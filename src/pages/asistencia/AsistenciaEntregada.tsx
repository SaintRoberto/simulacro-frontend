import React, { useEffect, useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { BaseCRUD } from '../../components/crud/BaseCRUD';
import MapSelector from '../../components/map/MapSelector';
import { useAuth } from '../../context/AuthContext';

interface AsistenciaListItem {
  asistencia_id: number;
  asistencia_grupo: string;
  asistencia_item: string;
  cantidad: number;
  familias: number;
  fecha_entrega: string | null;
  institucion_donante: string | null;
  latitud: number | null;
  longitud: number | null;
  parroquia_nombre: string | null;
  personas: number;
  sector: string | null;
}

interface AsistenciaPostPayload {
  activo: boolean;
  asistencia_categoria_id: number;
  asistencia_grupo_id: number;
  asistencia_item_id: number;
  cantidad: number;
  canton_id: number;
  creador: string;
  emergencia_id: number;
  familias: number;
  fecha_entrega: string | null;
  institucion_donante_id: number;
  latitud: number | null;
  longitud: number | null;
  parroquia_id: number;
  personas: number;
  provincia_id: number;
  sector: string;
}

export const AsistenciaEntregada: React.FC = () => {
  const { authFetch, datosLogin, selectedEmergenciaId } = useAuth();
  const [rows, setRows] = useState<AsistenciaListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [grupos, setGrupos] = useState<Array<{ id: number; nombre: string }>>([]);
  const [gruposStatus, setGruposStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle');
  const [itemsAll, setItemsAll] = useState<Array<{ id: number; nombre: string; recurso_grupo_id: number }>>([]);
  const [items, setItems] = useState<Array<{ id: number; nombre: string; recurso_grupo_id?: number }>>([]);
  const [itemsStatus, setItemsStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle');

  const [instituciones, setInstituciones] = useState<Array<{ id: number; nombre: string; siglas: string }>>([]);
  const [cantones, setCantones] = useState<Array<{ id: number; nombre: string }>>([]);
  const [selectedCantonId, setSelectedCantonId] = useState<number | null>(null);
  const [parroquias, setParroquias] = useState<Array<{ id: number; nombre: string }>>([]);

  const apiBase = process.env.REACT_APP_API_URL || '/api';

  const emergenciaId = selectedEmergenciaId ?? 0;
  const usuarioId = useMemo(() => {
    const effective = datosLogin?.usuario_id ?? Number(localStorage.getItem('userId') || 'NaN');
    return Number(effective) || 0;
  }, [datosLogin]);

  // Catalogs
  useEffect(() => {
    if (gruposStatus !== 'idle') return;
    setGruposStatus('loading');
    authFetch(`${apiBase}/recurso_grupos/categoria/1`, { headers: { accept: 'application/json' } })
      .then(async res => setGrupos(res.ok ? await res.json() : []))
      .catch(() => setGrupos([]))
      .finally(() => setGruposStatus('succeeded'));
  }, [apiBase, authFetch, gruposStatus]);

  // Load all items by categoria once
  useEffect(() => {
    if (itemsStatus !== 'idle') return;
    const loadAll = async () => {
      setItemsStatus('loading');
      try {
        const res = await authFetch(`${apiBase}/recurso-tipos/categoria/1`, { headers: { accept: 'application/json' } });
        const data = res.ok ? await res.json() : [];
        const arr = Array.isArray(data) ? data as Array<{ id: number; nombre: string; recurso_grupo_id: number }> : [];
        setItemsAll(arr);
        setItems(arr);
        setItemsStatus('succeeded');
      } catch {
        setItemsAll([]);
        setItems([]);
        setItemsStatus('failed');
      }
    };
    loadAll();
  }, [apiBase, authFetch, itemsStatus]);

  const filterItemsByGrupo = (grupoId?: number) => {
    if (!grupoId) { setItems([]); return; }
    setItems(itemsAll.filter(i => i.recurso_grupo_id === grupoId));
  };

  const handleCantonChange = async (cantonId: number) => {
    setSelectedCantonId(cantonId);
    try {
      const paRes = await authFetch(`${apiBase}/parroquias/canton/${cantonId}`, { headers: { accept: 'application/json' } });
      setParroquias(paRes.ok ? await paRes.json() : []);
    } catch {
      setParroquias([]);
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        const inst = await authFetch(`${apiBase}/instituciones`, { headers: { accept: 'application/json' } });
        setInstituciones(inst.ok ? await inst.json() : []);
      } catch { setInstituciones([]); }

      // Determinar si es usuario provincial o cantonal
      const isProvincial = datosLogin?.provincia_id && !datosLogin?.canton_id;
      const isCantonal = datosLogin?.canton_id;

      try {
        if (isCantonal) {
          // Usuario cantonal: cargar cantones de su provincia y seleccionar el suyo
          if (datosLogin?.provincia_id) {
            const canRes = await authFetch(`${apiBase}/provincia/${datosLogin.provincia_id}/cantones/`, { headers: { accept: 'application/json' } });
            const cantonesData = canRes.ok ? await canRes.json() : [];
            setCantones(cantonesData);
          }
          const paRes = await authFetch(`${apiBase}/parroquias/canton/${datosLogin.canton_id}`, { headers: { accept: 'application/json' } });
          setParroquias(paRes.ok ? await paRes.json() : []);
          setSelectedCantonId(datosLogin.canton_id);
        } else if (datosLogin?.provincia_id) {
          // Cargar cantones de la provincia del usuario (provincial o sin asignación específica)
          const canRes = await authFetch(`${apiBase}/provincia/${datosLogin.provincia_id}/cantones/`, { headers: { accept: 'application/json' } });
          setCantones(canRes.ok ? await canRes.json() : []);
          setParroquias([]);
          setSelectedCantonId(null);
        } else {
          setCantones([]);
          setParroquias([]);
          setSelectedCantonId(null);
        }
      } catch {
        setCantones([]);
        setParroquias([]);
        setSelectedCantonId(null);
      }
    };
    run();
  }, [apiBase, authFetch, datosLogin?.canton_id, datosLogin?.provincia_id]);

  const fetchRows = async () => {
    if (!emergenciaId || !usuarioId) return;
    setLoading(true);
    try {
      const url = `${apiBase}/asistencia_entregada/emergencia/${emergenciaId}/usuario/${usuarioId}`;
      const res = await authFetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) { setRows([]); }
      else {
        const data = await res.json();
        setRows(Array.isArray(data) ? data as AsistenciaListItem[] : []);
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emergenciaId, usuarioId]);

  const handleSave = async (payload: Partial<AsistenciaPostPayload> & { id?: number; asistencia_id?: number }) => {
    const creator = datosLogin?.usuario_login || datosLogin?.usuario_descripcion || 'usuario';
    const selectedItem = itemsAll.find(i => i.id === Number(payload.asistencia_item_id));
    const resolvedGrupoId = selectedItem?.recurso_grupo_id ?? Number(payload.asistencia_grupo_id ?? 0);
    const body: AsistenciaPostPayload = {
      activo: payload.activo ?? true,
      asistencia_categoria_id: 1,
      asistencia_grupo_id: resolvedGrupoId,
      asistencia_item_id: Number(payload.asistencia_item_id ?? 0),
      cantidad: Number(payload.cantidad ?? 0),
      canton_id: selectedCantonId || datosLogin?.canton_id || 0,
      creador: payload.creador ?? creator,
      emergencia_id: selectedEmergenciaId || 0,
      familias: Number(payload.familias ?? 0),
      fecha_entrega: payload.fecha_entrega ?? new Date().toISOString().substring(0, 19),
      institucion_donante_id: Number(payload.institucion_donante_id ?? 0),
      latitud: payload.latitud ?? null,
      longitud: payload.longitud ?? null,
      parroquia_id: Number(payload.parroquia_id ?? 0),
      personas: Number(payload.personas ?? 0),
      provincia_id: datosLogin?.provincia_id || 0,
      sector: String(payload.sector ?? ''),
    };
    const id = (payload as any)?.id ?? (payload as any)?.asistencia_id;
    const isEdit = !!id;
    const url = isEdit ? `${apiBase}/asistencia_entregada/${id}` : `${apiBase}/asistencia_entregada`;
    const res = await authFetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) await fetchRows();
  };

  const handleDelete = async (row: AsistenciaListItem) => {
    const id = (row as any).id ?? (row as any).asistencia_id;
    if (!id) return;
    try {
      const res = await authFetch(`${apiBase}/asistencia_entregada/${id}`, { method: 'DELETE', headers: { accept: 'application/json' } });
      if (res.ok) await fetchRows();
    } catch { }
  };

  const renderForm = (item: Partial<AsistenciaPostPayload>, onChange: (e: any) => void) => {
    const onDateChange = (date: string | Date | Date[] | null, field: keyof AsistenciaPostPayload) => {
      if (!date) return;
      let iso: string | null = null;
      if (Array.isArray(date)) {
        const d = date[0] as Date; iso = d ? new Date(d).toISOString().substring(0, 19) : null;
      } else if (typeof date === 'string') {
        const parsed = new Date(date); if (!isNaN(parsed.getTime())) iso = parsed.toISOString().substring(0, 19);
      } else { iso = date.toISOString().substring(0, 19); }
      onChange({ target: { name: field, value: iso } });
    };
    const onDropdownChange = (e: { value: any }, field: keyof AsistenciaPostPayload) => onChange({ target: { name: field, value: e.value } });
    const onNumberChange = (e: { value: number | null }, field: keyof AsistenciaPostPayload) => onChange({ target: { name: field, value: e.value || 0 } });

    const grupoOptions = (grupos || []).map(g => ({ label: g.nombre, value: g.id }));
    const itemOptions = (items || []).map(i => ({ label: i.nombre, value: i.id }));
    const institucionOptions = (instituciones || []).map(i => ({ label: i.siglas ? `${i.siglas} - ${i.nombre}` : i.nombre, value: i.id }));
    const parroquiaOptions = (parroquias || []).map(p => ({ label: p.nombre, value: p.id }));

    return (
      <div className="grid p-fluid">
       
        <div className="row">
          <div className="field col-6 md:col-4">
            <label>Cantidad *</label>
            <InputNumber value={Number(item.cantidad || 0)} onValueChange={(e) => onNumberChange(e, 'cantidad')} min={0} className="w-full" />
          </div>
          <div className="field col-6 md:col-4">
            <label>Familias</label>
            <InputNumber value={Number(item.familias || 0)} onValueChange={(e) => onNumberChange(e, 'familias')} min={0} className="w-full" />
          </div>
          <div className="field col-6 md:col-4">
            <label>Personas</label>
            <InputNumber value={Number(item.personas || 0)} onValueChange={(e) => onNumberChange(e, 'personas')} min={0} className="w-full" />
          </div>
        </div>

        <div className="field col-12md:col-4">
          <label>Institución donante</label>
          <Dropdown
            value={typeof item.institucion_donante_id === 'number' ? item.institucion_donante_id : null}
            options={institucionOptions}
            onChange={(e) => onDropdownChange(e, 'institucion_donante_id')}
            placeholder="Seleccionar institución"
            filter
            className="w-full"
          />
        </div>

        <div className="row" >
          <div className="field col-6 md:col-4" hidden={true}>
            <label>Grupo *</label>
            <Dropdown
              value={typeof item.asistencia_grupo_id === 'number' ? item.asistencia_grupo_id : null}
              options={grupoOptions}
              onChange={async (e) => {
                onDropdownChange(e, 'asistencia_grupo_id');
                // Clear selected item and filter list by group
                onChange({ target: { name: 'asistencia_item_id', value: undefined } });
                if (typeof e.value === 'number') {
                  filterItemsByGrupo(e.value);
                } else {
                  filterItemsByGrupo(undefined);
                }
              }}
              placeholder={gruposStatus === 'loading' ? 'Cargando...' : 'Seleccionar grupo'}
              disabled={gruposStatus === 'loading'}
              filter
              className="w-full"
            />
          </div>
          <div className="field col-12 md:col-12">
            <label>Ítem *</label>
            <Dropdown
              value={typeof item.asistencia_item_id === 'number' ? item.asistencia_item_id : null}
              options={itemOptions}
              onChange={(e) => onDropdownChange(e, 'asistencia_item_id')}
              placeholder={itemsStatus === 'loading' ? 'Cargando...' : 'Seleccionar item'}
              disabled={itemsStatus === 'loading'}
              filter
              className="w-full"
            />
          </div>

        </div>

        <div className="row">
          <div className="field col-6 md:col-6">
            <label>Fecha Entrega *</label>
            <Calendar value={item.fecha_entrega ? new Date(item.fecha_entrega) : null} onChange={(e) => onDateChange(e.value as Date, 'fecha_entrega')} showIcon dateFormat="dd/mm/yy" className="w-full" />
          </div>
          <div className="field col-6 md:col-6">
            <label>Cantón</label>
            <Dropdown
              value={selectedCantonId}
              options={cantones.map(c => ({ label: c.nombre, value: c.id }))}
              onChange={(e) => handleCantonChange(e.value)}
              placeholder="Seleccionar cantón"
              disabled={!!datosLogin?.canton_id || cantones.length === 0}
              filter
              className="w-full"
            />
          </div>
        </div>

        <div className="row">
          <div className="field col-6 md:col-6">
            <label>Parroquia *</label>
            <Dropdown
              value={typeof item.parroquia_id === 'number' && item.parroquia_id !== 0 ? item.parroquia_id : null}
              options={parroquiaOptions}
              onChange={(e) => onDropdownChange(e, 'parroquia_id')}
              placeholder="Seleccionar parroquia"
              disabled={parroquiaOptions.length === 0}
              filter
              className="w-full"
            />
          </div>
        </div>

         <div>
          <label>Ubicación en el mapa</label>
          <MapSelector
            latitud={item.latitud}
            longitud={item.longitud}
            onLocationChange={(lat, lng) => {
              onChange({ target: { name: 'latitud', value: lat } });
              onChange({ target: { name: 'longitud', value: lng } });
            }}
            height="200px"
            placeholder="Buscar dirección, calle, ciudad..."
          />
        </div>

        <div className="row">
          <div className="field col-6 md:col-6">
            <label>Latitud</label>
            <InputNumber
              value={typeof item.latitud === 'number' ? item.latitud : null}
              onValueChange={(e) => onChange({ target: { name: 'latitud', value: e.value } })}
              className="w-full"
              mode="decimal"
              min={-90}
              max={90}
              step={0.000001}
              minFractionDigits={6}
              maxFractionDigits={6}
              useGrouping={false}
              placeholder="-90.000000"
            />
          </div>
          <div className="field col-6 md:col-6">
            <label>Longitud</label>
            <InputNumber
              value={typeof item.longitud === 'number' ? item.longitud : null}
              onValueChange={(e) => onChange({ target: { name: 'longitud', value: e.value } })}
              className="w-full"
              mode="decimal"
              min={-180}
              max={180}
              step={0.000001}
              minFractionDigits={6}
              maxFractionDigits={6}
              useGrouping={false}
              placeholder="-180.000000"
            />
          </div>
        </div>

        <div className="field col-12">
          <label>Sector</label>
          <InputText value={item.sector || ''} onChange={(e) => onChange({ target: { name: 'sector', value: e.target.value } })} />
        </div>
      </div>
    );
  };

  const resolveItemForEdit = async (row: AsistenciaListItem): Promise<Partial<AsistenciaPostPayload> & { id?: number; asistencia_id?: number }> => {
    // Resolve item and derive group from itemsAll
    const item = itemsAll.find(i => i.nombre === row.asistencia_item);
    const asistencia_item_id = item?.id || undefined;
    const asistencia_grupo_id = item?.recurso_grupo_id || undefined;
    // Filter items by resolved group so dropdown has correct options
    if (asistencia_grupo_id) {
      filterItemsByGrupo(asistencia_grupo_id);
    }
    let institucion_donante_id: number | undefined = undefined;
    if (row.institucion_donante) {
      const inst = instituciones.find(i => i.nombre === row.institucion_donante || `${i.siglas ? i.siglas + ' - ' : ''}${i.nombre}` === row.institucion_donante);
      if (inst) institucion_donante_id = inst.id;
    }
    let parroquia_id: number | undefined = undefined;
    try {
      if ((!parroquias || parroquias.length === 0) && datosLogin?.canton_id) {
        const paRes = await authFetch(`${apiBase}/parroquias/canton/${datosLogin.canton_id}`, { headers: { accept: 'application/json' } });
        const paData = paRes.ok ? await paRes.json() : [];
        setParroquias(Array.isArray(paData) ? paData : []);
      }
    } catch { }
    if (row.parroquia_nombre) {
      const pa = (parroquias || []).find(p => p.nombre === row.parroquia_nombre);
      if (pa) parroquia_id = pa.id;
    }
    return {
      id: (row as any).id,
      asistencia_id: (row as any).asistencia_id,
      activo: true,
      asistencia_categoria_id: 1,
      asistencia_grupo_id,
      asistencia_item_id,
      cantidad: row.cantidad,
      canton_id: datosLogin?.canton_id || 0,
      creador: datosLogin?.usuario_login || datosLogin?.usuario_descripcion || 'usuario',
      emergencia_id: selectedEmergenciaId || 0,
      familias: row.familias,
      fecha_entrega: row.fecha_entrega,
      institucion_donante_id: institucion_donante_id ?? 0,
      latitud: row.latitud ?? null,
      longitud: row.longitud ?? null,
      parroquia_id: parroquia_id ?? 0,
      personas: row.personas,
      provincia_id: datosLogin?.provincia_id || 0,
      sector: row.sector || '',
    } as Partial<AsistenciaPostPayload> & { id?: number; asistencia_id?: number };
  };

  const columns = [
    { field: 'id', header: 'ID', sortable: true },
    { field: 'parroquia_nombre', header: 'Parroquia', sortable: true },
    { field: 'fecha_entrega', header: 'Fecha Entrega', sortable: true },
    { field: 'sector', header: 'Sector', sortable: true },
    { field: 'institucion_donante', header: 'Institución', sortable: true },
    { field: 'asistencia_grupo', header: 'Grupo', sortable: true },
    { field: 'asistencia_item', header: 'Ítem', sortable: true },
    { field: 'cantidad', header: 'Cantidad', sortable: true },
    { field: 'familias', header: 'Familias', sortable: true },
    { field: 'personas', header: 'Personas', sortable: true },
  ];

  return (
    <Card title="Asistencia Entregada">
      <BaseCRUD<AsistenciaListItem | AsistenciaPostPayload>
        title=""
        items={rows as any}
        columns={columns as any}
        renderForm={renderForm}
        onSave={handleSave}
        onDelete={handleDelete as any}
        resolveItemForEdit={resolveItemForEdit as any}
        initialItem={{
          activo: true,
          asistencia_categoria_id: 1,
          asistencia_grupo_id: undefined as any,
          asistencia_item_id: undefined as any,
          cantidad: 0,
          canton_id: datosLogin?.canton_id || 0,
          creador: datosLogin?.usuario_login || '',
          emergencia_id: selectedEmergenciaId || 0,
          familias: 0,
          fecha_entrega: new Date().toISOString().substring(0, 19),
          institucion_donante_id: 0,
          latitud: null,
          longitud: null,
          parroquia_id: 0,
          personas: 0,
          provincia_id: datosLogin?.provincia_id || 0,
          sector: '',
        }}
        idField="id"
        showDeleteButton={true}
      />
      {loading && <div className="mt-2">Cargando...</div>}
    </Card>
  );
};
