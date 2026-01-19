import React, { useEffect, useMemo, useState } from "react";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { InputNumber } from "primereact/inputnumber";
import { InputSwitch } from "primereact/inputswitch";
import { BaseCRUD } from "../../components/crud/BaseCRUD";
import { useAuth } from "../../context/AuthContext";
import MapSelector from "../../components/map/MapSelector"

interface RecursoMovilizadoListItem {
  recurso_id: number;
  recurso_grupo: string;
  recurso_tipo: string;
  cantidad: number;
  disponible: boolean;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  institucion: string | null;
  latitud: number | null;
  longitud: number | null;
  parroquia_nombre: string | null;
}

interface RecursoMovilizadoPost {
  activo: boolean;
  cantidad: number;
  canton_id: number;
  creador: string;
  disponible: boolean;
  emergencia_id: number;
  fecha_fin: string | null;
  fecha_inicio: string | null;
  institucion_id: number;
  latitud: number | null;
  longitud: number | null;
  parroquia_id: number;
  provincia_id: number;
  recurso_categoria_id: number;
  recurso_grupo_id: number;
  recurso_tipo_id: number;
}

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
    Array<{ id: number; nombre: string; canton_id: number }>
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

  // Load recurso grupos by categoria=2
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

  // Load recurso tipos by categoria=2 (independent of grupo)
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

  // Load instituciones catalog
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

  // Load provincias and defaults for cantones/parroquias based on login context
  useEffect(() => {
    const load = async () => {
      if (!selectedEmergenciaId) return;
      try {
        const p = await authFetch(
          `${apiBase}/provincias/emergencia/${selectedEmergenciaId}`,
          { headers: { accept: "application/json" } }
        );
        setProvincias(p.ok ? await p.json() : []);
      } catch {
        setProvincias([]);
      }
      // Preload cantones/parroquias from login defaults when available
      try {
        if (datosLogin?.provincia_id) {
          const c = await authFetch(
            `${apiBase}/provincia/${datosLogin.provincia_id}/cantones/`,
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
        if (datosLogin?.canton_id) {
          const pa = await authFetch(
            `${apiBase}/parroquias/canton/${datosLogin.canton_id}`,
            { headers: { accept: "application/json" } }
          );
          setParroquias(pa.ok ? await pa.json() : []);
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
    selectedEmergenciaId,
    datosLogin?.provincia_id,
    datosLogin?.canton_id,
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
          Array.isArray(data) ? (data as RecursoMovilizadoListItem[]) : []
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
    payload: Partial<RecursoMovilizadoPost> & {
      id?: number;
      recurso_id?: number;
    }
  ) => {
    const creator =
      datosLogin?.usuario_login || datosLogin?.usuario_descripcion || "usuario";
    const selectedTipo = recursoTiposCat.find(
      (t) => t.id === Number(payload.recurso_tipo_id)
    );
    const resolvedGrupoId =
      selectedTipo?.recurso_grupo_id ?? Number(payload.recurso_grupo_id ?? 0);
    const body: RecursoMovilizadoPost = {
      activo: payload.activo ?? true,
      cantidad: Number(payload.cantidad ?? 0),
      canton_id: payload.canton_id ?? (datosLogin?.canton_id || 0),
      creador: payload.creador ?? creator,
      disponible: payload.disponible ?? true,
      emergencia_id: payload.emergencia_id ?? (selectedEmergenciaId || 0),
      fecha_fin: payload.fecha_fin ?? null,
      fecha_inicio:
        payload.fecha_inicio ?? new Date().toISOString().substring(0, 19),
      institucion_id: payload.institucion_id ?? 0,
      latitud: payload.latitud ?? null,
      longitud: payload.longitud ?? null,
      parroquia_id: payload.parroquia_id ?? 0,
      provincia_id: payload.provincia_id ?? (datosLogin?.provincia_id || 0),
      recurso_categoria_id: 2,
      recurso_grupo_id: resolvedGrupoId,
      recurso_tipo_id: Number(payload.recurso_tipo_id ?? 0),
    };

    const id = (payload as any)?.id ?? (payload as any)?.recurso_id;
    const isEdit = !!id;
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
    }
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
    item: Partial<RecursoMovilizadoPost>,
    onChange: (e: any) => void
  ) => {
    const onDateChange = (
      date: string | Date | Date[] | null,
      field: keyof RecursoMovilizadoPost
    ) => {
      if (!date) return;
      let iso: string | null = null;
      if (Array.isArray(date)) {
        const d = date[0] as Date;
        iso = d ? new Date(d).toISOString().substring(0, 19) : null;
      } else if (typeof date === "string") {
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime()))
          iso = parsed.toISOString().substring(0, 19);
      } else {
        iso = date.toISOString().substring(0, 19);
      }
      onChange({ target: { name: field, value: iso } });
    };

    const onDropdownChange = (
      e: { value: any },
      field: keyof RecursoMovilizadoPost
    ) => {
      onChange({ target: { name: field, value: e.value } });
    };

    const onNumberChange = (
      e: { value: number | null },
      field: keyof RecursoMovilizadoPost
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
    const cantonOptions = cantones
      .filter((c) => !item.provincia_id || c.provincia_id === item.provincia_id)
      .map((c) => ({ label: c.nombre, value: c.id }));
    const parroquiaOptions = parroquias
      .filter((pa) => !item.canton_id || pa.canton_id === item.canton_id)
      .map((pa) => ({ label: pa.nombre, value: pa.id }));

    const handleProvinciaChange = async (provId: number | null) => {
      onChange({ target: { name: "provincia_id", value: provId || 0 } });
      // Reset dependent fields
      onChange({ target: { name: "canton_id", value: 0 } });
      onChange({ target: { name: "parroquia_id", value: 0 } });
      setParroquias([]);
      if (!provId) {
        setCantones([]);
        return;
      }
      try {
        const res = await authFetch(
          `${apiBase}/provincia/${provId}/cantones/`,
          { headers: { accept: "application/json" } }
        );
        setCantones(res.ok ? await res.json() : []);
      } catch {
        setCantones([]);
      }
    };

    const handleCantonChange = async (canId: number | null) => {
      onChange({ target: { name: "canton_id", value: canId || 0 } });
      onChange({ target: { name: "parroquia_id", value: 0 } });
      if (!canId) {
        setParroquias([]);
        return;
      }
      try {
        const res = await authFetch(`${apiBase}/parroquias/canton/${canId}`, {
          headers: { accept: "application/json" },
        });
        setParroquias(res.ok ? await res.json() : []);
      } catch {
        setParroquias([]);
      }
    };

    return (
      <div className="grid p-fluid">
        <div className="row">
          <div className="field col-6 md:col-4">
            <label>Cantidad *</label>
            <InputNumber
              value={Number(item.cantidad || 0)}
              onValueChange={(e) => onNumberChange(e, "cantidad")}
              min={0}
              className="w-full"
            />
          </div>
          {/*<div className="field col-6 md:col-4">
            <label>Disponible</label>
            <div className="d-flex align-items-center" style={{ gap: 8 }}>
              <InputSwitch
                checked={!!item.disponible}
                onChange={(e) =>
                  onChange({ target: { name: "disponible", value: e.value } })
                }
              />
            </div>
          </div>*/}
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
            onChange={(e) => onDropdownChange(e, "recurso_tipo_id")}
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
        <div className="field col-12 md:col-4" style={{ display: "none" }}>
          <label>Categoría (opcional)</label>
          <InputNumber
            value={2}
            onValueChange={(e) => onNumberChange(e, "recurso_categoria_id")}
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

        {/* Provincia y Cantón se obtienen del login; no se muestran en el modal */}
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
          <label>Institución</label>
          <Dropdown
            value={
              typeof item.institucion_id === "number"
                ? item.institucion_id
                : null
            }
            options={institucionOptions}
            onChange={(e) => onDropdownChange(e, "institucion_id")}
            placeholder="Seleccionar institución"
            filter
            className="w-full"
          />
        </div>

        <div>
          <label>Ubicación en el mapa</label>
          <MapSelector
            latitud={item.latitud}
            longitud={item.longitud}
            onLocationChange={(lat, lng) => {
              onChange({ target: { name: "latitud", value: lat } });
              onChange({ target: { name: "longitud", value: lng } });
            }}
            height="200px"
            placeholder="Buscar dirección, calle, ciudad..."
          />
        </div>

        <div className="row">
          <div className="field col-6 md:col-6">
            <label>Latitud</label>
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
            <label>Longitud</label>
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
    Partial<RecursoMovilizadoPost> & { id?: number; recurso_id?: number }
  > => {
    // Resolve tipo and grupo from the global categoria tipos list
    let recurso_tipo_id: number | undefined = undefined;
    let recurso_grupo_id: number | undefined = undefined;
    if (recursoTiposCat && recursoTiposCat.length > 0) {
      const tipo = recursoTiposCat.find((t) => t.nombre === row.recurso_tipo);
      recurso_tipo_id = tipo?.id || undefined;
      recurso_grupo_id = tipo?.recurso_grupo_id || undefined;
    }
    // Resolve institucion by display string
    let institucion_id: number | undefined = undefined;
    if (row.institucion) {
      const inst = instituciones.find(
        (i) =>
          i.nombre === row.institucion ||
          `${i.siglas ? i.siglas + " - " : ""}${i.nombre}` === row.institucion
      );
      if (inst) institucion_id = inst.id;
    }

    let parroquia_id: number | undefined = undefined;
    // Ensure parroquias loaded for current canton
    try {
      if ((!parroquias || parroquias.length === 0) && datosLogin?.canton_id) {
        const paRes = await authFetch(
          `${apiBase}/parroquias/canton/${datosLogin.canton_id}`,
          { headers: { accept: "application/json" } }
        );
        const paData = paRes.ok ? await paRes.json() : [];
        setParroquias(Array.isArray(paData) ? paData : []);
      }
    } catch {}
    if (row.parroquia_nombre) {
      const pa = (parroquias || []).find(
        (p) => p.nombre === row.parroquia_nombre
      );
      if (pa) parroquia_id = pa.id;
    }
    return {
      // include possible id fields from the row to detect edit in handleSave
      id: (row as any).id,
      recurso_id: (row as any).recurso_id,
      activo: true,
      cantidad: row.cantidad,
      canton_id: datosLogin?.canton_id || 0,
      creador:
        datosLogin?.usuario_login ||
        datosLogin?.usuario_descripcion ||
        "usuario",
      disponible: row.disponible,
      emergencia_id: selectedEmergenciaId || 0,
      fecha_fin: row.fecha_fin,
      fecha_inicio: row.fecha_inicio,
      institucion_id: institucion_id ?? 0,
      latitud: row.latitud ?? null,
      longitud: row.longitud ?? null,
      parroquia_id: parroquia_id ?? 0,
      provincia_id: datosLogin?.provincia_id || 0,
      recurso_categoria_id: 2,
      recurso_grupo_id,
      recurso_tipo_id,
    } as Partial<RecursoMovilizadoPost>;
  };

  const columns = [
    { field: "id", header: "ID", sortable: true },
    { field: "recurso_grupo", header: "Grupo", sortable: true },
    { field: "recurso_tipo", header: "Tipo", sortable: true },
    { field: "cantidad", header: "Cantidad", sortable: true },
    //{ field: 'disponible', header: 'Disponible', sortable: true, body: (r: RecursoMovilizadoListItem) => (r.disponible ? 'Sí' : 'No') },
    { field: "institucion", header: "Institución", sortable: true },
    { field: "parroquia_nombre", header: "Parroquia", sortable: true },
    { field: "fecha_inicio", header: "Fecha Inicio", sortable: true },
    { field: "fecha_fin", header: "Fecha Fin", sortable: true },
  ];

  return (
    <Card title="Recursos Movilizados">
      <BaseCRUD<RecursoMovilizadoListItem | RecursoMovilizadoPost>
        title=""
        items={rows as any}
        columns={columns as any}
        renderForm={renderForm}
        onSave={handleSave}
        onDelete={handleDelete as any}
        resolveItemForEdit={resolveItemForEdit as any}
        initialItem={{
          activo: true,
          cantidad: 0,
          canton_id: datosLogin?.canton_id || 0,
          creador: datosLogin?.usuario_login || "",
          disponible: true,
          emergencia_id: selectedEmergenciaId || 0,
          fecha_fin: null,
          fecha_inicio: new Date().toISOString().substring(0, 19),
          institucion_id: 0,
          latitud: null,
          longitud: null,
          parroquia_id: 0,
          provincia_id: datosLogin?.provincia_id || 0,
          recurso_categoria_id: 2,
          recurso_grupo_id: undefined as any,
          recurso_tipo_id: undefined as any,
        }}
        idField="id"
        showDeleteButton={false}
      />
      {loading && <div className="mt-2">Cargando...</div>}
    </Card>
  );
};
