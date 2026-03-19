import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Table, InputNumber, Button, Spin, Typography, Space, Select, Row, Col, Drawer, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAuth } from '../../context/AuthContext';

const { Text, Title } = Typography;

type Parroquia = {
  id: number;
  nombre: string;
  provincia_id: number;
  canton_id: number;
};

type Provincia = { id: number; nombre: string };
type Canton = { id: number; nombre: string; provincia_id: number };

type AfectacionVariable = {
  id: number;
  nombre: string;
  requiere_costo: boolean;
  requiere_gis: boolean;
  dato_tipo_id?: number;
};

type AfectacionCellPayload = {
  cantidad?: number | null;
  costo?: number | null;
  id?: number;
};

type RowItem = {
  parroquia_id: number;
  parroquia_nombre: string;
  evento_id: number;
  evento_nombre: string;
};

type InfraDetalle = {
  afectacion_variable_registro_detalle_id: number | null;
  afectacion_variable_registro_id: number | null;
  infraestructura_id: number;
  nombre: string;
  registrada: boolean;
};

type RegistroApi = {
  parroquia_id: number;
  parroquia_nombre?: string;
  evento_id?: number;
  evento_nombre?: string;
  afectacion_variable_id: number;
  variable_nombre?: string;
  requiere_gis?: boolean;
  cantidad: number;
  costo: number;
  id?: number | null;
  afectacion_variable_registro_id?: number | null;
  registro_id?: number | null;
};

export interface AfectacionesParroquiasMatrixSidePanelProps {
  apiBase?: string;
  cantonId?: number;
  mesaGrupoId?: number;
  tableTitle?: string;
}

const buildApiBase = () => process.env.REACT_APP_API_URL || '/api';

export const AfectacionesParroquiasMatrixSidePanel: React.FC<AfectacionesParroquiasMatrixSidePanelProps> = ({
  apiBase = buildApiBase(),
  mesaGrupoId = 0,
  tableTitle = 'Matriz de Afectaciones por Parroquia',
}) => {
  const { datosLogin, authFetch } = useAuth();
  const isNacionalReadOnly = datosLogin?.coe_id === 1;
  const mesagrupo_Id = datosLogin?.mesa_grupo_id ?? mesaGrupoId;
  const emergencyId = Number(localStorage.getItem('selectedEmergenciaId') || '0');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [cantones, setCantones] = useState<Canton[]>([]);
  const [parroquiasOptions, setParroquiasOptions] = useState<Parroquia[]>([]);
  const [parroquiasSelIds, setParroquiasSelIds] = useState<number[]>([]);
  const [provinciaId, setProvinciaId] = useState<number | undefined>(undefined);
  const [cantonSelId, setCantonSelId] = useState<number | undefined>(undefined);

  const [variables, setVariables] = useState<AfectacionVariable[]>([]);
  const [rows, setRows] = useState<RowItem[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Record<number, AfectacionCellPayload>>>({});
  const [recordIds, setRecordIds] = useState<Record<string, Record<number, number>>>({});
  const matrixRef = useRef(matrix);
  useEffect(() => {
    matrixRef.current = matrix;
  }, [matrix]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<RowItem | null>(null);
  const [selectedVar, setSelectedVar] = useState<AfectacionVariable | null>(null);
  const [draftCantidad, setDraftCantidad] = useState<number>(0);
  const [draftCosto, setDraftCosto] = useState<number>(0);

  const [infraLoading, setInfraLoading] = useState(false);
  const [infraList, setInfraList] = useState<InfraDetalle[]>([]);
  const [infraChecked, setInfraChecked] = useState<number[]>([]);

  useEffect(() => {
    if (datosLogin?.provincia_id && provinciaId === undefined) setProvinciaId(datosLogin.provincia_id);
  }, [datosLogin?.provincia_id, provinciaId]);

  useEffect(() => {
    let mounted = true;
    const loadBase = async () => {
      try {
        setLoading(true);
        const [provRes, varRes] = await Promise.all([
          authFetch(`${apiBase}/provincias/emergencia/${emergencyId}`, { headers: { accept: 'application/json' } }),
          authFetch(`${apiBase}/mesa_grupo/${mesagrupo_Id}/afectacion_varibles/`, { headers: { accept: 'application/json' } }),
        ]);
        if (!mounted) return;
        const provData = provRes.ok ? await provRes.json() : [];
        const varData = varRes.ok ? await varRes.json() : [];
        setProvincias(Array.isArray(provData) ? provData : []);
        setVariables(Array.isArray(varData) ? varData : []);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadBase();
    return () => {
      mounted = false;
    };
  }, [apiBase, authFetch, emergencyId, mesagrupo_Id]);

  useEffect(() => {
    let mounted = true;
    const loadCantones = async () => {
      if (!provinciaId) {
        setCantones([]);
        setCantonSelId(undefined);
        return;
      }
      const res = await authFetch(`${apiBase}/provincia/${provinciaId}/cantones/emergencia/${emergencyId}`, { headers: { accept: 'application/json' } });
      if (!mounted) return;
      const data = res.ok ? await res.json() : [];
      setCantones(Array.isArray(data) ? data : []);
    };
    loadCantones();
    return () => {
      mounted = false;
    };
  }, [apiBase, authFetch, emergencyId, provinciaId]);

  useEffect(() => {
    if (datosLogin?.canton_id && provinciaId === datosLogin.provincia_id && !cantonSelId && cantones.length > 0) {
      const exists = cantones.some(c => c.id === datosLogin.canton_id);
      if (exists) setCantonSelId(datosLogin.canton_id);
    }
  }, [cantones, cantonSelId, datosLogin?.canton_id, datosLogin?.provincia_id, provinciaId]);

  useEffect(() => {
    let mounted = true;
    const loadParroquias = async () => {
      if (!cantonSelId) {
        setParroquiasOptions([]);
        setParroquiasSelIds([]);
        return;
      }
      const res = await authFetch(`${apiBase}/canton/${cantonSelId}/parroquias/emergencia/${emergencyId}`, { headers: { accept: 'application/json' } });
      if (!mounted) return;
      const data = res.ok ? await res.json() : [];
      const list = Array.isArray(data) ? data : [];
      setParroquiasOptions(list);
      setParroquiasSelIds(list.map((p: Parroquia) => p.id));
    };
    loadParroquias();
    return () => {
      mounted = false;
    };
  }, [apiBase, authFetch, cantonSelId, emergencyId]);

  useEffect(() => {
    let mounted = true;
    const loadRegistros = async () => {
      if (!cantonSelId || parroquiasSelIds.length === 0) return;
      setLoading(true);
      try {
        const url = `${apiBase}/afectaciones_registros/eventos/emergencia/${emergencyId}/canton/${cantonSelId}/mesa_grupo/${mesagrupo_Id}/`;
        const res = await authFetch(url, { headers: { accept: 'application/json' } });
        const all: RegistroApi[] = res.ok ? await res.json() : [];
        if (!mounted) return;
        const filtered = (all || []).filter(r => parroquiasSelIds.includes(r.parroquia_id));

        if (variables.length === 0 && filtered.length > 0) {
          const byVar = new Map<number, AfectacionVariable>();
          filtered.forEach(r => {
            if (byVar.has(r.afectacion_variable_id)) return;
            byVar.set(r.afectacion_variable_id, {
              id: r.afectacion_variable_id,
              nombre: r.variable_nombre || `Variable ${r.afectacion_variable_id}`,
              requiere_costo: true,
              requiere_gis: Boolean(r.requiere_gis),
              dato_tipo_id: 1,
            });
          });
          setVariables(Array.from(byVar.values()));
        }

        const rowMap = new Map<string, RowItem>();
        const fresh: Record<string, Record<number, AfectacionCellPayload>> = {};
        const freshIds: Record<string, Record<number, number>> = {};

        const getRegistroId = (row: RegistroApi): number | undefined => {
          const c = [row.afectacion_variable_registro_id, row.registro_id, row.id];
          const found = c.find(v => typeof v === 'number');
          return typeof found === 'number' ? found : undefined;
        };

        filtered.forEach(r => {
          const rk = `${r.parroquia_id}-${r.evento_id ?? 0}`;
          if (!rowMap.has(rk)) {
            rowMap.set(rk, {
              parroquia_id: r.parroquia_id,
              parroquia_nombre: r.parroquia_nombre || String(r.parroquia_id),
              evento_id: r.evento_id ?? 0,
              evento_nombre: r.evento_nombre || '-',
            });
          }
          if (!fresh[rk]) fresh[rk] = {};
          fresh[rk][r.afectacion_variable_id] = {
            cantidad: typeof r.cantidad === 'number' ? r.cantidad : 0,
            costo: typeof r.costo === 'number' ? r.costo : 0,
            id: getRegistroId(r),
          };
          if (typeof fresh[rk][r.afectacion_variable_id].id === 'number') {
            if (!freshIds[rk]) freshIds[rk] = {};
            freshIds[rk][r.afectacion_variable_id] = fresh[rk][r.afectacion_variable_id].id as number;
          }
        });

        setRows(Array.from(rowMap.values()));
        setMatrix(fresh);
        setRecordIds(freshIds);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadRegistros();
    return () => {
      mounted = false;
    };
  }, [apiBase, authFetch, cantonSelId, emergencyId, mesagrupo_Id, parroquiasSelIds, variables.length]);

  const openCellPanel = (row: RowItem, variable: AfectacionVariable) => {
    const rk = `${row.parroquia_id}-${row.evento_id}`;
    const cell = matrixRef.current[rk]?.[variable.id];
    setSelectedRow(row);
    setSelectedVar(variable);
    setSelectedRowKey(rk);
    setDraftCantidad(typeof cell?.cantidad === 'number' ? cell.cantidad : 0);
    setDraftCosto(typeof cell?.costo === 'number' ? cell.costo : 0);
    setDrawerOpen(true);
  };

  useEffect(() => {
    const loadInfra = async () => {
      if (!drawerOpen || !selectedRow || !selectedVar) return;
      setInfraLoading(true);
      try {
        const url = `${apiBase}/afectacion_variable_registro_detalles/emergencia/${emergencyId}/variable/${selectedVar.id}/parroquia/${selectedRow.parroquia_id}`;
        const res = await authFetch(url, { headers: { accept: 'application/json' } });
        const data = res.ok ? await res.json() : [];
        const list = Array.isArray(data) ? data : [];
        setInfraList(list);
        setInfraChecked(list.filter((d: InfraDetalle) => d.registrada).map((d: InfraDetalle) => d.infraestructura_id));
      } finally {
        setInfraLoading(false);
      }
    };
    loadInfra();
  }, [apiBase, authFetch, drawerOpen, emergencyId, selectedRow, selectedVar]);

  const applyDrawerToMatrix = () => {
    if (!selectedRowKey || !selectedVar) return;
    setMatrix(prev => ({
      ...prev,
      [selectedRowKey]: {
        ...(prev[selectedRowKey] || {}),
        [selectedVar.id]: {
          ...(prev[selectedRowKey]?.[selectedVar.id] || {}),
          cantidad: draftCantidad,
          costo: draftCosto,
        },
      },
    }));
  };

  useEffect(() => {
    if (!drawerOpen || !selectedRowKey || !selectedVar) return;
    applyDrawerToMatrix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftCantidad, draftCosto, drawerOpen, selectedRowKey, selectedVar?.id]);

  const ensureRegistroIdForSelected = useCallback(async (): Promise<number | null> => {
    if (!selectedRowKey || !selectedRow || !selectedVar) return null;
    const existing = recordIds[selectedRowKey]?.[selectedVar.id] ?? matrixRef.current[selectedRowKey]?.[selectedVar.id]?.id;
    if (existing) return existing;

    const body = {
      activo: true,
      afectacion_variable_id: selectedVar.id,
      cantidad: draftCantidad ?? 0,
      canton_id: cantonSelId,
      costo: draftCosto ?? 0,
      creador: datosLogin?.usuario_login || 'frontend',
      emergencia_id: emergencyId,
      parroquia_id: selectedRow.parroquia_id,
      provincia_id: provinciaId,
      evento_id: selectedRow.evento_id,
    };
    const res = await authFetch(`${apiBase}/afectacion_variable_registros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const created = await res.json();
    const newId = created?.id as number | undefined;
    if (!newId) return null;

    setRecordIds(prev => ({
      ...prev,
      [selectedRowKey]: { ...(prev[selectedRowKey] || {}), [selectedVar.id]: newId },
    }));
    setMatrix(prev => ({
      ...prev,
      [selectedRowKey]: {
        ...(prev[selectedRowKey] || {}),
        [selectedVar.id]: { ...(prev[selectedRowKey]?.[selectedVar.id] || {}), id: newId },
      },
    }));
    return newId;
  }, [apiBase, authFetch, cantonSelId, datosLogin?.usuario_login, draftCantidad, draftCosto, emergencyId, provinciaId, recordIds, selectedRow, selectedRowKey, selectedVar]);

  const saveInfraFromDrawer = async () => {
    if (isNacionalReadOnly || !selectedVar || !selectedRow) return;
    applyDrawerToMatrix();
    const registroId = await ensureRegistroIdForSelected();
    if (!registroId) {
      message.warning('No se pudo preparar el registro base para infraestructuras.');
      return;
    }
    setInfraLoading(true);
    try {
      const toCreate = infraList.filter(d => !d.registrada && infraChecked.includes(d.infraestructura_id));
      const toDelete = infraList.filter(d => d.registrada && !infraChecked.includes(d.infraestructura_id) && typeof d.afectacion_variable_registro_detalle_id === 'number');

      await Promise.all([
        ...toCreate.map(d =>
          authFetch(`${apiBase}/afectacion_variable_registro_detalles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              activo: true,
              afectacion_variable_registro_id: registroId,
              costo: 0,
              creador: datosLogin?.usuario_login || 'frontend',
              infraestructura_id: d.infraestructura_id,
            }),
          })
        ),
        ...toDelete.map(d =>
          authFetch(`${apiBase}/afectacion_variable_registro_detalles/${d.afectacion_variable_registro_detalle_id}`, {
            method: 'DELETE',
            headers: { accept: 'application/json' },
          })
        ),
      ]);
      message.success('Infraestructuras guardadas');
    } catch {
      message.error('Error al guardar infraestructuras');
    } finally {
      setInfraLoading(false);
    }
  };

  const saveAll = async () => {
    if (isNacionalReadOnly) {
      message.warning('El COE Nacional no puede editar esta matriz.');
      return;
    }
    if (!provinciaId || !cantonSelId || rows.length === 0) {
      message.warning('Seleccione provincia, cantón y al menos una parroquia');
      return;
    }
    setSaving(true);
    try {
      const tasks: Promise<Response>[] = [];
      for (const row of rows) {
        const rk = `${row.parroquia_id}-${row.evento_id}`;
        const rowCells = matrixRef.current[rk] || {};
        for (const v of variables) {
          const cell = rowCells[v.id];
          if (!cell) continue;
          const payload = { cantidad: Number(cell.cantidad ?? 0), costo: Number(cell.costo ?? 0) };
          const existingId = recordIds[rk]?.[v.id] ?? cell.id;
          if (existingId) {
            tasks.push(
              authFetch(`${apiBase}/afectacion_variable_registros/${existingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              })
            );
          } else {
            tasks.push(
              authFetch(`${apiBase}/afectacion_variable_registros`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  activo: true,
                  afectacion_variable_id: v.id,
                  cantidad: payload.cantidad,
                  canton_id: cantonSelId,
                  costo: payload.costo,
                  creador: datosLogin?.usuario_login || 'frontend',
                  emergencia_id: emergencyId,
                  parroquia_id: row.parroquia_id,
                  provincia_id: provinciaId,
                  evento_id: row.evento_id,
                }),
              })
            );
          }
        }
      }
      await Promise.all(tasks);
      message.success('Cambios guardados');
    } catch {
      message.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const formatMoney = (n: number) => `$ ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const columns: ColumnsType<RowItem> = useMemo(() => {
    const base: ColumnsType<RowItem> = [
      {
        title: 'Parroquia / Evento',
        key: 'pe',
        fixed: 'left',
        width: 200,
        render: (_, r) => (
          <Space direction="vertical" size={0}>
            <Text strong>{r.parroquia_nombre}</Text>
            <Text type="secondary">{r.evento_nombre}</Text>
          </Space>
        ),
      },
    ];

    const vars: ColumnsType<RowItem> = variables.map(v => ({
      title: v.nombre,
      key: `var_${v.id}`,
      width: 220,
      render: (_, r) => {
        const rk = `${r.parroquia_id}-${r.evento_id}`;
        const cell = matrix[rk]?.[v.id];
        const isSelected = selectedRowKey === rk && selectedVar?.id === v.id;
        const cantidad = Number(cell?.cantidad ?? 0);
        const costo = Number(cell?.costo ?? 0);
        const progressValue = Math.max(0, Math.min(100, cantidad));
        const progressColor = progressValue >= 70 ? '#497fc5' : progressValue >= 35 ? '#f59e0b' : '#ef4444';
        const progressColorCosto = costo > 0 ? '#5fd68b' : '#d1d5db';
        const isPercent = v.dato_tipo_id === 3;
        return (
          <button
            type="button"
            onClick={() => openCellPanel(r, v)}
            style={{
              width: '100%',
              border: isSelected ? '2px solid #0ea5e9' : '1px solid #d9d9d9',
              borderRadius: 8,
              background: isSelected ? '#e0f2fe' : '#fff',
              boxShadow: isSelected ? '0 0 0 3px rgba(14,165,233,.25)' : 'none',
              padding: '8px 10px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, minWidth: 56 }}>Cantidad</div>
              <div style={{ position: 'relative', flex: 1, height: 24, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${progressValue}%`,
                    background: progressColor,
                    transition: 'width .2s ease',
                  }}
                />
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: progressValue > 45 ? '#ffffff' : '#111827',
                  }}
                >
                  {isPercent ? `${cantidad}%` : cantidad}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, minWidth: 56 }}>Costo</div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 10px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#f8fafc',
                  background: progressColorCosto,
                }}
              >
                {formatMoney(costo)}
              </span>
            </div>
          </button>
        );
      },
    }));
    return [...base, ...vars];
  }, [matrix, variables, selectedRowKey, selectedVar?.id]);

  return (
    <div>
      {saving && <Spin spinning fullscreen tip="Guardando cambios..." />}
      <div style={{ marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>{tableTitle}</Title>
      </div>
      <Row gutter={[12, 12]} style={{ marginBottom: 8 }}>
        <Col xs={24} md={10} lg={4}>
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Text strong>Provincia</Text>
            <Select
              placeholder="Seleccione provincia"
              options={provincias.map(p => ({ label: p.nombre, value: p.id }))}
              value={provinciaId}
              onChange={setProvinciaId}
              disabled={!isNacionalReadOnly || Boolean(datosLogin?.provincia_id)}
              style={{ width: '100%' }}
            />
          </Space>
        </Col>
        <Col xs={24} md={10} lg={4}>
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Text strong>Cantón</Text>
            <Select
              placeholder="Seleccione cantón"
              options={cantones.map(c => ({ label: c.nombre, value: c.id }))}
              value={cantonSelId}
              onChange={setCantonSelId}
              disabled={!isNacionalReadOnly || !provinciaId || Boolean(datosLogin?.canton_id)}
              style={{ width: '100%' }}
            />
          </Space>
        </Col>
        <Col xs={24} md={4} lg={3} style={{ display: 'flex', alignItems: 'end', justifyContent: 'flex-end' }}>
          <Button type="primary" onClick={saveAll} loading={saving} disabled={isNacionalReadOnly || rows.length === 0 || variables.length === 0}>
            Guardar Cambios
          </Button>
        </Col>
      </Row>

      <Spin spinning={loading}>
        <Table<RowItem>
          rowKey={r => `${r.parroquia_id}-${r.evento_id}`}
          dataSource={rows}
          columns={columns}
          pagination={false}
          scroll={{ x: 1200 }}
          bordered
          size="middle"
        />
      </Spin>

      <Drawer
        title={selectedRow ? `Parroquia/Evento: ${selectedRow.parroquia_nombre} - ${selectedRow.evento_nombre}` : 'Detalle'}
        placement="right"
        width={420}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
      >
        {selectedVar && selectedRow ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <div style={{ border: '1px solid #0ea5e9', borderRadius: 10, padding: 12, background: '#e0f2fe', boxShadow: '0 0 0 1px #9ed2e9' }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>{selectedVar.nombre}</Text>
              <Row gutter={8}>
                <Col span={12}>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Cantidad</Text>
                  <InputNumber min={0} value={draftCantidad} onChange={v => setDraftCantidad(typeof v === 'number' ? v : 0)} style={{ width: '100%' }} disabled={isNacionalReadOnly} />
                </Col>
                <Col span={12}>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Costo Estimado</Text>
                  <InputNumber min={0} value={draftCosto} onChange={v => setDraftCosto(typeof v === 'number' ? v : 0)} style={{ width: '100%' }} prefix="$ " disabled={isNacionalReadOnly || !selectedVar.requiere_costo} />
                </Col>
              </Row>
            </div>

            <div style={{ border: '1px solid #dbeafe', borderRadius: 10, padding: 12, background: '#f8fbff' }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Infraestructura</Text>
              <Spin spinning={infraLoading}>
                <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, background: '#fff' }}>
                  {infraList.map(item => (
                    <div key={item.infraestructura_id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 4px', borderBottom: '1px solid #f3f4f6' }}>
                      <input
                        type="checkbox"
                        checked={infraChecked.includes(item.infraestructura_id)}
                        disabled={isNacionalReadOnly}
                        onChange={(e) => {
                          const checked = e.currentTarget.checked;
                          setInfraChecked(prev => checked ? [...prev, item.infraestructura_id] : prev.filter(id => id !== item.infraestructura_id));
                        }}
                      />
                      <span>{item.nombre}</span>
                    </div>
                  ))}
                </div>
              </Spin>
            </div>

            <Space>
              <Button onClick={() => setDrawerOpen(false)}>Cerrar</Button>
              <Button type="primary" onClick={saveInfraFromDrawer} loading={infraLoading} disabled={isNacionalReadOnly}>Guardar Infraestructura</Button>
            </Space>
          </Space>
        ) : null}
      </Drawer>
    </div>
  );
};

export default AfectacionesParroquiasMatrixSidePanel;
