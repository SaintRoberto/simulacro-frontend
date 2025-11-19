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
  // Matrix keyed by composite rowKey `${parroquia_id}-${evento_id}` -> variable_id -> payload
  const [matrix, setMatrix] = useState<Record<string, Record<number, AfectacionCellPayload>>>({});
  // Rows with parroquia-evento pairs
  type RowItem = { parroquia_id: number; parroquia_nombre: string; evento_id: number; evento_nombre: string };
  const [rows, setRows] = useState<RowItem[]>([]);
  // Also keep a ref to avoid stale closures in memoized renderers
  const matrixRef = useRef(matrix);
  useEffect(() => {
    matrixRef.current = matrix;
  }, [matrix]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
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
  const [recordIds, setRecordIds] = useState<Record<string, Record<number, number>>>({});
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

  // Load existing registros for each selected parroquia (new endpoint aggregates by canton)
  useEffect(() => {
    let isMounted = true;
    const loadRegistros = async () => {
      if (!parroquiasSelIds.length || !cantonSelId) return;
      try {
        setLoading(true);
        const url = `${apiBase}/afectaciones_registros/eventos/emergencia/${emergencyId}/canton/${cantonSelId}/mesa_grupo/${mesagrupo_Id}/`;
        const res = await authFetch(url, { headers: { accept: 'application/json' } });
        const all: Array<{ parroquia_id: number; parroquia_nombre?: string; evento_id?: number; evento_nombre?: string; afectacion_variable_id: number; cantidad: number; costo: number }>
          = res.ok ? await res.json() : [];
        if (!isMounted) return;
        // Filter only selected parroquias
        const filtered = (all || []).filter(r => parroquiasSelIds.includes(r.parroquia_id));
        // Build row list (duplicated parroquia per evento)
        const rowMap = new Map<string, RowItem>();
        for (const r of filtered) {
          const key = `${r.parroquia_id}-${r.evento_id ?? 0}`;
          if (!rowMap.has(key)) {
            rowMap.set(key, {
              parroquia_id: r.parroquia_id,
              parroquia_nombre: r.parroquia_nombre || String(r.parroquia_id),
              evento_id: r.evento_id ?? 0,
              evento_nombre: r.evento_nombre || '-',
            });
          }
        }
        setRows(Array.from(rowMap.values()));
        // Build fresh matrix aggregated by rowKey+variable, preferring non-zero values when duplicates exist
        const fresh: Record<string, Record<number, AfectacionCellPayload>> = {};
        for (const r of filtered) {
          const rowKey = `${r.parroquia_id}-${r.evento_id ?? 0}`;
          const current = fresh[rowKey]?.[r.afectacion_variable_id];
          const cand = {
            cantidad: typeof r.cantidad === 'number' ? r.cantidad : null,
            costo: typeof r.costo === 'number' ? r.costo : null,
            id: current?.id, // keep any existing id if present later
          } as AfectacionCellPayload;
          const isNonZero = (cand.cantidad ?? 0) !== 0 || (cand.costo ?? 0) !== 0;
          const hasExisting = !!current;
          const existingNonZero = hasExisting && (((current!.cantidad ?? 0) !== 0) || ((current!.costo ?? 0) !== 0));
          if (!fresh[rowKey]) fresh[rowKey] = {};
          if (!hasExisting) {
            fresh[rowKey][r.afectacion_variable_id] = cand;
          } else {
            // Prefer non-zero over zero. If both non-zero, keep the latest.
            if (!existingNonZero && isNonZero) {
              fresh[rowKey][r.afectacion_variable_id] = cand;
            } else if (existingNonZero && !isNonZero) {
              // keep existing non-zero
            } else {
              // both zero or both non-zero: overwrite with latest
              fresh[rowKey][r.afectacion_variable_id] = { ...current!, ...cand };
            }
          }
        }
        setMatrix(fresh);
        // If any non-empty data returned, toggle to update label
        setHasExisting(Object.values(fresh).some(vars => Object.values(vars).length > 0));
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadRegistros();
    return () => { isMounted = false; };
  }, [parroquiasSelIds, apiBase, mesagrupo_Id, emergencyId, cantonSelId]);

  const saveAll = useCallback(async () => {
    if (!provinciaId || !cantonSelId || !rows.length) {
      message.warning('Seleccione provincia, cantón y al menos una parroquia');
      return;
    }
    try {
      setSaving(true);
      const tasks: Promise<any>[] = [];
      for (const r of rows) {
        const rk = `${r.parroquia_id}-${r.evento_id}`;
        const rowCells = matrixRef.current[rk] || {};
        for (const v of variables) {
          const cell = rowCells[v.id];
          if (!cell || (cell.cantidad == null && cell.costo == null)) continue;
          const hasId = !!(recordIds[rk]?.[v.id] || cell.id);
          if (hasId) {
            const id = recordIds[rk]?.[v.id] ?? cell.id!;
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
              parroquia_id: r.parroquia_id,
              provincia_id: provinciaId,
              evento_id: r.evento_id,
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
                      [rk]: { ...(prev[rk] || {}), [v.id]: newId },
                    }));
                    // also embed into matrix for quick reference
                    setMatrix(prev => ({
                      ...prev,
                      [rk]: { ...(prev[rk] || {}), [v.id]: { ...(prev[rk]?.[v.id] || {}), id: newId } },
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
  }, [apiBase, provinciaId, cantonSelId, rows, variables, recordIds, hasExisting]);

  const commitCell = useCallback((rowKey: string, variableId: number, patch: Partial<AfectacionCellPayload>) => {
    setMatrix(prev => ({
      ...prev,
      [rowKey]: {
        ...(prev[rowKey] || {}),
        [variableId]: { ...(prev[rowKey]?.[variableId] || {}), ...patch },
      },
    }));
  }, []);

  type CellEditorProps = {
    rowKey: string;
    variable: AfectacionVariable;
    cell?: AfectacionCellPayload;
    parroquia: { id: number; nombre: string };
  };

  const CellEditor: React.FC<CellEditorProps> = React.memo(({ rowKey, variable, cell, parroquia }) => {
    const [cantidad, setCantidad] = useState<number | null | undefined>(cell?.cantidad ?? null);
    const [costo, setCosto] = useState<number | null | undefined>(cell?.costo ?? null);

    // When external matrix updates for this cell (rare), sync local values
    useEffect(() => {
      setCantidad(cell?.cantidad ?? null);
      setCosto(cell?.costo ?? null);
    }, [cell?.cantidad, cell?.costo, rowKey, variable.id]);

    const onCommit = useCallback(() => {
      commitCell(rowKey, variable.id, { cantidad: typeof cantidad === 'number' ? cantidad : null, costo: typeof costo === 'number' ? costo : null });
    }, [cantidad, costo, rowKey, variable.id]);

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
        <Button icon={<SettingOutlined />} onClick={() => openDetails(parroquia as Parroquia, variable, rowKey)} />
      </Space>
    );
  });
  CellEditor.displayName = 'CellEditor';

  const openDetails = (parroquia: Parroquia, variable: AfectacionVariable, rowKey?: string) => {
    setSelected({ parroquia, variable });
    if (rowKey) setSelectedRowKey(rowKey); else setSelectedRowKey(null);
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
    const pid = selected.parroquia.id;
    const vid = selected.variable.id;
    // Use the selected row key (parroquia_id-evento_id) to resolve registro id
    const rk = selectedRowKey || '';
    // Validate that the base cell has meaningful values (not both zero/null)
    const baseCell = rk ? matrixRef.current[rk]?.[vid] : undefined;
    const qtyVal = typeof baseCell?.cantidad === 'number' ? baseCell!.cantidad! : 0;
    const costVal = typeof baseCell?.costo === 'number' ? baseCell!.costo! : 0;
    if ((qtyVal ?? 0) === 0 && (costVal ?? 0) === 0) {
      message.warning('Debe ingresar cantidad o costo (distinto de 0) antes de registrar infraestructuras.');
      return;
    }
    let registroId = (rk ? (recordIds[rk]?.[vid] ?? matrixRef.current[rk]?.[vid]?.id) : undefined);
    // If no registro id exists yet, create a base one on the fly for this parroquia/evento/variable
    if (!registroId && rk) {
      const parts = rk.split('-');
      const eventoId = parts.length > 1 ? Number(parts[1]) : undefined;
      if (!eventoId) {
        message.warning('No se pudo identificar el evento de la fila. Intente guardar la matriz primero.');
        return;
      }
      try {
        const url = `${apiBase}/afectacion_variable_registros`;
        const body = {
          activo: true,
          afectacion_variable_id: vid,
          cantidad: 0,
          canton_id: cantonSelId,
          costo: 0,
          creador: 'frontend',
          emergencia_id: emergencyId,
          parroquia_id: pid,
          provincia_id: provinciaId,
          evento_id: eventoId,
        };
        const res = await authFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) {
          message.warning('No se pudo generar el registro base. Guarde cantidad/costo y vuelva a intentar.');
          return;
        }
        const created = await res.json();
        const newId = created?.id as number | undefined;
        if (!newId) {
          message.warning('No se pudo generar el registro base.');
          return;
        }
        registroId = newId;
        // Persist id en memoria local
        setRecordIds(prev => ({
          ...prev,
          [rk]: { ...(prev[rk] || {}), [vid]: newId },
        }));
        setMatrix(prev => ({
          ...prev,
          [rk]: { ...(prev[rk] || {}), [vid]: { ...(prev[rk]?.[vid] || {}), id: newId, cantidad: (prev[rk]?.[vid]?.cantidad ?? 0), costo: (prev[rk]?.[vid]?.costo ?? 0) } },
        }));
      } catch {
        message.warning('No se pudo generar el registro base.');
        return;
      }
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

  const columns: ColumnsType<RowItem> = useMemo(() => {
    const base: any[] = [
      {
        title: 'Parroquia',
        dataIndex: 'parroquia_nombre',
        key: 'parroquia',
        fixed: 'left',
        width: 200,
        render: (value: string) => <Text strong>{value}</Text>,
      },
      {
        title: 'Evento',
        dataIndex: 'evento_nombre',
        key: 'evento_nombre',
        fixed: 'left',
        width: 260,
        render: (value: string) => <Text>{value || '-'}</Text>,
      },
    ];

    const variableColumns: any[] = variables.map((v) => ({
      title: (
        <div>
          <div>{v.nombre}</div>
        </div>
      ),
      dataIndex: `var_${v.id}`,
      key: `var_${v.id}`,
      width: 280,
      render: (_: any, r: RowItem) => {
        const rk = `${r.parroquia_id}-${r.evento_id}`;
        return (
          <CellEditor
            rowKey={rk}
            variable={v}
            cell={matrix[rk]?.[v.id]}
            parroquia={{ id: r.parroquia_id, nombre: r.parroquia_nombre }}
          />
        );
      },
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
        <Table<RowItem>
          rowKey={(r) => `${r.parroquia_id}-${r.evento_id}`}
          dataSource={rows}
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
