import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { BaseCRUD } from '../../components/crud/BaseCRUD';
import { useAuth } from '../../context/AuthContext';

interface AlojamientosActivadosRow {
  alojamiento_estado: string;
  alojamiento_nombre: string;
  alojamiento_tipo: string;
  capacidad_familias: number;
  capacidad_personas: number;
  familias_ingresaron: number;
  familias_salieron: number;
  fecha_activacion: string;
  id: number;
  parroquia_nombre: string;
  personas_ingresaron: number;
  personas_salieron: number;
}

interface AlojamientoEstado {
  activo: boolean;
  creacion: string;
  creador: string;
  descripcion: string;
  id: number;
  modificacion: string;
  modificador: string;
  nombre: string;
}

interface AlojamientoItem {
  activo: boolean;
  canton_id: number;
  capacidad_familias: number;
  capacidad_personas: number;
  codigo: string;
  direccion: string;
  estado_id: number;
  fecha_inspeccion: string;
  id: number;
  latitud: number;
  longitud: number;
  nombre: string;
  parroquia_id: number;
  provincia_id: number;
  responsable_nombre: string;
  responsable_telefono: string;
  sector: string;
  situacion_id: number;
  tipo_id: number;
}

interface ActivarAlojamientoForm {
  id?: number;
  alojamiento_id: number | null;
  estado_id: number | null;
  fecha_activacion: Date | null;
  fecha_cierre: Date | null;
  familias_ingresaron: number | null;
  familias_salieron: number | null;
  personas_ingresaron: number | null;
  personas_salieron: number | null;
  responsable_nombre: string;
  responsable_telefono: string;
}

export const AlojamientosActivados: React.FC = () => {
  const { authFetch, datosLogin, loginResponse, selectedEmergenciaId } = useAuth();
  const [rows, setRows] = useState<AlojamientosActivadosRow[]>([]);
  const [estados, setEstados] = useState<AlojamientoEstado[]>([]);
  const [alojamientos, setAlojamientos] = useState<AlojamientoItem[]>([]);

  const usuarioId = useMemo(() => {
    return datosLogin?.usuario_id ?? Number(localStorage.getItem('userId') || 'NaN');
  }, [datosLogin]);

  const creador = useMemo(() => {
    return datosLogin?.usuario_descripcion || loginResponse?.usuario || '';
  }, [datosLogin, loginResponse]);

  const apiBase = process.env.REACT_APP_API_URL || '/api';

  const loadEstados = useCallback(async () => {
    try {
      const res = await authFetch(`${apiBase}/alojamiento_estados`, { headers: { accept: 'application/json' } });
      if (!res.ok) return;
      const data = (await res.json()) as AlojamientoEstado[];
      setEstados(data || []);
    } catch { }
  }, [apiBase, authFetch]);

  const loadAlojamientos = useCallback(async () => {
    const provinciaId = datosLogin?.provincia_id;
    const cantonId = datosLogin?.canton_id || 0;
    
    try {
      const url = `${apiBase}/alojamientos/provincia/${provinciaId}/canton/${cantonId}`;
      const res = await authFetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) {
        setAlojamientos([]);
        return;
      }
      const data = (await res.json()) as AlojamientoItem[];
      setAlojamientos(Array.isArray(data) ? data : []);
    } catch {
      setAlojamientos([]);
    }
  }, [apiBase, authFetch, datosLogin?.provincia_id, datosLogin?.canton_id]);

  const loadGrid = useCallback(async () => {
    if (!selectedEmergenciaId || !usuarioId || isNaN(Number(usuarioId))) return;
    try {
      const url = `${apiBase}/alojamientos_activados/emergencia/${selectedEmergenciaId}/usuario/${usuarioId}`;
      const res = await authFetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) {
        setRows([]);
        return;
      }
      const data = (await res.json()) as AlojamientosActivadosRow[];
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    }
  }, [apiBase, authFetch, selectedEmergenciaId, usuarioId]);

  useEffect(() => {
    loadEstados();
  }, [loadEstados]);

  useEffect(() => {
    loadGrid();
  }, [loadGrid]);

  useEffect(() => {
    loadAlojamientos();
  }, [loadAlojamientos]);

  const handleSave = async (form: Partial<ActivarAlojamientoForm>) => {
    if (!selectedEmergenciaId) return;
    const isEdit = !!form.id;
    const common = {
      activo: true,
      alojamiento_id: Number(form.alojamiento_id) || 0,
      emergencia_id: Number(selectedEmergenciaId),
      estado_id: Number(form.estado_id) || 0,
      familias_ingresaron: Number(form.familias_ingresaron) || 0,
      familias_salieron: Number(form.familias_salieron) || 0,
      fecha_activacion: form.fecha_activacion ? new Date(form.fecha_activacion).toISOString() : new Date().toISOString(),
      fecha_cierre: form.fecha_cierre ? new Date(form.fecha_cierre).toISOString() : '',
      personas_ingresaron: Number(form.personas_ingresaron) || 0,
      personas_salieron: Number(form.personas_salieron) || 0,
      responsable_nombre: form.responsable_nombre || '',
      responsable_telefono: form.responsable_telefono || ''
    };
    try {
      if (isEdit) {
        const putBody = { ...common, modificador: creador } as any;
        const res = await authFetch(`${apiBase}/alojamientos_activados/${form.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(putBody),
        });
        if (res.ok) await loadGrid();
      } else {
        const postBody = { ...common, creador: creador } as any;
        const res = await authFetch(`${apiBase}/alojamientos_activados`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postBody),
        });
        if (res.ok) await loadGrid();
      }
    } catch { }
  };

  const handleDelete = async (_row: AlojamientosActivadosRow) => {
    try {
      const res = await authFetch(`${apiBase}/alojamientos_activados/${_row.id}`, {
        method: 'DELETE',
        headers: { accept: 'application/json' },
      });
      if (res.ok) {
        await loadGrid();
      }
    } catch {}
  };

  const onDropdownChange = (onChange: (e: any) => void, field: keyof ActivarAlojamientoForm) => (e: { value: any }) => {
    onChange({ target: { name: field, value: e.value } });
  };

  const onDateChange = (onChange: (e: any) => void, field: keyof ActivarAlojamientoForm) => (value: any) => {
    if (!value) return;
    onChange({ target: { name: field, value } });
  };

  const renderForm = (item: Partial<ActivarAlojamientoForm>, onChange: (e: any) => void) => {
    return (
      <div className="grid p-fluid">
        <div className="field col-12 md:col-6">
          <label htmlFor="alojamiento_id">Alojamiento</label>
          <Dropdown
            id="alojamiento_id"
            name="alojamiento_id"
            value={item.alojamiento_id as number | null}
            options={alojamientos.map(a => ({ label: a.nombre, value: a.id }))}
            onChange={onDropdownChange(onChange, 'alojamiento_id')}
            placeholder="Seleccione alojamiento"
            className="w-full"
            filter
          />
        </div>

        <div className="field col-12 md:col-6">
          <label htmlFor="estado_id">Estado</label>
          <Dropdown id="estado_id" name="estado_id" value={item.estado_id as number | null} options={estados.map(e => ({ label: e.nombre, value: e.id }))} onChange={onDropdownChange(onChange, 'estado_id')} placeholder="Seleccione estado" className="w-full" />
        </div>

        <div className="field col-12 md:col-6">
          <label htmlFor="fecha_activacion">Fecha activación</label>
          <Calendar id="fecha_activacion" value={item.fecha_activacion || new Date()} onChange={(e) => onDateChange(onChange, 'fecha_activacion')(e.value)} showTime showSeconds dateFormat="dd/mm/yy" className="w-full" />
        </div>

        <div className="field col-12 md:col-6">
          <label htmlFor="fecha_cierre">Fecha cierre</label>
          <Calendar id="fecha_cierre" value={item.fecha_cierre || null} onChange={(e) => onDateChange(onChange, 'fecha_cierre')(e.value)} showTime showSeconds dateFormat="dd/mm/yy" className="w-full" />
        </div>
        <div className='row'>
          <div className="field col-6 md:col-6">
            <label htmlFor="familias_ingresaron">Familias ingresaron</label>
            <InputNumber id="familias_ingresaron" value={item.familias_ingresaron as number | null} onValueChange={(e) => onChange({ target: { name: 'familias_ingresaron', value: e.value } })} mode="decimal" min={0} useGrouping={false} className="w-full" />
          </div>

          <div className="field col-6 md:col-6">
            <label htmlFor="familias_salieron">Familias salieron</label>
            <InputNumber id="familias_salieron" value={item.familias_salieron as number | null} onValueChange={(e) => onChange({ target: { name: 'familias_salieron', value: e.value } })} mode="decimal" min={0} useGrouping={false} className="w-full" />
          </div>
        </div>

        <div className='row'>
          <div className="field col-6 md:col-6">
            <label htmlFor="personas_ingresaron">Personas ingresaron</label>
            <InputNumber id="personas_ingresaron" value={item.personas_ingresaron as number | null} onValueChange={(e) => onChange({ target: { name: 'personas_ingresaron', value: e.value } })} mode="decimal" min={0} useGrouping={false} className="w-full" />
          </div>

          <div className="field col-6 md:col-6">
            <label htmlFor="personas_salieron">Personas salieron</label>
            <InputNumber id="personas_salieron" value={item.personas_salieron as number | null} onValueChange={(e) => onChange({ target: { name: 'personas_salieron', value: e.value } })} mode="decimal" min={0} useGrouping={false} className="w-full" />
          </div>
        </div>

        <div className="field col-12 md:col-6">
          <label htmlFor="responsable_nombre">Responsable</label>
          <InputText id="responsable_nombre" name="responsable_nombre" value={item.responsable_nombre || ''} onChange={onChange} />
        </div>

        <div className="field col-12 md:col-6">
          <label htmlFor="responsable_telefono">Teléfono</label>
          <InputText id="responsable_telefono" name="responsable_telefono" value={item.responsable_telefono || ''} onChange={onChange} />
        </div>
      </div>
    );
  };

  const columns = [
    { field: 'id', header: 'ID', sortable: true },
    { field: 'alojamiento_nombre', header: 'Alojamiento', sortable: true },
    { field: 'alojamiento_tipo', header: 'Tipo', sortable: true },
    { field: 'parroquia_nombre', header: 'Parroquia', sortable: true },
    { field: 'capacidad_familias', header: 'Cap. familias', sortable: true },
    { field: 'capacidad_personas', header: 'Cap. personas', sortable: true },
    { field: 'familias_ingresaron', header: 'Familias ingresaron', sortable: true },
    { field: 'familias_salieron', header: 'Familias salieron', sortable: true },
    { field: 'personas_ingresaron', header: 'Personas ingresaron', sortable: true },
    { field: 'personas_salieron', header: 'Personas salieron', sortable: true },
    { field: 'alojamiento_estado', header: 'Estado', sortable: true },
    { field: 'fecha_activacion', header: 'Activación', sortable: true },
  ];

  return (
    <Card title="Alojamientos activados">
      <BaseCRUD<ActivarAlojamientoForm>
        title="Alojamiento activado"
        items={rows as any}
        columns={columns as any}
        renderForm={renderForm}
        onSave={handleSave}
        onDelete={handleDelete as any}
        resolveItemForEdit={async (row) => {
          try {
            const res = await authFetch(`${apiBase}/alojamientos_activados/${(row as any).id}`, { headers: { accept: 'application/json' } });
            if (!res.ok) return {} as Partial<ActivarAlojamientoForm>;
            const data = await res.json();
            const form: Partial<ActivarAlojamientoForm> = {
              id: data.id,
              alojamiento_id: data.alojamiento_id ?? null,
              estado_id: data.estado_id ?? null,
              fecha_activacion: data.fecha_activacion ? new Date(data.fecha_activacion) : null,
              fecha_cierre: data.fecha_cierre ? new Date(data.fecha_cierre) : null,
              familias_ingresaron: data.familias_ingresaron ?? 0,
              familias_salieron: data.familias_salieron ?? 0,
              personas_ingresaron: data.personas_ingresaron ?? 0,
              personas_salieron: data.personas_salieron ?? 0,
              responsable_nombre: data.responsable_nombre ?? '',
              responsable_telefono: data.responsable_telefono ?? ''
            };
            return form;
          } catch {
            return {} as Partial<ActivarAlojamientoForm>;
          }
        }}
        initialItem={{
          id: null,
          alojamiento_id: null,
          estado_id: null,
          fecha_activacion: new Date(),
          fecha_cierre: null,
          familias_ingresaron: 0,
          familias_salieron: 0,
          personas_ingresaron: 0,
          personas_salieron: 0,
          responsable_nombre: '',
          responsable_telefono: ''
        }}
        showDeleteButton={false}
      />
    </Card>
  );
};
