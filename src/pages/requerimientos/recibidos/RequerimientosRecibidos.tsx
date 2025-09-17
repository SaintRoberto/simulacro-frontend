import React, { useState } from 'react';
import { Card } from 'primereact/card';
import { BaseCRUD } from '../../../components/crud/BaseCRUD';
import { Progress } from 'antd';
import { RequerimientoRecibidoForm } from './RequerimientoRecibidoForm';

interface RequerimientoRecibido {
  id: number;
  codigo: string;
  solicitante: string; // emisor
  destinatario: string; // receptor
  fechaSolicitud: Date; // inicio
  fechaCumplimiento: Date | null; // fin
  porcentajeAvance: number; // 0|25|50|75|100
  estado: 'Inicio' | 'Proceso' | 'Finalizado';
}

export const RequerimientosRecibidos: React.FC = () => {
  const [requerimientos, setRequerimientos] = useState<RequerimientoRecibido[]>([]);

  const handleSave = (requerimiento: Partial<RequerimientoRecibido>) => {
    if (requerimiento.id) {
      setRequerimientos((prev) => prev.map((r) => (r.id === requerimiento.id ? (requerimiento as RequerimientoRecibido) : r)));
    } else {
      const newId = Math.max(...requerimientos.map((r) => r.id), 0) + 1;
      const nuevo: RequerimientoRecibido = {
        id: newId,
        codigo: `REQ-REC-${new Date().getFullYear()}-${String(newId).padStart(5, '0')}`,
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

  const handleDelete = (requerimiento: RequerimientoRecibido) => {
    setRequerimientos((prev) => prev.filter((r) => r.id !== requerimiento.id));
  };

  const fechaTemplate = (rowData: RequerimientoRecibido, field: keyof RequerimientoRecibido) => {
    const date = rowData[field] as Date | null | undefined;
    return date ? new Date(date).toLocaleDateString() : '-';
  };

  const porcentajeTemplate = (rowData: RequerimientoRecibido) => {
    return <Progress percent={rowData.porcentajeAvance} size="small" status={rowData.porcentajeAvance === 100 ? 'success' : undefined} />;
  };

  const columns = [
    { field: 'codigo', header: 'Código Requerimiento', sortable: true },
    { field: 'solicitante', header: 'Emisor', sortable: true },
    { field: 'destinatario', header: 'Receptor', sortable: true },
    {
      field: 'fechaSolicitud',
      header: 'Fecha Inicio Requerimiento',
      sortable: true,
      body: (row: RequerimientoRecibido) => fechaTemplate(row, 'fechaSolicitud'),
    },
    {
      field: 'fechaCumplimiento',
      header: 'Fecha Fin Requerimiento',
      sortable: true,
      body: (row: RequerimientoRecibido) => fechaTemplate(row, 'fechaCumplimiento'),
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
    },
  ];

  return (
    <Card title="Requerimientos Recibidos">
      <BaseCRUD<RequerimientoRecibido>
        title="Requerimiento Recibido"
        items={requerimientos}
        columns={columns}
        renderForm={(item, onChange) => (
          <RequerimientoRecibidoForm<RequerimientoRecibido> item={item} onChange={onChange} />
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
          estado: 'Inicio',
        }}
      />
    </Card>
  );
};

export default RequerimientosRecibidos;
