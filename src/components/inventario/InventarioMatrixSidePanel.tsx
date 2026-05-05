import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InputNumber, Button, Typography, Space, Drawer, message, Spin, Select } from 'antd';
import { useAuth } from '../../context/AuthContext';
import InventarioMatrix, { Institucion, InventarioCellPayload, RecursoTipoRow, Mesa } from './InventarioMatrix';

const { Text } = Typography;

type InventarioRegistroApi = {
  id?: number | string;
  recurso_inventario_id?: number | string;
  recurso_tipo_id?: number | string;
  institucion_id?: number | string;
  institucion_duena_id?: number | string;
  institucion_siglas?: string;
  existencias?: number;
  inventario_disponible?: number;
  disponible?: number;
  parroquia_id?: number;
  parroquia_nombre?: string;
  canton_id?: number;
  provincia_id?: number;
};

type Provincia = { id: number; nombre: string };
type Canton = { id: number; nombre: string; provincia_id?: number };
type Parroquia = { id: number; nombre: string; canton_id?: number; provincia_id?: number };
type ParroquiaExistenciaDetalle = NonNullable<InventarioCellPayload['existencias_detalle']>[number];
type ParroquiaExistenciaDetalleLocal = ParroquiaExistenciaDetalle & { recurso_inventario_id?: number };
const resolveInventarioId = (value: { recurso_inventario_id?: unknown; id?: unknown }): number | undefined => {
  const parsed = Number(value?.recurso_inventario_id ?? value?.id ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};
const resolveInstitucionId = (value: {
  institucion_id?: unknown;
  institucion_duena_id?: unknown;
}): number | undefined => {
  const parsed = Number(value?.institucion_id ?? value?.institucion_duena_id ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};
const normalizeName = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export interface InventarioMatrixSidePanelProps {
  apiBase?: string;
  tableTitle?: string;
}

const buildApiBase = () => process.env.REACT_APP_API_URL || '/api';

const withTimeout = async (promise: Promise<Response>, ms = 3500): Promise<Response> => {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('timeout')), ms);
  });
  return Promise.race([promise, timeout]) as Promise<Response>;
};

export const InventarioMatrixSidePanel: React.FC<InventarioMatrixSidePanelProps> = ({
  apiBase = buildApiBase(),
  tableTitle = 'Matriz de Inventario por Institucion',
}) => {
  const {
    datosLogin,
    authFetch,
    recursoGrupos,
    recursoGruposStatus,
    loadRecursoGrupos,
    getRecursoTiposByGrupo,
  } = useAuth();

  const emergencyId = Number(localStorage.getItem('selectedEmergenciaId') || '0');
  const coeId = Number(datosLogin?.coe_id || 0);
  const assignedMesaId = Number(datosLogin?.mesa_id ?? 0);
  const hasAssignedMesa = Number.isFinite(assignedMesaId) && assignedMesaId !== 0;
  const loginProvinciaId = Number(datosLogin?.provincia_id ?? 0);
  const loginCantonId = Number(datosLogin?.canton_id ?? 0);
  const isUsuarioNacional = loginProvinciaId === 0 && loginCantonId === 0;
  const isUsuarioProvincial = loginProvinciaId > 0 && loginCantonId === 0;
  const isUsuarioCantonal = loginProvinciaId > 0 && loginCantonId > 0;

  const [loading, setLoading] = useState(false);
  const [savingParroquia, setSavingParroquia] = useState(false);
  const [mesasStatus, setMesasStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle');
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [selectedMesaId, setSelectedMesaId] = useState<number | undefined>(undefined);
  const [selectedGrupoId, setSelectedGrupoId] = useState<number | undefined>(undefined);
  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [rows, setRows] = useState<RecursoTipoRow[]>([]);
  const [matrix, setMatrix] = useState<Record<number, Record<number, InventarioCellPayload>>>({});
  const effectiveMesaId = hasAssignedMesa ? assignedMesaId : selectedMesaId;

  const matrixRef = useRef(matrix);
  useEffect(() => {
    matrixRef.current = matrix;
  }, [matrix]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<RecursoTipoRow | null>(null);
  const [selectedInstitucion, setSelectedInstitucion] = useState<Institucion | null>(null);
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [cantones, setCantones] = useState<Canton[]>([]);
  const [parroquiasOptions, setParroquiasOptions] = useState<Parroquia[]>([]);
  const [drawerProvinciaId, setDrawerProvinciaId] = useState<number | undefined>(undefined);
  const [drawerCantonId, setDrawerCantonId] = useState<number | undefined>(undefined);
  const [drawerInitialDetalles, setDrawerInitialDetalles] = useState<ParroquiaExistenciaDetalleLocal[]>([]);
  const [drawerParroquiaValues, setDrawerParroquiaValues] = useState<Record<number, number>>({});
  const [drawerParroquiaMeta, setDrawerParroquiaMeta] = useState<
    Record<number, { parroquia_nombre: string; canton_id?: number; provincia_id?: number; recurso_inventario_id?: number }>
  >({});
  const [drawerHasUnsavedChanges, setDrawerHasUnsavedChanges] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const confirmDiscardUnsavedChanges = useCallback(() => {
    if (!drawerHasUnsavedChanges) return true;
    return window.confirm('Tienes cambios sin guardar. Si sales, se perderán. ¿Deseas continuar?');
  }, [drawerHasUnsavedChanges]);

  useEffect(() => {
    if (recursoGruposStatus === 'idle') loadRecursoGrupos();
  }, [recursoGruposStatus, loadRecursoGrupos]);

  const fetchFirstArray = useCallback(async (urls: string[]) => {
    for (const url of urls) {
      try {
        const res = await withTimeout(authFetch(url, { headers: { accept: 'application/json' } }), 3500);
        if (!res.ok) continue;
        const data = await res.json();
        if (Array.isArray(data)) return data;
      } catch {
        // probar siguiente endpoint
      }
    }
    return [];
  }, [authFetch]);

  const fetchMesas = useCallback(async () => {
    if (!coeId) {
      setMesas([]);
      setSelectedMesaId(hasAssignedMesa ? assignedMesaId : undefined);
      setMesasStatus('failed');
      return;
    }
    setMesasStatus('loading');
    try {
      const res = await authFetch(`${apiBase}/mesas/coe/${coeId}`, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error('mesas_not_ok');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      const mapped: Mesa[] = list
        .map((x: any) => ({
          id: Number(x.id),
          nombre: String(x.mesa_nombre ?? x.nombre ?? 'Mesa'),
          siglas: x.mesa_siglas ?? x.siglas,
          grupo_mesa_abreviatura: String(x.grupo_mesa_abreviatura ?? x.grupo_mesa_abreviatura ?? 'General'),
        }))
        .filter((x: Mesa) => Number.isFinite(x.id));

      setMesas(mapped);
      setMesasStatus('succeeded');

      const defaultMesa = hasAssignedMesa ? assignedMesaId : mapped[0]?.id;
      setSelectedMesaId(defaultMesa);
    } catch {
      setMesas([]);
      setSelectedMesaId(hasAssignedMesa ? assignedMesaId : undefined);
      setMesasStatus('failed');
    }
  }, [apiBase, assignedMesaId, authFetch, coeId, hasAssignedMesa]);

  const fetchInstituciones = useCallback(async () => {
    if (!coeId || !effectiveMesaId) {
      setInstituciones([]);
      return;
    }
    const candidates = [
      `${apiBase}/instituciones_coe_mesa/coe/${coeId}/mesa/${effectiveMesaId}`,
      `${apiBase}/instituciones/emergencia/${emergencyId}`,
      `${apiBase}/instituciones`,
    ];

    for (const url of candidates) {
      try {
        const res = await withTimeout(authFetch(url, { headers: { accept: 'application/json' } }), 3000);
        if (!res.ok) continue;
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        const mapped: Institucion[] = list
          .map((x: any) => ({
            id: Number(x.institucion_id ?? x.id),
            nombre: String(x.nombre ?? x.institucion_nombre ?? 'Institucion'),
            siglas: x.siglas ?? x.abreviatura,
          }))
          .filter((x: Institucion) => Number.isFinite(x.id));
        setInstituciones(mapped);
        return;
      } catch {
        // intentar siguiente endpoint
      }
    }
    setInstituciones([]);
  }, [apiBase, authFetch, coeId, effectiveMesaId, emergencyId]);

  useEffect(() => {
    fetchMesas();
  }, [fetchMesas]);

  useEffect(() => {
    fetchInstituciones();
  }, [fetchInstituciones]);

  useEffect(() => {
    setRows([]);
    setMatrix({});
    setSelectedRow(null);
    setSelectedInstitucion(null);
    setDrawerOpen(false);
    setDrawerInitialDetalles([]);
    setDrawerParroquiaValues({});
    setDrawerParroquiaMeta({});
    setDrawerHasUnsavedChanges(false);
    setParroquiasOptions([]);
    setCantones([]);
  }, [effectiveMesaId]);

  const getCell = useCallback((recursoTipoId: number, institucionId: number) => {
    return matrix[recursoTipoId]?.[institucionId];
  }, [matrix]);

  const fetchDrawerDetallesFromBd = useCallback(async (
    rowId: number,
    institucionId: number
  ): Promise<ParroquiaExistenciaDetalleLocal[]> => {
    if (!selectedGrupoId || !effectiveMesaId || !coeId) return [];
    try {
      const url = `${apiBase}/recursos_inventario/recurso_grupo/${selectedGrupoId}/coe/${coeId}/mesa/${effectiveMesaId}/`;
      const res = await withTimeout(authFetch(url, { headers: { accept: 'application/json' } }), 4000);
      if (!res.ok) return [];
      const data = await res.json();
      const registros = (Array.isArray(data) ? data : []) as InventarioRegistroApi[];

      const detallesByParroquia = new Map<number, ParroquiaExistenciaDetalleLocal>();
      for (const it of registros) {
        const tipoId = Number(it.recurso_tipo_id);
        if (tipoId !== rowId) continue;

        let instId = Number(resolveInstitucionId(it) ?? 0);
        if (!Number.isFinite(instId) || instId <= 0) {
          const siglas = String(it.institucion_siglas || '').trim().toLowerCase();
          if (siglas) {
            const inst = instituciones.find((x) => String(x.siglas || '').trim().toLowerCase() === siglas);
            if (inst) instId = inst.id;
          }
        }
        if (instId !== institucionId) continue;

        const parroquiaId = Number(it.parroquia_id ?? 0);
        if (!Number.isFinite(parroquiaId) || parroquiaId <= 0) continue;

        const prev = detallesByParroquia.get(parroquiaId);
        const existencias = Math.max(0, Number(it.existencias ?? 0));
        detallesByParroquia.set(parroquiaId, {
          parroquia_id: parroquiaId,
          parroquia_nombre: String(it.parroquia_nombre ?? prev?.parroquia_nombre ?? ''),
          canton_id: Number(it.canton_id ?? prev?.canton_id ?? 0) || undefined,
          provincia_id: Number(it.provincia_id ?? prev?.provincia_id ?? 0) || undefined,
          existencias: Math.max(0, Number(prev?.existencias ?? 0)) + existencias,
          recurso_inventario_id:
            prev?.recurso_inventario_id ?? resolveInventarioId(it),
        });
      }
      return Array.from(detallesByParroquia.values());
    } catch {
      return [];
    }
  }, [apiBase, authFetch, coeId, effectiveMesaId, instituciones, selectedGrupoId]);

  const loadMatrixByGrupo = useCallback(async () => {
    if (!selectedGrupoId || !effectiveMesaId || !coeId) return;
    setLoading(true);
    try {
      const tipos = await getRecursoTiposByGrupo(selectedGrupoId);
      const nextRows: RecursoTipoRow[] = (tipos || []).map((t: any) => ({
        recurso_tipo_id: t.id,
        recurso_tipo_nombre: t.nombre,
      }));
      setRows(nextRows);

      const fresh: Record<number, Record<number, InventarioCellPayload>> = {};
      try {
        const url = `${apiBase}/recursos_inventario/recurso_grupo/${selectedGrupoId}/coe/${coeId}/mesa/${effectiveMesaId}/`;
        const res = await withTimeout(authFetch(url, { headers: { accept: 'application/json' } }), 4000);
        if (!res.ok) throw new Error('inventario_not_ok');
        const data = await res.json();
        const registros = (Array.isArray(data) ? data : []) as InventarioRegistroApi[];

        registros.forEach((it) => {
          const tipoId = Number(it.recurso_tipo_id);
          if (!Number.isFinite(tipoId)) return;

          let instId = Number(resolveInstitucionId(it) ?? 0);
          if (!Number.isFinite(instId) || instId <= 0) {
            const siglas = String(it.institucion_siglas || '').trim().toLowerCase();
            if (siglas) {
              const inst = instituciones.find((x) => String(x.siglas || '').trim().toLowerCase() === siglas);
              if (inst) instId = inst.id;
            }
          }
          if (!Number.isFinite(instId) || instId <= 0) return;

          if (!fresh[tipoId]) fresh[tipoId] = {};
          if (!fresh[tipoId][instId]) {
            fresh[tipoId][instId] = {
              existencias: 0,
              inventario_disponible: 0,
              existencias_detalle: [],
            };
          }

          const cell = fresh[tipoId][instId];
          const existencias = Math.max(0, Number(it.existencias ?? 0));
          const disponible = Math.max(0, Number(it.inventario_disponible ?? it.disponible ?? 0));

          cell.existencias = Math.max(0, Number(cell.existencias ?? 0)) + existencias;
          cell.inventario_disponible = Math.max(0, Number(cell.inventario_disponible ?? 0)) + disponible;

          const detalle: ParroquiaExistenciaDetalleLocal = {
            parroquia_id: Number(it.parroquia_id ?? 0),
            parroquia_nombre: it.parroquia_nombre,
            canton_id: Number(it.canton_id ?? 0) || undefined,
            provincia_id: Number(it.provincia_id ?? 0) || undefined,
            existencias,
            recurso_inventario_id:
              resolveInventarioId(it),
          };

          if (detalle.parroquia_id > 0) {
            const currentDetalles = (cell.existencias_detalle || []) as ParroquiaExistenciaDetalleLocal[];
            const existingDetalleIndex = currentDetalles.findIndex((d) => Number(d.parroquia_id) === detalle.parroquia_id);
            if (existingDetalleIndex >= 0) {
              const existingDetalle = currentDetalles[existingDetalleIndex];
              currentDetalles[existingDetalleIndex] = {
                ...existingDetalle,
                parroquia_nombre: existingDetalle.parroquia_nombre || detalle.parroquia_nombre,
                canton_id: existingDetalle.canton_id ?? detalle.canton_id,
                provincia_id: existingDetalle.provincia_id ?? detalle.provincia_id,
                existencias: Math.max(0, Number(existingDetalle.existencias ?? 0)) + detalle.existencias,
                recurso_inventario_id: existingDetalle.recurso_inventario_id ?? detalle.recurso_inventario_id,
              };
            } else {
              currentDetalles.push(detalle);
            }
            cell.existencias_detalle = currentDetalles;
          } else if (typeof cell.id !== 'number') {
            cell.id = detalle.recurso_inventario_id;
          }
        });
      } catch {
        message.error('No se pudo cargar existencias desde recursos_inventario.');
      }

      setMatrix(fresh);
    } finally {
      setLoading(false);
    }
  }, [apiBase, authFetch, coeId, effectiveMesaId, getRecursoTiposByGrupo, instituciones, selectedGrupoId]);

  useEffect(() => {
    if (!drawerOpen) return;
    if (isUsuarioProvincial || isUsuarioCantonal) {
      setDrawerProvinciaId(loginProvinciaId || undefined);
    }
    if (isUsuarioCantonal) {
      setDrawerCantonId(loginCantonId || undefined);
    }
  }, [drawerOpen, isUsuarioCantonal, isUsuarioProvincial, loginCantonId, loginProvinciaId]);

  useEffect(() => {
    if (!drawerOpen || !isUsuarioNacional) return;
    if (provincias.length > 0) return;
    let mounted = true;
    const loadProvincias = async () => {
      setGeoLoading(true);
      try {
        const data = await fetchFirstArray([
          `${apiBase}/provincias/emergencia/${emergencyId}`,
          `${apiBase}/provincias`,
        ]);
        if (!mounted) return;
        const mapped: Provincia[] = data
          .map((x: any) => ({
            id: Number(x.id),
            nombre: String(x.nombre ?? x.provincia_nombre ?? `Provincia ${x.id}`),
          }))
          .filter((x: Provincia) => Number.isFinite(x.id) && x.id > 0);
        setProvincias(mapped);
      } finally {
        if (mounted) setGeoLoading(false);
      }
    };
    loadProvincias();
    return () => {
      mounted = false;
    };
  }, [apiBase, drawerOpen, emergencyId, fetchFirstArray, isUsuarioNacional, provincias.length]);

  useEffect(() => {
    if (!drawerOpen || isUsuarioCantonal) return;
    const provinciaIdForCantones = isUsuarioNacional ? drawerProvinciaId : loginProvinciaId;
    if (!provinciaIdForCantones || provinciaIdForCantones <= 0) {
      setCantones([]);
      setDrawerCantonId(undefined);
      setParroquiasOptions([]);
      setDrawerParroquiaValues({});
      setDrawerParroquiaMeta({});
      return;
    }

    let mounted = true;
    const loadCantones = async () => {
      setGeoLoading(true);
      try {
        const data = await fetchFirstArray([
          `${apiBase}/provincia/${provinciaIdForCantones}/cantones/emergencia/${emergencyId}`,
          `${apiBase}/provincia/${provinciaIdForCantones}/cantones/`,
        ]);
        if (!mounted) return;
        const mapped: Canton[] = data
          .map((x: any) => ({
            id: Number(x.id),
            nombre: String(x.nombre ?? x.canton_nombre ?? `Cantón ${x.id}`),
            provincia_id: Number(x.provincia_id ?? provinciaIdForCantones),
          }))
          .filter((x: Canton) => Number.isFinite(x.id) && x.id > 0);
        setCantones(mapped);

        const detalleCantonId = Number(drawerInitialDetalles.find((d) => Number(d.canton_id) > 0)?.canton_id ?? 0);
        setDrawerCantonId((prev) => {
          if (prev && mapped.some((x) => x.id === prev)) return prev;
          if (detalleCantonId > 0 && mapped.some((x) => x.id === detalleCantonId)) return detalleCantonId;
          return undefined;
        });
      } finally {
        if (mounted) setGeoLoading(false);
      }
    };

    loadCantones();
    return () => {
      mounted = false;
    };
  }, [
    apiBase,
    drawerInitialDetalles,
    drawerOpen,
    drawerProvinciaId,
    emergencyId,
    fetchFirstArray,
    isUsuarioCantonal,
    isUsuarioNacional,
    loginProvinciaId,
  ]);

  useEffect(() => {
    if (!drawerOpen) return;
    const cantonIdForParroquias = isUsuarioCantonal ? loginCantonId : drawerCantonId;
    const provinciaIdForParroquias = isUsuarioNacional ? drawerProvinciaId : loginProvinciaId;
    if (!cantonIdForParroquias || cantonIdForParroquias <= 0) {
      setParroquiasOptions([]);
      setDrawerParroquiaValues({});
      setDrawerParroquiaMeta({});
      setDrawerHasUnsavedChanges(false);
      return;
    }

    let mounted = true;
    const loadParroquias = async () => {
      setGeoLoading(true);
      try {
        const data = await fetchFirstArray([
          `${apiBase}/canton/${cantonIdForParroquias}/parroquias/emergencia/${emergencyId}`,
          `${apiBase}/parroquias/canton/${cantonIdForParroquias}`,
        ]);
        if (!mounted) return;

        const mapped: Parroquia[] = data
          .map((x: any) => ({
            id: Number(x.id),
            nombre: String(x.nombre ?? x.parroquia_nombre ?? `Parroquia ${x.id}`),
            canton_id: Number(x.canton_id ?? cantonIdForParroquias),
            provincia_id: Number(x.provincia_id ?? provinciaIdForParroquias ?? 0),
          }))
          .filter((x: Parroquia) => Number.isFinite(x.id) && x.id > 0);

        const detallesMap = new Map<number, ParroquiaExistenciaDetalleLocal>();
        const rowId = Number(selectedRow?.recurso_tipo_id ?? 0);
        const institucionId = Number(selectedInstitucion?.id ?? 0);

        if (coeId > 0 && effectiveMesaId && provinciaIdForParroquias && rowId > 0 && institucionId > 0) {
          try {
            const endpoint = `${apiBase}/recursos_inventario/coe_id/${coeId}/mesa_id/${effectiveMesaId}/provincia_id/${provinciaIdForParroquias}/canton_id/${cantonIdForParroquias}/recurso_tipo_id/${rowId}/institucion_duena_id/${institucionId}`;
            const res = await withTimeout(authFetch(endpoint, { headers: { accept: 'application/json' } }), 4000);
            if (res.ok) {
              const invData = await res.json();
              const invRows = Array.isArray(invData) ? invData : [];
              invRows.forEach((it: any) => {
                let parroquiaId = Number(it.parroquia_id ?? it.parroquiaId ?? 0);
                if (!Number.isFinite(parroquiaId) || parroquiaId <= 0) {
                  const byName = normalizeName(it.parroquia_nombre ?? it.parroquia ?? it.nombre);
                  const matched = mapped.find((p) => normalizeName(p.nombre) === byName);
                  parroquiaId = Number(matched?.id ?? 0);
                }
                if (!Number.isFinite(parroquiaId) || parroquiaId <= 0) return;
                const prev = detallesMap.get(parroquiaId);
                detallesMap.set(parroquiaId, {
                  parroquia_id: parroquiaId,
                  parroquia_nombre: String(it.parroquia_nombre ?? prev?.parroquia_nombre ?? ''),
                  canton_id: Number(it.canton_id ?? cantonIdForParroquias) || undefined,
                  provincia_id: Number(it.provincia_id ?? provinciaIdForParroquias) || undefined,
                  existencias: Math.max(0, Number(prev?.existencias ?? 0)) + Math.max(0, Number(it.existencias ?? 0)),
                  recurso_inventario_id:
                    prev?.recurso_inventario_id ?? resolveInventarioId(it),
                });
              });
            }
          } catch {
            // fallback a los detalles ya cargados en memoria
          }
        }

        if (detallesMap.size === 0) {
          drawerInitialDetalles.forEach((d) => {
            detallesMap.set(Number(d.parroquia_id), d);
          });
        }

        const nextValues: Record<number, number> = {};
        const nextMeta: Record<number, { parroquia_nombre: string; canton_id?: number; provincia_id?: number; recurso_inventario_id?: number }> = {};
        mapped.forEach((p) => {
          const fromDetalle =
            detallesMap.get(p.id) ??
            Array.from(detallesMap.values()).find((d) => normalizeName(d.parroquia_nombre) === normalizeName(p.nombre));
          const val = Number(fromDetalle?.existencias ?? 0);
          if (val > 0) {
            nextValues[p.id] = val;
          }
          nextMeta[p.id] = {
            parroquia_nombre: p.nombre,
            canton_id: p.canton_id,
            provincia_id: p.provincia_id,
            recurso_inventario_id: fromDetalle?.recurso_inventario_id,
          };
        });

        setParroquiasOptions(mapped);
        setDrawerParroquiaValues(nextValues);
        setDrawerParroquiaMeta(nextMeta);
        setDrawerHasUnsavedChanges(false);
      } finally {
        if (mounted) setGeoLoading(false);
      }
    };

    loadParroquias();
    return () => {
      mounted = false;
    };
  }, [
    apiBase,
    authFetch,
    coeId,
    drawerCantonId,
    drawerInitialDetalles,
    drawerOpen,
    drawerProvinciaId,
    emergencyId,
    effectiveMesaId,
    fetchFirstArray,
    isUsuarioCantonal,
    isUsuarioNacional,
    loginCantonId,
    loginProvinciaId,
    selectedInstitucion,
    selectedRow,
  ]);

  const openCellPanel = useCallback((row: RecursoTipoRow, institucion: Institucion) => {
    if (!confirmDiscardUnsavedChanges()) return;

    const cell = matrixRef.current[row.recurso_tipo_id]?.[institucion.id];
    const detalles = (Array.isArray(cell?.existencias_detalle) ? cell.existencias_detalle : []) as ParroquiaExistenciaDetalleLocal[];
    const detalleProvinciaId = Number(detalles.find((d) => Number(d.provincia_id) > 0)?.provincia_id ?? 0);
    const detalleCantonId = Number(detalles.find((d) => Number(d.canton_id) > 0)?.canton_id ?? 0);

    setSelectedRow(row);
    setSelectedInstitucion(institucion);
    setDrawerInitialDetalles(detalles);
    setDrawerParroquiaValues({});
    setDrawerParroquiaMeta({});
    setParroquiasOptions([]);
    setDrawerHasUnsavedChanges(false);

    if (isUsuarioNacional) {
      setDrawerProvinciaId(detalleProvinciaId > 0 ? detalleProvinciaId : undefined);
      setDrawerCantonId(detalleCantonId > 0 ? detalleCantonId : undefined);
    } else if (isUsuarioProvincial) {
      setDrawerProvinciaId(loginProvinciaId || undefined);
      setDrawerCantonId(detalleCantonId > 0 ? detalleCantonId : undefined);
    } else if (isUsuarioCantonal) {
      setDrawerProvinciaId(loginProvinciaId || undefined);
      setDrawerCantonId(loginCantonId || undefined);
    } else {
      setDrawerProvinciaId(undefined);
      setDrawerCantonId(undefined);
    }

    setDrawerOpen(true);
  }, [confirmDiscardUnsavedChanges, isUsuarioCantonal, isUsuarioNacional, isUsuarioProvincial, loginCantonId, loginProvinciaId]);

  const handleParroquiaExistenciaChange = useCallback((parroquia: Parroquia, value: number | null) => {
    const safeValue = Math.max(0, Math.floor(Number(value ?? 0)));
    setDrawerHasUnsavedChanges(true);
    setDrawerParroquiaValues((prev) => {
      const next = { ...prev };
      if (safeValue <= 0) {
        delete next[parroquia.id];
      } else {
        next[parroquia.id] = safeValue;
      }
      return next;
    });
    setDrawerParroquiaMeta((prev) => ({
      ...prev,
      [parroquia.id]: {
        parroquia_nombre: parroquia.nombre,
        canton_id: parroquia.canton_id,
        provincia_id: parroquia.provincia_id,
      },
    }));
  }, []);

  const totalExistenciasParroquias = useMemo(() => {
    return Object.values(drawerParroquiaValues).reduce((acc, val) => acc + Math.max(0, Number(val || 0)), 0);
  }, [drawerParroquiaValues]);

  const drawerTotalExistencias = totalExistenciasParroquias;

  const drawerDetalleForMatrix = useMemo<ParroquiaExistenciaDetalleLocal[]>(() => {
    const selectedProvinciaId = isUsuarioNacional ? drawerProvinciaId : loginProvinciaId;
    const selectedCantonId = isUsuarioCantonal ? loginCantonId : drawerCantonId;
    return Object.entries(drawerParroquiaValues)
      .map(([parroquiaIdRaw, existenciasRaw]) => {
        const parroquiaId = Number(parroquiaIdRaw);
        const existencias = Math.max(0, Number(existenciasRaw || 0));
        const meta = drawerParroquiaMeta[parroquiaId];
        const original = drawerInitialDetalles.find((x) => Number(x.parroquia_id) === parroquiaId);
        const option = parroquiasOptions.find((x) => x.id === parroquiaId);
        return {
          parroquia_id: parroquiaId,
          parroquia_nombre: meta?.parroquia_nombre ?? option?.nombre,
          canton_id: selectedCantonId,
          provincia_id: selectedProvinciaId,
          existencias,
          recurso_inventario_id: original?.recurso_inventario_id ?? meta?.recurso_inventario_id,
        };
      })
      .filter((d) =>
        Number.isFinite(d.parroquia_id) &&
        d.parroquia_id > 0 &&
        Number.isFinite(Number(d.canton_id ?? 0)) &&
        Number(d.canton_id ?? 0) > 0 &&
        Number.isFinite(Number(d.provincia_id ?? 0)) &&
        Number(d.provincia_id ?? 0) > 0 &&
        d.existencias > 0
      );
  }, [
    drawerCantonId,
    drawerInitialDetalles,
    drawerParroquiaMeta,
    drawerParroquiaValues,
    drawerProvinciaId,
    isUsuarioCantonal,
    isUsuarioNacional,
    loginCantonId,
    loginProvinciaId,
    parroquiasOptions,
  ]);

  const blockContextChangeOnUnsaved = useCallback(() => {
    return !confirmDiscardUnsavedChanges();
  }, [confirmDiscardUnsavedChanges]);

  const persistInventarioCreateOrUpdate = useCallback(async (
    detalle: ParroquiaExistenciaDetalleLocal,
    recursoTipoId: number,
    institucionId: number
  ): Promise<number | undefined> => {
    const usuarioLogin = String(datosLogin?.usuario_login || 'frontend');
    let recordId = Number(detalle.recurso_inventario_id ?? 0);

    // Primera carga/cambio de canton: si el id aun no esta en memoria, buscarlo en backend
    if (recordId <= 0 && coeId > 0 && effectiveMesaId) {
      try {
        const lookupUrl = `${apiBase}/recursos_inventario/coe_id/${coeId}/mesa_id/${effectiveMesaId}/provincia_id/${Number(detalle.provincia_id ?? 0)}/canton_id/${Number(detalle.canton_id ?? 0)}/recurso_tipo_id/${recursoTipoId}/institucion_duena_id/${institucionId}`;
        const lookupRes = await withTimeout(authFetch(lookupUrl, { headers: { accept: 'application/json' } }), 4000);
        if (lookupRes.ok) {
          const lookupData = await lookupRes.json();
          const lookupRows = Array.isArray(lookupData) ? lookupData : [];
          const byParroquia = lookupRows.find((it: any) => Number(it?.parroquia_id ?? 0) === Number(detalle.parroquia_id ?? 0));
          const resolved = resolveInventarioId(byParroquia ?? {});
          if (resolved) recordId = resolved;
        }
      } catch {
        // si falla la busqueda, continuar con flujo normal
      }
    }

    if (recordId > 0) {
      const updateBody = [{ existencias: detalle.existencias, recurso_inventario_id: recordId }];
      const updateRes = await authFetch(`${apiBase}/recursos_inventario/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody),
      });
      if (!updateRes.ok) throw new Error('save_failed');
      return recordId;
    }

    const createBody = {
      activo: true,
      canton_id: Number(detalle.canton_id ?? 0),
      coe_id: coeId,
      creador: usuarioLogin,
      recurso_tipo_id: recursoTipoId,
      existencias: Number(detalle.existencias ?? 0),
      institucion_duena_id: institucionId,
      mesa_id: effectiveMesaId,
      modificador: usuarioLogin,
      parroquia_id: Number(detalle.parroquia_id ?? 0),
      provincia_id: Number(detalle.provincia_id ?? 0),
    };
    if (
      Number(createBody.provincia_id) <= 0 ||
      Number(createBody.canton_id) <= 0 ||
      Number(createBody.parroquia_id) <= 0
    ) {
      throw new Error('invalid_geo_ids');
    }

    const createRes = await authFetch(`${apiBase}/recursos_inventario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createBody),
    });
    if (!createRes.ok) throw new Error('save_failed');

    try {
      const payload = await createRes.json();
      const payloadId = Number(payload?.recurso_inventario_id ?? payload?.id ?? 0);
      return payloadId > 0 ? payloadId : undefined;
    } catch {
      return undefined;
    }
  }, [apiBase, authFetch, coeId, datosLogin?.usuario_login, effectiveMesaId]);

  const saveParroquia = useCallback(async () => {
    if (!selectedRow || !selectedInstitucion) {
      message.warning('Seleccione una celda de la matriz.');
      return;
    }
    if (!effectiveMesaId || !selectedGrupoId) {
      message.warning('Seleccione mesa y grupo de recurso para cargar la matriz.');
      return;
    }
    if (isUsuarioNacional && !drawerProvinciaId) {
      message.warning('Seleccione una provincia antes de guardar.');
      return;
    }
    if ((isUsuarioNacional || isUsuarioProvincial) && !drawerCantonId) {
      message.warning('Seleccione un cantón antes de guardar.');
      return;
    }
    if (!drawerHasUnsavedChanges) {
      message.info('No hay cambios por guardar en esta parroquia.');
      return;
    }
    if (drawerDetalleForMatrix.length === 0) {
      message.warning('Debe seleccionar provincia, canton y parroquia validos para guardar.');
      return;
    }

    setSavingParroquia(true);
    try {
      const rowId = selectedRow.recurso_tipo_id;
      const institucionId = selectedInstitucion.id;
      const currentCell = matrixRef.current[rowId]?.[institucionId];
      const currentDetalles = ((currentCell?.existencias_detalle || []) as ParroquiaExistenciaDetalleLocal[]);
      const nextDetallesMap = new Map<number, ParroquiaExistenciaDetalleLocal>();
      drawerDetalleForMatrix.forEach((d) => {
        nextDetallesMap.set(Number(d.parroquia_id), d);
      });

      const persistedDetalles: ParroquiaExistenciaDetalleLocal[] = [];
      for (const detalle of drawerDetalleForMatrix) {
        const persistedId = await persistInventarioCreateOrUpdate(detalle, rowId, institucionId);
        persistedDetalles.push({ ...detalle, recurso_inventario_id: persistedId ?? detalle.recurso_inventario_id });
      }

      for (const detalleActual of currentDetalles) {
        const parroquiaId = Number(detalleActual.parroquia_id);
        if (parroquiaId <= 0 || nextDetallesMap.has(parroquiaId)) continue;
        const currentId = Number(detalleActual.recurso_inventario_id ?? 0);
        if (currentId <= 0) continue;
        await persistInventarioCreateOrUpdate({ ...detalleActual, existencias: 0 }, rowId, institucionId);
      }

      const existencias = persistedDetalles.reduce((acc, d) => acc + Math.max(0, Number(d.existencias || 0)), 0);
      setMatrix((prev) => ({
        ...prev,
        [rowId]: {
          ...(prev[rowId] || {}),
          [institucionId]: {
            ...(prev[rowId]?.[institucionId] || {}),
            existencias,
            inventario_disponible: Math.max(0, Number(prev[rowId]?.[institucionId]?.inventario_disponible ?? 0)),
            existencias_detalle: persistedDetalles,
          },
        },
      }));

      setDrawerInitialDetalles(persistedDetalles);
      setDrawerHasUnsavedChanges(false);
      await loadMatrixByGrupo();
      message.success('Parroquia guardada correctamente.');
    } catch {
      message.error('Error al guardar en recursos_inventario.');
    } finally {
      setSavingParroquia(false);
    }
  }, [
    drawerCantonId,
    drawerDetalleForMatrix,
    drawerHasUnsavedChanges,
    drawerProvinciaId,
    effectiveMesaId,
    isUsuarioNacional,
    isUsuarioProvincial,
    loadMatrixByGrupo,
    persistInventarioCreateOrUpdate,
    selectedGrupoId,
    selectedInstitucion,
    selectedRow,
  ]);

  const onDrawerProvinciaChange = useCallback((value: number) => {
    if (blockContextChangeOnUnsaved()) return;
    setDrawerProvinciaId(value);
    setDrawerCantonId(undefined);
    setParroquiasOptions([]);
    setDrawerParroquiaValues({});
    setDrawerParroquiaMeta({});
    setDrawerHasUnsavedChanges(false);
  }, [blockContextChangeOnUnsaved]);

  const onDrawerCantonChange = useCallback((value: number) => {
    if (blockContextChangeOnUnsaved()) return;
    setDrawerCantonId(value);
    setParroquiasOptions([]);
    setDrawerParroquiaValues({});
    setDrawerParroquiaMeta({});
    setDrawerHasUnsavedChanges(false);
  }, [blockContextChangeOnUnsaved]);

  const closeDrawer = useCallback(() => {
    if (!confirmDiscardUnsavedChanges()) return;
    setDrawerOpen(false);
  }, [confirmDiscardUnsavedChanges]);

  useEffect(() => {
    if (!drawerOpen || !selectedRow || !selectedInstitucion) return;
    let mounted = true;
    const refreshDrawerFromBd = async () => {
      const bdDetalles = await fetchDrawerDetallesFromBd(selectedRow.recurso_tipo_id, selectedInstitucion.id);
      if (!mounted || bdDetalles.length === 0) return;
      setDrawerInitialDetalles(bdDetalles);
    };
    refreshDrawerFromBd();
    return () => {
      mounted = false;
    };
  }, [drawerOpen, fetchDrawerDetallesFromBd, selectedInstitucion, selectedRow]);

  return (
    <div>
      <Spin spinning={loading && rows.length === 0}>
        <InventarioMatrix
          tableTitle={tableTitle}
          mesas={mesas}
          mesasStatus={mesasStatus}
          selectedMesaId={effectiveMesaId}
          onMesaChange={(mesaId) => setSelectedMesaId(mesaId)}
          hideMesaSelector={hasAssignedMesa}
          recursoGrupos={recursoGrupos}
          recursoGruposStatus={recursoGruposStatus}
          selectedGrupoId={selectedGrupoId}
          onGrupoChange={(grupoId) => setSelectedGrupoId(grupoId)}
          onLoadMatrix={loadMatrixByGrupo}
          rows={rows}
          instituciones={instituciones}
          getCell={getCell}
          onCellClick={openCellPanel}
          selectedRowId={selectedRow?.recurso_tipo_id}
          selectedInstitucionId={selectedInstitucion?.id}
          loading={loading}
          loadDisabled={!effectiveMesaId || !selectedGrupoId || instituciones.length === 0}
        />
      </Spin>

      <Drawer
        title={selectedRow && selectedInstitucion ? `${selectedRow.recurso_tipo_nombre} - ${selectedInstitucion.nombre}` : 'Detalle'}
        placement="right"
        width={400}
        onClose={closeDrawer}
        open={drawerOpen}
      >
        {selectedRow && selectedInstitucion ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <div style={{ border: '1px solid #0ea5e9', borderRadius: 10, padding: 12, background: '#e0f2fe', boxShadow: '0 0 0 1px #9ed2e9' }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Registro de Inventario por Parroquia</Text>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                {isUsuarioNacional ? (
                  <div>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>Provincia</Text>
                    <Select
                      placeholder="Seleccione provincia"
                      options={provincias.map((p) => ({ label: p.nombre, value: p.id }))}
                      value={drawerProvinciaId}
                      onChange={onDrawerProvinciaChange}
                      style={{ width: '100%' }}
                      loading={geoLoading}
                    />
                  </div>
                ) : null}

                {(isUsuarioNacional || isUsuarioProvincial) ? (
                  <div>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>Cantón</Text>
                    <Select
                      placeholder="Seleccione cantón"
                      options={cantones.map((c) => ({ label: c.nombre, value: c.id }))}
                      value={drawerCantonId}
                      onChange={onDrawerCantonChange}
                      style={{ width: '100%' }}
                      loading={geoLoading}
                      disabled={isUsuarioNacional && !drawerProvinciaId}
                    />
                  </div>
                ) : null}

                <div>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Existencias por Parroquia</Text>
                  <Spin spinning={geoLoading}>
                    <div style={{ maxHeight: 450, overflowY: 'auto', border: '1px solid #bfdbfe', borderRadius: 8, background: '#fff', padding: 8 }}>
                      {(isUsuarioNacional && !drawerProvinciaId) ? (
                        <Text type="secondary">Seleccione una provincia para continuar.</Text>
                      ) : ((isUsuarioNacional || isUsuarioProvincial) && !drawerCantonId) ? (
                        <Text type="secondary">Seleccione un cantón para listar parroquias.</Text>
                      ) : parroquiasOptions.length === 0 ? (
                        <Text type="secondary">No hay parroquias disponibles para el cantón seleccionado.</Text>
                      ) : (
                        parroquiasOptions.map((parroquia) => (
                          <div
                            key={parroquia.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 110px',
                              gap: 8,
                              alignItems: 'center',
                              padding: '6px 4px',
                              borderBottom: '1px solid #f1f5f9',
                            }}
                          >
                            <Text>{parroquia.nombre}</Text>
                            <InputNumber
                              min={0}
                              precision={0}
                              value={drawerParroquiaValues[parroquia.id] ?? 0}
                              onChange={(value) => handleParroquiaExistenciaChange(parroquia, typeof value === 'number' ? value : 0)}
                              style={{ width: '100%' }}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </Spin>
                </div>

                <div>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Existencias (Total Calculado)</Text>
                  <InputNumber
                    type="number"
                    min={0}
                    value={drawerTotalExistencias}
                    style={{ width: '100%' }}
                    disabled
                  />
                </div>
              </div>
            </div>
            <Space>
              <Button onClick={closeDrawer}>Cerrar</Button>
              <Button type="primary" onClick={saveParroquia} loading={savingParroquia}>
                Guardar
              </Button>
            </Space>
          </Space>
        ) : null}
      </Drawer>
    </div>
  );
};

export default InventarioMatrixSidePanel;
