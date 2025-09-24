import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Table, InputNumber, Button, Modal, Spin, Typography, Space, Select, Row, Col } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SettingOutlined } from '@ant-design/icons';

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
}

// Component props allow providing ids, but default to the ones in the prompt
export interface AfectacionesParroquiasMatrixProps {
  apiBase?: string; // default process.env.REACT_APP_API_URL || '/api'
  cantonId?: number; // default 901
  mesaGrupoId?: number; // default 1
  tableTitle?: string;
}

const buildApiBase = () => process.env.REACT_APP_API_URL || '/api';

export const AfectacionesParroquiasMatrix: React.FC<AfectacionesParroquiasMatrixProps> = ({
  apiBase = buildApiBase(),
  cantonId = 901,
  mesaGrupoId = 1,
  tableTitle = 'Matriz de Afectaciones por Parroquia',
}) => {
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

  // New: selectors state
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [cantones, setCantones] = useState<Canton[]>([]);
  const [parroquiasOptions, setParroquiasOptions] = useState<Parroquia[]>([]);
  const [provinciaId, setProvinciaId] = useState<number | undefined>(undefined);
  const [cantonSelId, setCantonSelId] = useState<number | undefined>(cantonId);
  const [parroquiasSelIds, setParroquiasSelIds] = useState<number[]>([]);

  // Fetch parroquias and variables
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [provRes, vRes] = await Promise.all([
          fetch(`${apiBase}/provincias`, { headers: { accept: 'application/json' } }),
          fetch(`${apiBase}/mesa_grupo/${mesaGrupoId}/afectacion_varibles/`, { headers: { accept: 'application/json' } }),
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
  }, [apiBase, mesaGrupoId]);

  // When provincia changes, load cantones
  useEffect(() => {
    let isMounted = true;
    const loadCantones = async () => {
      if (!provinciaId) { setCantones([]); setCantonSelId(undefined); setParroquiasOptions([]); setParroquiasSelIds([]); return; }
      try {
        setLoading(true);
        const res = await fetch(`${apiBase}/provincia/${provinciaId}/cantones/`, { headers: { accept: 'application/json' } });
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
        const res = await fetch(`${apiBase}/canton/${cantonSelId}/parroquias/`, { headers: { accept: 'application/json' } });
        if (!isMounted) return;
        const data: Parroquia[] = res.ok ? await res.json() : [];
        setParroquiasOptions(data || []);
        // Optional: auto-select all initially? Keeping empty selection by default
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
  };

  const CellEditor: React.FC<CellEditorProps> = React.memo(({ parroquia, variable }) => {
    const parroquiaId = parroquia.id;
    const current = matrixRef.current[parroquiaId]?.[variable.id] || {};
    const [cantidad, setCantidad] = useState<number | null | undefined>(current.cantidad ?? null);
    const [costo, setCosto] = useState<number | null | undefined>(current.costo ?? null);

    // When external matrix updates for this cell (rare), sync local values
    useEffect(() => {
      const fresh = matrixRef.current[parroquiaId]?.[variable.id] || {};
      setCantidad(fresh.cantidad ?? null);
      setCosto(fresh.costo ?? null);
    }, [parroquiaId, variable.id, matrix]);

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
      render: (_: any, p: Parroquia) => <CellEditor parroquia={p} variable={v} />,
    }));

    return [...base, ...variableColumns];
  // Only re-create columns when variables change (not on every keystroke)
  }, [variables]);

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
        <Col xs={24} md={8}>
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Text strong>Parroquias</Text>
            <Select
              mode="multiple"
              placeholder="Seleccione parroquias"
              options={(parroquiasOptions || []).map(p => ({ label: p.nombre, value: p.id }))}
              value={parroquiasSelIds}
              onChange={(vals) => setParroquiasSelIds(vals as number[])}
              disabled={!cantonSelId}
              maxTagCount="responsive"
              style={{ width: '100%' }}
            />
          </Space>
        </Col>
      </Row>
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
        onOk={() => setModalOpen(false)}
        okText="Cerrar"
        cancelButtonProps={{ style: { display: 'none' } }}
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
            <p>
              <Text strong>Requiere costo: </Text>
              <Text>{selected.variable.requiere_costo ? 'Sí' : 'No'}</Text>
            </p>
            <p>
              <Text strong>Requiere GIS: </Text>
              <Text>{selected.variable.requiere_gis ? 'Sí' : 'No'}</Text>
            </p>
          </div>
        ) : (
          <Text type="secondary">Seleccione una celda para ver detalles</Text>
        )}
      </Modal>
    </div>
  );
};

export default AfectacionesParroquiasMatrix;
