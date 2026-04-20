import React, { useMemo } from 'react';
import { Table, Typography, Row, Col, Space, Select, Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

export type Institucion = {
  id: number;
  nombre: string;
  siglas?: string;
};

export type Mesa = {
  id: number;
  nombre: string;
  siglas?: string;
  grupo_mesa_abreviatura: string
};

export type RecursoTipoRow = {
  recurso_tipo_id: number;
  recurso_tipo_nombre: string;
};

export type InventarioCellPayload = {
  existencias?: number | null;
  inventario_disponible?: number | null;
  id?: number;
};

export interface InventarioMatrixProps {
  tableTitle: string;
  mesas: Mesa[];
  mesasStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  selectedMesaId?: number;
  onMesaChange: (mesaId: number) => void;
  recursoGrupos: Array<{ id: number; nombre: string }>;
  recursoGruposStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  selectedGrupoId?: number;
  onGrupoChange: (grupoId: number) => void;
  onLoadMatrix: () => void;
  onSaveAll: () => void;
  saving?: boolean;
  saveDisabled?: boolean;
  dirtyCount?: number;
  rows: RecursoTipoRow[];
  instituciones: Institucion[];
  getCell: (recursoTipoId: number, institucionId: number) => InventarioCellPayload | undefined;
  onCellClick: (row: RecursoTipoRow, institucion: Institucion) => void;
  selectedRowId?: number | null;
  selectedInstitucionId?: number | null;
  loading?: boolean;
  loadDisabled?: boolean;
}

export const InventarioMatrix: React.FC<InventarioMatrixProps> = ({
  tableTitle,
  mesas,
  mesasStatus,
  selectedMesaId,
  onMesaChange,
  recursoGrupos,
  recursoGruposStatus,
  selectedGrupoId,
  onGrupoChange,
  onLoadMatrix,
  onSaveAll,
  saving = false,
  saveDisabled = false,
  dirtyCount = 0,
  rows,
  instituciones,
  getCell,
  onCellClick,
  selectedRowId,
  selectedInstitucionId,
  loading = false,
  loadDisabled = false,
}) => {
  const columns: ColumnsType<RecursoTipoRow> = useMemo(() => {
    const base: ColumnsType<RecursoTipoRow> = [
      {
        title: 'Tipo Recurso',
        key: 'tipo',
        fixed: 'left',
        width: 260,
        render: (_, row) => <Text strong>{row.recurso_tipo_nombre}</Text>,
      },
    ];

    const dynamic: ColumnsType<RecursoTipoRow> = instituciones.map((inst) => ({
      title: inst.siglas ? `${inst.siglas} - ${inst.nombre}` : inst.nombre,
      key: `inst_${inst.id}`,
      width: 220,
      render: (_, row) => {
        const cell = getCell(row.recurso_tipo_id, inst.id);
        const existencias = Number(cell?.existencias ?? 0);
        const isSelected = selectedRowId === row.recurso_tipo_id && selectedInstitucionId === inst.id;
        return (
          <button
            type="button"
            onClick={() => onCellClick(row, inst)}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 12 }}>Existencias</Text>
              <Text strong>{existencias}</Text>
            </div>
            
          </button>
        );
      },
    }));

    return [...base, ...dynamic];
  }, [instituciones, getCell, onCellClick, selectedInstitucionId, selectedRowId]);

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Text strong style={{ fontSize: 22 }}>{tableTitle}</Text>
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 8 }}>
        
        <Col xs={24} md={10} lg={6}>
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Text strong>Grupo Recurso</Text>
            <Select
              placeholder="Seleccione grupo de recurso"
              options={recursoGrupos.map((g) => ({ label: g.nombre, value: g.id }))}
              value={selectedGrupoId}
              onChange={(value) => onGrupoChange(value)}
              disabled={recursoGruposStatus === 'loading'}
              loading={recursoGruposStatus === 'loading'}
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="label"
            />
          </Space>
        </Col>
        <Col xs={24} md={10} lg={6}>
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Text strong>Mesa</Text>
            <Select
              placeholder="Seleccione mesa"
              options={mesas.map((m) => ({ label: m.grupo_mesa_abreviatura ? `${m.grupo_mesa_abreviatura} - ${m.nombre}` : m.nombre, value: m.id }))}
              value={selectedMesaId}
              onChange={(value) => onMesaChange(value)}
              disabled={mesasStatus === 'loading'}
              loading={mesasStatus === 'loading'}
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="label"
            />
          </Space>
        </Col>
        <Col xs={24} md={8} lg={2} style={{ display: 'flex', alignItems: 'end' }}>
          <Button type="default" onClick={onLoadMatrix} disabled={loadDisabled} loading={loading}>
            Cargar Matriz
          </Button>
          
        </Col>
        <Col xs={24} md={6} lg={3} style={{ display: 'flex', alignItems: 'end', justifyContent: 'flex-end' }}>
          <Button type="primary" onClick={onSaveAll} loading={saving} disabled={saveDisabled}>
            Guardar Cambios ({dirtyCount})
          </Button>
        </Col>
      </Row>

      <Table<RecursoTipoRow>
        rowKey={(r) => `${r.recurso_tipo_id}`}
        dataSource={rows}
        columns={columns}
        pagination={false}
        scroll={{ x: 1200 }}
        bordered
        size="middle"
        loading={loading}
      />
    </div>
  );
};

export default InventarioMatrix;
