import React, { useEffect, useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { BaseCRUD } from '../../components/crud/BaseCRUD';
import MapSelector from '../../components/map/MapSelector';
import { useAuth } from '../../context/AuthContext';

interface AsistenciaListItem {
  activo: boolean;
  cantidad_entregada: number;
  canton_destino: string | null;
  canton_destino_id: number;
  creacion: string;
  creador: string;
  emergencia_id: number;
  familias_beneficiadas: number;
  fecha_entrega: string | null;
  id: number;
  institucion_donante: string | null;
  institucion_donante_id: number;
  latitud_destino: number | null;
  longitud_destino: number | null;
  modificacion: string;
  modificador: string;
  parroquia_destino: string | null;
  parroquia_destino_id: number;
  personas_beneficiadas: number;
  provincia_destino: string | null;
  provincia_destino_id: number;
  recurso_categoria: string | null;
  recurso_categoria_id: number;
  recurso_grupo: string | null;
  recurso_grupo_id: number;
  recurso_tipo: string | null;
  recurso_tipo_id: number;
  sector_destino: string | null;
}

interface AsistenciaSavePayload {
  activo: boolean;
  cantidad_entregada: number;
  canton_destino_id: number;
  creador: string;
  emergencia_id: number;
  familias_beneficiadas: number;
  fecha_entrega: string | null;
  institucion_donante_id: number;
  latitud_destino: number;
  longitud_destino: number;
  modificador: string;
  parroquia_destino_id: number;
  personas_beneficiadas: number;
  provincia_destino_id: number;
  recurso_tipo_id: number;
  sector_destino: string;
}

type AsistenciaFormItem = Partial<AsistenciaSavePayload> & {
  id?: number;
  recurso_categoria_id?: number;
  recurso_grupo_id?: number;
};

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
  const [provincias, setProvincias] = useState<Array<{ id: number; nombre: string }>>([]);
  const [cantones, setCantones] = useState<Array<{ id: number; nombre: string }>>([]);
  const [selectedProvinciaId, setSelectedProvinciaId] = useState<number | null>(null);
  const [selectedCantonId, setSelectedCantonId] = useState<number | null>(null);
  const [parroquias, setParroquias] = useState<Array<{ id: number; nombre: string }>>([]);

  const apiBase = process.env.REACT_APP_API_URL || '/api';

  const emergenciaId = selectedEmergenciaId ?? 0;
  const usuarioId = useMemo(() => {
    const effective = datosLogin?.usuario_id ?? Number(localStorage.getItem('userId') || 'NaN');
    return Number(effective) || 0;
  }, [datosLogin]);
  const loginProvinciaId = Number(datosLogin?.provincia_id ?? 0);
  const loginCantonId = Number(datosLogin?.canton_id ?? 0);
  const isUsuarioNacional = loginProvinciaId === 0 && loginCantonId === 0;
  const isUsuarioCantonal = loginCantonId > 0;

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

  const handleProvinciaChange = async (provinciaId: number | null) => {
    setSelectedProvinciaId(provinciaId);
    setSelectedCantonId(null);
    setParroquias([]);
    if (!provinciaId) {
      setCantones([]);
      return;
    }
    try {
      const canRes = await authFetch(`${apiBase}/provincia/${provinciaId}/cantones/`, { headers: { accept: 'application/json' } });
      setCantones(canRes.ok ? await canRes.json() : []);
    } catch {
      setCantones([]);
    }
  };

  const handleCantonChange = async (cantonId: number | null) => {
    setSelectedCantonId(cantonId);
    if (!cantonId) {
      setParroquias([]);
      return;
    }
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

      try {
        if (isUsuarioNacional) {
          if (!selectedEmergenciaId) {
            setProvincias([]);
            setCantones([]);
            setParroquias([]);
            setSelectedProvinciaId(null);
            setSelectedCantonId(null);
            return;
          }
          const provRes = await authFetch(`${apiBase}/provincias/emergencia/${selectedEmergenciaId}`, { headers: { accept: 'application/json' } });
          setProvincias(provRes.ok ? await provRes.json() : []);
          setCantones([]);
          setParroquias([]);
          setSelectedProvinciaId(null);
          setSelectedCantonId(null);
        } else if (isUsuarioCantonal) {
          setProvincias([]);
          setSelectedProvinciaId(loginProvinciaId || null);
          if (loginProvinciaId) {
            const canRes = await authFetch(`${apiBase}/provincia/${loginProvinciaId}/cantones/`, { headers: { accept: 'application/json' } });
            const cantonesData = canRes.ok ? await canRes.json() : [];
            setCantones(cantonesData);
          }
          const paRes = await authFetch(`${apiBase}/parroquias/canton/${loginCantonId}`, { headers: { accept: 'application/json' } });
          setParroquias(paRes.ok ? await paRes.json() : []);
          setSelectedCantonId(loginCantonId);
        } else if (loginProvinciaId) {
          setProvincias([]);
          setSelectedProvinciaId(loginProvinciaId);
          const canRes = await authFetch(`${apiBase}/provincia/${loginProvinciaId}/cantones/`, { headers: { accept: 'application/json' } });
          setCantones(canRes.ok ? await canRes.json() : []);
          setParroquias([]);
          setSelectedCantonId(null);
        } else {
          setProvincias([]);
          setCantones([]);
          setParroquias([]);
          setSelectedProvinciaId(null);
          setSelectedCantonId(null);
        }
      } catch {
        setProvincias([]);
        setCantones([]);
        setParroquias([]);
        setSelectedProvinciaId(null);
        setSelectedCantonId(null);
      }
    };
    run();
  }, [apiBase, authFetch, isUsuarioCantonal, isUsuarioNacional, loginCantonId, loginProvinciaId, selectedEmergenciaId]);

  const fetchRows = async () => {
    if (!emergenciaId || !usuarioId) return;
    setLoading(true);
    try {
      const url = `${apiBase}/asistencia_humanitaria_entregada/emergencia/${emergenciaId}/usuario/${usuarioId}`;
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

  const handleSave = async (payload: AsistenciaFormItem) => {
    const creator = datosLogin?.usuario_login || datosLogin?.usuario_descripcion || 'usuario';
    const resolvedProvinciaId = isUsuarioNacional
      ? Number(selectedProvinciaId ?? payload.provincia_destino_id ?? 0)
      : Number(loginProvinciaId || payload.provincia_destino_id || 0);
    const resolvedCantonId = Number(selectedCantonId ?? payload.canton_destino_id ?? loginCantonId ?? 0);
    const id = payload.id;
    const isEdit = !!id;
    const baseBody = {
      activo: payload.activo ?? true,
      cantidad_entregada: Number(payload.cantidad_entregada ?? 0),
      canton_destino_id: resolvedCantonId,
      emergencia_id: selectedEmergenciaId || 0,
      familias_beneficiadas: Number(payload.familias_beneficiadas ?? 0),
      fecha_entrega: payload.fecha_entrega ?? new Date().toISOString().substring(0, 19),
      institucion_donante_id: Number(payload.institucion_donante_id ?? 0),
      latitud_destino: Number(payload.latitud_destino ?? 0),
      longitud_destino: Number(payload.longitud_destino ?? 0),
      modificador: creator,
      parroquia_destino_id: Number(payload.parroquia_destino_id ?? 0),
      personas_beneficiadas: Number(payload.personas_beneficiadas ?? 0),
      provincia_destino_id: resolvedProvinciaId,
      recurso_tipo_id: Number(payload.recurso_tipo_id ?? 0),
      sector_destino: String(payload.sector_destino ?? ''),
    };
    const body = isEdit ? baseBody : { ...baseBody, creador: payload.creador ?? creator };
    const url = isEdit ? `${apiBase}/asistencia_humanitaria_entregada/${id}` : `${apiBase}/asistencia_humanitaria_entregada`;
    const res = await authFetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) await fetchRows();
  };

  const handleDelete = async (row: AsistenciaListItem) => {
    const id = row.id;
    if (!id) return;
    try {
      const res = await authFetch(`${apiBase}/asistencia_humanitaria_entregada/${id}`, { method: 'DELETE', headers: { accept: 'application/json' } });
      if (res.ok) await fetchRows();
    } catch { }
  };

  const renderForm = (item: AsistenciaFormItem, onChange: (e: any) => void) => {
    const onDateChange = (date: string | Date | Date[] | null, field: keyof AsistenciaSavePayload) => {
      if (!date) return;
      let iso: string | null = null;
      if (Array.isArray(date)) {
        const d = date[0] as Date; iso = d ? new Date(d).toISOString().substring(0, 19) : null;
      } else if (typeof date === 'string') {
        const parsed = new Date(date); if (!isNaN(parsed.getTime())) iso = parsed.toISOString().substring(0, 19);
      } else { iso = date.toISOString().substring(0, 19); }
      onChange({ target: { name: field, value: iso } });
    };
    const onDropdownChange = (e: { value: any }, field: keyof AsistenciaSavePayload | 'recurso_grupo_id') => onChange({ target: { name: field, value: e.value } });
    const onNumberChange = (e: { value: number | null }, field: keyof AsistenciaSavePayload) => onChange({ target: { name: field, value: e.value || 0 } });

    const grupoOptions = (grupos || []).map(g => ({ label: g.nombre, value: g.id }));
    const itemOptions = (items || []).map(i => ({ label: i.nombre, value: i.id }));
    const institucionOptions = (instituciones || []).map(i => ({ label: i.siglas ? `${i.siglas} - ${i.nombre}` : i.nombre, value: i.id }));
    const provinciaOptions = (provincias || []).map(p => ({ label: p.nombre, value: p.id }));
    const parroquiaOptions = (parroquias || []).map(p => ({ label: p.nombre, value: p.id }));

    return (
      <div className="grid p-fluid">
       
        <div className="row">
          <div className="field col-4 md:col-4">
            <label>Cantidad *</label>
            <InputNumber value={Number(item.cantidad_entregada || 0)} onValueChange={(e) => onNumberChange(e, 'cantidad_entregada')} min={0} className="w-full" />
          </div>
          <div className="field col-4 md:col-4">
            <label>Familias</label>
            <InputNumber value={Number(item.familias_beneficiadas || 0)} onValueChange={(e) => onNumberChange(e, 'familias_beneficiadas')} min={0} className="w-full" />
          </div>
          <div className="field col-4 md:col-4">
            <label>Personas</label>
            <InputNumber value={Number(item.personas_beneficiadas || 0)} onValueChange={(e) => onNumberChange(e, 'personas_beneficiadas')} min={0} className="w-full" />
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
              value={typeof item.recurso_grupo_id === 'number' ? item.recurso_grupo_id : null}
              options={grupoOptions}
              onChange={async (e) => {
                onDropdownChange(e, 'recurso_grupo_id');
                // Clear selected item and filter list by group
                onChange({ target: { name: 'recurso_tipo_id', value: undefined } });
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
              value={typeof item.recurso_tipo_id === 'number' ? item.recurso_tipo_id : null}
              options={itemOptions}
              onChange={(e) => onDropdownChange(e, 'recurso_tipo_id')}
              placeholder={itemsStatus === 'loading' ? 'Cargando...' : 'Seleccionar item'}
              disabled={itemsStatus === 'loading'}
              filter
              className="w-full"
            />
          </div>

        </div>

        {isUsuarioNacional && (
          <div className="row">
            <div className="field col-12 md:col-6">
              <label>Provincia *</label>
              <Dropdown
                value={selectedProvinciaId}
                options={provinciaOptions}
                onChange={(e) => {
                  onDropdownChange(e, 'provincia_destino_id');
                  onChange({ target: { name: 'canton_destino_id', value: 0 } });
                  onChange({ target: { name: 'parroquia_destino_id', value: 0 } });
                  handleProvinciaChange(e.value ?? null);
                }}
                placeholder="Seleccionar provincia"
                disabled={provinciaOptions.length === 0}
                filter
                className="w-full"
              />
            </div>
          </div>
        )}

        <div className="row">
          <div className="field col-12 md:col-6">
            <label>Cantón</label>
            <Dropdown
              value={selectedCantonId}
              options={cantones.map(c => ({ label: c.nombre, value: c.id }))}
              onChange={(e) => {
                onDropdownChange(e, 'canton_destino_id');
                onChange({ target: { name: 'parroquia_destino_id', value: 0 } });
                handleCantonChange(e.value ?? null);
              }}
              placeholder="Seleccionar canton"
              disabled={isUsuarioCantonal || (isUsuarioNacional && !selectedProvinciaId) || cantones.length === 0}
              filter
              className="w-full"
            />
          </div>
        </div>

        <div className="row">
          <div className="field col-6 md:col-6">
            <label>Parroquia *</label>
            <Dropdown
              value={typeof item.parroquia_destino_id === 'number' && item.parroquia_destino_id !== 0 ? item.parroquia_destino_id : null}
              options={parroquiaOptions}
              onChange={(e) => onDropdownChange(e, 'parroquia_destino_id')}
              placeholder="Seleccionar parroquia"
              disabled={parroquiaOptions.length === 0}
              filter
              className="w-full"
            />
          </div>
           <div className="field col-6 md:col-6">
            <label>Fecha Entrega *</label>
            <Calendar value={item.fecha_entrega ? new Date(item.fecha_entrega) : null} onChange={(e) => onDateChange(e.value as Date, 'fecha_entrega')} showIcon dateFormat="dd/mm/yy" className="w-full" />
          </div>
        </div>

         <div>
          <label>Ubicación en el mapa</label>
          <MapSelector
            latitud={item.latitud_destino}
            longitud={item.longitud_destino}
            initializeWithDefault={!item.id}
            onLocationChange={(lat, lng) => {
              onChange({ target: { name: 'latitud_destino', value: lat } });
              onChange({ target: { name: 'longitud_destino', value: lng } });
            }}
            height="200px"
            placeholder="Buscar dirección, calle, ciudad..."
          />
        </div>

        <div className="row">
          <div className="field col-6 md:col-6">
            <label>Latitud</label>
            <InputNumber
              value={typeof item.latitud_destino === 'number' ? item.latitud_destino : null}
              onValueChange={(e) => onChange({ target: { name: 'latitud_destino', value: e.value } })}
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
              value={typeof item.longitud_destino === 'number' ? item.longitud_destino : null}
              onValueChange={(e) => onChange({ target: { name: 'longitud_destino', value: e.value } })}
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
          <InputText value={item.sector_destino || ''} onChange={(e) => onChange({ target: { name: 'sector_destino', value: e.target.value } })} />
        </div>
      </div>
    );
  };

  const resolveItemForEdit = async (row: AsistenciaListItem): Promise<AsistenciaFormItem> => {
    if (row.recurso_grupo_id) {
      filterItemsByGrupo(row.recurso_grupo_id);
    }
    const editProvinciaId = Number(row.provincia_destino_id ?? loginProvinciaId ?? 0) || 0;
    const editCantonId = Number(row.canton_destino_id ?? loginCantonId ?? 0) || 0;
    setSelectedProvinciaId(editProvinciaId || null);
    setSelectedCantonId(editCantonId || null);
    if (editProvinciaId > 0 && (!cantones || cantones.length === 0)) {
      try {
        const canRes = await authFetch(`${apiBase}/provincia/${editProvinciaId}/cantones/`, { headers: { accept: 'application/json' } });
        setCantones(canRes.ok ? await canRes.json() : []);
      } catch { }
    }
    try {
      if ((!parroquias || parroquias.length === 0) && editCantonId) {
        const paRes = await authFetch(`${apiBase}/parroquias/canton/${editCantonId}`, { headers: { accept: 'application/json' } });
        const paData = paRes.ok ? await paRes.json() : [];
        setParroquias(Array.isArray(paData) ? paData : []);
      }
    } catch { }
    return {
      id: row.id,
      activo: row.activo ?? true,
      cantidad_entregada: row.cantidad_entregada,
      canton_destino_id: editCantonId,
      creador: datosLogin?.usuario_login || datosLogin?.usuario_descripcion || 'usuario',
      emergencia_id: selectedEmergenciaId || 0,
      familias_beneficiadas: row.familias_beneficiadas,
      fecha_entrega: row.fecha_entrega,
      institucion_donante_id: row.institucion_donante_id ?? 0,
      latitud_destino: Number(row.latitud_destino ?? 0),
      longitud_destino: Number(row.longitud_destino ?? 0),
      modificador: datosLogin?.usuario_login || datosLogin?.usuario_descripcion || 'usuario',
      parroquia_destino_id: row.parroquia_destino_id ?? 0,
      personas_beneficiadas: row.personas_beneficiadas,
      provincia_destino_id: editProvinciaId,
      recurso_categoria_id: row.recurso_categoria_id,
      recurso_grupo_id: row.recurso_grupo_id,
      recurso_tipo_id: row.recurso_tipo_id,
      sector_destino: row.sector_destino || '',
    };
  };

  const columns = [
    { field: 'id', header: 'ID', sortable: true },
    { field: 'parroquia_destino', header: 'Parroquia', sortable: true },
    { field: 'fecha_entrega', header: 'Fecha Entrega', sortable: true },
    { field: 'sector_destino', header: 'Sector', sortable: true },
    { field: 'institucion_donante', header: 'Institución', sortable: true },
    { field: 'recurso_grupo', header: 'Grupo', sortable: true },
    { field: 'recurso_tipo', header: 'Ítem', sortable: true },
    { field: 'cantidad_entregada', header: 'Cantidad', sortable: true },
    { field: 'familias_beneficiadas', header: 'Familias', sortable: true },
    { field: 'personas_beneficiadas', header: 'Personas', sortable: true },
  ];

  return (
    <Card title="Asistencia Entregada">
      <BaseCRUD<AsistenciaListItem | AsistenciaFormItem>
        title=""
        items={rows as any}
        columns={columns as any}
        renderForm={renderForm}
        onSave={handleSave}
        onDelete={handleDelete as any}
        resolveItemForEdit={resolveItemForEdit as any}
        initialItem={{
          activo: true,
          cantidad_entregada: 0,
          canton_destino_id: loginCantonId || 0,
          creador: datosLogin?.usuario_login || '',
          emergencia_id: selectedEmergenciaId || 0,
          familias_beneficiadas: 0,
          fecha_entrega: new Date().toISOString().substring(0, 19),
          institucion_donante_id: 0,
          latitud_destino: 0,
          longitud_destino: 0,
          modificador: datosLogin?.usuario_login || '',
          parroquia_destino_id: 0,
          personas_beneficiadas: 0,
          provincia_destino_id: loginProvinciaId || 0,
          recurso_categoria_id: 1,
          recurso_grupo_id: undefined as any,
          recurso_tipo_id: undefined as any,
          sector_destino: '',
        }}
        idField="id"
        showDeleteButton={true}
      />
      {loading && <div className="mt-2">Cargando...</div>}
    </Card>
  );
};

