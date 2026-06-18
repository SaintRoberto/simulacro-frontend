import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import { Dropdown } from 'primereact/dropdown';
import { BaseCRUD } from '../../components/crud/BaseCRUD';
import { useAuth } from '../../context/AuthContext';
import { Select, Checkbox, message } from 'antd';
import MapSelector from '../../components/map/MapSelector';

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

type GeoOption = {
  id: number;
  nombre: string;
};

const isValidCoordinate = (value: unknown, min: number, max: number): value is number => {
  if (value === null || value === undefined || value === '') return false;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= min && numeric <= max;
};

const hasText = (value: unknown) => String(value ?? '').trim().length > 0;

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
  const [provincias, setProvincias] = useState<GeoOption[]>([]);
  const [cantones, setCantones] = useState<GeoOption[]>([]);
  const [parroquias, setParroquias] = useState<GeoOption[]>([]);
  const [atencionEstados, setAtencionEstados] = useState<{ id: number; nombre: string }[]>([]);
  const loginProvinciaId = Number(datosLogin?.provincia_id ?? 0);
  const loginCantonId = Number(datosLogin?.canton_id ?? 0);
  const isUsuarioNacional = loginProvinciaId === 0 && loginCantonId === 0;

  const load = useCallback(async () => {
    if (!selectedEmergenciaId) {
      setItems([]);
      return;
    }
    try {
      setLoading(true);
      const url = `${apiBase}/eventos/emergencia/${selectedEmergenciaId}/provincia/${loginProvinciaId}/canton/${loginCantonId}`;
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
        provincia_id: it.provincia_id != null ? Number(it.provincia_id) : loginProvinciaId,
        canton_id: it.canton_id != null ? Number(it.canton_id) : loginCantonId,
        // synthetic key support via id if present
      }});
      setItems(mapped);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase, authFetch, selectedEmergenciaId, loginProvinciaId, loginCantonId]);

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

  const loadCantones = useCallback(async (provinciaId?: number) => {
    if (!provinciaId || !selectedEmergenciaId) {
      setCantones([]);
      return [];
    }
    try {
      const res = await authFetch(`${apiBase}/provincia/${provinciaId}/cantones/emergencia/${selectedEmergenciaId}`);
      const data = res.ok ? await res.json() : [];
      const nextCantones = Array.isArray(data) ? data : [];
      setCantones(nextCantones);
      return nextCantones;
    } catch {
      setCantones([]);
      return [];
    }
  }, [apiBase, authFetch, selectedEmergenciaId]);

  const loadParroquias = useCallback(async (cantonId?: number) => {
    if (!cantonId || !selectedEmergenciaId) {
      setParroquias([]);
      return [];
    }
    try {
      const res = await authFetch(`${apiBase}/canton/${cantonId}/parroquias/emergencia/${selectedEmergenciaId}`);
      const data = res.ok ? await res.json() : [];
      const nextParroquias = Array.isArray(data) ? data : [];
      setParroquias(nextParroquias);
      return nextParroquias;
    } catch {
      setParroquias([]);
      return [];
    }
  }, [apiBase, authFetch, selectedEmergenciaId]);

  useEffect(() => {
    if (!isUsuarioNacional || !selectedEmergenciaId) {
      setProvincias([]);
      return;
    }
    const run = async () => {
      try {
        const res = await authFetch(`${apiBase}/provincias/emergencia/${selectedEmergenciaId}`);
        const data = res.ok ? await res.json() : [];
        setProvincias(Array.isArray(data) ? data : []);
      } catch {
        setProvincias([]);
      }
    };
    run();
  }, [apiBase, authFetch, isUsuarioNacional, selectedEmergenciaId]);

  useEffect(() => {
    if (isUsuarioNacional) {
      setCantones([]);
      setParroquias([]);
      return;
    }
    loadParroquias(loginCantonId);
  }, [isUsuarioNacional, loadParroquias, loginCantonId]);

  const fetchSubtipos = useCallback(async (tipoId?: number) => {
    try {
      if (!tipoId) { setSubtipos([]); return; }
      const res = await authFetch(`${apiBase}/evento_subtipos/tipo/${tipoId}`);
      setSubtipos(res.ok ? await res.json() : []);
    } catch { setSubtipos([]); }
  }, [apiBase, authFetch]);

  const handleSave = async (item: Partial<EventoItem>): Promise<boolean | void> => {
    const provinciaId = Number(item.provincia_id ?? datosLogin?.provincia_id ?? 0);
    const cantonId = Number(item.canton_id ?? datosLogin?.canton_id ?? 0);
    const parroquiaId = Number(item.parroquia_id ?? 0);
    const tipoId = Number(item.evento_tipo_id ?? 0);
    const subtipoId = Number(item.evento_subtipo_id ?? 0);
    const causaId = Number(item.evento_causa_id ?? 0);
    const atencionEstadoId = Number(item.evento_atencion_estado_id ?? 0);
    const origenId = Number(item.evento_origen_id ?? 0);

    if (!selectedEmergenciaId && !item.emergencia_id) {
      message.warning('Debe seleccionar una emergencia.');
      return false;
    }
    if (tipoId <= 0) {
      message.warning('El tipo es obligatorio.');
      return false;
    }
    if (subtipoId <= 0) {
      message.warning('El subtipo es obligatorio.');
      return false;
    }
    if (causaId <= 0) {
      message.warning('La causa es obligatoria.');
      return false;
    }
    if (atencionEstadoId <= 0) {
      message.warning('El estado de atencion es obligatorio.');
      return false;
    }
    if (provinciaId <= 0) {
      message.warning('La provincia es obligatoria.');
      return false;
    }
    if (cantonId <= 0) {
      message.warning('El canton es obligatorio.');
      return false;
    }
    if (origenId <= 0) {
      message.warning('El origen es obligatorio.');
      return false;
    }
    if (parroquiaId <= 0) {
      message.warning('La parroquia afectada es obligatoria.');
      return false;
    }
    if (!isValidCoordinate(item.latitud, -90, 90)) {
      message.warning('Debe ingresar una latitud valida.');
      return false;
    }
    if (!isValidCoordinate(item.longitud, -180, 180)) {
      message.warning('Debe ingresar una longitud valida.');
      return false;
    }
    if (!item.evento_fecha) {
      message.warning('La fecha del evento es obligatoria.');
      return false;
    }
    if (!hasText(item.sector)) {
      message.warning('El sector es obligatorio.');
      return false;
    }
    if (!hasText(item.situacion)) {
      message.warning('La situacion es obligatoria.');
      return false;
    }

    try {
      const isEdit = !!item.id && item.id > 0;
      const url = isEdit ? `${apiBase}/eventos/${item.id}` : `${apiBase}/eventos`;
      const payloadRaw: Record<string, any> = {
        activo: true,
        alto_impacto: item.alto_impacto ?? false,
        canton_id: cantonId,
        creador: loginResponse?.usuario ?? '',
        descripcion: item.descripcion ?? '',
        emergencia_id: item.emergencia_id ?? selectedEmergenciaId,
        evento_causa_id: causaId,
        evento_atencion_estado_id: atencionEstadoId,
        evento_fecha: item.evento_fecha,
        evento_origen_id: origenId,
        evento_tipo_id: tipoId,
        evento_subtipo_id: subtipoId,
        latitud: Number(item.latitud),
        longitud: Number(item.longitud),
        modificador: isEdit ? (loginResponse?.usuario ?? '') : undefined,
        parroquia_id: parroquiaId,
        provincia_id: provinciaId,
        sector: String(item.sector ?? '').trim(),
        situacion: String(item.situacion ?? '').trim()
      };
      const payload = Object.fromEntries(Object.entries(payloadRaw).filter(([, v]) => v !== undefined));
      const res = await authFetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        message.error('No se pudo guardar el evento.');
        return false;
      }
      await load();
      return true;
    } catch {
      message.error('No se pudo guardar el evento.');
      return false;
    }
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
        if (needsParroquias) {
          const cantonId = Number(row.canton_id ?? loginCantonId);
          if (isUsuarioNacional) {
            await loadCantones(Number(row.provincia_id ?? 0));
          }
          await loadParroquias(cantonId);
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
      if (isUsuarioNacional) {
        await loadCantones(mapped.provincia_id);
        await loadParroquias(mapped.canton_id);
      }
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
    { field: 'situacion', header: 'Situación', className: 'w-25' , headerClassName: 'w-25' },
    { field: 'descripcion', header: 'Descripción', className: 'w-30', headerClassName: 'w-30'},
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
    provincia_id: loginProvinciaId || undefined,
    canton_id: loginCantonId || undefined,
  };

  const renderForm = (item: Partial<EventoItem>, onChange: (e: any) => void) => (
    <div className="d-flex flex-column gap-3">
      {/* Primera fila: Tipo y Subtipo */}
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label">Tipo *</label>
          <Dropdown
            value={typeof item.evento_tipo_id === 'number' ? Number(item.evento_tipo_id) : null}
            options={tipos.map(t => ({ value: Number(t.id), label: t.nombre }))}
            onChange={async (e) => {
              const value = e.value;
              await fetchSubtipos(Number(value));
              onChange({ target: { name: 'evento_tipo_id', value: value } });
              onChange({ target: { name: 'evento_subtipo_id', value: undefined } });
            }}
            placeholder="Seleccione tipo"
            filter
            className="w-full"
            style={{ height: "50%" }}
            showClear
          />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label">Subtipo *</label>
          <Select
            className="w-100"
            value={typeof item.evento_subtipo_id === 'number' ? Number(item.evento_subtipo_id) : undefined}
            onChange={(v) => onChange({ target: { name: 'evento_subtipo_id', value: v } })}
            options={subtipos.map(s => ({ value: Number(s.id), label: s.nombre }))}
            placeholder={item.evento_tipo_id ? 'Seleccione subtipo' : 'Seleccione primero un tipo'}
            disabled={!item.evento_tipo_id}
          />
        </div>
      </div>

      {/* Segunda fila: Causa y Estado de atención */}
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label">Causa *</label>
          <Dropdown
            value={item.evento_causa_id != null ? Number(item.evento_causa_id) : null}
            options={causas.map(c => ({ value: Number(c.id), label: c.nombre }))}
            onChange={(e) => onChange({ target: { name: 'evento_causa_id', value: e.value } })}
            placeholder="Seleccione causa"
            filter
            className="w-full"
            style={{ height: "50%" }}
            showClear
          />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label">Estado de atención *</label>
          <Select
            className="w-100"
            value={item.evento_atencion_estado_id != null ? Number(item.evento_atencion_estado_id) : undefined}
            onChange={(v) => onChange({ target: { name: 'evento_atencion_estado_id', value: v } })}
            options={atencionEstados.map(e => ({ value: Number(e.id), label: e.nombre }))}
            placeholder="Seleccione estado de atención"
          />
        </div>
      </div>

      {isUsuarioNacional && (
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label">Provincia *</label>
            <Select
              className="w-100"
              value={item.provincia_id ? Number(item.provincia_id) : undefined}
              onChange={async (value) => {
                onChange({ target: { name: 'provincia_id', value } });
                onChange({ target: { name: 'canton_id', value: undefined } });
                onChange({ target: { name: 'parroquia_id', value: undefined } });
                setParroquias([]);
                await loadCantones(value);
              }}
              options={provincias.map((provincia) => ({
                value: Number(provincia.id),
                label: provincia.nombre,
              }))}
              placeholder="Seleccione provincia"
              showSearch
              optionFilterProp="label"
              allowClear
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Cantón *</label>
            <Select
              className="w-100"
              value={item.canton_id ? Number(item.canton_id) : undefined}
              onChange={async (value) => {
                onChange({ target: { name: 'canton_id', value } });
                onChange({ target: { name: 'parroquia_id', value: undefined } });
                await loadParroquias(value);
              }}
              options={cantones.map((canton) => ({
                value: Number(canton.id),
                label: canton.nombre,
              }))}
              placeholder={item.provincia_id ? 'Seleccione cantón' : 'Seleccione primero una provincia'}
              disabled={!item.provincia_id}
              showSearch
              optionFilterProp="label"
              allowClear
            />
          </div>
        </div>
      )}

      {/* Tercera fila: Origen y Parroquia */}
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label">Origen *</label>
          <Select
            className="w-100"
            value={item.evento_origen_id != null ? Number(item.evento_origen_id) : undefined}
            onChange={(v) => onChange({ target: { name: 'evento_origen_id', value: v } })}
            options={origenes.map(o => ({ value: Number(o.id), label: o.nombre }))}
            placeholder="Seleccione origen"
          />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label">Parroquia Afectada *</label>
          <Select
            className="w-100"
            value={item.parroquia_id != null ? Number(item.parroquia_id) : undefined}
            onChange={(v) => onChange({ target: { name: 'parroquia_id', value: v } })}
            options={parroquias.map(p => ({ value: Number(p.id), label: p.nombre }))}
            placeholder={isUsuarioNacional && !item.canton_id ? 'Seleccione primero un cantón' : 'Seleccione parroquia'}
            disabled={isUsuarioNacional && !item.canton_id}
            showSearch
            optionFilterProp="label"
            allowClear
          />
        </div>
      </div>

      {/* Ubicación - Mapa y coordenadas */}
      <div>
        <label className="form-label">Ubicación en el mapa</label>
        <MapSelector
          latitud={item.latitud}
          longitud={item.longitud}
          initializeWithDefault={!item.id}
          onLocationChange={(lat, lng) => {
            onChange({ target: { name: 'latitud', value: lat } });
            onChange({ target: { name: 'longitud', value: lng } });
          }}
          height="250px"
          placeholder="Buscar dirección, calle, ciudad..."
        />
      </div>

      {/* Coordenadas */}
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label">Latitud *</label>
          <input
            type="number"
            step="any"
            name="latitud"
            className="form-control"
            value={item.latitud ?? ''}
            onChange={(e) => onChange({ target: { name: 'latitud', value: e.target.value === '' ? undefined : Number(e.target.value) } })}
            placeholder="Se actualizará automáticamente al seleccionar en el mapa"
          />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label">Longitud *</label>
          <input
            type="number"
            step="any"
            name="longitud"
            className="form-control"
            value={item.longitud ?? ''}
            onChange={(e) => onChange({ target: { name: 'longitud', value: e.target.value === '' ? undefined : Number(e.target.value) } })}
            placeholder="Se actualizará automáticamente al seleccionar en el mapa"
          />
        </div>
      </div>

      {/* Información adicional */}
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label">Fecha del evento *</label>
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

      {/* Campos de texto */}
      <div>
        <label className="form-label">Sector *</label>
        <input name="sector" className="form-control" value={item.sector || ''} onChange={onChange} />
      </div>
      <div>
        <label className="form-label">Situación *</label>
        <input name="situacion" className="form-control" value={item.situacion || ''} onChange={onChange} />
      </div>
      <div>
        <label className="form-label">Descripción</label>
        <textarea name="descripcion" className="form-control" value={item.descripcion || ''} onChange={onChange} rows={3} />
      </div>
    </div>
  );

  const itemsWithKeys = useMemo(() => items.map((it, idx) => ({ ...it, key: String(it.id ?? `${idx}-${it.evento_fecha ?? ''}-${it.canton ?? ''}`) })), [items]);

  return (
    <Card title="Eventos adversos" className="shadow-sm">
      <BaseCRUD<EventoItem>
        title=""
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
