import React, { useState, useEffect, useCallback } from 'react';
import { Card } from 'primereact/card';
import { BaseCRUD } from '../../../components/crud/BaseCRUD';
import { Progress, Tag, Modal, Button as AntButton } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  HuellaAccionLogId,
  registrarHuellaMovimiento,
} from '../../../utils/requerimientoHuellaLog';
 

interface RequerimientoRecibido {
  id: number; // requerimiento_recurso.id
  requerimientoId: number; // requerimiento.id
  requerimientoNumero?: string | null;
  codigo: string;
  solicitante: string; // emisor
  destinatario: string; // receptor
  grupoRequerimiento: string;
  tipoRequerimiento: string;
  cantidadSolicitada: number;
  fechaSolicitud: Date; // inicio
  fechaCumplimiento: Date | null; // fin
  porcentajeAvance: number; // 0|25|50|75|100
  requerimientoEstadoId: number;
  estado: string; // nombre proveniente del backend
}

// API response shape for requerimientos Recibidos endpoint
interface RequerimientoRecibidoAPI {
  activo: boolean;
  creador?: string;
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

interface RequerimientoDetalle {
  activo: boolean;
  creacion: string;
  creador: string;
  emergencia_id: number;
  fecha_fin: string;
  fecha_inicio: string;
  id: number;
  modificacion: string;
  modificador: string;
  porcentaje_avance: number;
  requerimiento_estado_id: number;
  usuario_emisor_id: number;
  usuario_receptor_id: number;
}

interface RecursoSolicitado {
  activo: boolean;
  cantidad_solicitada: number;
  costoEstimado?: number;
  costo?: number;
  creacion: string;
  creador: string;
  destino: string;
  detalle?: string;
  especificaciones: string;
  id: number;
  modificacion: string;
  modificador: string | null;
  recurso_grupo_id: number;
  recurso_tipo_id: number;
  requerimiento_id: number;
  grupo_nombre?: string;
  tipo_nombre?: string;
}

const isRejectedStateName = (value: string): boolean => {
  const normalized = String(value || '').toLowerCase();
  return (
    normalized.includes('rechaz') ||
    normalized.includes('devuelt') ||
    normalized.includes('no acept')
  );
};

const isFinalizedRequirement = (value: Pick<RequerimientoRecibido, 'estado' | 'requerimientoEstadoId'>): boolean => {
  const normalized = String(value.estado || '').toLowerCase();
  return Number(value.requerimientoEstadoId) === 3 || normalized.includes('final');
};

const hasRequirementProgress = (value: Pick<RequerimientoRecibido, 'porcentajeAvance'>): boolean => {
  const progress = Number(value.porcentajeAvance ?? 0);
  return Number.isFinite(progress) && progress > 0;
};

export const RequerimientosRecibidos: React.FC = () => {
  const [requerimientos, setRequerimientos] = useState<RequerimientoRecibido[]>([]);
  const [showConsultaModal, setShowConsultaModal] = useState(false);
  const [requerimientoDetalle, setRequerimientoDetalle] = useState<RequerimientoDetalle | null>(null);
  const [recursosSolicitados, setRecursosSolicitados] = useState<RecursoSolicitado[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [rechazadoEstadoId, setRechazadoEstadoId] = useState<number | null>(null);
  const apiBase = process.env.REACT_APP_API_URL || '/api';
  const navigate = useNavigate();
  const { 
    getRequerimientoEstados, 
    getRequerimientoById, 
    authFetch,
    datosLogin,
    getRecursoTiposByGrupo,
    recursoGrupos
  } = useAuth();

  const loadRequerimientos = useCallback(async () => {
    try {
      const usuarioReceptorId = Number(datosLogin?.usuario_id ?? 0);
      if (!usuarioReceptorId) {
        setRequerimientos([]);
        return;
      }

      // 1) Obtener requerimiento_ids desde recursos por usuario receptor
      const recursosRes = await authFetch(`${apiBase}/requerimiento-recursos/usuario-receptor/${usuarioReceptorId}`, {
        headers: { accept: 'application/json' },
      });
      if (!recursosRes.ok) {
        setRequerimientos([]);
        return;
      }
      const recursosData = await recursosRes.json();
      const recursosLista = Array.isArray(recursosData) ? recursosData : [];

      if (recursosLista.length === 0) {
        setRequerimientos([]);
        return;
      }

      const recursosPorClave = new Map<string, any[]>();
      for (const recurso of recursosLista) {
        const numero = String(recurso?.requerimiento_numero ?? '').trim();
        const rid = Number(recurso?.requerimiento_id ?? 0);
        const clave = numero
          ? `NUM:${numero}`
          : rid > 0
            ? `RID:${rid}`
            : `ROW:${Number(recurso?.id ?? 0)}`;
        const current = recursosPorClave.get(clave) || [];
        current.push(recurso);
        recursosPorClave.set(clave, current);
      }

      const uniqueGrupoIds = Array.from(
        new Set(
          recursosLista
            .map((r: any) => Number(r?.recurso_grupo_id ?? 0))
            .filter((gid: number) => gid > 0)
        )
      );
      const tiposByGrupo = new Map<number, Array<{ id: number; nombre: string }>>();
      await Promise.all(
        uniqueGrupoIds.map(async (grupoId) => {
          const tipos = await getRecursoTiposByGrupo(grupoId);
          tiposByGrupo.set(grupoId, tipos || []);
        })
      );

      // 2) Cargar lista general y estados (si falla, seguimos con fallback por ID)
      const [ estadosResult] = await Promise.allSettled([
        getRequerimientoEstados(),
      ]);
    
      const estadosList =
        estadosResult.status === 'fulfilled'
          ? estadosResult.value
          : [];
      const estadosMap = new Map<number, string>((estadosList || []).map((e: any) => [e.id, e.nombre]));
      const rejectedEstado = (estadosList || []).find((e: any) => isRejectedStateName(String(e?.nombre ?? '')));
      setRechazadoEstadoId(rejectedEstado ? Number((rejectedEstado as any).id) : null);

      const byId = new Map<number, RequerimientoRecibidoAPI>();
     

      const transformedData: RequerimientoRecibido[] = [];
      for (const recursosReq of Array.from(recursosPorClave.values())) {
        const first = recursosReq[0] || {};
        const rid = Number(first?.requerimiento_id ?? 0);
        const requerimientoNumero = String(first?.requerimiento_numero ?? '').trim() || null;
        const requerimientoRecursoId = Number(recursosReq[0]?.id ?? 0);
        const gruposSet = new Set<string>();
        const tiposSet = new Set<string>();
        let cantidadSolicitada = 0;
        for (const recurso of recursosReq) {
          const grupoId = Number(recurso?.recurso_grupo_id ?? 0);
          const tipoId = Number(recurso?.recurso_tipo_id ?? 0);
          const cantidad = Number(recurso?.cantidad_solicitada ?? recurso?.cantidad ?? 0);
          const grupoNombre =
            String(recurso?.grupo_recurso ?? '').trim() ||
            recursoGrupos.find((g) => g.id === grupoId)?.nombre ||
            `Grupo ${grupoId}`;
          const tipoNombre = tiposByGrupo.get(grupoId)?.find((t) => t.id === tipoId)?.nombre || `Tipo ${tipoId}`;
          if (grupoId > 0) gruposSet.add(grupoNombre);
          if (tipoId > 0) tiposSet.add(tipoNombre);
          if (Number.isFinite(cantidad)) cantidadSolicitada += Math.max(0, cantidad);
        }
        const gruposResumen = Array.from(gruposSet).join(' / ') || '-';
        const tiposResumen = Array.from(tiposSet).join(' / ') || '-';

        const req = rid > 0 ? byId.get(rid) : undefined;
        const firstPorcentajeAvance = Number(first?.porcentaje_avance);
        const firstEstadoId = Number(first?.requerimiento_estado_id);
        if (req) {
          const reqPorcentajeAvance = Number(req.porcentaje_avance);
          const requerimientoEstadoId = Number.isFinite(firstEstadoId)
            ? firstEstadoId
            : Number(req.requerimiento_estado_id ?? 0);
          transformedData.push({
            id: requerimientoRecursoId,
            requerimientoId: rid,
            requerimientoNumero,
            codigo: requerimientoNumero || `REQ-${rid}`,
            solicitante: req.usuario_emisor || req.creador || '-',
            destinatario: req.usuario_receptor || '-',
            grupoRequerimiento: gruposResumen,
            tipoRequerimiento: tiposResumen,
            cantidadSolicitada,
            fechaSolicitud: new Date(req.fecha_inicio),
            fechaCumplimiento: req.fecha_fin ? new Date(req.fecha_fin) : null,
            porcentajeAvance: Number.isFinite(firstPorcentajeAvance)
              ? firstPorcentajeAvance
              : (Number.isFinite(reqPorcentajeAvance) ? reqPorcentajeAvance : 0),
            requerimientoEstadoId,
            estado: estadosMap.get(requerimientoEstadoId) || 'Solicitado',
          });
          continue;
        }

        // Fallback: si no existe cabecera de requerimiento, armar fila desde requerimiento_recursos
        let detalle: any = null;
        if (rid > 0) {
          detalle = await getRequerimientoById(rid);
        }
        const detallePorcentajeAvance = Number((detalle as any)?.porcentaje_avance);
        const detalleEstadoId = Number((detalle as any)?.requerimiento_estado_id);
        const requerimientoEstadoId = Number.isFinite(firstEstadoId)
          ? firstEstadoId
          : (Number.isFinite(detalleEstadoId) ? detalleEstadoId : 0);
        transformedData.push({
          id: requerimientoRecursoId,
          requerimientoId: rid,
          requerimientoNumero,
          codigo: requerimientoNumero || (rid > 0 ? `REQ-${rid}` : `RR-${requerimientoRecursoId}`),
          solicitante: String(first?.usuario_emisor ?? first?.creador ?? (detalle as any)?.creador ?? '-'),
          destinatario: String(first?.usuario_receptor ?? '-'),
          grupoRequerimiento: gruposResumen,
          tipoRequerimiento: tiposResumen,
          cantidadSolicitada,
          fechaSolicitud: first?.creacion ? new Date(first.creacion) : (detalle?.fecha_inicio ? new Date(detalle.fecha_inicio) : new Date()),
          fechaCumplimiento: first?.modificacion ? new Date(first.modificacion) : (detalle?.fecha_fin ? new Date(detalle.fecha_fin) : null),
          porcentajeAvance: Number.isFinite(firstPorcentajeAvance)
            ? firstPorcentajeAvance
            : (Number.isFinite(detallePorcentajeAvance) ? detallePorcentajeAvance : 0),
          requerimientoEstadoId,
          estado: estadosMap.get(requerimientoEstadoId) || 'Solicitado',
        });
      }

      setRequerimientos(
        transformedData.sort((a, b) => b.fechaSolicitud.getTime() - a.fechaSolicitud.getTime())
      );
    } catch (error) {
      console.error('Error loading requerimientos:', error);
    }
  }, [authFetch, apiBase, datosLogin?.usuario_id, getRequerimientoEstados, getRequerimientoById, getRecursoTiposByGrupo, recursoGrupos]);

  useEffect(() => {
    loadRequerimientos();
    const intervalId = window.setInterval(loadRequerimientos, 10000);
    return () => window.clearInterval(intervalId);
  }, [loadRequerimientos]);

  const handleSave = (requerimiento: Partial<RequerimientoRecibido>) => {
    if (requerimiento.id) {
      setRequerimientos((prev) => prev.map((r) => (r.id === requerimiento.id ? (requerimiento as RequerimientoRecibido) : r)));
    } else {
      const newId = Math.max(...requerimientos.map((r) => r.id), 0) + 1;
      const nuevo: RequerimientoRecibido = {
        id: newId,
        requerimientoId: 0,
        codigo: `REQ-ENV-${new Date().getFullYear()}-${String(newId).padStart(5, '0')}`,
        solicitante: requerimiento.solicitante || '',
        destinatario: requerimiento.destinatario || '',
        grupoRequerimiento: requerimiento.grupoRequerimiento || '',
        tipoRequerimiento: requerimiento.tipoRequerimiento || '',
        cantidadSolicitada: Number(requerimiento.cantidadSolicitada ?? 0),
        fechaSolicitud: requerimiento.fechaSolicitud || new Date(),
        fechaCumplimiento: requerimiento.fechaCumplimiento ?? null,
        porcentajeAvance: typeof requerimiento.porcentajeAvance === 'number' ? requerimiento.porcentajeAvance : 0,
        requerimientoEstadoId: Number(requerimiento.requerimientoEstadoId ?? 0),
        estado: (requerimiento.estado as any) || 'Inicio',
      };
      setRequerimientos((prev) => [...prev, nuevo]);
    }
  };

  const handleDelete = useCallback(async (requerimiento: RequerimientoRecibido) => {
    if (hasRequirementProgress(requerimiento)) {
      alert('No se puede rechazar un requerimiento con avance mayor a 0%.');
      return;
    }

    if (isFinalizedRequirement(requerimiento)) {
      alert('No se puede rechazar un requerimiento finalizado.');
      return;
    }

    if (!rechazadoEstadoId) {
      alert('No se encontro el estado de rechazo configurado.');
      return;
    }

    try {
      const patchRes = await authFetch(`${apiBase}/requerimiento-recursos/${requerimiento.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ requerimiento_estado_id: Number(rechazadoEstadoId) }),
      });

      if (patchRes.ok) {
        const usuarioMesa = String(
          datosLogin?.usuario_login ||
          datosLogin?.mesa_siglas ||
          datosLogin?.mesa_nombre ||
          ''
        ).trim();
        await registrarHuellaMovimiento({
          apiBase,
          authFetch,
          context: 'recibidos:rechazar_requerimiento',
          params: {
            accionId: HuellaAccionLogId.RECHAZAR_REQUERIMIENTO,
            usuarioAccionId: Number(datosLogin?.usuario_id ?? 0),
            cantidadSolicitada: Number(requerimiento.cantidadSolicitada ?? 0),
            coeOrigenId: Number(datosLogin?.coe_id ?? 0),
            mesaOrigenId: Number(datosLogin?.mesa_id ?? 0),
            requerimientoNumero: String(requerimiento.requerimientoNumero || ''),
            requerimientoRecursoId: Number(requerimiento.id ?? 0),
            requerimientoRespuestaSituacion: `requerimiento rechazado por ${usuarioMesa || '-'}`,
            respuestaFecha: new Date().toISOString(),
          },
        });
        alert('Recurso rechazado correctamente.');
        await loadRequerimientos();
        return;
      }

      alert('No se pudo rechazar el requerimiento.');
    } catch (error) {
      console.error('Error al rechazar requerimiento:', error);
      alert('Ocurrio un error al rechazar el requerimiento.');
    }
  }, [
    rechazadoEstadoId,
    authFetch,
    apiBase,
    loadRequerimientos,
    datosLogin?.usuario_login,
    datosLogin?.mesa_siglas,
    datosLogin?.mesa_nombre,
    datosLogin?.usuario_id,
    datosLogin?.coe_id,
    datosLogin?.mesa_id,
  ]);

  const handleRead = useCallback(async (item: RequerimientoRecibido) => {
    try {
      setLoadingDetalle(true);
      setShowConsultaModal(true);
      setRequerimientoDetalle(null);
      setRecursosSolicitados([]);

      // Cargar detalle del requerimiento
      if (item.requerimientoId > 0) {
        const detalle = await getRequerimientoById(item.requerimientoId);
        if (detalle) {
          setRequerimientoDetalle(detalle as any);
        }
      } else {
        setRequerimientoDetalle({
          activo: true,
          creacion: item.fechaSolicitud.toISOString(),
          creador: item.solicitante || '-',
          emergencia_id: 0,
          fecha_fin: item.fechaCumplimiento ? item.fechaCumplimiento.toISOString() : '',
          fecha_inicio: item.fechaSolicitud.toISOString(),
          id: 0,
          modificacion: '',
          modificador: '',
          porcentaje_avance: item.porcentajeAvance || 0,
          requerimiento_estado_id: 0,
          usuario_emisor_id: 0,
          usuario_receptor_id: 0,
        } as any);
      }

      // Cargar recursos solicitados por usuario receptor
      const usuarioReceptorId = Number(datosLogin?.usuario_id ?? 0);
      if (!usuarioReceptorId) {
        setRecursosSolicitados([]);
        return;
      }
      const resRecursos = await authFetch(`${apiBase}/requerimiento-recursos/usuario-receptor/${usuarioReceptorId}`, {
        headers: { accept: 'application/json' },
      });
      if (!resRecursos.ok) {
        setRecursosSolicitados([]);
        return;
      }
      const recursosApiAll = await resRecursos.json();
      const recursosApi = (Array.isArray(recursosApiAll) ? recursosApiAll : [])
        .filter((r: any) => {
          if (item.requerimientoNumero) {
            return String(r?.requerimiento_numero ?? '').trim() === String(item.requerimientoNumero).trim();
          }
          return Number(r?.requerimiento_id ?? 0) === item.requerimientoId;
        });
      
      // Resolver nombres de grupo y tipo para cada recurso
      const recursosConNombres: RecursoSolicitado[] = [];
      for (const recurso of recursosApi) {
        // Obtener nombre del grupo
        const grupo = recursoGrupos.find(g => g.id === recurso.recurso_grupo_id);
        let grupoNombre = grupo?.nombre || `${recurso.grupo_recurso}`;
        
        // Obtener nombre del tipo
        let tipoNombre = '';
        const tipos = await getRecursoTiposByGrupo(recurso.recurso_grupo_id);
        const tipo = tipos.find(t => t.id === recurso.recurso_tipo_id);
        tipoNombre = tipo?.nombre || `Tipo ${recurso.recurso_tipo_id}`;

        recursosConNombres.push({
          ...recurso,
          cantidad_solicitada: Number((recurso as any).cantidad_solicitada ?? 0),
          costoEstimado: Number((recurso as any).costo ?? (recurso as any).costoEstimado ?? 0),
          grupo_nombre: grupoNombre,
          tipo_nombre: tipoNombre
        });
      }

      setRecursosSolicitados(recursosConNombres);
    } catch (error) {
      console.error('Error cargando detalle del requerimiento:', error);
    } finally {
      setLoadingDetalle(false);
    }
  }, [getRequerimientoById, authFetch, apiBase, datosLogin?.usuario_id, getRecursoTiposByGrupo, recursoGrupos]);

  const fechaTemplate = (rowData: RequerimientoRecibido, field: keyof RequerimientoRecibido) => {
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

  const porcentajeTemplate = (rowData: RequerimientoRecibido) => {
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
    { field: 'solicitante', header: 'Solicitado por', sortable: true },
    { field: 'grupoRequerimiento', header: 'Grupo recurso', sortable: true },
    { field: 'tipoRequerimiento', header: 'Tipo recurso', sortable: true },
    { field: 'cantidadSolicitada', header: 'Cantidad Solicitada', sortable: true },
    {
      field: 'fechaSolicitud',
      header: 'Fecha Inicio',
      sortable: true,
      body: (row: RequerimientoRecibido) => fechaTemplate(row, 'fechaSolicitud'),
    },
    {
      field: 'fechaCumplimiento',
      header: 'Fecha Fin',
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
      body: (row: RequerimientoRecibido) => <Tag color={estadoColor(row.estado)}>{row.estado}</Tag>,
    },
  ];

  const formatDateTime = (dateString: string | null): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return dateString;
    }
  };

  return (
    <>
      <Card title="Requerimientos Recibidos">
        <BaseCRUD<RequerimientoRecibido>
          title=""
          items={requerimientos}
          columns={columns}
          onEdit={(row) => {
            if (isFinalizedRequirement(row)) {
              alert('No se puede editar un requerimiento finalizado.');
              return;
            }
            const params = new URLSearchParams({
              id: String(row.id),
              requerimiento_id: String(row.requerimientoId),
              requerimiento_numero: String(row.requerimientoNumero || ''),
              requerimientoRecursoId: String(row.id),
              cantidadSolicitada: String(Number(row.cantidadSolicitada ?? 0)),
              grupoRequerimiento: row.grupoRequerimiento || '',
              tipoRequerimiento: row.tipoRequerimiento || '',
            });
            navigate(`/requerimientos/Recibidos/nuevo?${params.toString()}`);
          }}
          canEditRow={(row) => !isFinalizedRequirement(row)}
          canDeleteRow={(row) => !isFinalizedRequirement(row) && !hasRequirementProgress(row)}
          onRead={handleRead}
          showCreateButton={false}
          showDeleteButton={true}
          showDeleteAction={true}
          deleteActionTitle="Rechazar requerimiento"
          deleteActionIconClassName="pi pi-times"
          deleteActionButtonClassName="btn btn-sm btn-link p-0 text-danger"
          deleteDialogTitle="Confirmar rechazo"
          deleteDialogMessage="¿Está seguro que desea rechazar este requerimiento?"
          deleteDialogOkText="Rechazar"
          forceDeleteAction={true}
          onSave={handleSave}
          onDelete={handleDelete}
          initialItem={{
            id: 0,
            requerimientoId: 0,
            codigo: '',
            solicitante: '',
            destinatario: '',
            grupoRequerimiento: '',
            tipoRequerimiento: '',
            cantidadSolicitada: 0,
            fechaSolicitud: new Date(),
            fechaCumplimiento: null,
            porcentajeAvance: 0,
            requerimientoEstadoId: 0,
            estado: 'Solicitado',
          }}
        />
      </Card>

      <Modal
        open={showConsultaModal}
        title="Detalle del Requerimiento"
        onCancel={() => {
          setShowConsultaModal(false);
          setRequerimientoDetalle(null);
          setRecursosSolicitados([]);
        }}
        footer={[
          <AntButton key="close" type="primary" onClick={() => {
            setShowConsultaModal(false);
            setRequerimientoDetalle(null);
            setRecursosSolicitados([]);
          }}>
            Cerrar
          </AntButton>
        ]}
        width={900}
      >
        {loadingDetalle ? (
          <div className="text-center py-4">Cargando información...</div>
        ) : requerimientoDetalle ? (
          <div>
            {/* Información del Requerimiento */}
            <div className="mb-4">
              <div className="row mb-2">
                <div className="col-md-3"><strong>Número:</strong></div>
                <div className="col-md-9">REQ-{requerimientoDetalle.id}</div>
              </div>
              <div className="row mb-2">
                <div className="col-md-3"><strong>Fecha Solicitud:</strong></div>
                <div className="col-md-9">{formatDateTime(requerimientoDetalle.fecha_inicio)}</div>
              </div>
              <div className="row mb-2">
                <div className="col-md-3"><strong>Fecha Fin:</strong></div>
                <div className="col-md-9">{formatDateTime(requerimientoDetalle.fecha_fin)}</div>
              </div>
            </div>

            {/* Grilla de Recursos Solicitados */}
            <div className="mt-4">
              <h5 className="mb-3">Recursos solicitados</h5>
              {recursosSolicitados.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-bordered table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>Grupo</th>
                        <th>Tipo</th>
                        <th>Cantidad</th>
                        <th>Costo</th>
                        <th>Destino</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recursosSolicitados.map((recurso) => (
                        <tr key={recurso.id}>
                          <td>{recurso.grupo_nombre || '-'}</td>
                          <td>{recurso.tipo_nombre || '-'}</td>
                          <td>{recurso.cantidad_solicitada}</td>
                          <td>${recurso.costoEstimado?.toFixed(2) || 0}</td>
                          <td>{recurso.destino || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted">No hay recursos solicitados para este requerimiento.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted">No se pudo cargar la información del requerimiento.</div>
        )}
      </Modal>
    </>
  );
};

export default RequerimientosRecibidos;
