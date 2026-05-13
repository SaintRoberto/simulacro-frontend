import React, { useState, useEffect, useCallback } from 'react';
import { Card } from 'primereact/card';
import { BaseCRUD } from '../../../components/crud/BaseCRUD';
import { Progress, Tag, Modal, Button as AntButton } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
 

interface RequerimientoRecibido {
  id: number; // requerimiento_recurso.id
  requerimientoId: number; // requerimiento.id
  codigo: string;
  solicitante: string; // emisor
  destinatario: string; // receptor
  grupoRequerimiento: string;
  tipoRequerimiento: string;
  cantidadSolicitada: number;
  fechaSolicitud: Date; // inicio
  fechaCumplimiento: Date | null; // fin
  porcentajeAvance: number; // 0|25|50|75|100
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

export const RequerimientosRecibidos: React.FC = () => {
  const [requerimientos, setRequerimientos] = useState<RequerimientoRecibido[]>([]);
  const [showConsultaModal, setShowConsultaModal] = useState(false);
  const [requerimientoDetalle, setRequerimientoDetalle] = useState<RequerimientoDetalle | null>(null);
  const [recursosSolicitados, setRecursosSolicitados] = useState<RecursoSolicitado[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const apiBase = process.env.REACT_APP_API_URL || '/api';
  const navigate = useNavigate();
  const { 
    getRequerimientosRecibidos, 
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
      const requerimientoIds = new Set<number>(
        recursosLista
          .map((r: any) => Number(r?.requerimiento_id ?? 0))
          .filter((id: number) => id > 0)
      );

      if (requerimientoIds.size === 0) {
        setRequerimientos([]);
        return;
      }

      const recursosPorRequerimiento = new Map<number, any[]>();
      for (const recurso of recursosLista) {
        const rid = Number(recurso?.requerimiento_id ?? 0);
        if (!rid) continue;
        const current = recursosPorRequerimiento.get(rid) || [];
        current.push(recurso);
        recursosPorRequerimiento.set(rid, current);
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
      const [dataResult, estadosResult] = await Promise.allSettled([
        getRequerimientosRecibidos(),
        getRequerimientoEstados(),
      ]);
      const data =
        dataResult.status === 'fulfilled'
          ? (dataResult.value as unknown as RequerimientoRecibidoAPI[])
          : [];
      const estadosList =
        estadosResult.status === 'fulfilled'
          ? estadosResult.value
          : [];
      const estadosMap = new Map<number, string>((estadosList || []).map((e: any) => [e.id, e.nombre]));

      const byId = new Map<number, RequerimientoRecibidoAPI>();
      for (const req of data || []) {
        const rid = Number((req as any).requerimiento_id ?? (req as any).id ?? 0);
        if (rid > 0) byId.set(rid, req as RequerimientoRecibidoAPI);
      }

      const transformedData: RequerimientoRecibido[] = [];
      for (const rid of Array.from(requerimientoIds)) {
        const recursosReq = recursosPorRequerimiento.get(rid) || [];
        const requerimientoRecursoId = Number(recursosReq[0]?.id ?? 0);
        const gruposSet = new Set<string>();
        const tiposSet = new Set<string>();
        let cantidadSolicitada = 0;
        for (const recurso of recursosReq) {
          const grupoId = Number(recurso?.recurso_grupo_id ?? 0);
          const tipoId = Number(recurso?.recurso_tipo_id ?? 0);
          const cantidad = Number(recurso?.cantidad_solicitada ?? recurso?.cantidad ?? 0);
          const grupoNombre = recursoGrupos.find((g) => g.id === grupoId)?.nombre || `Grupo ${grupoId}`;
          const tipoNombre = tiposByGrupo.get(grupoId)?.find((t) => t.id === tipoId)?.nombre || `Tipo ${tipoId}`;
          if (grupoId > 0) gruposSet.add(grupoNombre);
          if (tipoId > 0) tiposSet.add(tipoNombre);
          if (Number.isFinite(cantidad)) cantidadSolicitada += Math.max(0, cantidad);
        }
        const gruposResumen = Array.from(gruposSet).join(' / ') || '-';
        const tiposResumen = Array.from(tiposSet).join(' / ') || '-';

        const req = byId.get(rid);
        if (req) {
          transformedData.push({
            id: requerimientoRecursoId,
            requerimientoId: rid,
            codigo: `REQ-${rid}`,
            solicitante: req.creador || '-',
            destinatario: req.usuario_receptor,
            grupoRequerimiento: gruposResumen,
            tipoRequerimiento: tiposResumen,
            cantidadSolicitada,
            fechaSolicitud: new Date(req.fecha_inicio),
            fechaCumplimiento: req.fecha_fin ? new Date(req.fecha_fin) : null,
            porcentajeAvance: typeof req.porcentaje_avance === 'number' ? req.porcentaje_avance : 0,
            estado: estadosMap.get(req.requerimiento_estado_id ?? -1) || 'Solicitado',
          });
          continue;
        }

        // Fallback: cargar detalle por ID cuando el endpoint de lista no incluya el requerimiento
        const detalle = await getRequerimientoById(rid);
        transformedData.push({
          id: requerimientoRecursoId,
          requerimientoId: rid,
          codigo: `REQ-${rid}`,
          solicitante: (detalle as any)?.creador || '-',
          destinatario: '-',
          grupoRequerimiento: gruposResumen,
          tipoRequerimiento: tiposResumen,
          cantidadSolicitada,
          fechaSolicitud: detalle?.fecha_inicio ? new Date(detalle.fecha_inicio) : new Date(),
          fechaCumplimiento: detalle?.fecha_fin ? new Date(detalle.fecha_fin) : null,
          porcentajeAvance: Number((detalle as any)?.porcentaje_avance ?? 0),
          estado: estadosMap.get(Number((detalle as any)?.requerimiento_estado_id ?? -1)) || 'Solicitado',
        });
      }

      setRequerimientos(transformedData);
    } catch (error) {
      console.error('Error loading requerimientos:', error);
    }
  }, [authFetch, apiBase, datosLogin?.usuario_id, getRequerimientosRecibidos, getRequerimientoEstados, getRequerimientoById, getRecursoTiposByGrupo, recursoGrupos]);

  useEffect(() => {
    loadRequerimientos();
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
        estado: (requerimiento.estado as any) || 'Inicio',
      };
      setRequerimientos((prev) => [...prev, nuevo]);
    }
  };

  const handleDelete = (requerimiento: RequerimientoRecibido) => {
    setRequerimientos((prev) => prev.filter((r) => r.id !== requerimiento.id));
  };

  const handleRead = useCallback(async (item: RequerimientoRecibido) => {
    try {
      setLoadingDetalle(true);
      setShowConsultaModal(true);
      setRequerimientoDetalle(null);
      setRecursosSolicitados([]);

      // Cargar detalle del requerimiento
      const detalle = await getRequerimientoById(item.requerimientoId);
      if (detalle) {
        setRequerimientoDetalle(detalle as any);
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
        .filter((r: any) => Number(r?.requerimiento_id ?? 0) === item.requerimientoId);
      
      // Resolver nombres de grupo y tipo para cada recurso
      const recursosConNombres: RecursoSolicitado[] = [];
      for (const recurso of recursosApi) {
        // Obtener nombre del grupo
        const grupo = recursoGrupos.find(g => g.id === recurso.recurso_grupo_id);
        let grupoNombre = grupo?.nombre || `Grupo ${recurso.recurso_grupo_id}`;
        
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
    { field: 'solicitante', header: 'Emisor', sortable: true },
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
            const params = new URLSearchParams({
              id: String(row.requerimientoId),
              requerimientoRecursoId: String(row.id),
              cantidadSolicitada: String(Number(row.cantidadSolicitada ?? 0)),
              grupoRequerimiento: row.grupoRequerimiento || '',
              tipoRequerimiento: row.tipoRequerimiento || '',
            });
            navigate(`/requerimientos/Recibidos/nuevo?${params.toString()}`);
          }}
          onRead={handleRead}
          showCreateButton={false}
          showDeleteButton={false}
          showDeleteAction={false}
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
