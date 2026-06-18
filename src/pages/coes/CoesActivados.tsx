import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { BaseCRUD } from '../../components/crud/BaseCRUD';
import { useAuth } from '../../context/AuthContext';
import { message } from 'antd';


interface CoeActivadoRow {
  activo: boolean;
  canton_id: number;
  canton_nombre: string;
  coe_id: number;
  coe_nombre: string;
  coe_siglas: string;
  creacion: string;
  creador: string;
  emergencia_id: number;
  estado_activacion: number;
  estado_activacion_nombre: string;
  fecha_activacion: string;
  id: number;
  modificacion: string;
  modificador: string;
  parroquia_id: number;
  parroquia_nombre: string;
  provincia_id: number;
  provincia_nombre: string;
}

interface CoeActivadoForm {
  id?: number | null;
  activo: boolean;
  canton_id: number;
  coe_id: number | null;
  creador?: string;
  emergencia_id: number;
  estado_activacion: number | null;
  fecha_activacion: Date | string | null;
  modificador?: string;
  provincia_id: number;
}

interface CatalogOption {
  id: number;
  nombre: string;
  siglas?: string;
}

interface ProvinciaOption {
  id: number;
  nombre: string;
}

interface CantonOption {
  id: number;
  nombre: string;
  provincia_id: number;
}

export const CoesActivados: React.FC = () => {
  const { authFetch, datosLogin, selectedEmergenciaId } = useAuth();
  const [rows, setRows] = useState<CoeActivadoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [coes, setCoes] = useState<CatalogOption[]>([]);
  const [estados, setEstados] = useState<CatalogOption[]>([]);
  const [provincias, setProvincias] = useState<ProvinciaOption[]>([]);
  const [cantones, setCantones] = useState<CantonOption[]>([]);

  const apiBase = process.env.REACT_APP_API_URL || '/api';
  const emergenciaId = Number(selectedEmergenciaId ?? 0);
  const usuarioId = useMemo(() => {
    const effective = datosLogin?.usuario_id ?? Number(localStorage.getItem('userId') || 'NaN');
    return Number(effective) || 0;
  }, [datosLogin]);
  const actor = useMemo(() => {
    return datosLogin?.usuario_login || datosLogin?.usuario_descripcion || 'usuario';
  }, [datosLogin]);
  const loginProvinciaId = Number(datosLogin?.provincia_id ?? 0);
  const loginCantonId = Number(datosLogin?.canton_id ?? 0);

  const fetchFirstArray = useCallback(async (urls: string[]) => {
    for (const url of urls) {
      try {
        const res = await authFetch(url, { headers: { accept: 'application/json' } });
        if (!res.ok) continue;
        const data = await res.json();
        if (Array.isArray(data)) return data;
      } catch {
        // probar siguiente endpoint
      }
    }
    return [];
  }, [authFetch]);

  const loadCantones = useCallback(async (provinciaId: number) => {
    if (!provinciaId) {
      setCantones([]);
      return [];
    }
    const data = await fetchFirstArray([
      `${apiBase}/provincia/${provinciaId}/cantones/emergencia/${emergenciaId}`,
      `${apiBase}/provincia/${provinciaId}/cantones/`,
    ]);
    const mapped = data
      .map((item: any) => ({
        id: Number(item.id),
        nombre: String(item.nombre ?? item.canton_nombre ?? `Cantón ${item.id}`),
        provincia_id: Number(item.provincia_id ?? provinciaId),
      }))
      .filter((item: CantonOption) => Number.isFinite(item.id) && item.id > 0);
    setCantones(mapped);
    return mapped;
  }, [apiBase, emergenciaId, fetchFirstArray]);

  const fetchRows = useCallback(async () => {
    if (!emergenciaId || !usuarioId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch(`${apiBase}/coes_activados/emergencia/${emergenciaId}`, {
        headers: { accept: 'application/json' },
      });
      if (!res.ok) {
        setRows([]);
        return;
      }
      const data = await res.json();
      setRows(Array.isArray(data) ? data as CoeActivadoRow[] : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase, authFetch, emergenciaId, usuarioId]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    const loadCatalogs = async () => {
      const [coesData, estadosData] = await Promise.all([
        fetchFirstArray([
          `${apiBase}/coes`,
          `${apiBase}/coe`,
        ]),
        fetchFirstArray([
          `${apiBase}/coes_activados_estados`,
        ]),
      ]);

      setCoes(
        coesData
          .map((item: any) => ({
            id: Number(item.id),
            nombre: String(item.nombre ?? item.coe_nombre ?? `COE ${item.id}`),
            siglas: String(item.siglas ?? item.coe_siglas ?? ''),
          }))
          .filter((item: CatalogOption) => Number.isFinite(item.id) && item.id > 0)
      );

      setEstados(
        estadosData
          .map((item: any) => ({
            id: Number(item.id),
            nombre: String(item.nombre ?? item.descripcion ?? item.estado_activacion_nombre ?? `Estado ${item.id}`),
          }))
          .filter((item: CatalogOption) => Number.isFinite(item.id) && item.id >= 0)
      );
    };

    loadCatalogs();
  }, [apiBase, fetchFirstArray]);

  useEffect(() => {
    const loadGeo = async () => {
      if (!emergenciaId) {
        setProvincias([]);
        setCantones([]);
        return;
      }

      const data = await fetchFirstArray([
        `${apiBase}/provincias/emergencia/${emergenciaId}`,
        `${apiBase}/provincias`,
      ]);
      const mapped = data
        .map((item: any) => ({
          id: Number(item.id),
          nombre: String(item.nombre ?? item.provincia_nombre ?? `Provincia ${item.id}`),
        }))
        .filter((item: ProvinciaOption) => Number.isFinite(item.id) && item.id > 0);
      setProvincias(mapped);

      if (loginProvinciaId > 0) {
        await loadCantones(loginProvinciaId);
      } else {
        setCantones([]);
      }
    };

    loadGeo();
  }, [apiBase, emergenciaId, fetchFirstArray, loadCantones, loginProvinciaId]);

  const coeOptions = useMemo(() => {
    const fromRows = rows.map((row) => ({
      id: Number(row.coe_id),
      nombre: String(row.coe_nombre ?? `COE ${row.coe_id}`),
      siglas: String(row.coe_siglas ?? ''),
    }));
    const merged = new Map<number, CatalogOption>();
    [...coes, ...fromRows].forEach((item) => {
      if (item.id > 0 && !merged.has(item.id)) merged.set(item.id, item);
    });
    return Array.from(merged.values());
  }, [coes, rows]);

  const estadoOptions = useMemo(() => {
    const fromRows = rows.map((row) => ({
      id: Number(row.estado_activacion),
      nombre: String(row.estado_activacion_nombre ?? `Estado ${row.estado_activacion}`),
    }));
    const merged = new Map<number, CatalogOption>();
    [...estados, ...fromRows].forEach((item) => {
      if (item.id >= 0 && !merged.has(item.id)) merged.set(item.id, item);
    });
    return Array.from(merged.values());
  }, [estados, rows]);

  const handleSave = async (item: Partial<CoeActivadoForm>): Promise<boolean | void> => {
    if (!emergenciaId) {
      message.warning('Debe seleccionar una emergencia.');
      return false;
    }
    if (!item.coe_id || item.coe_id <= 0) {
      message.warning('El COE es obligatorio.');
      return false;
    }
    if (item.estado_activacion === null || item.estado_activacion === undefined || item.estado_activacion < 0) {
      message.warning('El estado de activación es obligatorio.');
      return false;
    }
    if (!item.fecha_activacion) {
      message.warning('La fecha de activación es obligatoria.');
      return false;
    }
    if(!item.provincia_id && !loginProvinciaId) {
      message.warning('La provincia es obligatoria.');
      return false;
    }
    if(!item.canton_id && !loginCantonId) {
      message.warning('El cantón es obligatorio.');
      return false;
    }
    const resolvedProvinciaId = Number(item.provincia_id ?? loginProvinciaId ?? 0);
    const resolvedCantonId = Number(item.canton_id ?? loginCantonId ?? 0);
    const isEdit = Number(item.id ?? 0) > 0;

    const payload = {
      activo: isEdit ? (item.activo ?? true) : true,
      canton_id: resolvedCantonId,
      coe_id: Number(item.coe_id ?? 0),
      emergencia_id: emergenciaId,
      estado_activacion: Number(item.estado_activacion ?? 0),
      fecha_activacion: item.fecha_activacion
        ? new Date(item.fecha_activacion).toISOString()
        : new Date().toISOString(),
      modificador: actor,
      parroquia_id: 0,
      provincia_id: resolvedProvinciaId,
    };

    const url = isEdit
      ? `${apiBase}/coes_activados/${item.id}`
      : `${apiBase}/coes_activados`;

    const body = isEdit
      ? payload
      : { ...payload, creador: actor };

    const res = await authFetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      await fetchRows();
      return true;
    }
    message.error('No se pudo guardar el COE activado.');
    return false;
  };

  const handleDelete = async (row: CoeActivadoRow) => {
    if (!row.id) return;
    try {
      const putBody = {
        activo: false,
        canton_id: Number(row.canton_id ?? 0),
        coe_id: Number(row.coe_id ?? 0),
        emergencia_id: Number(row.emergencia_id ?? emergenciaId),
        estado_activacion: Number(row.estado_activacion ?? 0),
        fecha_activacion: row.fecha_activacion
          ? new Date(row.fecha_activacion).toISOString()
          : new Date().toISOString(),
        modificador: actor,
        parroquia_id: 0,
        provincia_id: Number(row.provincia_id ?? 0),
      };

      let res = await authFetch(`${apiBase}/coes_activados/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(putBody),
      });

      if (!res.ok) {
        res = await authFetch(`${apiBase}/coes_activados/${row.id}`, {
          method: 'DELETE',
          headers: { accept: 'application/json' },
        });
      }

      if (res.ok) {
        await fetchRows();
      }
    } catch {
      // sin acción
    }
  };

  const resolveItemForEdit = async (row: CoeActivadoRow): Promise<Partial<CoeActivadoForm>> => {
    const provinciaId = Number(row.provincia_id ?? loginProvinciaId ?? 0);
    const cantonId = Number(row.canton_id ?? loginCantonId ?? 0);

    if (provinciaId > 0) {
      await loadCantones(provinciaId);
    }

    return {
      id: row.id,
      activo: row.activo ?? true,
      canton_id: cantonId,
      coe_id: Number(row.coe_id ?? 0),
      emergencia_id: Number(row.emergencia_id ?? emergenciaId),
      estado_activacion: Number(row.estado_activacion ?? 0),
      fecha_activacion: row.fecha_activacion ? new Date(row.fecha_activacion) : new Date(),
      provincia_id: provinciaId,
    };
  };

  const renderForm = (item: Partial<CoeActivadoForm>, onChange: (e: any) => void, readOnly?: boolean) => {
    const isEdit = Number(item.id ?? 0) > 0;
    const effectiveProvinciaId = Number(item.provincia_id ?? loginProvinciaId ?? 0);
    const effectiveCantonId = Number(item.canton_id ?? loginCantonId ?? 0);

    const onDropdownChange = (e: { value: any }, field: keyof CoeActivadoForm) => {
      onChange({ target: { name: field, value: e.value } });
    };

    const handleProvinciaChange = async (provinciaId: number | null) => {
      onChange({ target: { name: 'provincia_id', value: provinciaId ?? 0 } });
      onChange({ target: { name: 'canton_id', value: 0 } });
      if (!provinciaId) {
        setCantones([]);
        return;
      }
      await loadCantones(provinciaId);
    };

    const handleCantonChange = async (cantonId: number | null) => {
      onChange({ target: { name: 'canton_id', value: cantonId ?? 0 } });
    };

    return (
      <div className="grid p-fluid">
        <div className="field col-12 md:col-6">
          <label>COE *</label>
          <Dropdown
            value={typeof item.coe_id === 'number' && item.coe_id > 0 ? item.coe_id : null}
            options={coeOptions.map((option) => ({
              label: option.siglas ? `${option.siglas} - ${option.nombre}` : option.nombre,
              value: option.id,
            }))}
            onChange={(e) => onDropdownChange(e, 'coe_id')}
            placeholder="Seleccionar COE"
            filter
            className="w-full"
          />
        </div>

        <div className="field col-12 md:col-6">
          <label>Estado activación *</label>
          <Dropdown
            value={typeof item.estado_activacion === 'number' ? item.estado_activacion : null}
            options={estadoOptions.map((option) => ({
              label: option.nombre,
              value: option.id,
            }))}
            onChange={(e) => onDropdownChange(e, 'estado_activacion')}
            placeholder="Seleccionar estado"
            filter
            className="w-full"
          />
        </div>

        <div className="field col-12 md:col-6">
          <label>Fecha activación *</label>
          <Calendar
            value={item.fecha_activacion ? new Date(item.fecha_activacion) : null}
            onChange={(e) => onChange({ target: { name: 'fecha_activacion', value: e.value } })}
            showTime
            showSeconds
            dateFormat="dd/mm/yy"
            className="w-full"
            disabled={Boolean(readOnly) || isEdit}
          />
        </div>

        <div className="field col-12 md:col-6">
          <label>Provincia *</label>
          <Dropdown
            value={effectiveProvinciaId || null}
            options={provincias.map((option) => ({ label: option.nombre, value: option.id }))}
            onChange={(e) => handleProvinciaChange(e.value ?? null)}
            placeholder="Seleccionar provincia"
            filter
            className="w-full"
          />
        </div>

        <div className="field col-12 md:col-6">
          <label>Cantón *</label>
          <Dropdown
            value={effectiveCantonId || null}
            options={cantones
              .filter((option) => !effectiveProvinciaId || option.provincia_id === effectiveProvinciaId)
              .map((option) => ({ label: option.nombre, value: option.id }))}
            onChange={(e) => handleCantonChange(e.value ?? null)}
            placeholder="Seleccionar cantón"
            disabled={!effectiveProvinciaId}
            filter
            className="w-full"
          />
        </div>
      </div>
    );
  };

  const columns = [
    { field: 'id', header: 'ID', sortable: true },
    { field: 'coe_nombre', header: 'COE', sortable: true },
    { field: 'coe_siglas', header: 'Siglas', sortable: true },
    { field: 'provincia_nombre', header: 'Provincia', sortable: true },
    { field: 'canton_nombre', header: 'Cantón', sortable: true },
    { field: 'parroquia_nombre', header: 'Parroquia', sortable: true },
    { field: 'estado_activacion_nombre', header: 'Estado', sortable: true },
    {
      field: 'fecha_activacion',
      header: 'Fecha activación',
      sortable: true,
      body: (row: CoeActivadoRow) => row.fecha_activacion ? new Date(row.fecha_activacion).toLocaleString() : '',
    },
    {
      field: 'activo',
      header: 'Activo',
      sortable: true,
      body: (row: CoeActivadoRow) => row.activo ? 'Sí' : 'No',
    },
  ];

  return (
    <Card title="COEs activados">
      <BaseCRUD<CoeActivadoForm>
        title=""
        items={rows as any}
        columns={columns as any}
        renderForm={renderForm}
        onSave={handleSave}
        onDelete={handleDelete as any}
        resolveItemForEdit={resolveItemForEdit as any}
        initialItem={{
          id: null,
          activo: true,
          canton_id: loginCantonId || 0,
          coe_id: null,
          emergencia_id: emergenciaId,
          estado_activacion: null,
          fecha_activacion: new Date(),
          provincia_id: loginProvinciaId || 0,
        }}
        idField="id"
        showDeleteButton={true}
      />
      {loading && <div className="mt-2">Cargando...</div>}
    </Card>
  );
};
