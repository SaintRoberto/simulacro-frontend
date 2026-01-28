import React, { useCallback, useEffect, useState } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { BaseCRUD } from '../../components/crud/BaseCRUD';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Modal, Button as AntButton, Tag } from 'antd';

interface ActaCOEApi {
  activo: boolean;
  creacion: string;
  creador: string;
  detalle: string;
  emergencia_id: number;
  fecha_sesion: string;
  hora_sesion: string;
  id: number;
  modificacion: string;
  modificador: string;
  usuario_id: number;
}

interface ActaCOEItem {
  id: number;
  detalle: string;
  fechaSesion: string;
  creador: string;
}

interface ActaCOEDetalle {
  acta_coe_estado_id: number;
  acta_coe_estado_nombre: string;
  activo: boolean;
  creacion: string;
  creador: string;
  detalle: string;
  emergencia_id: number;
  fecha_finalizado: string | null;
  fecha_sesion: string;
  id: number;
  modificacion: string;
  modificador: string;
  usuario_id: number;
}

interface Resolucion {
  acta_coe_id: number;
  acta_coe_resolucion_estado_descripcion: string;
  acta_coe_resolucion_estado_id: number;
  acta_coe_resolucion_estado_nombre: string;
  activo: boolean;
  creacion: string;
  creador: string;
  detalle: string;
  fecha_cumplimiento: string;
  id: number;
  modificacion: string;
  modificador: string;
  responsable: string;
}

interface ResolucionMesa {
  acta_coe_resolucion_id: number;
  acta_coe_resolucion_mesa_estado_id: number;
  activo: boolean;
  creacion: string;
  creador: string;
  id: number;
  mesa_abreviatura: string;
  mesa_id: number;
  mesa_nombre: string;
  modificacion: string;
  modificador: string;
}

const formatDate = (date: String | null): string => {
  if (!date) return '-';
  const [year, month, day] = date.split('T')[0].split('-');
  const [hour, minute] = date.split('T')[1].split(':');
  return `${day}-${month}-${year} ${hour}:${minute}`;

};


export const ActasCOE: React.FC = () => {
  const navigate = useNavigate();
  const { authFetch, datosLogin } = useAuth();
  const [actas, setActas] = useState<ActaCOEItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConsultaModal, setShowConsultaModal] = useState(false);
  const [actaDetalle, setActaDetalle] = useState<ActaCOEDetalle | null>(null);
  const [resoluciones, setResoluciones] = useState<Resolucion[]>([]);
  const [resolucionesMesas, setResolucionesMesas] = useState<Map<number, ResolucionMesa[]>>(new Map());
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const apiBase = process.env.REACT_APP_API_URL || '/api';

  const loadActas = useCallback(async () => {
    try {
      setIsLoading(true);
      const storedUserId = Number(localStorage.getItem('userId') || '0');
      const usuarioId = datosLogin?.usuario_id || (storedUserId > 0 ? storedUserId : 84);
      const emergenciaId = 1;
      const url = `${apiBase}/actas_coe/usuario/${usuarioId}/emergencia/${emergenciaId}`;
      const response = await authFetch(url, { headers: { accept: 'application/json' } });
      if (!response.ok) {
        console.error('No se pudo cargar la lista de actas COE', response.status, response.statusText);
        setActas([]);
        return;
      }

      const data = (await response.json()) as ActaCOEApi[];
      const mapped = (Array.isArray(data) ? data : []).map<ActaCOEItem>((item) => ({
        id: item.id,
        detalle: item.detalle,
        fechaSesion: item.fecha_sesion ? formatDate(item.fecha_sesion) : null,
        creador: (item.creador).toUpperCase() || '',
      }));

      setActas(mapped);
    } catch (error) {
      console.error('Error cargando actas COE:', error);
      setActas([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, authFetch, datosLogin?.usuario_id]);

  useEffect(() => {
    loadActas();
  }, [loadActas]);

  const handleSave = (_item: Partial<ActaCOEItem>) => {
    // Persistencia se definira en una iteracion futura
  };

  const handleDelete = (_item: ActaCOEItem) => {
    // Pendiente de definir con el backend
  };

  const handleRead = useCallback(async (item: ActaCOEItem) => {
    try {
      setLoadingDetalle(true);
      setShowConsultaModal(true);
      setActaDetalle(null);
      setResoluciones([]);
      setResolucionesMesas(new Map());

      // Cargar detalle del acta
      const actaUrl = `${apiBase}/actas_coe/${item.id}`;
      const actaRes = await authFetch(actaUrl, { headers: { accept: 'application/json' } });
      
      if (actaRes.ok) {
        const actaData = await actaRes.json() as ActaCOEDetalle;
        setActaDetalle(actaData);
      }

      // Cargar resoluciones
      const resolucionesUrl = `${apiBase}/acta_coe_resoluciones/acta_coe/${item.id}`;
      const resolucionesRes = await authFetch(resolucionesUrl, { headers: { accept: 'application/json' } });
      
      if (resolucionesRes.ok) {
        const resolucionesData = await resolucionesRes.json() as Resolucion[];
        const resolucionesArray = Array.isArray(resolucionesData) ? resolucionesData : [];
        setResoluciones(resolucionesArray);

        // Cargar mesas para cada resolución
        const mesasMap = new Map<number, ResolucionMesa[]>();
        const mesasPromises = resolucionesArray.map(async (resolucion) => {
          try {
            const mesasUrl = `${apiBase}/acta_coe_resolucion_mesas/acta_coe_resolucion/${resolucion.id}`;
            const mesasRes = await authFetch(mesasUrl, { headers: { accept: 'application/json' } });
            
            if (mesasRes.ok) {
              const mesasData = await mesasRes.json() as ResolucionMesa[];
              mesasMap.set(resolucion.id, Array.isArray(mesasData) ? mesasData : []);
            } else {
              mesasMap.set(resolucion.id, []);
            }
          } catch (error) {
            console.error(`Error cargando mesas para resolución ${resolucion.id}:`, error);
            mesasMap.set(resolucion.id, []);
          }
        });

        await Promise.all(mesasPromises);
        setResolucionesMesas(mesasMap);
      }
    } catch (error) {
      console.error('Error cargando detalle del acta:', error);
    } finally {
      setLoadingDetalle(false);
    }
  }, [apiBase, authFetch]);

  const columns = [
    { field: 'id', header: 'ID', sortable: true },
    { field: 'detalle', header: 'Detalle', sortable: true },
    {
      field: 'fechaSesion',
      header: 'Fecha de Sesion',
      sortable: true,
      body: (row: ActaCOEItem) => (row.fechaSesion),
    },
    { field: 'creador', header: 'Creador', sortable: true },

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
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <>
      <Card title="Actas COE">
        <BaseCRUD<ActaCOEItem>
          title=""
          items={actas}
          columns={columns}
          leftToolbarTemplate={() => (            
            <Button
              label="Nueva Acta"
              icon="pi pi-plus"
              severity="success"
              onClick={() => navigate('/actas/nueva')}
              disabled={isLoading}
              visible={datosLogin.perfil_id === 3}
            />
          )}          
          onEdit={(row) => navigate(`/actas/nueva?id=${row.id}`)}
          onRead={handleRead}
          showDeleteButton={false}
          showDeleteAction={false}
          onSave={handleSave}
          onDelete={handleDelete}
          initialItem={{
            id: 0,
            detalle: '',
            fechaSesion: null,
          }}
          emptyMessage={isLoading ? 'Cargando actas...' : 'No existen actas registradas.'}
        />
      </Card>

      <Modal
        open={showConsultaModal}
        title="Consultar Acta COE"
        onCancel={() => {
          setShowConsultaModal(false);
          setActaDetalle(null);
          setResoluciones([]);
        }}
        footer={[
          <AntButton key="close" type="primary" onClick={() => {
            setShowConsultaModal(false);
            setActaDetalle(null);
            setResoluciones([]);
          }}>
            Cerrar
          </AntButton>
        ]}
        width={900}
      >
        {loadingDetalle ? (
          <div className="text-center py-4">Cargando información...</div>
        ) : actaDetalle ? (
          <div>
            {/* Información del Acta */}
            <div className="mb-4">
              <div className="row mb-2">
                <div className="col-md-3"><strong>ID:</strong></div>
                <div className="col-md-9">{actaDetalle.id}</div>
              </div>
              <div className="row mb-2">
                <div className="col-md-3"><strong>Detalle:</strong></div>
                <div className="col-md-9">{actaDetalle.detalle || '-'}</div>
              </div>
              <div className="row mb-2">
                <div className="col-md-3"><strong>Fecha de Sesión:</strong></div>
                <div className="col-md-9">{formatDateTime(actaDetalle.fecha_sesion)}</div>
              </div>
              <div className="row mb-2">
                <div className="col-md-3"><strong>Fecha Finalizado:</strong></div>
                <div className="col-md-9">{formatDateTime(actaDetalle.fecha_finalizado)}</div>
              </div>
              <div className="row mb-2">
                <div className="col-md-3"><strong>Estado:</strong></div>
                <div className="col-md-9"><Tag color="green">{actaDetalle.acta_coe_estado_nombre.toUpperCase()}</Tag></div>
              </div>              
              <div className="row mb-2">
                <div className="col-md-3"><strong>Usuario ID:</strong></div>
                <div className="col-md-9">{actaDetalle.usuario_id}</div>
              </div>
              <div className="row mb-2">
                <div className="col-md-3"><strong>Creador:</strong></div>
                <div className="col-md-9">{actaDetalle.creador || '-'}</div>
              </div>          
              
            </div>

            {/* Grilla de Resoluciones */}
            <div className="mt-4">
              <h5 className="mb-3">Resoluciones</h5>
              {resoluciones.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-bordered table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>ID</th>
                        <th>Detalle</th>
                        <th>Responsable</th>
                        <th>Estado</th>
                        <th>Fecha Cumplimiento</th>
                        <th>Mesas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resoluciones.map((resolucion) => {
                        const mesas = resolucionesMesas.get(resolucion.id) || [];
                        return (
                          <tr key={resolucion.id}>
                            <td>{resolucion.id}</td>
                            <td>{resolucion.detalle || '-'}</td>
                            <td>{resolucion.responsable || '-'}</td>
                            <td>{resolucion.acta_coe_resolucion_estado_nombre || '-'}</td>
                            <td>{formatDateTime(resolucion.fecha_cumplimiento)}</td>
                            <td>
                              {mesas.length > 0 ? (
                                <div className="d-flex flex-wrap gap-1">
                                  {mesas.map((mesa) => (
                                    <Tag color="blue" 
                                      key={mesa.id} 
                                      className="mb-1"
                                      style={{ fontSize: '0.875rem' }}
                                    >
                                      {mesa.mesa_abreviatura}
                                    </Tag>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted">No hay resoluciones registradas para este acta.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted">No se pudo cargar la información del acta.</div>
        )}
      </Modal>
    </>
  );
};

export default ActasCOE;

