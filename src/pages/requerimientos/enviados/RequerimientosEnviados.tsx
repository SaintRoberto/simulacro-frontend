import React, { useState, useEffect, useCallback } from 'react';
import { Card } from 'primereact/card';
import { BaseCRUD } from '../../../components/crud/BaseCRUD';
import { Progress, Tag } from 'antd';
import { RequerimientoEnviadoForm } from './RequerimientoEnviadoForm';
import { Button } from 'primereact/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
 

interface RequerimientoEnviado {
  id: number;
  codigo: string;
  solicitante: string; // emisor
  destinatario: string; // receptor
  fechaSolicitud: Date; // inicio
  fechaCumplimiento: Date | null; // fin
  porcentajeAvance: number; // 0|25|50|75|100
  estado: string; // nombre proveniente del backend
}

// API response shape for requerimientos enviados endpoint
interface RequerimientoEnviadoAPI {
  activo: boolean;
  emergencia_id: number;
  fecha_fin: string | null;
  fecha_inicio: string;
  porcentaje_avance?: number;
  requerimiento_estado_id?: number;
  requerimiento_id: number;
  usuario_emisor: string;
  usuario_emisor_id: number;
  usuario_receptor: string;
  usuario_receptor_id: number;
}

export const RequerimientosEnviados: React.FC = () => {
  const [requerimientos, setRequerimientos] = useState<RequerimientoEnviado[]>([]);
  const navigate = useNavigate();
  const { getRequerimientosEnviados, getRequerimientoEstados } = useAuth();

  const loadRequerimientos = useCallback(async () => {
    try {
      const [data, estadosList] = await Promise.all([
        getRequerimientosEnviados(),
        getRequerimientoEstados(),
      ]);
      const estadosMap = new Map<number, string>((estadosList || []).map((e: any) => [e.id, e.nombre]));
      // Transform API data to local format
      const transformedData: RequerimientoEnviado[] = (data as unknown as RequerimientoEnviadoAPI[]).map((req) => ({
        id: req.requerimiento_id,
        codigo: `REQ-${req.requerimiento_id}`,
        solicitante: req.usuario_emisor,
        destinatario: req.usuario_receptor,
        fechaSolicitud: new Date(req.fecha_inicio),
        fechaCumplimiento: req.fecha_fin ? new Date(req.fecha_fin) : null,
        porcentajeAvance: typeof req.porcentaje_avance === 'number' ? req.porcentaje_avance : 0,
        estado: estadosMap.get(req.requerimiento_estado_id ?? -1) || 'Solicitado',
      }));
      setRequerimientos(transformedData);
    } catch (error) {
      console.error('Error loading requerimientos:', error);
    }
  }, [getRequerimientosEnviados, getRequerimientoEstados]);

  useEffect(() => {
    loadRequerimientos();
  }, [loadRequerimientos]);

  const handleSave = (requerimiento: Partial<RequerimientoEnviado>) => {
    if (requerimiento.id) {
      setRequerimientos((prev) => prev.map((r) => (r.id === requerimiento.id ? (requerimiento as RequerimientoEnviado) : r)));
    } else {
      const newId = Math.max(...requerimientos.map((r) => r.id), 0) + 1;
      const nuevo: RequerimientoEnviado = {
        id: newId,
        codigo: `REQ-ENV-${new Date().getFullYear()}-${String(newId).padStart(5, '0')}`,
        solicitante: requerimiento.solicitante || '',
        destinatario: requerimiento.destinatario || '',
        fechaSolicitud: requerimiento.fechaSolicitud || new Date(),
        fechaCumplimiento: requerimiento.fechaCumplimiento ?? null,
        porcentajeAvance: typeof requerimiento.porcentajeAvance === 'number' ? requerimiento.porcentajeAvance : 0,
        estado: (requerimiento.estado as any) || 'Inicio',
      };
      setRequerimientos((prev) => [...prev, nuevo]);
    }
  };

  const handleDelete = (requerimiento: RequerimientoEnviado) => {
    setRequerimientos((prev) => prev.filter((r) => r.id !== requerimiento.id));
  };

  const fechaTemplate = (rowData: RequerimientoEnviado, field: keyof RequerimientoEnviado) => {
    const date = rowData[field] as Date | null | undefined;
    if (!date) return '-';
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
  };

  const porcentajeTemplate = (rowData: RequerimientoEnviado) => {
    return <Progress percent={rowData.porcentajeAvance} size="small" status={rowData.porcentajeAvance === 100 ? 'success' : undefined} />;
  };

  const estadoColor = (estado: string): string => {
    const e = (estado || '').toLowerCase();
    if (e.includes('final')) return 'green';
    if (e.includes('seguim')) return 'gold';
    if (e.includes('acept')) return 'blue';
    if (e.includes('solic')) return 'geekblue';
    return 'default';
  };

  const columns = [
    { field: 'id', header: 'Req ID', sortable: true },
    { field: 'solicitante', header: 'Emisor', sortable: true },
    { field: 'destinatario', header: 'Receptor', sortable: true },
    {
      field: 'fechaSolicitud',
      header: 'Fecha Inicio',
      sortable: true,
      body: (row: RequerimientoEnviado) => fechaTemplate(row, 'fechaSolicitud'),
    },
    {
      field: 'fechaCumplimiento',
      header: 'Fecha Fin',
      sortable: true,
      body: (row: RequerimientoEnviado) => fechaTemplate(row, 'fechaCumplimiento'),
    },
    {
      field: 'porcentajeAvance',
      header: 'Porcentaje Avance',
      sortable: true,
      body: porcentajeTemplate,
    },
    {
      field: 'estado',
      header: 'Estado',
      sortable: true,
      body: (row: RequerimientoEnviado) => <Tag color={estadoColor(row.estado)}>{row.estado}</Tag>,
    },
  ];

  return (
    <Card title="Requerimientos Enviados">
      <BaseCRUD<RequerimientoEnviado>
        title=""
        items={requerimientos}
        columns={columns}
        onEdit={(row) => navigate(`/requerimientos/enviados/nuevo?id=${row.id}`)}
        leftToolbarTemplate={() => (
          <Button label="Nuevo" icon="pi pi-plus" severity="success" onClick={() => navigate('/requerimientos/enviados/nuevo')} />
        )}
        renderForm={(item, onChange) => (
          <RequerimientoEnviadoForm<RequerimientoEnviado> item={item} onChange={onChange} />
        )}
        onSave={handleSave}
        onDelete={handleDelete}
        initialItem={{
          id: 0,
          codigo: '',
          solicitante: '',
          destinatario: '',
          fechaSolicitud: new Date(),
          fechaCumplimiento: null,
          porcentajeAvance: 0,
          estado: 'Solicitado',
        }}
      />
    </Card>
  );
};

export default RequerimientosEnviados;