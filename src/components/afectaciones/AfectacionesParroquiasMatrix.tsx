import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Table, InputNumber, Button, Modal, Spin, Typography, Space, Select, Row, Col, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SettingOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const { Text, Title } = Typography;

// Types based on the provided endpoints
export interface Parroquia {
  abreviatura: string;
  activo: boolean;
  canton_id: number;
  creacion: string;
  creador: string;
  dpa: string;
  id: number;
  modificacion: string;
  modificador: string;
  nombre: string;
  provincia_id: number;
}

export interface AfectacionVariable {
  activo: boolean;
  coe_id: number;
  creacion: string;
  creador: string;
  dato_tipo_id: number;
  id: number;
  infraestructura_tipo_id: number;
  mesa_grupo_id: number;
  modificacion: string;
  modificador: string;
  nombre: string;
  observaciones: string;
  requiere_costo: boolean;
  requiere_gis: boolean;
}

export interface Provincia {
  abreviatura: string;
  activo: boolean;
  creacion: string;
  creador: string;
  dpa: string;
  id: number;
  modificacion: string;
  modificador: string;
  nombre: string;
}

export interface Canton {
  abreviatura: string;
  activo: boolean;
  creacion: string;
  creador: string;
  dpa: string;
  id: number;
  modificacion: string;
  modificador: string;
  nombre: string;
  provincia_id: number;
}

// Cell payload to store user inputs
export interface AfectacionCellPayload {
  cantidad?: number | null;
  costo?: number | null;
  id?: number; // registro id cuando exista
}

// Component props allow providing ids, but default to the ones in the prompt
export interface AfectacionesParroquiasMatrixProps {
  apiBase?: string; // default process.env.REACT_APP_API_URL || '/api'
  cantonId?: number; // default 901
  mesaGrupoId?: number; // default 1
  tableTitle?: string;
}

const buildApiBase = () => process.env.REACT_APP_API_URL || '/api';
const emergencyId = 1;

export const AfectacionesParroquiasMatrix: React.FC<AfectacionesParroquiasMatrixProps> = ({
  apiBase = buildApiBase(),
  cantonId = 901,
  mesaGrupoId = 1,
  tableTitle = 'Matriz de Afectaciones por Parroquia',
}) => {
  const { datosLogin, authFetch } = useAuth();  
  const mesagrupo_Id = datosLogin?.mesa_grupo_id ?? mesaGrupoId;
  const [loading, setLoading] = useState(false);
  const [parroquias, setParroquias] = useState<Parroquia[]>([]);
  const [variables, setVariables] = useState<AfectacionVariable[]>([]);
  // Store the matrix in state for React to know when to re-render
  const [matrix, setMatrix] = useState<Record<number, Record<number, AfectacionCellPayload>>>({});
  // Also keep a ref to avoid stale closures in memoized renderers
  const matrixRef = useRef(matrix);
  useEffect(() => {
    matrixRef.current = matrix;
  }, [matrix]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<{ parroquia?: Parroquia; variable?: AfectacionVariable } | null>(null);
  // Infraestructura detalles (modal)
  type InfraDetalle = {
    afectacion_variable_registro_detalle_id: number | null;
    afectacion_variable_registro_id: number | null;
    infraestructura_id: number;
    nombre: string;
    registrada: boolean;
  };
  const [infraLoading, setInfraLoading] = useState(false);
  const [infraList, setInfraList] = useState<InfraDetalle[]>([]);
  const [infraChecked, setInfraChecked] = useState<number[]>([]);

  // New: selectors state
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [cantones, setCantones] = useState<Canton[]>([]);
  const [parroquiasOptions, setParroquiasOptions] = useState<Parroquia[]>([]);
  const [provinciaId, setProvinciaId] = useState<number | undefined>(undefined);
  const [cantonSelId, setCantonSelId] = useState<number | undefined>(undefined);
  const [parroquiasSelIds, setParroquiasSelIds] = useState<number[]>([]);
  // Track record IDs by parroquia/variable for updates
  const [recordIds, setRecordIds] = useState<Record<number, Record<number, number>>>({});
  const [saving, setSaving] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  // Initialize selectors from login
  useEffect(() => {
    if (datosLogin) {
      if (provinciaId === undefined) setProvinciaId(datosLogin.provincia_id);
      if (cantonSelId === undefined) setCantonSelId(datosLogin.canton_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datosLogin?.provincia_id, datosLogin?.canton_id]);

  // authFetch variables and provincias
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [provRes, vRes] = await Promise.all([
          authFetch(`${apiBase}/provincias/emergencia/${emergencyId}`, { headers: { accept: 'application/json' } }),
          authFetch(`${apiBase}/mesa_grupo/${mesagrupo_Id}/afectacion_varibles/`, { headers: { accept: 'application/json' } }),
        ]);
        if (!isMounted) return;
        const provinciasData: Provincia[] = provRes.ok ? await provRes.json() : [];
        const variablesData: AfectacionVariable[] = vRes.ok ? await vRes.json() : [];
        setProvincias(provinciasData || []);
        setVariables(variablesData || []);
      } catch (e) {
        setProvincias([]);
        setVariables([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [apiBase, mesagrupo_Id]);

  // When provincia changes, load cantones
  useEffect(() => {
    let isMounted = true;
    const loadCantones = async () => {
      if (!provinciaId) { setCantones([]); setCantonSelId(undefined); setParroquiasOptions([]); setParroquiasSelIds([]); return; }
      try {
        setLoading(true);
        const res = await authFetch(`${apiBase}/provincia/${provinciaId}/cantones/emergencia/${emergencyId}`, { headers: { accept: 'application/json' } });
        if (!isMounted) return;
        const data: Canton[] = res.ok ? await res.json() : [];
        setCantones(data || []);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadCantones();
    return () => { isMounted = false; };
  }, [provinciaId, apiBase]);

  // When canton changes, load parroquias options
  useEffect(() => {
    let isMounted = true;
    const loadParroquias = async () => {
      if (!cantonSelId) { setParroquiasOptions([]); setParroquiasSelIds([]); return; }
      try {
        setLoading(true);
        const res = await authFetch(`${apiBase}/canton/${cantonSelId}/parroquias/emergencia/${emergencyId}`, { headers: { accept: 'application/json' } });
        if (!isMounted) return;
        const data: Parroquia[] = res.ok ? await res.json() : [];
        const list = data || [];
        setParroquiasOptions(list);
        // Auto-select ALL parroquias for the selected canton
        setParroquiasSelIds(list.map(p => p.id));
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadParroquias();
    return () => { isMounted = false; };
  }, [cantonSelId, apiBase]);

  // Compute selected parroquias to show in grid
  useEffect(() => {
    const selected = parroquiasOptions.filter(p => parroquiasSelIds.includes(p.id));
    setParroquias(selected);
  }, [parroquiasOptions, parroquiasSelIds]);

  // Load existing registros for each selected parroquia
  useEffect(() => {
    let isMounted = true;
    const loadRegistros = async () => {
      if (!parroquiasSelIds.length) return;
      try {
        setLoading(true);
        const allResults = await Promise.all(parroquiasSelIds.map(async (pid) => {
          const url = `${apiBase}/afectacion_variable_registros/parroquia/${pid}/emergencia/${emergencyId}/mesa_grupo/${mesagrupo_Id}`;
          const res = await authFetch(url, { headers: { accept: 'application/json' } });
          const data = res.ok ? await res.json() : [];
          return { pid, data } as { pid: number; data: Array<{ afectacion_variable_registro_id?: number; afectacion_variable_id: number; cantidad: number; costo: number }>; };
        }));
        if (!isMounted) return;
        // Merge into matrix
        setMatrix(prev => {
          const next = { ...prev } as Record<number, Record<number, AfectacionCellPayload>>;
          for (const { pid, data } of allResults) {
            next[pid] = next[pid] || {};
            for (const r of data) {
              next[pid][r.afectacion_variable_id] = {
                ...(next[pid][r.afectacion_variable_id] || {}),
                cantidad: typeof r.cantidad === 'number' ? r.cantidad : null,
                costo: typeof r.costo === 'number' ? r.costo : null,
                id: typeof (r as any).afectacion_variable_registro_id === 'number' ? (r as any).afectacion_variable_registro_id : (next[pid][r.afectacion_variable_id]?.id),
              };
            }
          }
          return next;
        });
        // Capture ids for PUT if backend returns them
        setRecordIds(prev => {
          const next = { ...prev } as Record<number, Record<number, number>>;
          for (const { pid, data } of allResults) {
            next[pid] = next[pid] || {};
            for (const r of data) {
              if (typeof (r as any).afectacion_variable_registro_id === 'number') {
                next[pid][r.afectacion_variable_id] = (r as any).afectacion_variable_registro_id as number;
              }
            }
          }
          return next;
        });
        // If any data returned, toggle to update label
        setHasExisting(allResults.some(r => (r.data || []).length > 0));
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadRegistros();
    return () => { isMounted = false; };
  }, [parroquiasSelIds, apiBase, mesagrupo_Id, emergencyId]);

  const saveAll = useCallback(async () => {
    if (!provinciaId || !cantonSelId || !parroquias.length) {
      message.warning('Seleccione provincia, cantón y al menos una parroquia');
      return;
    }
    try {
      setSaving(true);
      const tasks: Promise<any>[] = [];
      for (const p of parroquias) {
        const row = matrixRef.current[p.id] || {};
        for (const v of variables) {
          const cell = row[v.id];
          if (!cell || (cell.cantidad == null && cell.costo == null)) continue;
          const hasId = !!(recordIds[p.id]?.[v.id] || cell.id);
          if (hasId) {
            const id = recordIds[p.id]?.[v.id] ?? cell.id!;
            const url = `${apiBase}/afectacion_variable_registros/${id}`;
            const body = { cantidad: cell.cantidad ?? 0, costo: cell.costo ?? 0 };
            tasks.push(authFetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
          } else {
            const url = `${apiBase}/afectacion_variable_registros`;
            const body = {
              activo: true,
              afectacion_variable_id: v.id,
              cantidad: cell.cantidad ?? 0,
              canton_id: cantonSelId,
              costo: cell.costo ?? 0,
              creador: 'frontend',
              emergencia_id: emergencyId,
              parroquia_id: p.id,
              provincia_id: provinciaId,
            };
            tasks.push(
              authFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                .then(async (res) => {
                  if (!res.ok) return;
                  const created = await res.json();
                  const newId = created?.id as number | undefined;
                  if (typeof newId === 'number') {
                    setRecordIds(prev => ({
                      ...prev,
                      [p.id]: { ...(prev[p.id] || {}), [v.id]: newId },
                    }));
                    // also embed into matrix for quick reference
                    setMatrix(prev => ({
                      ...prev,
                      [p.id]: { ...(prev[p.id] || {}), [v.id]: { ...(prev[p.id]?.[v.id] || {}), id: newId } },
                    }));
                  }
                })
            );
          }
        }
      }
      await Promise.all(tasks);
      message.success(hasExisting ? 'Cambios actualizados' : 'Cambios guardados');
    } catch (e) {
      message.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  }, [apiBase, provinciaId, cantonSelId, parroquias, variables, recordIds, hasExisting]);

  const commitCell = useCallback((parroquiaId: number, variableId: number, patch: Partial<AfectacionCellPayload>) => {
    setMatrix(prev => ({
      ...prev,
      [parroquiaId]: {
        ...(prev[parroquiaId] || {}),
        [variableId]: { ...(prev[parroquiaId]?.[variableId] || {}), ...patch },
      },
    }));
  }, []);

  type CellEditorProps = {
    parroquia: Parroquia;
    variable: AfectacionVariable;
    cell?: AfectacionCellPayload;
  };

  const CellEditor: React.FC<CellEditorProps> = React.memo(({ parroquia, variable, cell }) => {
    const parroquiaId = parroquia.id;
    const [cantidad, setCantidad] = useState<number | null | undefined>(cell?.cantidad ?? null);
    const [costo, setCosto] = useState<number | null | undefined>(cell?.costo ?? null);

    // When external matrix updates for this cell (rare), sync local values
    useEffect(() => {
      setCantidad(cell?.cantidad ?? null);
      setCosto(cell?.costo ?? null);
    }, [cell?.cantidad, cell?.costo, parroquiaId, variable.id]);

    const onCommit = useCallback(() => {
      commitCell(parroquiaId, variable.id, { cantidad: typeof cantidad === 'number' ? cantidad : null, costo: typeof costo === 'number' ? costo : null });
    }, [cantidad, costo, parroquiaId, variable.id]);

    return (
      <Space size="small" wrap>
        <InputNumber
          placeholder="Cant"
          min={0}
          value={cantidad ?? null}
          onChange={(val) => setCantidad(typeof val === 'number' ? val : null)}
          onBlur={onCommit}
          onPressEnter={onCommit}
          style={{ width: 80 }}
        />
        <InputNumber
          placeholder="Costo"
          min={0}
          value={costo ?? null}
          onChange={(val) => setCosto(typeof val === 'number' ? val : null)}
          onBlur={onCommit}
          onPressEnter={onCommit}
          style={{ width: 80 }}
          disabled={!variable.requiere_costo}
        />
        <Button icon={<SettingOutlined />} onClick={() => openDetails(parroquia, variable)} />
      </Space>
    );
  });
  CellEditor.displayName = 'CellEditor';

  const openDetails = (parroquia: Parroquia, variable: AfectacionVariable) => {
    setSelected({ parroquia, variable });
    setModalOpen(true);
  };

  // Load infra list when modal opens and selection is set
  useEffect(() => {
    const loadInfra = async () => {
      if (!modalOpen || !selected?.parroquia || !selected?.variable) return;
      try {
        setInfraLoading(true);
        const url = `${apiBase}/afectacion_variable_registro_detalles/emergencia/${emergencyId}/variable/${selected.variable.id}/parroquia/${selected.parroquia.id}`;
        const res = await authFetch(url, { headers: { accept: 'application/json' } });
        const data: InfraDetalle[] = res.ok ? await res.json() : [];
        setInfraList(data || []);
        setInfraChecked((data || []).filter(d => d.registrada).map(d => d.infraestructura_id));
      } catch {
        setInfraList([]);
        setInfraChecked([]);
      } finally {
        setInfraLoading(false);
      }
    };
    loadInfra();
  }, [modalOpen, selected?.parroquia?.id, selected?.variable?.id, apiBase]);

  const saveInfraDetalles = async () => {
    if (!selected?.parroquia || !selected?.variable) return;
    // Need the registro id for this parroquia + variable
    const pid = selected.parroquia.id;
    const vid = selected.variable.id;
    const registroId = recordIds[pid]?.[vid] ?? matrixRef.current[pid]?.[vid]?.id;
    if (!registroId) {
      message.warning('Primero guarde la matriz (cantidad/costo) para generar el registro base.');
      return;
    }
    try {
      setInfraLoading(true);
      const toCreate = infraList.filter(d => !d.registrada && infraChecked.includes(d.infraestructura_id));
      const toDelete = infraList.filter(d => d.registrada && !infraChecked.includes(d.infraestructura_id) && typeof d.afectacion_variable_registro_detalle_id === 'number');
      const tasks = toCreate.map(d => {
        const body = {
          activo: true,
          afectacion_variable_registro_id: registroId,
          costo: 0,
          creador: 'frontend',
          infraestructura_id: d.infraestructura_id,
        };
        return authFetch(`${apiBase}/afectacion_variable_registro_detalles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      });
      const deleteTasks = toDelete.map(d => authFetch(`${apiBase}/afectacion_variable_registro_detalles/${d.afectacion_variable_registro_detalle_id}`, { method: 'DELETE', headers: { accept: 'application/json' } }));
      await Promise.all([...tasks, ...deleteTasks]);
      message.success('Infraestructuras guardadas');
      // Reload to reflect registrada=true
      const url = `${apiBase}/afectacion_variable_registro_detalles/emergencia/${emergencyId}/variable/${vid}/parroquia/${pid}`;
      const res = await authFetch(url, { headers: { accept: 'application/json' } });
      const data: InfraDetalle[] = res.ok ? await res.json() : [];
      setInfraList(data || []);
      setInfraChecked((data || []).filter(d => d.registrada).map(d => d.infraestructura_id));
    } catch {
      message.error('Error al guardar infraestructuras');
    } finally {
      setInfraLoading(false);
    }
  };

  const columns: ColumnsType<Parroquia> = useMemo(() => {
    const base: ColumnsType<Parroquia> = [
      {
        title: 'Parroquia',
        dataIndex: 'nombre',
        key: 'parroquia',
        fixed: 'left',
        width: 200,
        render: (value: string) => <Text strong>{value}</Text>,
      },
    ];

    const variableColumns: ColumnsType<Parroquia> = variables.map((v) => ({
      title: (
        <div>
          <div>{v.nombre}</div>
        </div>
      ),
      dataIndex: `var_${v.id}`,
      key: `var_${v.id}`,
      width: 280,
      render: (_: any, p: Parroquia) => (
        <CellEditor
          parroquia={p}
          variable={v}
          cell={matrix[p.id]?.[v.id]}
        />
      ),
    }));

    return [...base, ...variableColumns];
  // Only re-create columns when variables change (not on every keystroke)
  }, [variables, matrix]);

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>{tableTitle}</Title>
      </div>
      <Row gutter={[12, 12]} style={{ marginBottom: 8 }}>
        <Col xs={24} md={8}>
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Text strong>Provincia</Text>
            <Select
              placeholder="Seleccione provincia"
              options={(provincias || []).map(p => ({ label: p.nombre, value: p.id }))}
              value={provinciaId}
              onChange={(val) => setProvinciaId(val)}
              allowClear
              style={{ width: '100%' }}
            />
          </Space>
        </Col>
        <Col xs={24} md={8}>
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Text strong>Cantón</Text>
            <Select
              placeholder="Seleccione cantón"
              options={(cantones || []).map(c => ({ label: c.nombre, value: c.id }))}
              value={cantonSelId}
              onChange={(val) => setCantonSelId(val)}
              allowClear
              disabled={!provinciaId}
              style={{ width: '100%' }}
            />
          </Space>
        </Col>
        
      </Row>
      <div style={{ marginBottom: 12 }}>
        <Space>
          <Button type="primary" onClick={saveAll} loading={saving} disabled={!parroquias.length || !variables.length}>
            {hasExisting ? 'Guardar cambios' : 'Guardar cambios'}
          </Button>
        </Space>
      </div>
      <Spin spinning={loading}>
        <Table<Parroquia>
          rowKey={(r) => r.id}
          dataSource={parroquias}
          columns={columns}
          pagination={false}
          scroll={{ x: 600 }}
          sticky
          bordered
          size="middle"
        />
      </Spin>
      <Modal
        open={modalOpen}
        title="Detalle de Afectación"
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        {selected?.parroquia && selected?.variable ? (
          <div>
            <p>
              <Text strong>Parroquia: </Text>
              <Text>{selected.parroquia.nombre} (ID: {selected.parroquia.id})</Text>
            </p>
            <p>
              <Text strong>Afectación: </Text>
              <Text>{selected.variable.nombre} (ID: {selected.variable.id})</Text>
            </p>
            <div style={{ margin: '12px 0' }}>
              <Text strong>Infraestructuras</Text>
            </div>
            <Spin spinning={infraLoading}>
              <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #f0f0f0', padding: 8, borderRadius: 4 }}>
                {(infraList || []).map(item => (
                  <div key={item.infraestructura_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                    <input
                      type="checkbox"
                      checked={infraChecked.includes(item.infraestructura_id)}
                      onChange={(e) => {
                        const checked = e.currentTarget.checked;
                        setInfraChecked(prev => checked ? [...prev, item.infraestructura_id] : prev.filter(id => id !== item.infraestructura_id));
                      }}
                    />
                    <span>{item.nombre}</span>
                    {item.registrada && <span style={{ marginLeft: 'auto', color: '#389e0d' }}>Registrada</span>}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <Space>
                  <Button onClick={() => setModalOpen(false)}>Cerrar</Button>
                  <Button type="primary" onClick={saveInfraDetalles} loading={infraLoading}>Guardar</Button>
                </Space>
              </div>
            </Spin>
          </div>
        ) : (
          <Text type="secondary">Seleccione una celda para ver detalles</Text>
        )}
      </Modal>
    </div>
  );
};

export default AfectacionesParroquiasMatrix;
