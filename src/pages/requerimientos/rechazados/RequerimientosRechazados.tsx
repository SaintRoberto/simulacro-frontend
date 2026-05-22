import React, { useCallback, useEffect, useState } from 'react';
import { Card } from 'primereact/card';
import { Progress, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { BaseCRUD } from '../../../components/crud/BaseCRUD';
import { useAuth } from '../../../context/AuthContext';

interface RequerimientoRechazado {
  id: number;
  requerimientoId: number;
  requerimientoNumero?: string | null;
  usuarioEmisorId: number;
  solicitante: string;
  destinatario: string;
  grupoRequerimiento: string;
  tipoRequerimiento: string;
  grupoId: number;
  tipoId: number;
  cantidadSolicitada: number;
  fechaSolicitud: Date;
  fechaCumplimiento: Date | null;
  porcentajeAvance: number;
  estado: string;
  requerimientoEstadoId: number;
}

interface RequerimientoRechazadoAPI {
  id: number;
  activo: boolean;
  cantidad_solicitada: number;
  costo: number;
  creacion: string;
  creador: string;
  destino: string;
  detalle: string;
  especificaciones: string;
  modificacion: string;
  modificador: string;
  recurso_grupo_id: number;
  recurso_grupo_nombre: string | null;
  recurso_tipo_id: number;
  recurso_tipo_nombre: string | null;
  requerimiento_estado_id: number;
  requerimiento_id: number;
  requerimiento_numero: string;
  usuario_emisor: string;
  usuario_emisor_id: number;
  usuario_receptor: string;
  usuario_receptor_id: number;
}

const RECHAZADO_ESTADO_ID = 4;

export const RequerimientosRechazados: React.FC = () => {
  const [requerimientos, setRequerimientos] = useState<RequerimientoRechazado[]>([]);
  const navigate = useNavigate();
  const apiBase = process.env.REACT_APP_API_URL || '/api';
  const { authFetch, datosLogin } = useAuth();

  const loadRequerimientos = useCallback(async () => {
    try {
      const usuarioEmisorId = Number(datosLogin?.usuario_id ?? localStorage.getItem('userId') ?? 0);
      if (!usuarioEmisorId) {
        setRequerimientos([]);
        return;
      }

      const endpoint = `${apiBase}/requerimiento-recursos/rechazados/usuario_emisor/${usuarioEmisorId}/requerimiento_estado/${RECHAZADO_ESTADO_ID}`;
      const recursosRes = await authFetch(endpoint, {
        headers: { accept: 'application/json' },
      });
      if (!recursosRes.ok) {
        setRequerimientos([]);
        return;
      }
      const recursosData = await recursosRes.json();
      const recursosLista = Array.isArray(recursosData) ? (recursosData as RequerimientoRechazadoAPI[]) : [];

      const transformedData: RequerimientoRechazado[] = recursosLista
        .map((row) => ({
          id: Number(row.id ?? 0),
          requerimientoId: Number(row.requerimiento_id ?? 0),
          requerimientoNumero: String(row.requerimiento_numero ?? '').trim() || null,
          usuarioEmisorId: Number(row.usuario_emisor_id ?? 0),
          solicitante: String(row.usuario_emisor ?? row.creador ?? '-'),
          destinatario: String(row.usuario_receptor ?? '-'),
          grupoRequerimiento: String(row.recurso_grupo_nombre ?? `Grupo ${Number(row.recurso_grupo_id ?? 0)}`),
          tipoRequerimiento: String(row.recurso_tipo_nombre ?? `Tipo ${Number(row.recurso_tipo_id ?? 0)}`),
          grupoId: Number(row.recurso_grupo_id ?? 0),
          tipoId: Number(row.recurso_tipo_id ?? 0),
          cantidadSolicitada: Number(row.cantidad_solicitada ?? 0),
          fechaSolicitud: row.creacion ? new Date(row.creacion) : new Date(),
          fechaCumplimiento: row.modificacion ? new Date(row.modificacion) : null,
          porcentajeAvance: 0,
          estado: `Rechazado (${Number(row.requerimiento_estado_id ?? RECHAZADO_ESTADO_ID)})`,
          requerimientoEstadoId: Number(row.requerimiento_estado_id ?? RECHAZADO_ESTADO_ID),
        }))
        .sort((a, b) => b.fechaSolicitud.getTime() - a.fechaSolicitud.getTime());

      setRequerimientos(transformedData);
    } catch (error) {
      console.error('Error loading rejected requerimientos:', error);
      setRequerimientos([]);
    }
  }, [apiBase, authFetch, datosLogin?.usuario_id]);

  useEffect(() => {
    loadRequerimientos();
  }, [loadRequerimientos]);

  const fechaTemplate = (rowData: RequerimientoRechazado, field: keyof RequerimientoRechazado) => {
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

  const estadoColor = (estado: string): string => {
    const e = (estado || '').toLowerCase();
    if (e.includes('rechaz')) return 'red';
    if (e.includes('devuelt')) return 'orange';
    return 'volcano';
  };

  const goToReasignar = (row: RequerimientoRechazado) => {
    const params = new URLSearchParams({
      req_id: String(row.id || 0),
      cantidad_solicitada: String(row.cantidadSolicitada || 0),
      flow: 'rechazado',
      requerimiento_id: String(row.requerimientoId || 0),
      requerimiento_numero: String(row.requerimientoNumero || ''),
      grupoRequerimiento: row.grupoRequerimiento || '',
      tipoRequerimiento: row.tipoRequerimiento || '',
      grupo_id: String(row.grupoId || 0),
      tipo_id: String(row.tipoId || 0),
      detalle: `Reasignacion por requerimiento rechazado ${row.requerimientoNumero || ''}`.trim(),
    });
    navigate(`/requerimientos/rechazados/nuevo?${params.toString()}`);
  };

  const goToNivelSuperior = (row: RequerimientoRechazado) => {
    const params = new URLSearchParams({
      req_id: String(row.id || 0),
      flow: 'superior',
      usuario_id_origen: String(row.usuarioEmisorId || 0),
      requerimiento_id: String(row.requerimientoId || 0),
      requerimiento_numero: String(row.requerimientoNumero || ''),
      grupo_id: String(row.grupoId || 0),
      tipo_id: String(row.tipoId || 0),
      detalle: `Escalamiento de requerimiento rechazado ${row.requerimientoNumero || ''}`.trim(),
    });
    navigate(`/requerimientos/enviados/nuevo?${params.toString()}`);
  };

  const columns = [
    { field: 'id', header: 'Req ID', sortable: true },
    { field: 'solicitante', header: 'Emisor', sortable: true },
    { field: 'grupoRequerimiento', header: 'Grupo recurso', sortable: true },
    { field: 'tipoRequerimiento', header: 'Tipo recurso', sortable: true },
    { field: 'cantidadSolicitada', header: 'Cantidad solicitada', sortable: true },
    {
      field: 'fechaSolicitud',
      header: 'Fecha inicio',
      sortable: true,
      body: (row: RequerimientoRechazado) => fechaTemplate(row, 'fechaSolicitud'),
    },
    {
      field: 'fechaCumplimiento',
      header: 'Fecha fin',
      sortable: true,
      body: (row: RequerimientoRechazado) => fechaTemplate(row, 'fechaCumplimiento'),
    },
    {
      field: 'porcentajeAvance',
      header: 'Porcentaje avance',
      sortable: true,
      body: (row: RequerimientoRechazado) => (
        <Progress percent={row.porcentajeAvance} size="small" status={row.porcentajeAvance === 100 ? 'success' : undefined} />
      ),
    },
    {
      field: 'estado',
      header: 'Estado',
      sortable: true,
      body: (row: RequerimientoRechazado) => <Tag color={estadoColor(row.estado)}>{row.estado}</Tag>,
    },
    {
      field: 'acciones',
      header: 'Acciones',
      body: (row: RequerimientoRechazado) => (
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => goToReasignar(row)}
          >
            Reasignar Recurso
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-success"
            onClick={() => goToNivelSuperior(row)}
          >
            Enviar a nivel superior
          </button>
        </div>
      ),
    },
  ];

  return (
    <Card title="Requerimientos Rechazados">
      <BaseCRUD<RequerimientoRechazado>
        title=""
        items={requerimientos}
        columns={columns}
        onSave={() => {}}
        onDelete={() => {}}
        initialItem={{
          id: 0,
          requerimientoId: 0,
          requerimientoNumero: '',
          solicitante: '',
          destinatario: '',
          grupoRequerimiento: '',
          tipoRequerimiento: '',
          grupoId: 0,
          tipoId: 0,
          cantidadSolicitada: 0,
          fechaSolicitud: new Date(),
          fechaCumplimiento: null,
          porcentajeAvance: 0,
          estado: '',
          requerimientoEstadoId: 0,
        }}
        showCreateButton={false}
        showReadAction={false}
        showEditAction={false}
        showDeleteAction={false}
        showDeleteButton={false}
        useMenuPermissions={false}
      />
    </Card>
  );
};

export default RequerimientosRechazados;
