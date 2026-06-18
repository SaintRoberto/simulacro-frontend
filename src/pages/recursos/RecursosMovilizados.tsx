import React, { useEffect, useMemo, useState } from "react";
import { Card } from "primereact/card";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { InputNumber } from "primereact/inputnumber";
import { message } from "antd";
import { BaseCRUD } from "../../components/crud/BaseCRUD";
import { useAuth } from "../../context/AuthContext";
import MapSelector from "../../components/map/MapSelector";

interface RecursoMovilizadoListItem {
  id: number;
  recurso_id?: number;
  recurso_grupo: string;
  recurso_tipo: string;
  institucion: string | null;
  parroquia_nombre: string | null;
  cantidad_asignada: number;
  disponible: number | boolean;
  factor: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  latitud: number | null;
  latitud_destino?: number | null;
  longitud: number | null;
  longitud_destino?: number | null;
  cantidad?: number;
  recurso_inventario_id?: number;
  provincia_id?: number;
  canton_id?: number;
  parroquia_id?: number;
}

interface RecursoMovilizadoPayload {
  id?: number;
  recurso_id?: number;
  activo: boolean;
  cantidad?: number;
  cantidad_asignada: number;
  canton_destino_id: number;
  canton_id: number;
  creador?: string;
  emergencia_id: number;
  factor: number;
  fecha_fin: string | null;
  fecha_inicio: string | null;
  latitud: number | null;
  latitud_destino: number | null;
  longitud: number | null;
  longitud_destino: number | null;
  modificacion?: string | null;
  modificador: string;
  parroquia_destino_id: number;
  parroquia_id: number;
  provincia_destino_id: number;
  provincia_id: number;
  recurso_inventario_id: number;
  recurso_grupo_id?: number;
  recurso_tipo_id?: number;
  institucion_id?: number;
}

type ParroquiaOption = { id: number; nombre: string; canton_id?: number };

const normalizeParroquias = (
  data: unknown,
  cantonId?: number
): ParroquiaOption[] => {
  if (!Array.isArray(data)) return [];
  return data
    .map((item: any) => ({
      id: Number(item?.id ?? 0),
      nombre: String(item?.nombre ?? ""),
      canton_id: Number(item?.canton_id ?? cantonId ?? 0) || undefined,
    }))
    .filter((item) => item.id > 0 && item.nombre);
};

const isValidCoordinate = (
  value: unknown,
  min: number,
  max: number
): value is number => {
  if (value === null || value === undefined || value === "") return false;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= min && numeric <= max;
};

export const RecursosMovilizados: React.FC = () => {
  const { authFetch, datosLogin, selectedEmergenciaId } = useAuth();
  const [rows, setRows] = useState<RecursoMovilizadoListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [provincias, setProvincias] = useState<
    Array<{ id: number; nombre: string }>
  >([]);
  const [cantones, setCantones] = useState<
    Array<{ id: number; nombre: string; provincia_id: number }>
  >([]);
  const [parroquias, setParroquias] = useState<
    ParroquiaOption[]
  >([]);
  const [instituciones, setInstituciones] = useState<
    Array<{ id: number; nombre: string; siglas: string }>
  >([]);
  const [recursoGruposCat, setRecursoGruposCat] = useState<
    Array<{ id: number; nombre: string }>
  >([]);
  const [recursoGruposCatStatus, setRecursoGruposCatStatus] = useState<
    "idle" | "loading" | "succeeded" | "failed"
  >("idle");
  const [recursoTiposCat, setRecursoTiposCat] = useState<
    Array<{ id: number; nombre: string; recurso_grupo_id: number }>
  >([]);
  const [recursoTiposCatStatus, setRecursoTiposCatStatus] = useState<
    "idle" | "loading" | "succeeded" | "failed"
  >("idle");

  const apiBase = process.env.REACT_APP_API_URL || "/api";
  const loginProvinciaId = Number(datosLogin?.provincia_id ?? 0);
  const loginCantonId = Number(datosLogin?.canton_id ?? 0);
  const isUsuarioNacional = loginProvinciaId === 0 && loginCantonId === 0;
  const isUsuarioCantonal = loginCantonId > 0;

  useEffect(() => {
    const load = async () => {
      if (recursoGruposCatStatus !== "idle") return;
      setRecursoGruposCatStatus("loading");
      try {
        const res = await authFetch(`${apiBase}/recurso_grupos/categoria/2`, {
          headers: { accept: "application/json" },
        });
        const data = res.ok ? await res.json() : [];
        setRecursoGruposCat(Array.isArray(data) ? data : []);
        setRecursoGruposCatStatus("succeeded");
      } catch {
        setRecursoGruposCat([]);
        setRecursoGruposCatStatus("failed");
      }
    };
    load();
  }, [apiBase, authFetch, recursoGruposCatStatus]);

  useEffect(() => {
    const load = async () => {
      if (recursoTiposCatStatus !== "idle") return;
      setRecursoTiposCatStatus("loading");
      try {
        const res = await authFetch(`${apiBase}/recurso-tipos/categoria/2`, {
          headers: { accept: "application/json" },
        });
        const data = res.ok ? await res.json() : [];
        setRecursoTiposCat(
          Array.isArray(data)
            ? (data as Array<{
                id: number;
                nombre: string;
                recurso_grupo_id: number;
              }>)
            : []
        );
        setRecursoTiposCatStatus("succeeded");
      } catch {
        setRecursoTiposCat([]);
        setRecursoTiposCatStatus("failed");
      }
    };
    load();
  }, [apiBase, authFetch, recursoTiposCatStatus]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authFetch(`${apiBase}/instituciones`, {
          headers: { accept: "application/json" },
        });
        setInstituciones(res.ok ? await res.json() : []);
      } catch {
        setInstituciones([]);
      }
    };
    load();
  }, [apiBase, authFetch]);

  useEffect(() => {
    const load = async () => {
      if (!selectedEmergenciaId) {
        setProvincias([]);
        setCantones([]);
        setParroquias([]);
        return;
      }
      if (isUsuarioNacional) {
        try {
          const p = await authFetch(
            `${apiBase}/provincias/emergencia/${selectedEmergenciaId}`,
            { headers: { accept: "application/json" } }
          );
          setProvincias(p.ok ? await p.json() : []);
        } catch {
          setProvincias([]);
        }
      } else {
        setProvincias([]);
      }
      try {
        if (loginProvinciaId) {
          const c = await authFetch(
            `${apiBase}/provincia/${loginProvinciaId}/cantones/`,
            { headers: { accept: "application/json" } }
          );
          setCantones(c.ok ? await c.json() : []);
        } else {
          setCantones([]);
        }
      } catch {
        setCantones([]);
      }
      try {
        if (loginCantonId) {
          const pa = await authFetch(
            `${apiBase}/canton/${loginCantonId}/parroquias/emergencia/${selectedEmergenciaId}`,
            { headers: { accept: "application/json" } }
          );
          const paData = pa.ok ? await pa.json() : [];
          setParroquias(normalizeParroquias(paData, loginCantonId));
        } else {
          setParroquias([]);
        }
      } catch {
        setParroquias([]);
      }
    };
    load();
  }, [
    apiBase,
    authFetch,
    isUsuarioNacional,
    loginProvinciaId,
    loginCantonId,
    selectedEmergenciaId,
  ]);

  const emergenciaId = selectedEmergenciaId ?? 0;
  const usuarioId = useMemo(() => {
    const effective =
      datosLogin?.usuario_id ?? Number(localStorage.getItem("userId") || "NaN");
    return Number(effective) || 0;
  }, [datosLogin]);

  const fetchRows = async () => {
    if (!emergenciaId || !usuarioId) return;
    setLoading(true);
    try {
      const url = `${apiBase}/recursos_movilizados/emergencia/${emergenciaId}/usuario/${usuarioId}`;
      const res = await authFetch(url, {
        headers: { accept: "application/json" },
      });
      if (!res.ok) {
        setRows([]);
      } else {
        const data = await res.json();
        setRows(
          Array.isArray(data)
            ? data.map((item: any) => ({
                ...item,
                latitud: item?.latitud_destino ?? item?.latitud ?? null,
                longitud: item?.longitud_destino ?? item?.longitud ?? null,
              })) as RecursoMovilizadoListItem[]
            : []
        );
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

  const handleSave = async (
    payload: Partial<RecursoMovilizadoPayload> & {
      id?: number;
      recurso_id?: number;
    }
  ): Promise<boolean | void> => {
    const creator =
      datosLogin?.usuario_login || datosLogin?.usuario_descripcion || "usuario";
    const resolvedProvinciaId = isUsuarioNacional
      ? Number(payload.provincia_id ?? 0)
      : Number(loginProvinciaId || payload.provincia_id || 0);
    const resolvedCantonId = Number(payload.canton_id ?? loginCantonId ?? 0);
    const resolvedParroquiaId = Number(payload.parroquia_id ?? 0);
    const provinciaDestinoId =
      Number(payload.provincia_destino_id ?? 0) > 0
        ? Number(payload.provincia_destino_id)
        : resolvedProvinciaId;
    const cantonDestinoId =
      Number(payload.canton_destino_id ?? 0) > 0
        ? Number(payload.canton_destino_id)
        : resolvedCantonId;
    const parroquiaDestinoId =
      Number(payload.parroquia_destino_id ?? 0) > 0
        ? Number(payload.parroquia_destino_id)
        : resolvedParroquiaId;
    const recursoTipoId = Number(payload.recurso_tipo_id ?? payload.recurso_inventario_id ?? 0);
    const institucionId = Number(payload.institucion_id ?? 0);
    const latitud = payload.latitud_destino ?? payload.latitud;
    const longitud = payload.longitud_destino ?? payload.longitud;

    if (!selectedEmergenciaId) {
      message.warning("Debe seleccionar una emergencia.");
      return false;
    }
    if (Number(payload.cantidad_asignada ?? 0) <= 0) {
      message.warning("La cantidad asignada debe ser mayor a 0.");
      return false;
    }
    if (recursoTipoId <= 0) {
      message.warning("El tipo de recurso es obligatorio.");
      return false;
    }
    if (!payload.fecha_inicio) {
      message.warning("La fecha de inicio es obligatoria.");
      return false;
    }
    if (resolvedProvinciaId <= 0) {
      message.warning("La provincia es obligatoria.");
      return false;
    }
    if (resolvedCantonId <= 0) {
      message.warning("El canton es obligatorio.");
      return false;
    }
    if (parroquiaDestinoId <= 0) {
      message.warning("La parroquia es obligatoria.");
      return false;
    }
    if (institucionId <= 0) {
      message.warning("La institucion es obligatoria.");
      return false;
    }
    if (!isValidCoordinate(latitud, -90, 90)) {
      message.warning("Debe ingresar una latitud valida.");
      return false;
    }
    if (!isValidCoordinate(longitud, -180, 180)) {
      message.warning("Debe ingresar una longitud valida.");
      return false;
    }

    const id = (payload as any)?.id ?? (payload as any)?.recurso_id;
    const isEdit = !!id;

    const baseBody = {
      activo: payload.activo ?? true,
      cantidad_asignada: Number(payload.cantidad_asignada ?? 0),
      canton_destino_id: cantonDestinoId,
      emergencia_id: Number(payload.emergencia_id ?? (selectedEmergenciaId || 0)),
      fecha_fin: payload.fecha_fin ?? null,
      fecha_inicio:
        payload.fecha_inicio ?? new Date().toISOString().substring(0, 19),
      institucion_id: institucionId,
      latitud_destino: Number(latitud),
      longitud_destino: Number(longitud),
      modificador: payload.modificador ?? creator,
      parroquia_destino_id: parroquiaDestinoId,
      provincia_destino_id: provinciaDestinoId,
      recurso_tipo_id: recursoTipoId,
    };
    const body = isEdit
      ? baseBody
      : {
          ...baseBody,
          creador: payload.creador ?? creator,
          modificacion:
            payload.modificacion ?? new Date().toISOString().substring(0, 19),
        };

    const url = isEdit
      ? `${apiBase}/recursos_movilizados/${id}`
      : `${apiBase}/recursos_movilizados`;

    const res = await authFetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      await fetchRows();
      return true;
    }
    message.error("No se pudo guardar el recurso movilizado.");
    return false;
  };

  const handleDelete = async (row: RecursoMovilizadoListItem) => {
    const id = (row as any).id ?? (row as any).recurso_id;
    if (!id) return;
    try {
      const url = `${apiBase}/recursos_movilizados/${id}`;
      const res = await authFetch(url, {
        method: "DELETE",
        headers: { accept: "application/json" },
      });
      if (res.ok) {
        await fetchRows();
      }
    } catch {}
  };

  const renderForm = (
    item: Partial<RecursoMovilizadoPayload>,
    onChange: (e: any) => void
  ) => {
    const onDateChange = (
      date: string | Date | Date[] | null,
      field: keyof RecursoMovilizadoPayload
    ) => {
      if (!date) return;
      let iso: string | null = null;
      if (Array.isArray(date)) {
        const d = date[0] as Date;
        iso = d ? new Date(d).toISOString().substring(0, 19) : null;
      } else if (typeof date === "string") {
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) {
          iso = parsed.toISOString().substring(0, 19);
        }
      } else {
        iso = date.toISOString().substring(0, 19);
      }
      onChange({ target: { name: field, value: iso } });
    };

    const onDropdownChange = (
      e: { value: any },
      field: keyof RecursoMovilizadoPayload
    ) => {
      onChange({ target: { name: field, value: e.value } });
    };

    const onNumberChange = (
      e: { value: number | null },
      field: keyof RecursoMovilizadoPayload
    ) => {
      onChange({ target: { name: field, value: e.value || 0 } });
    };

    const grupoOptions = (recursoGruposCat || []).map((g) => ({
      label: g.nombre,
      value: g.id,
    }));
    const tipoOptions = (recursoTiposCat || []).map((t) => ({
      label: t.nombre,
      value: t.id,
    }));
    const institucionOptions = (instituciones || []).map((i) => ({
      label: i.siglas ? `${i.siglas} - ${i.nombre}` : i.nombre,
      value: i.id,
    }));

    const provinciaOptions = provincias.map((p) => ({
      label: p.nombre,
      value: p.id,
    }));
    const effectiveProvinciaId =
      (typeof item.provincia_id === "number" && item.provincia_id !== 0
        ? item.provincia_id
        : loginProvinciaId || 0) || 0;
    const cantonOptions = cantones
      .filter(
        (c) => !effectiveProvinciaId || c.provincia_id === effectiveProvinciaId
      )
      .map((c) => ({ label: c.nombre, value: c.id }));
    const effectiveCantonId =
      (typeof item.canton_id === "number" && item.canton_id !== 0
        ? item.canton_id
        : loginCantonId || 0) || 0;
    const parroquiaOptions = parroquias
      .filter((pa) => !effectiveCantonId || pa.canton_id === effectiveCantonId)
      .map((pa) => ({ label: pa.nombre, value: pa.id }));

    const handleProvinciaChange = async (provId: number | null) => {
      onChange({ target: { name: "provincia_id", value: provId || 0 } });
      onChange({ target: { name: "canton_id", value: 0 } });
      onChange({ target: { name: "parroquia_id", value: 0 } });
      setParroquias([]);
      if (!provId) {
        setCantones([]);
        return;
      }
      try {
        const res = await authFetch(`${apiBase}/provincia/${provId}/cantones/`, {
          headers: { accept: "application/json" },
        });
        setCantones(res.ok ? await res.json() : []);
      } catch {
        setCantones([]);
      }
    };

    const handleCantonChange = async (canId: number | null) => {
      onChange({ target: { name: "canton_id", value: canId || 0 } });
      onChange({ target: { name: "parroquia_id", value: 0 } });
      if (!canId || !emergenciaId) {
        setParroquias([]);
        return;
      }
      try {
        const res = await authFetch(`${apiBase}/canton/${canId}/parroquias/emergencia/${emergenciaId}`, {
          headers: { accept: "application/json" },
        });
        const data = res.ok ? await res.json() : [];
        setParroquias(normalizeParroquias(data, canId));
      } catch {
        setParroquias([]);
      }
    };

    return (
      <div className="grid p-fluid">
        <div className="row">
          <div className="field col-6 md:col-4">
            <label>Cantidad Asignada *</label>
            <InputNumber
              value={Number(item.cantidad_asignada || 0)}
              onValueChange={(e) => onNumberChange(e, "cantidad_asignada")}
              min={0}
              className="w-full"
            />
          </div>
        </div>

        <div className="field col-12 md:col-4" style={{ display: "none" }}>
          <label>Grupo Recurso *</label>
          <Dropdown
            value={
              typeof item.recurso_grupo_id === "number"
                ? item.recurso_grupo_id
                : null
            }
            options={grupoOptions}
            onChange={(e) => {
              onDropdownChange(e, "recurso_grupo_id");
            }}
            placeholder={
              recursoGruposCatStatus === "loading"
                ? "Cargando..."
                : "Seleccionar grupo"
            }
            disabled={recursoGruposCatStatus === "loading"}
            filter
            className="w-full"
          />
        </div>

        <div className="field col-12 md:col-4">
          <label>Tipo Recurso *</label>
          <Dropdown
            value={
              typeof item.recurso_tipo_id === "number"
                ? item.recurso_tipo_id
                : null
            }
            options={tipoOptions}
            onChange={(e) => {
              onDropdownChange(e, "recurso_tipo_id");
              onChange({ target: { name: "recurso_inventario_id", value: e.value } });
            }}
            placeholder={
              recursoTiposCatStatus === "loading"
                ? "Cargando..."
                : "Seleccionar tipo"
            }
            disabled={recursoTiposCatStatus === "loading"}
            filter
            className="w-full"
          />
        </div>

        <div className="row">
          <div className="field col-6 md:col-6">
            <label>Fecha Inicio *</label>
            <Calendar
              value={item.fecha_inicio ? new Date(item.fecha_inicio) : null}
              onChange={(e) => onDateChange(e.value as Date, "fecha_inicio")}
              showIcon
              dateFormat="dd/mm/yy"
              className="w-full"
            />
          </div>
          <div className="field col-6 md:col-6">
            <label>Fecha Fin</label>
            <Calendar
              value={item.fecha_fin ? new Date(item.fecha_fin) : null}
              onChange={(e) => onDateChange(e.value as Date, "fecha_fin")}
              showIcon
              dateFormat="dd/mm/yy"
              className="w-full"
            />
          </div>
        </div>

        {isUsuarioNacional && (
          <div className="field col-12 md:col-4">
            <label>Provincia *</label>
            <Dropdown
              value={effectiveProvinciaId || null}
              options={provinciaOptions}
              onChange={(e) => handleProvinciaChange(e.value ?? null)}
              placeholder="Seleccionar provincia"
              disabled={provinciaOptions.length === 0}
              filter
              className="w-full"
            />
          </div>
        )}

        <div className="field col-12 md:col-4">
          <label>Canton *</label>
          <Dropdown
            value={effectiveCantonId || null}
            options={cantonOptions}
            onChange={(e) => handleCantonChange(e.value ?? null)}
            placeholder="Seleccionar canton"
            disabled={
              isUsuarioCantonal ||
              (isUsuarioNacional && !effectiveProvinciaId) ||
              cantonOptions.length === 0
            }
            filter
            className="w-full"
          />
        </div>

        <div className="field col-12 md:col-4">
          <label>Parroquia *</label>
          <Dropdown
            value={
              typeof item.parroquia_id === "number" && item.parroquia_id !== 0
                ? item.parroquia_id
                : null
            }
            options={parroquiaOptions}
            onChange={(e) => onDropdownChange(e, "parroquia_id")}
            placeholder="Seleccionar parroquia"
            disabled={parroquiaOptions.length === 0}
            filter
            className="w-full"
          />
        </div>

        <div className="field col-12 md:col-4">
          <label>Institucion *</label>
          <Dropdown
            value={
              typeof item.institucion_id === "number" ? item.institucion_id : null
            }
            options={institucionOptions}
            onChange={(e) => onDropdownChange(e, "institucion_id")}
            placeholder="Seleccionar institucion"
            filter
            className="w-full"
          />
        </div>

        <div>
          <label>Ubicacion en el mapa</label>
          <MapSelector
            latitud={item.latitud}
            longitud={item.longitud}
            initializeWithDefault={!item.id}
            onLocationChange={(lat, lng) => {
              onChange({ target: { name: "latitud", value: lat } });
              onChange({ target: { name: "longitud", value: lng } });
            }}
            height="200px"
            placeholder="Buscar direccion, calle, ciudad..."
          />
        </div>

        <div className="row">
          <div className="field col-6 md:col-6">
            <label>Latitud *</label>
            <InputNumber
              value={typeof item.latitud === "number" ? item.latitud : null}
              onValueChange={(e) =>
                onChange({ target: { name: "latitud", value: e.value } })
              }
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
            <label>Longitud *</label>
            <InputNumber
              value={typeof item.longitud === "number" ? item.longitud : null}
              onValueChange={(e) =>
                onChange({ target: { name: "longitud", value: e.value } })
              }
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
      </div>
    );
  };

  const resolveItemForEdit = async (
    row: RecursoMovilizadoListItem
  ): Promise<
    Partial<RecursoMovilizadoPayload> & { id?: number; recurso_id?: number }
  > => {
    const resolvedId = Number((row as any).id ?? (row as any).recurso_id ?? 0);
    let detail: any = null;
    if (resolvedId > 0) {
      try {
        const dRes = await authFetch(`${apiBase}/recursos_movilizados/${resolvedId}`, {
          headers: { accept: "application/json" },
        });
        if (dRes.ok) {
          detail = await dRes.json();
        }
      } catch {}
    }

    let recurso_tipo_id: number | undefined = undefined;
    let recurso_grupo_id: number | undefined = undefined;
    if (recursoTiposCat && recursoTiposCat.length > 0) {
      const tipo = recursoTiposCat.find((t) => t.nombre === row.recurso_tipo);
      recurso_tipo_id = tipo?.id || undefined;
      recurso_grupo_id = tipo?.recurso_grupo_id || undefined;
    }

    let institucion_id: number | undefined = undefined;
    if (row.institucion) {
      const inst = instituciones.find(
        (i) =>
          i.nombre === row.institucion ||
          `${i.siglas ? i.siglas + " - " : ""}${i.nombre}` === row.institucion
      );
      if (inst) institucion_id = inst.id;
    }

    const editProvinciaId =
      Number(
        detail?.provincia_destino_id ??
          (row as any).provincia_destino_id ??
          (row as any).provincia_id ??
          loginProvinciaId ??
          0
      ) || 0;
    const editCantonId =
      Number(
        detail?.canton_destino_id ??
          (row as any).canton_destino_id ??
          (row as any).canton_id ??
          loginCantonId ??
          0
      ) || 0;

    if (editProvinciaId > 0 && (!cantones || cantones.length === 0)) {
      try {
        const cRes = await authFetch(
          `${apiBase}/provincia/${editProvinciaId}/cantones/`,
          { headers: { accept: "application/json" } }
        );
        setCantones(cRes.ok ? await cRes.json() : []);
      } catch {}
    }

    const editParroquiaId =
      Number(
        detail?.parroquia_destino_id ??
          (row as any).parroquia_destino_id ??
          (row as any).parroquia_id ??
          0
      ) || 0;
    let parroquia_id: number | undefined = editParroquiaId || undefined;
    try {
      if ((!parroquias || parroquias.length === 0) && editCantonId && emergenciaId) {
        const paRes = await authFetch(
          `${apiBase}/canton/${editCantonId}/parroquias/emergencia/${emergenciaId}`,
          { headers: { accept: "application/json" } }
        );
        const paData = paRes.ok ? await paRes.json() : [];
        setParroquias(normalizeParroquias(paData, editCantonId));
      }
    } catch {}

    if (row.parroquia_nombre) {
      const pa = (parroquias || []).find((p) => p.nombre === row.parroquia_nombre);
      if (pa) parroquia_id = pa.id;
    }

    const cantidadValue = Number(
      detail?.cantidad_asignada ?? row.cantidad ?? row.cantidad_asignada ?? 0
    );

    return {
      id: resolvedId,
      recurso_id: resolvedId,
      activo: detail?.activo ?? true,
      cantidad_asignada: Number(row.cantidad_asignada ?? cantidadValue),
      canton_destino_id: editCantonId,
      canton_id: editCantonId,
      creador:
        detail?.creador ||
        datosLogin?.usuario_login ||
        datosLogin?.usuario_descripcion ||
        "usuario",
      emergencia_id: Number(detail?.emergencia_id ?? (selectedEmergenciaId || 0)),
      factor: Number(detail?.factor ?? row.factor ?? 0),
      fecha_fin: (detail?.fecha_fin ?? row.fecha_fin) || null,
      fecha_inicio:
        (detail?.fecha_inicio ?? row.fecha_inicio) ||
        new Date().toISOString().substring(0, 19),
      latitud: detail?.latitud_destino ?? detail?.latitud ?? row.latitud_destino ?? row.latitud ?? null,
      latitud_destino: detail?.latitud_destino ?? row.latitud_destino ?? row.latitud ?? null,
      longitud: detail?.longitud_destino ?? detail?.longitud ?? row.longitud_destino ?? row.longitud ?? null,
      longitud_destino: detail?.longitud_destino ?? row.longitud_destino ?? row.longitud ?? null,
      modificador:
        detail?.modificador ||
        datosLogin?.usuario_login ||
        datosLogin?.usuario_descripcion ||
        "usuario",
      parroquia_destino_id: Number(detail?.parroquia_destino_id ?? parroquia_id ?? 0),
      parroquia_id: parroquia_id ?? 0,
      provincia_destino_id: editProvinciaId,
      provincia_id: editProvinciaId,
      recurso_inventario_id: Number(
        detail?.recurso_inventario_id ??
          (row as any).recurso_inventario_id ??
          recurso_tipo_id ??
          0
      ),
      recurso_grupo_id,
      recurso_tipo_id,
      institucion_id: institucion_id ?? 0,
    };
  };

  const columns = [
    { field: "id", header: "ID", sortable: true },
    { field: "recurso_grupo", header: "Grupo", sortable: true },
    { field: "recurso_tipo", header: "Tipo", sortable: true },
    { field: "institucion", header: "Institucion", sortable: true },
    { field: "parroquia_nombre", header: "Parroquia", sortable: true },
    { field: "cantidad_asignada", header: "Cantidad Asignada", sortable: true },
    {
      field: "disponible",
      header: "Disponible",
      sortable: true,
      body: (r: RecursoMovilizadoListItem) =>
        Number(r.disponible) === 1 || r.disponible === true ? "Si" : "No",
    },
    { field: "fecha_inicio", header: "Fecha Inicio", sortable: true },
    { field: "fecha_fin", header: "Fecha Fin", sortable: true },
    { field: "latitud", header: "Latitud", sortable: true },
    { field: "longitud", header: "Longitud", sortable: true },
  ];

  return (
    <Card title="Recursos Movilizados">
      <BaseCRUD<RecursoMovilizadoListItem | RecursoMovilizadoPayload>
        title=""
        items={rows as any}
        columns={columns as any}
        renderForm={renderForm}
        onSave={handleSave}
        onDelete={handleDelete as any}
        resolveItemForEdit={resolveItemForEdit as any}
        initialItem={{
          activo: true,
          cantidad_asignada: 0,
          canton_destino_id: loginCantonId || 0,
          canton_id: loginCantonId || 0,
          creador: datosLogin?.usuario_login || "",
          emergencia_id: selectedEmergenciaId || 0,
          factor: 0,
          fecha_fin: null,
          fecha_inicio: new Date().toISOString().substring(0, 19),
          latitud: null,
          latitud_destino: null,
          longitud: null,
          longitud_destino: null,
          modificador: datosLogin?.usuario_login || "",
          parroquia_destino_id: 0,
          parroquia_id: 0,
          provincia_destino_id: loginProvinciaId || 0,
          provincia_id: loginProvinciaId || 0,
          recurso_inventario_id: 0,
          recurso_grupo_id: undefined as any,
          recurso_tipo_id: undefined as any,
          institucion_id: 0,
        }}
        idField="id"
        showDeleteButton={false}
      />
      {loading && <div className="mt-2">Cargando...</div>}
    </Card>
  );
};
