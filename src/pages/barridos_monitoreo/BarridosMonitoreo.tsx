import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Tag, message } from 'antd';
import { BaseCRUD } from '../../components/crud/BaseCRUD';
import MapSelector from '../../components/map/MapSelector';
import { useAuth } from '../../context/AuthContext';

type BarridoIntensidad = {
  id: number;
  evento_tipo_id: number;
  orden: number;
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
};

type BarridoMonitoreo = {
  _rowKey: string;
  id?: number | null;
  barrido_id: number;
  barrido_evento_fecha?: string | null;
  barrido_evento_tipo_id?: number | null;
  barrido_evento_tipo_nombre?: string | null;
  emergencia_id?: number | null;
  emergencia_nombre?: string | null;
  monitoreo_fecha?: string | null;
  provincia_id: number;
  provincia_nombre?: string | null;
  canton_id: number;
  canton_nombre?: string | null;
  parroquia_id: number;
  parroquia_nombre?: string | null;
  sector?: string | null;
  longitud?: number | null;
  latitud?: number | null;
  intensidad_id?: number | null;
  intensidad_orden?: number | null;
  intensidad_nombre?: string | null;
  intensidad_descripcion?: string | null;
  fuente?: string | null;
  observaciones?: string | null;
  activo?: boolean;
  monitoreo_registrado?: boolean;
  monitoreo_estado?: string | null;
};

const getArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const nested = record.data ?? record.items ?? record.results;
    return Array.isArray(nested) ? nested as T[] : [];
  }
  return [];
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const uniqueText = (items: Array<string | null | undefined>) => {
  const values = Array.from(new Set(items.map((item) => String(item ?? '').trim()).filter(Boolean)));
  return values.join(', ');
};

const hasCoordinates = (row: Partial<BarridoMonitoreo>) => {
  if (row.latitud === null || row.latitud === undefined ||
      row.longitud === null || row.longitud === undefined) {
    return false;
  }
  const latitud = Number(row.latitud);
  const longitud = Number(row.longitud);
  return Number.isFinite(latitud) &&
    Number.isFinite(longitud) &&
    !(latitud === 0 && longitud === 0);
};

const getErrorMessage = async (response: Response, fallback: string) => {
  try {
    const data = await response.json();
    return String(data?.error ?? data?.detail ?? data?.detalle ?? fallback);
  } catch {
    return fallback;
  }
};

export const BarridosMonitoreo: React.FC = () => {
  const {
    authFetch,
    barridoActivo,
    barridoActivoStatus,
    datosLogin,
    selectedEmergenciaId,
  } = useAuth();
  const apiBase = process.env.REACT_APP_API_URL || '/api';
  const emergenciaId = Number(
    selectedEmergenciaId ??
    datosLogin?.emergencia_id ??
    localStorage.getItem('selectedEmergenciaId') ??
    0
  );
  const usuarioId = Number(datosLogin?.usuario_id ?? localStorage.getItem('userId') ?? 0);
  const coeIdUsuario = Number(datosLogin?.coe_id ?? 0);
  const hasCoeId = datosLogin?.coe_id != null;
  const barridoActivoId = Number(barridoActivo?.id ?? 0);

  const [rows, setRows] = useState<BarridoMonitoreo[]>([]);
  const [intensidades, setIntensidades] = useState<BarridoIntensidad[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  const loadIntensidades = useCallback(async () => {
    try {
      const response = await authFetch(`${apiBase}/barrido_intensidad`, {
        headers: { accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'No se pudieron cargar las intensidades.'));
      }
      setIntensidades(
        getArray<BarridoIntensidad>(await response.json())
          .filter((item) => Number(item.id) > 0 && item.activo !== false)
          .sort((a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0))
      );
    } catch (error) {
      setIntensidades([]);
      message.error(error instanceof Error ? error.message : 'No se pudieron cargar las intensidades.');
    }
  }, [apiBase, authFetch]);

  const loadRows = useCallback(async () => {
    if (!barridoActivoId || !usuarioId || !hasCoeId) {
      setRows([]);
      return;
    }

    setRows([]);
    setLoadingRows(true);
    try {
      const response = await authFetch(
        `${apiBase}/barrido_monitoreo/usuario/${usuarioId}/coe/${coeIdUsuario}/barrido/${barridoActivoId}`,
        { headers: { accept: 'application/json' } }
      );
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'No se pudo cargar el monitoreo del barrido.'));
      }

      const data = getArray<Omit<BarridoMonitoreo, '_rowKey'>>(await response.json());
      setRows(data.map((item) => ({
        ...item,
        _rowKey: item.id
          ? `monitoreo-${item.id}`
          : `parroquia-${item.provincia_id}-${item.canton_id}-${item.parroquia_id}`,
      })));
    } catch (error) {
      setRows([]);
      message.error(error instanceof Error ? error.message : 'No se pudo cargar el monitoreo del barrido.');
    } finally {
      setLoadingRows(false);
    }
  }, [apiBase, authFetch, barridoActivoId, coeIdUsuario, hasCoeId, usuarioId]);

  useEffect(() => {
    loadIntensidades();
  }, [loadIntensidades]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const availableIntensidades = useMemo(() => {
    const eventoTipoId = Number(
      rows[0]?.barrido_evento_tipo_id ??
      barridoActivo?.evento_tipo_id ??
      0
    );
    return intensidades.filter((item) => item.evento_tipo_id === eventoTipoId);
  }, [barridoActivo?.evento_tipo_id, intensidades, rows]);

  const summary = useMemo(() => {
    const firstRow = rows[0];
    return {
      emergencia: firstRow?.emergencia_nombre || barridoActivo?.emergencia_nombre || '-',
      evento: firstRow?.barrido_evento_tipo_nombre || barridoActivo?.evento_tipo_nombre || '-',
      fecha: firstRow?.barrido_evento_fecha || barridoActivo?.evento_fecha,
      provincias: uniqueText(rows.map((row) => row.provincia_nombre)) || barridoActivo?.provincia_nombre || '-',
      cantones: uniqueText(rows.map((row) => row.canton_nombre)) || barridoActivo?.canton_nombre || '-',
      fuentes: uniqueText(rows.map((row) => row.fuente)),
      sectores: uniqueText(rows.map((row) => row.sector)),
    };
  }, [barridoActivo, rows]);

  const resolveItemForEdit = async (row: BarridoMonitoreo): Promise<Partial<BarridoMonitoreo>> => {
    if (!row.id) return row;

    const response = await authFetch(`${apiBase}/barrido_monitoreo/${row.id}`, {
      headers: { accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(await getErrorMessage(response, 'No se pudo consultar el monitoreo.'));
    }
    return {
      ...row,
      ...await response.json(),
      _rowKey: row._rowKey,
    };
  };

  const handleSave = async (item: Partial<BarridoMonitoreo>): Promise<boolean> => {
    const intensidadId = Number(item.intensidad_id ?? 0);
    if (!intensidadId) {
      message.warning('La intensidad es obligatoria.');
      return false;
    }

    const hasLatitud = item.latitud !== null && item.latitud !== undefined;
    const hasLongitud = item.longitud !== null && item.longitud !== undefined;
    if (hasLatitud !== hasLongitud) {
      message.warning('Debe ingresar latitud y longitud.');
      return false;
    }
    if (hasLatitud && (Number(item.latitud) < -90 || Number(item.latitud) > 90)) {
      message.warning('La latitud debe estar entre -90 y 90.');
      return false;
    }
    if (hasLongitud && (Number(item.longitud) < -180 || Number(item.longitud) > 180)) {
      message.warning('La longitud debe estar entre -180 y 180.');
      return false;
    }

    const isEdit = Number(item.id ?? 0) > 0;
    const usuario = datosLogin?.usuario_login || datosLogin?.usuario_descripcion || 'Sistema';
    const commonPayload = {
      intensidad_id: intensidadId,
      latitud: hasLatitud ? Number(item.latitud) : null,
      longitud: hasLongitud ? Number(item.longitud) : null,
      observaciones: String(item.observaciones ?? '').trim() || null,
    };
    const payload = isEdit
      ? {
          ...commonPayload,
          modificador: usuario,
        }
      : {
          ...commonPayload,
          activo: true,
          barrido_id: Number(barridoActivoId || item.barrido_id || 0),
          canton_id: Number(item.canton_id ?? 0),
          creador: usuario,
          fuente: item.fuente ?? null,
          modificador: usuario,
          monitoreo_fecha: new Date().toISOString(),
          parroquia_id: Number(item.parroquia_id ?? 0),
          provincia_id: Number(item.provincia_id ?? 0),
          sector: String(item.sector ?? barridoActivo?.sector ?? ''),
        };

    try {
      const response = await authFetch(
        isEdit ? `${apiBase}/barrido_monitoreo/${item.id}` : `${apiBase}/barrido_monitoreo`,
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            `No se pudo ${isEdit ? 'actualizar' : 'registrar'} el monitoreo.`
          )
        );
      }

      message.success(`Monitoreo ${isEdit ? 'actualizado' : 'registrado'} correctamente.`);
      await loadRows();
      return true;
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'No se pudo guardar el monitoreo.');
      return false;
    }
  };

  const renderForm = (
    item: Partial<BarridoMonitoreo>,
    onChange: (event: any) => void,
    readOnly = false
  ) => (
    <div className="d-flex flex-column gap-3">
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label">Parroquia</label>
          <InputText value={item.parroquia_nombre ?? ''} className="w-full" disabled />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label">Intensidad *</label>
          <Dropdown
            value={item.intensidad_id ?? null}
            options={availableIntensidades.map((option) => ({
              value: option.id,
              label: option.nombre,
            }))}
            onChange={(event) => onChange({
              target: { name: 'intensidad_id', value: event.value },
            })}
            optionLabel="label"
            optionValue="value"
            placeholder="Seleccione una intensidad"
            emptyMessage="No existen intensidades para este tipo de evento"
            className="w-full"
            filter
            disabled={readOnly}
          />
        </div>
      </div>

      <div>
        <label className="form-label">Ubicación en el mapa</label>
        <MapSelector
          latitud={item.latitud}
          longitud={item.longitud}
          initializeWithDefault={!hasCoordinates(item)}
          onLocationChange={(latitud, longitud) => {
            if (readOnly) return;
            onChange({ target: { name: 'latitud', value: latitud } });
            onChange({ target: { name: 'longitud', value: longitud } });
          }}
          height="280px"
          placeholder="Buscar dirección, sector o ciudad..."
        />
      </div>

      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label">Latitud</label>
          <InputNumber
            value={typeof item.latitud === 'number' ? item.latitud : null}
            onValueChange={(event) => onChange({
              target: { name: 'latitud', value: event.value ?? null },
            })}
            className="w-full"
            min={-90}
            max={90}
            minFractionDigits={6}
            maxFractionDigits={6}
            useGrouping={false}
            disabled={readOnly}
          />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label">Longitud</label>
          <InputNumber
            value={typeof item.longitud === 'number' ? item.longitud : null}
            onValueChange={(event) => onChange({
              target: { name: 'longitud', value: event.value ?? null },
            })}
            className="w-full"
            min={-180}
            max={180}
            minFractionDigits={6}
            maxFractionDigits={6}
            useGrouping={false}
            disabled={readOnly}
          />
        </div>
      </div>

      <div>
        <label className="form-label">Observaciones</label>
        <InputTextarea
          value={item.observaciones ?? ''}
          onChange={(event) => onChange({
            target: { name: 'observaciones', value: event.target.value },
          })}
          rows={2}
          className="w-full"
          autoResize
          disabled={readOnly}
        />
      </div>
    </div>
  );

  const columns = [
    {
      field: 'id',
      header: 'ID',
      body: (row: BarridoMonitoreo) => row.id ?? '-',
    },
    {
      field: 'parroquia_nombre',
      header: 'Parroquia',
      body: (row: BarridoMonitoreo) => row.parroquia_nombre || '-',
    },
    {
      field: 'intensidad_nombre',
      header: 'Estado / intensidad',
      body: (row: BarridoMonitoreo) => (
        <Tag color={row.intensidad_id ? 'blue' : 'default'} title={row.intensidad_descripcion ?? undefined}>
          {row.intensidad_nombre || row.monitoreo_estado || 'Pendiente'}
        </Tag>
      ),
    },
    {
      field: 'coordenadas',
      header: 'Coordenadas',
      body: (row: BarridoMonitoreo) => hasCoordinates(row)
        ? `${Number(row.latitud).toFixed(6)}, ${Number(row.longitud).toFixed(6)}`
        : 'Sin coordenadas',
    },
  ];

  const emptyMessage = loadingRows
    ? 'Cargando parroquias...'
    : !emergenciaId
      ? 'Seleccione una emergencia.'
      : barridoActivoStatus === 'loading'
        ? 'Cargando barrido activo...'
        : !barridoActivoId
          ? 'No existe un barrido activo para la emergencia.'
        : !usuarioId || !hasCoeId
          ? 'No se pudo resolver el usuario o COE actual.'
          : 'No existen parroquias asignadas para este barrido.';

  return (
    <Card title="Monitoreo de Barridos">
      {barridoActivoId > 0 && (
        <div className="border rounded bg-light p-3 mb-4">
          <div className="row g-3">
            <div className="col-12 col-md-6 col-xl-3">
              <small className="text-muted d-block">Emergencia</small>
              <strong>{summary.emergencia}</strong>
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <small className="text-muted d-block">Tipo de evento</small>
              <strong>{summary.evento}</strong>
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <small className="text-muted d-block">Fecha del evento</small>
              <strong>{formatDate(summary.fecha)}</strong>
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <small className="text-muted d-block">Fuente</small>
              <strong>{summary.fuentes || '-'}</strong>
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <small className="text-muted d-block">Provincia</small>
              <strong>{summary.provincias}</strong>
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <small className="text-muted d-block">Cantón</small>
              <strong>{summary.cantones}</strong>
            </div>
            {summary.sectores && (
              <div className="col-12 col-md-6 col-xl-3">
                <small className="text-muted d-block">Sector</small>
                <strong>{summary.sectores}</strong>
              </div>
            )}
          </div>
        </div>
      )}

      <BaseCRUD<BarridoMonitoreo>
        title="Barrido Monitoreo"
        items={rows}
        columns={columns}
        renderForm={renderForm}
        onSave={handleSave}
        onDelete={() => undefined}
        resolveItemForEdit={resolveItemForEdit}
        initialItem={{ _rowKey: '', barrido_id: barridoActivoId }}
        idField="_rowKey"
        showCreateButton={false}
        showDeleteButton={false}
        showDeleteAction={false}
        showReadAction={false}
        showEditAction
        useMenuPermissions={false}
        modalWidth={600}
        emptyMessage={emptyMessage}
      />
      {loadingRows && <div className="mt-2">Cargando...</div>}
    </Card>
  );
};

export default BarridosMonitoreo;
