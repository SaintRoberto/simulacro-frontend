import React, { useCallback, useEffect, useRef, useState } from 'react';
import { InputNumber, Button, Typography, Space, Drawer, message, Spin } from 'antd';
import { useAuth } from '../../context/AuthContext';
import InventarioMatrix, { Institucion, InventarioCellPayload, RecursoTipoRow } from './InventarioMatrix';

const { Text } = Typography;

type InventarioRegistroApi = {
  id?: number;
  recurso_tipo_id?: number;
  institucion_id?: number;
  existencias?: number;
  inventario_disponible?: number;
  disponible?: number;
};

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
  const isNacionalReadOnly = datosLogin?.coe_id === 1;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedGrupoId, setSelectedGrupoId] = useState<number | undefined>(undefined);
  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [rows, setRows] = useState<RecursoTipoRow[]>([]);
  const [matrix, setMatrix] = useState<Record<number, Record<number, InventarioCellPayload>>>({});

  const matrixRef = useRef(matrix);
  useEffect(() => {
    matrixRef.current = matrix;
  }, [matrix]);

  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<RecursoTipoRow | null>(null);
  const [selectedInstitucion, setSelectedInstitucion] = useState<Institucion | null>(null);
  const [draftExistencias, setDraftExistencias] = useState<number>(0);
  const [draftDisponible, setDraftDisponible] = useState<number>(0);

  useEffect(() => {
    if (recursoGruposStatus === 'idle') loadRecursoGrupos();
  }, [recursoGruposStatus, loadRecursoGrupos]);

  const fetchInstituciones = useCallback(async () => {
    const candidates = [
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
            id: Number(x.id ?? x.institucion_id),
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
  }, [apiBase, authFetch, emergencyId]);

  useEffect(() => {
    fetchInstituciones();
  }, [fetchInstituciones]);

  const getCell = useCallback((recursoTipoId: number, institucionId: number) => {
    return matrixRef.current[recursoTipoId]?.[institucionId];
  }, []);

  const loadMatrixByGrupo = useCallback(async () => {
    if (!selectedGrupoId) return;
    setLoading(true);
    try {
      const tipos = await getRecursoTiposByGrupo(selectedGrupoId);
      const nextRows: RecursoTipoRow[] = (tipos || []).map((t: any) => ({
        recurso_tipo_id: t.id,
        recurso_tipo_nombre: t.nombre,
      }));
      setRows(nextRows);

      const fresh: Record<number, Record<number, InventarioCellPayload>> = {};
      const endpointCandidates = [
        `${apiBase}/inventario/registros/grupo/${selectedGrupoId}/emergencia/${emergencyId}`,
        `${apiBase}/inventario/registros/grupo/${selectedGrupoId}`,
      ];

      for (const url of endpointCandidates) {
        try {
          const res = await withTimeout(authFetch(url, { headers: { accept: 'application/json' } }), 3200);
          if (!res.ok) continue;
          const data = await res.json();
          const registros = (Array.isArray(data) ? data : []) as InventarioRegistroApi[];
          registros.forEach((it) => {
            const tipoId = Number(it.recurso_tipo_id);
            const instId = Number(it.institucion_id);
            if (!Number.isFinite(tipoId) || !Number.isFinite(instId)) return;
            if (!fresh[tipoId]) fresh[tipoId] = {};
            fresh[tipoId][instId] = {
              id: typeof it.id === 'number' ? it.id : undefined,
              existencias: Number(it.existencias ?? 0),
              inventario_disponible: Number(it.inventario_disponible ?? it.disponible ?? 0),
            };
          });
          break;
        } catch {
          // intentar siguiente
        }
      }

      setMatrix(fresh);
      setDirtyKeys(new Set());
    } finally {
      setLoading(false);
    }
  }, [apiBase, authFetch, emergencyId, getRecursoTiposByGrupo, selectedGrupoId]);

  const openCellPanel = useCallback((row: RecursoTipoRow, institucion: Institucion) => {
    const cell = matrixRef.current[row.recurso_tipo_id]?.[institucion.id];
    setSelectedRow(row);
    setSelectedInstitucion(institucion);
    setDraftExistencias(typeof cell?.existencias === 'number' ? cell.existencias : 0);
    setDraftDisponible(typeof cell?.inventario_disponible === 'number' ? cell.inventario_disponible : 0);
    setDrawerOpen(true);
  }, []);

  const applyDrawerToMatrix = useCallback(() => {
    if (!selectedRow || !selectedInstitucion) return;
    const existencias = Math.max(0, Number(draftExistencias || 0));
    const inventarioDisponible = Math.max(0, Math.min(Number(draftDisponible || 0), existencias));

    setMatrix((prev) => ({
      ...prev,
      [selectedRow.recurso_tipo_id]: {
        ...(prev[selectedRow.recurso_tipo_id] || {}),
        [selectedInstitucion.id]: {
          ...(prev[selectedRow.recurso_tipo_id]?.[selectedInstitucion.id] || {}),
          existencias,
          inventario_disponible: inventarioDisponible,
        },
      },
    }));

    const key = `${selectedRow.recurso_tipo_id}-${selectedInstitucion.id}`;
    setDirtyKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, [draftDisponible, draftExistencias, selectedInstitucion, selectedRow]);

  useEffect(() => {
    if (!drawerOpen || !selectedRow || !selectedInstitucion) return;
    applyDrawerToMatrix();
  }, [draftExistencias, draftDisponible, drawerOpen, selectedRow, selectedInstitucion, applyDrawerToMatrix]);

  const saveAll = async () => {
    if (isNacionalReadOnly) {
      message.warning('El COE Nacional no puede editar esta matriz.');
      return;
    }
    if (!selectedGrupoId || rows.length === 0 || instituciones.length === 0) {
      message.warning('Seleccione un grupo de recurso para cargar la matriz.');
      return;
    }
    if (dirtyKeys.size === 0) {
      message.info('No hay cambios por guardar.');
      return;
    }

    setSaving(true);
    try {
      const tasks: Promise<Response>[] = [];
      dirtyKeys.forEach((k) => {
        const [tipoIdRaw, instIdRaw] = k.split('-');
        const tipoId = Number(tipoIdRaw);
        const instId = Number(instIdRaw);
        const cell = matrixRef.current[tipoId]?.[instId];
        if (!cell) return;

        const body = {
          activo: true,
          recurso_grupo_id: selectedGrupoId,
          recurso_tipo_id: tipoId,
          institucion_id: instId,
          existencias: Number(cell.existencias ?? 0),
          inventario_disponible: Number(cell.inventario_disponible ?? 0),
          emergencia_id: emergencyId,
          creador: datosLogin?.usuario_login || 'frontend',
        };

        if (cell.id) {
          tasks.push(
            authFetch(`${apiBase}/inventario/registros/${cell.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            })
          );
        } else {
          tasks.push(
            authFetch(`${apiBase}/inventario/registros`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            })
          );
        }
      });

      await Promise.all(tasks);
      setDirtyKeys(new Set());
      message.success('Cambios guardados');
    } catch {
      message.error('Error al guardar. Verifique los endpoints de inventario.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Spin spinning={loading && rows.length === 0}>
        <InventarioMatrix
          tableTitle={tableTitle}
          recursoGrupos={recursoGrupos}
          recursoGruposStatus={recursoGruposStatus}
          selectedGrupoId={selectedGrupoId}
          onGrupoChange={(grupoId) => setSelectedGrupoId(grupoId)}
          onLoadMatrix={loadMatrixByGrupo}
          onSaveAll={saveAll}
          saving={saving}
          saveDisabled={isNacionalReadOnly || rows.length === 0 || instituciones.length === 0}
          dirtyCount={dirtyKeys.size}
          rows={rows}
          instituciones={instituciones}
          getCell={getCell}
          onCellClick={openCellPanel}
          selectedRowId={selectedRow?.recurso_tipo_id}
          selectedInstitucionId={selectedInstitucion?.id}
          loading={loading}
          loadDisabled={!selectedGrupoId || instituciones.length === 0}
        />
      </Spin>

      <Drawer
        title={selectedRow && selectedInstitucion ? `${selectedRow.recurso_tipo_nombre} - ${selectedInstitucion.nombre}` : 'Detalle'}
        placement="right"
        width={420}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
      >
        {selectedRow && selectedInstitucion ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <div style={{ border: '1px solid #0ea5e9', borderRadius: 10, padding: 12, background: '#e0f2fe', boxShadow: '0 0 0 1px #9ed2e9' }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Registro de Inventario</Text>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Existencias</Text>
                  <InputNumber
                    min={0}
                    value={draftExistencias}
                    onChange={(v) => {
                      const val = typeof v === 'number' ? v : 0;
                      setDraftExistencias(val);
                      if (draftDisponible > val) setDraftDisponible(val);
                    }}
                    style={{ width: '100%' }}
                    disabled={isNacionalReadOnly}
                  />
                </div>
                <div>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Inventario disponible</Text>
                  <InputNumber
                    min={0}
                    max={draftExistencias}
                    value={draftDisponible}
                    onChange={(v) => setDraftDisponible(typeof v === 'number' ? v : 0)}
                    style={{ width: '100%' }}
                    disabled={isNacionalReadOnly}
                  />
                </div>
              </div>
            </div>
            <Space>
              <Button onClick={() => setDrawerOpen(false)}>Cerrar</Button>
            </Space>
          </Space>
        ) : null}
      </Drawer>
    </div>
  );
};

export default InventarioMatrixSidePanel;
