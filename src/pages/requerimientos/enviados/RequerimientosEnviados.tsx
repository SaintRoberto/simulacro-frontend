import React, { useState, useEffect, useCallback } from 'react';
import { Card } from 'primereact/card';
import { BaseCRUD } from '../../../components/crud/BaseCRUD';
import { Progress, Tag, Modal, Button as AntButton } from 'antd';
//import { RequerimientoEnviadoForm } from './RequerimientoEnviadoForm';
import { Button } from 'primereact/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';


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

// Interfaces para detalle y recursos, igual que en recibidos
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
  porcentaje_avance?: number;
  requerimiento_estado_id?: number;
  usuario_emisor_id: number;
  usuario_receptor_id: number;
}

interface RecursoSolicitado {
  id: number;
  activo: boolean;
  cantidad: number;
  costo: number;
  creacion: string;
  creador: string;
  destino: string;
  especificaciones: string;
  modificacion: string | null;
  modificador: string | null;
  recurso_grupo_id: number;
  recurso_tipo_id: number;
  requerimiento_id: number;
  grupo_nombre?: string;
  tipo_nombre?: string;
}

interface RespuestaHistorialItem {
  id?: number;
  requerimiento_id: number;
  fecha_respuesta: string; // ISO
  responsable: string;
  requerimiento_estado_id: number;
  requerimiento_estado_nombre?: string;
  porcentaje_avance: number;
  situacion_actual: string;
}

export const RequerimientosEnviados: React.FC = () => {
  const [requerimientos, setRequerimientos] = useState<RequerimientoEnviado[]>([]);
  const navigate = useNavigate();
  const {
    getRequerimientosEnviados,
    getRequerimientoEstados,
    getRequerimientoById,
    getRequerimientoRecursos,
    getRecursoTiposByGrupo,
    recursoGrupos
  } = useAuth();
  const { datosLogin, authFetch } = useAuth();
  const apiBase = process.env.REACT_APP_API_URL || '/api';

  // Estados para el modal de consulta
  const [showConsultaModal, setShowConsultaModal] = useState(false);
  const [requerimientoDetalle, setRequerimientoDetalle] = useState<RequerimientoDetalle | null>(null);
  const [recursosSolicitados, setRecursosSolicitados] = useState<RecursoSolicitado[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [historial, setHistorial] = useState<RespuestaHistorialItem[]>([]);
  const [estados, setEstados] = useState<Array<{ id: number; nombre: string }>>([]);


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

  const loadHistorial = useCallback(async (rid: number) => {
    try {
      // Nuevo endpoint: trae historial por requerimiento_id
      const res = await authFetch(`${apiBase}/requerimiento-respuestas/${rid}`, {
        headers: { accept: 'application/json' },
      });
      if (!res.ok) {
        setHistorial([]);
        return;
      }
      const data = (await res.json()) as any[];
      const mapped: RespuestaHistorialItem[] = data.map((d: any) => ({
        id: d.id,
        requerimiento_id: d.requerimiento_id ?? rid,
        fecha_respuesta: d.respuesta_fecha || d.fecha_respuesta || d.creacion || new Date().toISOString(),
        responsable: d.responsable || d.creador || '',
        requerimiento_estado_id: d.respuesta_estado_id ?? d.requerimiento_estado_id ?? d.estado_id ?? 0,
        requerimiento_estado_nombre: d.respuesta_estado_nombre || d.estado || d.requerimiento_estado_nombre,
        porcentaje_avance: typeof d.porcentaje_avance === 'number' ? d.porcentaje_avance : 0,
        situacion_actual: d.situacion_actual || d.descripcion || '',
      }));
      setHistorial(mapped);
    } catch (e) {
      setHistorial([]);
    }
  }, [apiBase]);

  useEffect(() => {
    loadRequerimientos();
  }, [loadRequerimientos]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadRequerimientos();
    }, 5000);

    return () => window.clearInterval(intervalId);
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

  // Función para mostrar modal similar a Recibidos
  const handleRead = useCallback(async (item: RequerimientoEnviado) => {
    try {
      setLoadingDetalle(true);
      setShowConsultaModal(true);
      setRequerimientoDetalle(null);
      setRecursosSolicitados([]);
      await loadHistorial(item.id);

      // Cargar detalle del requerimiento
      const detalle = await getRequerimientoById(item.id);
      if (detalle) {
        setRequerimientoDetalle(detalle as any);
      }

      // Cargar recursos solicitados
      const recursosApi = await getRequerimientoRecursos(item.id);
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
  }, [getRequerimientoById, getRequerimientoRecursos, getRecursoTiposByGrupo, recursoGrupos]);

  // Columnas de la tabla
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

  // Formateo para las fechas, igual que en recibidos
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
      <Card title="Requerimientos Enviados">
        <BaseCRUD<RequerimientoEnviado>
          title=""
          items={requerimientos}
          columns={columns}
          onEdit={(row) => navigate(`/requerimientos/enviados/nuevo?id=${row.id}`)}
          onRead={handleRead}
          leftToolbarTemplate={() => (
            <Button label="Nuevo" icon="pi pi-plus" severity="success" onClick={() => navigate('/requerimientos/enviados/nuevo')} />
          )}
          // renderForm={(item, onChange) => (
          //   <RequerimientoEnviadoForm<RequerimientoEnviado> item={item} onChange={onChange} />
          // )}
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
                        <th>Especificacion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recursosSolicitados.map((recurso) => (
                        <tr key={recurso.id}>
                          <td>{recurso.grupo_nombre || '-'}</td>
                          <td>{recurso.tipo_nombre || '-'}</td>
                          <td>{recurso.cantidad}</td>
                          <td>{`$ ${Number(recurso.costo ?? 0).toFixed(2)}`}</td>
                          <td>{recurso.destino || '-'}</td>
                          <td>{recurso.especificaciones || '-'}</td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted">No hay recursos solicitados para este requerimiento.</p>
              )}
            </div>

            <div className="col-12">
                <div className="mb-3 flex align-items-center justify-content-between"></div>
                <div className="row mt-2">
                  <h5 style={{fontSize: '18px', fontWeight: 'bold', color: '#000000ee' }}>Historial de Respuestas</h5>
                </div>

                <DataTable value={historial} emptyMessage="Sin respuestas registradas" responsiveLayout="scroll" style={{ fontSize: '13px'}}>
                  <Column header="#" body={(row: RespuestaHistorialItem, { rowIndex }) => `#${historial.length - rowIndex}`} />
                  <Column header="Fecha y Hora" style={{minWidth: '10px'}} body={(row: RespuestaHistorialItem) => (
                    <div>
                      {new Date(row.fecha_respuesta).toLocaleDateString()}<br />
                      <small>{new Date(row.fecha_respuesta).toLocaleTimeString()}</small>
                    </div>
                  )} />
                  <Column header="Responsable" field="responsable" />
                  <Column className="w-3 p-2" header="Estado del Requerimiento" style={{ minWidth: '30px' }} body={(row: RespuestaHistorialItem) => (
                    <Tag color="blue">{row.requerimiento_estado_nombre || (estados.find(e => e.id === row.requerimiento_estado_id)?.nombre || row.requerimiento_estado_id)}</Tag>
                  )} />
                  <Column header="Progreso" body={(row: RespuestaHistorialItem) => (
                    <div style={{ minWidth: 140 }}>
                      <Progress percent={row.porcentaje_avance} showInfo size="small" />
                    </div>
                  )} />
                  <Column header="Situación Actual" field="situacion_actual" />
               
                </DataTable>


            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted">No se pudo cargar la información del requerimiento.</div>
        )}
      </Modal>
    </>
  );
};

export default RequerimientosEnviados;
