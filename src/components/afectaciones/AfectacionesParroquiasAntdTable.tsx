import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Table, InputNumber, Button, Modal, Typography, Spin, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SettingOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

// Types from endpoints
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

export type CellValue = { cantidad?: number | null; costo?: number | null };

export interface AfectacionesParroquiasAntdTableProps {
  apiBase?: string; // defaults to REACT_APP_API_URL || '/api'
  cantonId?: number; // defaults 901
  mesaGrupoId?: number; // defaults 1
  title?: string;
}

const apiBaseDefault = () => process.env.REACT_APP_API_URL || '/api';

// Memoized cell editor: local state for responsiveness, commits on blur/enter only
const CellEditor: React.FC<{
  parroquia: Parroquia;
  variable: AfectacionVariable;
  getValue: (parroquiaId: number, variableId: number) => CellValue | undefined;
  commit: (parroquiaId: number, variableId: number, patch: Partial<CellValue>) => void;
  onOpen: (parroquia: Parroquia, variable: AfectacionVariable) => void;
}> = React.memo(({ parroquia, variable, getValue, commit, onOpen }) => {
  const parroquiaId = parroquia.id;
  const initial = getValue(parroquiaId, variable.id) || {};
  const [cantidad, setCantidad] = useState<number | null | undefined>(initial.cantidad ?? null);
  const [costo, setCosto] = useState<number | null | undefined>(initial.costo ?? null);


  
  // Sync if external store changes for this specific cell
  useEffect(() => {
    const fresh = getValue(parroquiaId, variable.id) || {};
    setCantidad(fresh.cantidad ?? null);
    setCosto(fresh.costo ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parroquiaId, variable.id]);

  const onCommit = useCallback(() => {
    commit(parroquiaId, variable.id, {
      cantidad: typeof cantidad === 'number' ? cantidad : null,
      costo: typeof costo === 'number' ? costo : null,
    });
  }, [cantidad, costo, commit, parroquiaId, variable.id]);

  return (
    <Space size="small">
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
        style={{ width: 90 }}
        disabled={!variable.requiere_costo}
      />
      <Button icon={<SettingOutlined />} onClick={() => onOpen(parroquia, variable)} />
    </Space>
  );
});
CellEditor.displayName = 'CellEditor';

const AfectacionesParroquiasAntdTable: React.FC<AfectacionesParroquiasAntdTableProps> = ({ apiBase = apiBaseDefault(), cantonId = 901, mesaGrupoId = 1, title = 'Matriz de Afectaciones por Parroquia' }) => {
  const [loading, setLoading] = useState(false);
  const [parroquias, setParroquias] = useState<Parroquia[]>([]);
  const [variables, setVariables] = useState<AfectacionVariable[]>([]);
  const [matrix, setMatrix] = useState<Record<number, Record<number, CellValue>>>({});
  const matrixRef = useRef(matrix);
  useEffect(() => { matrixRef.current = matrix; }, [matrix]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<{ parroquia?: Parroquia; variable?: AfectacionVariable } | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const [p, v] = await Promise.all([
          fetch(`${apiBase}/canton/${cantonId}/parroquias/`, { headers: { accept: 'application/json' } }),
          fetch(`${apiBase}/mesa_grupo/${mesaGrupoId}/afectacion_varibles/`, { headers: { accept: 'application/json' } }),
        ]);
        if (!mounted) return;
        setParroquias(p.ok ? await p.json() : []);
        setVariables(v.ok ? await v.json() : []);
      } catch {
        if (!mounted) return;
        setParroquias([]);
        setVariables([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [apiBase, cantonId, mesaGrupoId]);

  const getValue = useCallback((parroquiaId: number, variableId: number) => matrixRef.current[parroquiaId]?.[variableId], []);
  const commit = useCallback((parroquiaId: number, variableId: number, patch: Partial<CellValue>) => {
    setMatrix(prev => ({
      ...prev,
      [parroquiaId]: {
        ...(prev[parroquiaId] || {}),
        [variableId]: { ...(prev[parroquiaId]?.[variableId] || {}), ...patch },
      },
    }));
  }, []);

  const columns: ColumnsType<Parroquia> = useMemo(() => {
    const first: ColumnsType<Parroquia> = [
      {
        title: 'Parroquia',
        dataIndex: 'nombre',
        key: 'nombre',
        fixed: 'left',
        width: 220,
        render: (text: string) => <Text strong>{text}</Text>,
      },
    ];

    const dynamic: ColumnsType<Parroquia> = variables.map((v) => ({
      title: (
        <div>
          <div>{v.nombre}</div>
        </div>
      ),
      dataIndex: `v_${v.id}`,
      key: `v_${v.id}`,
      width: 280,
      render: (_: any, p: Parroquia) => (
        <CellEditor
          parroquia={p}
          variable={v}
          getValue={getValue}
          commit={commit}
          onOpen={(par, variable) => { setSelected({ parroquia: par, variable }); setModalOpen(true); }}
        />
      ),
    }));

    return [...first, ...dynamic];
  // Only re-create columns when variables change, not on each keystroke
  }, [variables, getValue, commit]);

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>{title}</Title>
      </div>
      <Spin spinning={loading}>
        <Table<Parroquia>
          rowKey={(r) => r.id}
          dataSource={parroquias}
          columns={columns}
          pagination={false}
          bordered
          size="middle"
          scroll={{ x: 800 }}
          sticky
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

export default AfectacionesParroquiasAntdTable;
