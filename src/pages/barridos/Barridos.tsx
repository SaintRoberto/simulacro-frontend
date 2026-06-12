import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Tag, message } from 'antd';
import { BaseCRUD } from '../../components/crud/BaseCRUD';
import MapSelector from '../../components/map/MapSelector';
import { useAuth } from '../../context/AuthContext';

type CatalogOption = {
  id: number;
  nombre: string;
};

type Barrido = {
  id?: number;
  emergencia_id?: number;
  evento_tipo_id?: number;
  evento_tipo?: string;
  evento_fecha?: string;
  provincia_id?: number;
  provincia?: string;
  canton_id?: number;
  canton?: string;
  parroquia_id?: number;
  parroquia?: string;
  sector?: string;
  longitud?: number | null;
  latitud?: number | null;
  parametro_0?: number;
  parametro_1?: number;
  parametro_2?: number;
  parametro_3?: string;
  barrido_estado_id?: number;
  barrido_estado?: string;
  activo?: boolean;
  creador?: string;
  creacion?: string;
  modificador?: string | null;
  modificacion?: string | null;
};

const getArray = (value: unknown): any[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const nested = record.data ?? record.items ?? record.results;
    return Array.isArray(nested) ? nested : [];
  }
  return [];
};

const getObject = (value: unknown): Barrido => {
  if (Array.isArray(value)) return (value[0] ?? {}) as Barrido;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (record.data && typeof record.data === 'object' && !Array.isArray(record.data)) {
      return record.data as Barrido;
    }
    return record as Barrido;
  }
  return {};
};

const mapCatalog = (items: any[], fallback: string): CatalogOption[] =>
  items
    .map((item) => ({
      id: Number(item?.id ?? 0),
      nombre: String(
        item?.nombre ??
        item?.descripcion ??
        item?.evento_tipo ??
        item?.barrido_estado ??
        `${fallback} ${item?.id ?? ''}`
      ),
    }))
    .filter((item) => Number.isFinite(item.id) && item.id > 0);

export const Barridos: React.FC = () => {
  const { authFetch, datosLogin, selectedEmergenciaId } = useAuth();
  const apiBase = process.env.REACT_APP_API_URL || '/api';
  const emergenciaId = Number(
    selectedEmergenciaId ??
    datosLogin?.emergencia_id ??
    localStorage.getItem('selectedEmergenciaId') ??
    0
  );
  const isUsuarioNacional =
    Number(datosLogin?.provincia_id ?? 0) === 0 &&
    Number(datosLogin?.canton_id ?? 0) === 0;

  const [rows, setRows] = useState<Barrido[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventoTipos, setEventoTipos] = useState<CatalogOption[]>([]);
  const [barridoEstados, setBarridoEstados] = useState<CatalogOption[]>([]);
  const [provincias, setProvincias] = useState<CatalogOption[]>([]);
  const [cantones, setCantones] = useState<CatalogOption[]>([]);
  const [parroquias, setParroquias] = useState<CatalogOption[]>([]);

  const fetchArray = useCallback(async (urls: string[]) => {
    for (const url of urls) {
      try {
        const response = await authFetch(url, { headers: { accept: 'application/json' } });
        if (!response.ok) continue;
        return getArray(await response.json());
      } catch {
        // Probar el siguiente endpoint compatible.
      }
    }
    return [];
  }, [authFetch]);

  const loadRows = useCallback(async () => {
    if (!emergenciaId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const response = await authFetch(`${apiBase}/barridos/emergencia/${emergenciaId}`, {
        headers: { accept: 'application/json' },
      });
      if (!response.ok) throw new Error('No se pudo cargar los barridos.');
      setRows(getArray(await response.json()));
    } catch (error) {
      setRows([]);
      message.error(error instanceof Error ? error.message : 'No se pudo cargar los barridos.');
    } finally {
      setLoading(false);
    }
  }, [apiBase, authFetch, emergenciaId]);

  const loadCantones = useCallback(async (provinciaId?: number) => {
    if (!provinciaId || !emergenciaId) {
      setCantones([]);
      return [];
    }
    const data = await fetchArray([
      `${apiBase}/provincia/${provinciaId}/cantones/emergencia/${emergenciaId}`,
      `${apiBase}/provincia/${provinciaId}/cantones/`,
    ]);
    const mapped = mapCatalog(data, 'Cantón');
    setCantones(mapped);
    return mapped;
  }, [apiBase, emergenciaId, fetchArray]);

  const loadParroquias = useCallback(async (cantonId?: number) => {
    if (!cantonId || !emergenciaId) {
      setParroquias([]);
      return [];
    }
    const data = await fetchArray([
      `${apiBase}/canton/${cantonId}/parroquias/emergencia/${emergenciaId}`,
      `${apiBase}/parroquias/canton/${cantonId}`,
    ]);
    const mapped = mapCatalog(data, 'Parroquia');
    setParroquias(mapped);
    return mapped;
  }, [apiBase, emergenciaId, fetchArray]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    const loadCatalogs = async () => {
      const [tiposData, estadosData, provinciasData] = await Promise.all([
        fetchArray([`${apiBase}/evento_tipos`]),
        fetchArray([`${apiBase}/barrido_estados`, `${apiBase}/barridos_estados`]),
        emergenciaId
          ? fetchArray([
              `${apiBase}/provincias/emergencia/${emergenciaId}`,
              `${apiBase}/provincias`,
            ])
          : Promise.resolve([]),
      ]);
      setEventoTipos(mapCatalog(tiposData, 'Tipo'));
      setBarridoEstados(mapCatalog(estadosData, 'Estado'));
      setProvincias(mapCatalog(provinciasData, 'Provincia'));
    };
    loadCatalogs();
  }, [apiBase, emergenciaId, fetchArray]);

  const resolveItemForEdit = async (row: Barrido): Promise<Partial<Barrido>> => {
    if (!row.id) return row;
    const response = await authFetch(`${apiBase}/barridos/${row.id}`, {
      headers: { accept: 'application/json' },
    });
    if (!response.ok) throw new Error('No se pudo consultar el barrido.');
    const detail = getObject(await response.json());
    await loadCantones(Number(detail.provincia_id ?? 0));
    await loadParroquias(Number(detail.canton_id ?? 0));
    return {
      ...detail,
      activo: detail.activo ?? true,
      emergencia_id: Number(detail.emergencia_id ?? emergenciaId),
      parametro_0: Number(detail.parametro_0 ?? 0),
      parametro_1: Number(detail.parametro_1 ?? 0),
      parametro_2: Number(detail.parametro_2 ?? 0),
      parametro_3: String(detail.parametro_3 ?? ''),
    };
  };

  const handleSave = async (item: Partial<Barrido>): Promise<boolean> => {
    if (!emergenciaId) {
      message.warning('Debe seleccionar una emergencia.');
      return false;
    }
    if (!Number(item.evento_tipo_id)) {
      message.warning('El tipo de evento es obligatorio.');
      return false;
    }
    if (!item.evento_fecha) {
      message.warning('La fecha del evento es obligatoria.');
      return false;
    }
    if (!Number(item.provincia_id)) {
      message.warning('La provincia es obligatoria.');
      return false;
    }
    if (!Number(item.canton_id)) {
      message.warning('El cantón es obligatorio.');
      return false;
    }
    if (!Number(item.parroquia_id)) {
      message.warning('La parroquia es obligatoria.');
      return false;
    }
    if (!String(item.sector ?? '').trim()) {
      message.warning('El sector es obligatorio.');
      return false;
    }
    if (!Number(item.barrido_estado_id)) {
      message.warning('El estado del barrido es obligatorio.');
      return false;
    }

    const commonPayload = {
      activo: item.activo ?? true,
      barrido_estado_id: Number(item.barrido_estado_id),
      canton_id: Number(item.canton_id),
      emergencia_id: emergenciaId,
      evento_fecha: new Date(String(item.evento_fecha)).toISOString(),
      evento_tipo_id: Number(item.evento_tipo_id),
      latitud: Number(item.latitud ?? 0),
      longitud: Number(item.longitud ?? 0),
      parametro_0: Number(item.parametro_0 ?? 0),
      parametro_1: Number(item.parametro_1 ?? 0),
      parametro_2: Number(item.parametro_2 ?? 0),
      parametro_3: String(item.parametro_3 ?? ''),
      parroquia_id: Number(item.parroquia_id),
      provincia_id: Number(item.provincia_id),
      sector: String(item.sector ?? '').trim(),
    };
    const isEdit = Number(item.id ?? 0) > 0;
    const payload = isEdit
      ? { ...commonPayload, modificador: String(datosLogin?.usuario_login ?? '') }
      : { ...commonPayload, creador: String(datosLogin?.usuario_login ?? '') };

    try {
      const response = await authFetch(
        isEdit ? `${apiBase}/barridos/${item.id}` : `${apiBase}/barridos`,
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
        const detail = await response.text();
        throw new Error(detail || `No se pudo ${isEdit ? 'actualizar' : 'crear'} el barrido.`);
      }
      message.success(`Barrido ${isEdit ? 'actualizado' : 'creado'} correctamente.`);
      await loadRows();
      return true;
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'No se pudo guardar el barrido.');
      return false;
    }
  };

  const renderForm = (
    item: Partial<Barrido>,
    onChange: (event: any) => void,
    readOnly = false
  ) => (
    <div className="d-flex flex-column gap-3">
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label">Tipo de evento *</label>
          <Dropdown
            value={item.evento_tipo_id ?? null}
            options={eventoTipos.map((option) => ({ value: option.id, label: option.nombre }))}
            onChange={(event) => onChange({ target: { name: 'evento_tipo_id', value: event.value } })}
            placeholder="Seleccione tipo de evento"
            className="w-full"
            filter
            disabled={readOnly}
          />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label">Fecha del evento *</label>
          <Calendar
            value={item.evento_fecha ? new Date(item.evento_fecha) : null}
            onChange={(event) => onChange({
              target: {
                name: 'evento_fecha',
                value: event.value instanceof Date ? event.value.toISOString() : undefined,
              },
            })}
            className="w-full"
            showIcon
            showTime
            hourFormat="24"
            dateFormat="dd/mm/yy"
            disabled={readOnly}
          />
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-md-4">
          <label className="form-label">Provincia *</label>
          <Dropdown
            value={item.provincia_id ?? null}
            options={provincias.map((option) => ({ value: option.id, label: option.nombre }))}
            onChange={async (event) => {
              onChange({ target: { name: 'provincia_id', value: event.value } });
              onChange({ target: { name: 'canton_id', value: undefined } });
              onChange({ target: { name: 'parroquia_id', value: undefined } });
              setParroquias([]);
              await loadCantones(event.value);
            }}
            placeholder="Seleccione provincia"
            className="w-full"
            filter
            disabled={readOnly}
          />
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label">Cantón *</label>
          <Dropdown
            value={item.canton_id ?? null}
            options={cantones.map((option) => ({ value: option.id, label: option.nombre }))}
            onChange={async (event) => {
              onChange({ target: { name: 'canton_id', value: event.value } });
              onChange({ target: { name: 'parroquia_id', value: undefined } });
              await loadParroquias(event.value);
            }}
            placeholder={item.provincia_id ? 'Seleccione cantón' : 'Seleccione primero una provincia'}
            className="w-full"
            filter
            disabled={readOnly || !item.provincia_id}
          />
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label">Parroquia *</label>
          <Dropdown
            value={item.parroquia_id ?? null}
            options={parroquias.map((option) => ({ value: option.id, label: option.nombre }))}
            onChange={(event) => onChange({ target: { name: 'parroquia_id', value: event.value } })}
            placeholder={item.canton_id ? 'Seleccione parroquia' : 'Seleccione primero un cantón'}
            className="w-full"
            filter
            disabled={readOnly || !item.canton_id}
          />
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-md-7">
          <label className="form-label">Sector *</label>
          <InputText
            value={item.sector ?? ''}
            onChange={(event) => onChange({ target: { name: 'sector', value: event.target.value } })}
            className="w-full"
            disabled={readOnly}
          />
        </div>
        <div className="col-12 col-md-5">
          <label className="form-label">Estado del barrido *</label>
          {barridoEstados.length > 0 ? (
            <Dropdown
              value={item.barrido_estado_id ?? null}
              options={barridoEstados.map((option) => ({ value: option.id, label: option.nombre }))}
              onChange={(event) => onChange({ target: { name: 'barrido_estado_id', value: event.value } })}
              placeholder="Seleccione estado"
              className="w-full"
              disabled={readOnly}
            />
          ) : (
            <InputNumber
              value={item.barrido_estado_id ?? null}
              onValueChange={(event) => onChange({ target: { name: 'barrido_estado_id', value: event.value } })}
              className="w-full"
              min={1}
              placeholder="ID del estado"
              disabled={readOnly}
            />
          )}
        </div>
      </div>

      <div>
        <label className="form-label">Ubicación en el mapa</label>
        <MapSelector
          latitud={item.latitud}
          longitud={item.longitud}
          initializeWithDefault={!item.id}
          onLocationChange={(latitud, longitud) => {
            if (readOnly) return;
            onChange({ target: { name: 'latitud', value: latitud } });
            onChange({ target: { name: 'longitud', value: longitud } });
          }}
          height="250px"
          placeholder="Buscar dirección, sector o ciudad..."
        />
      </div>

      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label">Latitud</label>
          <InputNumber
            value={typeof item.latitud === 'number' ? item.latitud : null}
            onValueChange={(event) => onChange({ target: { name: 'latitud', value: event.value ?? 0 } })}
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
            onValueChange={(event) => onChange({ target: { name: 'longitud', value: event.value ?? 0 } })}
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

      <div className="row g-3">
        {[0, 1, 2].map((index) => {
          const field = `parametro_${index}` as 'parametro_0' | 'parametro_1' | 'parametro_2';
          return (
            <div className="col-12 col-md-4" key={field}>
              <label className="form-label">{`Parámetro ${index}`}</label>
              <InputNumber
                value={Number(item[field] ?? 0)}
                onValueChange={(event) => onChange({ target: { name: field, value: event.value ?? 0 } })}
                className="w-full"
                disabled={readOnly}
              />
            </div>
          );
        })}
      </div>

      <div>
        <label className="form-label">Parámetro 3</label>
        <InputTextarea
          value={item.parametro_3 ?? ''}
          onChange={(event) => onChange({ target: { name: 'parametro_3', value: event.target.value } })}
          className="w-full"
          rows={3}
          disabled={readOnly}
        />
      </div>
    </div>
  );

  const eventoTipoNameById = useMemo(
    () => new Map(eventoTipos.map((item) => [item.id, item.nombre])),
    [eventoTipos]
  );
  const estadoNameById = useMemo(
    () => new Map(barridoEstados.map((item) => [item.id, item.nombre])),
    [barridoEstados]
  );

  const normalizedRows = useMemo(
    () => rows.map((row) => ({
      ...row,
      evento_tipo: row.evento_tipo || eventoTipoNameById.get(Number(row.evento_tipo_id)) || '',
      barrido_estado: row.barrido_estado || estadoNameById.get(Number(row.barrido_estado_id)) || '',
    })),
    [estadoNameById, eventoTipoNameById, rows]
  );

  const columns = [
    { field: 'id', header: 'ID', sortable: true },
    { field: 'evento_fecha', header: 'Fecha Evento', sortable: true },
    { field: 'evento_tipo', header: 'Tipo Evento', sortable: true },
    { field: 'provincia', header: 'Provincia', sortable: true },
    { field: 'canton', header: 'Cantón', sortable: true },
    { field: 'parroquia', header: 'Parroquia', sortable: true },
    { field: 'sector', header: 'Sector', sortable: true },
    {
      field: 'barrido_estado',
      header: 'Estado',
      body: (row: Barrido) => (
        <Tag color={row.activo === false ? 'default' : 'blue'}>
          {row.barrido_estado || row.barrido_estado_id || '-'}
        </Tag>
      ),
    },
    { field: 'latitud', header: 'Latitud', sortable: true },
    { field: 'longitud', header: 'Longitud', sortable: true },
  ];

  return (
    <Card title="Barridos Definición">
      <BaseCRUD<Barrido>
        title=""
        items={normalizedRows}
        columns={columns}
        renderForm={renderForm}
        onSave={handleSave}
        onDelete={() => undefined}
        resolveItemForEdit={resolveItemForEdit}
        initialItem={{
          activo: true,
          barrido_estado_id: undefined,
          canton_id: undefined,
          emergencia_id: emergenciaId || undefined,
          evento_fecha: new Date().toISOString(),
          evento_tipo_id: undefined,
          latitud: null,
          longitud: null,
          parametro_0: 0,
          parametro_1: 0,
          parametro_2: 0,
          parametro_3: '',
          parroquia_id: undefined,
          provincia_id: undefined,
          sector: '',
        }}
        idField="id"
        showCreateButton={isUsuarioNacional && emergenciaId > 0}
        showEditAction={isUsuarioNacional}
        showDeleteButton={false}
        showDeleteAction={false}
        emptyMessage={loading ? 'Cargando barridos...' : emergenciaId ? 'No existen barridos.' : 'Seleccione una emergencia.'}
      />
      {loading && <div className="mt-2">Cargando...</div>}
    </Card>
  );
};

export default Barridos;
