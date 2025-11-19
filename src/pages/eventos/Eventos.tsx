import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import { BaseCRUD } from '../../components/crud/BaseCRUD';
import { useAuth } from '../../context/AuthContext';
import { Select, Checkbox } from 'antd';

interface EventoItem {
  id?: number;
  alto_impacto?: boolean;
  canton?: string;
  categoria?: string;
  causa?: string;
  descripcion?: string;
  emergencia?: string;
  estado?: string;
  evento_fecha?: string;
  latitud?: number;
  longitud?: number;
  origen?: string;
  parroquia?: string;
  provincia?: string;
  sector?: string;
  situacion?: string;
  tipo?: string;
  subtipo?: string;
  // support ids for edit
  emergencia_id?: number;
  provincia_id?: number;
  canton_id?: number;
  parroquia_id?: number;
  evento_categoria_id?: number;
  evento_causa_id?: number;
  evento_atencion_estado_id?: number;
  evento_origen_id?: number;
  evento_tipo_id?: number;
  evento_subtipo_id?: number;
}

export const Eventos: React.FC = () => {
  const { authFetch, selectedEmergenciaId, datosLogin, loginResponse } = useAuth();
  const [items, setItems] = useState<EventoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Catalogs
  const [causas, setCausas] = useState<{ id: number; nombre: string }[]>([]);
  const [estados, setEstados] = useState<{ id: number; nombre: string }[]>([]);
  const [origenes, setOrigenes] = useState<{ id: number; nombre: string }[]>([]);
  const [tipos, setTipos] = useState<{ id: number; nombre: string }[]>([]);
  const [subtipos, setSubtipos] = useState<{ id: number; nombre: string }[]>([]);
  const [parroquias, setParroquias] = useState<{ id: number; nombre: string }[]>([]);
  const [atencionEstados, setAtencionEstados] = useState<{ id: number; nombre: string }[]>([]);

  const load = useCallback(async () => {
    if (!selectedEmergenciaId || !datosLogin?.provincia_id || !datosLogin?.canton_id) {
      setItems([]);
      return;
    }
    try {
      setLoading(true);
      const url = `${apiBase}/eventos/emergencia/${selectedEmergenciaId}/provincia/${datosLogin.provincia_id}/canton/${datosLogin.canton_id}`;
      const res = await authFetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) {
        setItems([]);
        return;
      }
      const data = await res.json();
      const mapped: EventoItem[] = (Array.isArray(data) ? data : []).map((it: any, idx: number) => {
        const rawId = it.id ?? it.evento_id ?? it.eventoId ?? it.eventoID ?? it.EventoId ?? null;
        const parsedId = rawId != null && !isNaN(Number(rawId)) ? Number(rawId) : undefined;
        return {
        id: parsedId,
        alto_impacto: Boolean(it.alto_impacto ?? false),
        canton: String(it.canton ?? ''),
        categoria: String(it.evento_categoria ?? ''),
        causa: String(it.evento_causa ?? ''),
        descripcion: String(it.descripcion ?? ''),
        emergencia: String(it.emergencia ?? ''),
        estado: String(it.evento_atencion_estado ?? ''),
        evento_fecha: String(it.evento_fecha ?? ''),
        latitud: it.latitud ?? undefined,
        longitud: it.longitud ?? undefined,
        origen: String(it.evento_origen ?? ''),
        parroquia: String(it.parroquia ?? ''),
        provincia: String(it.provincia ?? ''),
        sector: String(it.sector ?? ''),
        situacion: String(it.situacion ?? ''),
        tipo: String(it.evento_tipo ?? ''),
        subtipo: String(it.evento_subtipo ?? ''),
        emergencia_id: selectedEmergenciaId,
        provincia_id: datosLogin?.provincia_id,
        canton_id: datosLogin?.canton_id,
        // synthetic key support via id if present
      }});
      setItems(mapped);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase, authFetch, selectedEmergenciaId, datosLogin?.provincia_id, datosLogin?.canton_id]);

  useEffect(() => { load(); }, [load]);

  // Load catalogs (underscored endpoints)
  useEffect(() => {
    const run = async () => {
      try {
        const [c2, c3, c4, c5, c6] = await Promise.all([
          authFetch(`${apiBase}/evento_causas`),
          authFetch(`${apiBase}/evento_estados`),
          authFetch(`${apiBase}/evento_origenes`),
          authFetch(`${apiBase}/evento_tipos`),
          authFetch(`${apiBase}/evento_atencion_estados`),
        ]);
        setCausas(c2.ok ? await c2.json() : []);
        setEstados(c3.ok ? await c3.json() : []);
        setOrigenes(c4.ok ? await c4.json() : []);
        setTipos(c5.ok ? await c5.json() : []);
        setAtencionEstados(c6.ok ? await c6.json() : []);
      } catch {}
    };
    run();
  }, [apiBase, authFetch]);

  useEffect(() => {
    const cantonId = datosLogin?.canton_id;
    if (!cantonId) return;
    const run = async () => {
      try {
        const res = await authFetch(`${apiBase}/parroquias/canton/${cantonId}`);
        setParroquias(res.ok ? await res.json() : []);
      } catch {}
    };
    run();
  }, [apiBase, authFetch, datosLogin?.canton_id]);

  const fetchSubtipos = useCallback(async (tipoId?: number) => {
    try {
      if (!tipoId) { setSubtipos([]); return; }
      const res = await authFetch(`${apiBase}/evento_subtipos/tipo/${tipoId}`);
      setSubtipos(res.ok ? await res.json() : []);
    } catch { setSubtipos([]); }
  }, [apiBase, authFetch]);

  const handleSave = async (item: Partial<EventoItem>) => {
    try {
      const isEdit = !!item.id && item.id > 0;
      const url = isEdit ? `${apiBase}/eventos/${item.id}` : `${apiBase}/eventos`;
      const payloadRaw: Record<string, any> = {
        activo: true,
        alto_impacto: item.alto_impacto ?? false,
        canton_id: item.canton_id ?? datosLogin?.canton_id,
        creador: loginResponse?.usuario ?? '',
        descripcion: item.descripcion ?? '',
        emergencia_id: item.emergencia_id ?? selectedEmergenciaId,
        evento_causa_id: item.evento_causa_id ?? undefined,
        evento_atencion_estado_id: item.evento_atencion_estado_id ?? undefined,
        evento_fecha: item.evento_fecha ?? new Date().toISOString(),
        evento_origen_id: item.evento_origen_id ?? undefined,
        evento_tipo_id: item.evento_tipo_id ?? undefined,
        evento_subtipo_id: item.evento_subtipo_id ?? undefined,
        latitud: item.latitud ?? 0,
        longitud: item.longitud ?? 0,
        modificador: isEdit ? (loginResponse?.usuario ?? '') : undefined,
        parroquia_id: item.parroquia_id ?? undefined,
        provincia_id: item.provincia_id ?? datosLogin?.provincia_id,
        sector: item.sector ?? '',
        situacion: item.situacion ?? ''
      };
      const payload = Object.fromEntries(Object.entries(payloadRaw).filter(([, v]) => v !== undefined));
      const res = await authFetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return;
      await load();
    } catch {}
  };

  const handleDelete = async (item: EventoItem) => {
    try {
      if (!item.id) return;
      const url = `${apiBase}/eventos/${item.id}`;
      const res = await authFetch(url, { method: 'DELETE', headers: { accept: 'application/json' } });
      if (!res.ok) return;
      await load();
    } catch {}
  };

  const resolveItemForEdit = async (row: EventoItem): Promise<Partial<EventoItem>> => {
    try {
      // Make sure catalogs are available to reflect selected values
      const ensureCatalogs = async () => {
        const needsTipos = tipos.length === 0;
        const needsCausas = causas.length === 0;
        const needsEstados = estados.length === 0;
        const needsOrigenes = origenes.length === 0;
        const needsParroquias = parroquias.length === 0;
        const needsAtencionEstados = atencionEstados.length === 0;
        if (needsTipos || needsCausas || needsEstados || needsOrigenes || needsAtencionEstados) {
          try {
            const [c2, c3, c4, c5, c6] = await Promise.all([
              needsCausas ? authFetch(`${apiBase}/evento_causas`) : Promise.resolve({ ok: false }),
              needsEstados ? authFetch(`${apiBase}/evento_estados`) : Promise.resolve({ ok: false }),
              needsOrigenes ? authFetch(`${apiBase}/evento_origenes`) : Promise.resolve({ ok: false }),
              needsTipos ? authFetch(`${apiBase}/evento_tipos`) : Promise.resolve({ ok: false }),
              needsAtencionEstados ? authFetch(`${apiBase}/evento_atencion_estados`) : Promise.resolve({ ok: false }),
            ]);
            if (c2 && (c2 as Response).ok) setCausas(await (c2 as Response).json());
            if (c3 && (c3 as Response).ok) setEstados(await (c3 as Response).json());
            if (c4 && (c4 as Response).ok) setOrigenes(await (c4 as Response).json());
            if (c5 && (c5 as Response).ok) setTipos(await (c5 as Response).json());
            if (c6 && (c6 as Response).ok) setAtencionEstados(await (c6 as Response).json());
          } catch {}
        }
        if (needsParroquias && datosLogin?.canton_id) {
          try {
            const res = await authFetch(`${apiBase}/parroquias/canton/${datosLogin.canton_id}`);
            if (res.ok) setParroquias(await res.json());
          } catch {}
        }
      };
      await ensureCatalogs();

      if (!row.id) return row;
      const res = await authFetch(`${apiBase}/eventos/${row.id}`, { headers: { accept: 'application/json' } });
      if (!res.ok) return row;
      const d = await res.json();
      const mapped: Partial<EventoItem> = {
        id: d.id,
        alto_impacto: !!d.alto_impacto,
        descripcion: d.descripcion ?? '',
        emergencia_id: d.emergencia_id ?? selectedEmergenciaId,
        evento_causa_id: d.evento_causa_id != null ? Number(d.evento_causa_id) : undefined,
        evento_atencion_estado_id: d.evento_atencion_estado_id != null ? Number(d.evento_atencion_estado_id) : undefined,
        evento_fecha: d.evento_fecha ?? undefined,
        evento_origen_id: d.evento_origen_id != null ? Number(d.evento_origen_id) : undefined,
        evento_tipo_id: d.evento_tipo_id != null ? Number(d.evento_tipo_id) : undefined,
        evento_subtipo_id: d.evento_subtipo_id != null ? Number(d.evento_subtipo_id) : undefined,
        latitud: d.latitud ?? undefined,
        longitud: d.longitud ?? undefined,
        parroquia_id: d.parroquia_id != null ? Number(d.parroquia_id) : undefined,
        provincia_id: d.provincia_id != null ? Number(d.provincia_id) : (datosLogin?.provincia_id ?? undefined),
        canton_id: d.canton_id != null ? Number(d.canton_id) : (datosLogin?.canton_id ?? undefined),
        sector: d.sector ?? '',
        situacion: d.situacion ?? ''
      };
      // Ensure current IDs exist in option arrays so Select shows value
      try {
        if (mapped.evento_tipo_id != null && !tipos.some(t => Number(t.id) === mapped.evento_tipo_id)) {
          setTipos(prev => [...prev, { id: mapped.evento_tipo_id as number, nombre: d.tipo || `Tipo ${mapped.evento_tipo_id}` }]);
        }
        if (mapped.evento_tipo_id != null) {
          await fetchSubtipos(mapped.evento_tipo_id);
        }
        if (mapped.evento_causa_id != null && !causas.some(c => Number(c.id) === mapped.evento_causa_id)) {
          setCausas(prev => [...prev, { id: mapped.evento_causa_id as number, nombre: d.causa || `Causa ${mapped.evento_causa_id}` }]);
        }
      
        if (mapped.evento_origen_id != null && !origenes.some(o => Number(o.id) === mapped.evento_origen_id)) {
          setOrigenes(prev => [...prev, { id: mapped.evento_origen_id as number, nombre: d.origen || `Origen ${mapped.evento_origen_id}` }]);
        }
        if (mapped.parroquia_id != null && !parroquias.some(p => Number(p.id) === mapped.parroquia_id)) {
          setParroquias(prev => [...prev, { id: mapped.parroquia_id as number, nombre: d.parroquia || `Parroquia ${mapped.parroquia_id}` }]);
        }
        if (mapped.evento_atencion_estado_id != null && !atencionEstados.some(a => Number(a.id) === mapped.evento_atencion_estado_id)) {
          setAtencionEstados(prev => [...prev, { id: mapped.evento_atencion_estado_id as number, nombre: d.atencion_estado || `Estado atención ${mapped.evento_atencion_estado_id}` }]);
        }
        if (mapped.evento_subtipo_id != null && !subtipos.some(s => Number(s.id) === mapped.evento_subtipo_id)) {
          setSubtipos(prev => [...prev, { id: mapped.evento_subtipo_id as number, nombre: d.subtipo || d.evento_subtipo || `Subtipo ${mapped.evento_subtipo_id}` }]);
        }
      } catch {}
      return mapped;
    } catch {
      return row;
    }
  };

  const columns = [
    { field: 'id', header: 'ID', className: 'd-none d-xl-table-cell', headerClassName: 'd-none d-xl-table-cell' },
    { field: 'evento_fecha', header: 'Fecha' },
    { field: 'provincia', header: 'Provincia', className: 'd-none d-lg-table-cell', headerClassName: 'd-none d-lg-table-cell' },
    { field: 'canton', header: 'Cantón', className: 'd-none d-lg-table-cell', headerClassName: 'd-none d-lg-table-cell' },
    { field: 'parroquia', header: 'Parroquia', className: 'd-none d-xl-table-cell', headerClassName: 'd-none d-xl-table-cell' },
    { field: 'tipo', header: 'Tipo' },
    { field: 'subtipo', header: 'Subtipo' },
    { field: 'causa', header: 'Causa', className: 'd-none d-md-table-cell', headerClassName: 'd-none d-md-table-cell' },
    { field: 'origen', header: 'Origen', className: 'd-none d-lg-table-cell', headerClassName: 'd-none d-lg-table-cell' },
    { field: 'estado', header: 'Estado' },
    { field: 'sector', header: 'Sector' },
    { field: 'situacion', header: 'Situación' },
    { field: 'descripcion', header: 'Descripción', className: 'text-truncate' },
    { field: 'alto_impacto', header: 'Alto impacto', className: 'd-none d-xl-table-cell', headerClassName: 'd-none d-xl-table-cell' },
    { field: 'latitud', header: 'Latitud', className: 'd-none d-xl-table-cell', headerClassName: 'd-none d-xl-table-cell' },
    { field: 'longitud', header: 'Longitud', className: 'd-none d-xl-table-cell', headerClassName: 'd-none d-xl-table-cell' },
  ];

  const initialItem: Partial<EventoItem> = {
    id: undefined,
    descripcion: '',
    sector: '',
    situacion: '',
    emergencia_id: selectedEmergenciaId ?? undefined,
    provincia_id: datosLogin?.provincia_id ?? undefined,
    canton_id: datosLogin?.canton_id ?? undefined,
  };

  const renderForm = (item: Partial<EventoItem>, onChange: (e: any) => void) => (
    <div className="d-flex flex-column gap-3">
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label">Tipo</label>
          <Select
            className="w-100"
            value={typeof item.evento_tipo_id === 'number' ? Number(item.evento_tipo_id) : undefined}
            onChange={async (v) => { 
              await fetchSubtipos(Number(v));
              onChange({ target: { name: 'evento_tipo_id', value: v } });
              onChange({ target: { name: 'evento_subtipo_id', value: '' } });
            }}
            options={tipos.map(t => ({ value: Number(t.id), label: t.nombre }))}
            placeholder="Seleccione tipo"
          />
        </div>
          <div className="col-12 col-md-6">
          <label className="form-label">Subtipo</label>
          <Select
            className="w-100"
            value={typeof item.evento_subtipo_id === 'number' ? Number(item.evento_subtipo_id) : undefined}
            onChange={(v) => onChange({ target: { name: 'evento_subtipo_id', value: v } })}
            options={subtipos.map(s => ({ value: Number(s.id), label: s.nombre }))}
            placeholder={item.evento_tipo_id ? 'Seleccione subtipo' : 'Seleccione primero un tipo'}
            disabled={!item.evento_tipo_id}
          />
        </div>
        
        <div className="col-12 col-md-6">
          <label className="form-label">Causa</label>
          <Select
            className="w-100"
            value={item.evento_causa_id != null ? Number(item.evento_causa_id) : undefined}
            onChange={(v) => onChange({ target: { name: 'evento_causa_id', value: v } })}
            options={causas.map(c => ({ value: Number(c.id), label: c.nombre }))}
            placeholder="Seleccione causa"
          />
        </div>
       
        <div className="col-12 col-md-6">
          <label className="form-label">Estado de atención</label>
          <Select
            className="w-100"
            value={item.evento_atencion_estado_id != null ? Number(item.evento_atencion_estado_id) : undefined}
            onChange={(v) => onChange({ target: { name: 'evento_atencion_estado_id', value: v } })}
            options={atencionEstados.map(e => ({ value: Number(e.id), label: e.nombre }))}
            placeholder="Seleccione estado de atención"
          />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label">Origen</label>
          <Select
            className="w-100"
            value={item.evento_origen_id != null ? Number(item.evento_origen_id) : undefined}
            onChange={(v) => onChange({ target: { name: 'evento_origen_id', value: v } })}
            options={origenes.map(o => ({ value: Number(o.id), label: o.nombre }))}
            placeholder="Seleccione origen"
          />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label">Parroquia</label>
          <Select
            className="w-100"
            value={item.parroquia_id != null ? Number(item.parroquia_id) : undefined}
            onChange={(v) => onChange({ target: { name: 'parroquia_id', value: v } })}
            options={parroquias.map(p => ({ value: Number(p.id), label: p.nombre }))}
            placeholder="Seleccione parroquia"
          />
        </div>
       
        <div className="col-12 col-md-6">
          <label className="form-label">Latitud</label>
          <input
            type="number"
            step="any"
            name="latitud"
            className="form-control"
            value={item.latitud ?? ''}
            onChange={(e) => onChange({ target: { name: 'latitud', value: e.target.value === '' ? undefined : Number(e.target.value) } })}
          />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label">Longitud</label>
          <input
            type="number"
            step="any"
            name="longitud"
            className="form-control"
            value={item.longitud ?? ''}
            onChange={(e) => onChange({ target: { name: 'longitud', value: e.target.value === '' ? undefined : Number(e.target.value) } })}
          />
        </div>

         <div className="col-12 col-md-6">
          <label className="form-label">Fecha del evento</label>
          <input
            type="datetime-local"
            name="evento_fecha"
            className="form-control"
            value={item.evento_fecha ? String(item.evento_fecha).slice(0,16) : ''}
            onChange={onChange}
          />
        </div>     
         <div className="col-12 col-md-6 d-flex align-items-end">
          <div className="form-check">
            <Checkbox
              checked={!!item.alto_impacto}
              onChange={(e) => onChange({ target: { name: 'alto_impacto', value: e.target.checked } })}
            >
              Alto impacto
            </Checkbox>
          </div>
        </div>
       
      </div>
      <div>
        <label className="form-label">Sector</label>
        <input name="sector" className="form-control" value={item.sector || ''} onChange={onChange} />
      </div>
      <div>
        <label className="form-label">Situación</label>
        <input name="situacion" className="form-control" value={item.situacion || ''} onChange={onChange} />
      </div>
      <div>
        <label className="form-label">Descripción</label>
        <textarea name="descripcion" className="form-control" value={item.descripcion || ''} onChange={onChange} rows={4} />
      </div>
    </div>
  );

  const itemsWithKeys = useMemo(() => items.map((it, idx) => ({ ...it, key: String(it.id ?? `${idx}-${it.evento_fecha ?? ''}-${it.canton ?? ''}`) })), [items]);

  return (
    <Card title="Eventos" className="shadow-sm">
      <BaseCRUD<EventoItem>
        title="Evento"
        items={itemsWithKeys}
        columns={columns}
        renderForm={renderForm}
        onSave={handleSave}
        onDelete={handleDelete}
        initialItem={initialItem}
        resolveItemForEdit={resolveItemForEdit}
        emptyMessage={loading ? 'Cargando eventos...' : (selectedEmergenciaId ? 'No existen eventos.' : 'Seleccione una emergencia para ver eventos.')}
      />
    </Card>
  );
};

export default Eventos;
