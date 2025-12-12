import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputTextarea } from 'primereact/inputtextarea';
import { useAuth } from '../../context/AuthContext';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Tag, Breadcrumb } from 'antd';

interface Mesa {
  id: number;
  nombre: string;
  siglas: string;
}

interface EstadoResolucion {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

interface Resolucion {
  id?: number;
  mesaAsignadaId: number;
  mesaAsignadaNombre: string;
  detalle: string;
  fechaCumplimiento: Date | null;
  responsable: string;
  estadoId: number;
  estadoNombre: string;
  activo: boolean;
}

interface ActaCOE {
  id?: number;
  descripcion: string;
  fechaHoraSesion: Date | null;
  resoluciones: Resolucion[];
  emergencia_id: number;
  usuario_id: number;
  creador: string;
}

export const NuevoAccionesRespuesta: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { authFetch, datosLogin } = useAuth();

  const editId = useMemo(() => {
    const idStr = searchParams.get('id');
    const n = idStr ? Number(idStr) : NaN;
    return isNaN(n) ? null : n;
  }, [searchParams]);

  // Datos de la acción de respuesta
  const [accionRespuesta, setAccionRespuesta] = useState({
    detalle: '',
    fecha_final: new Date(),
    respuesta_estado_id: 0,
    resoluciones: [],
    emergencia_id: 1,
    usuario_id: datosLogin?.usuario_id || 0,
    creador: datosLogin?.usuario_login || ''
  });

  // Estados para el diálogo de resolución
  const [showResolucionDialog, setShowResolucionDialog] = useState(false);
  const [resolucionDraft, setResolucionDraft] = useState<Partial<Resolucion>>({
    mesaAsignadaId: 0,
    detalle: '',
    fechaCumplimiento: new Date(),
    responsable: '',
    estadoId: 0,
    activo: true
  });
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [estadosResolucion, setEstadosResolucion] = useState<EstadoResolucion[]>([]);
  const [respuestaEstados, setRespuestaEstados] = useState<{ id: number, nombre: string }[]>([]);
  const [actividades, setActividades] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isReadOnly = !!editId;
  const apiBase = process.env.REACT_APP_API_URL;

  // Cargar datos de la acción de respuesta cuando está en modo edición
  const cargarAccionRespuesta = useCallback(async (id: number) => {
    try {
      if (!id) return;

      setIsLoading(true);

      // Cargar datos de la acción de respuesta
      const response = await authFetch(apiBase + `/acciones_respuesta/${id}`);

      if (!response.ok) throw new Error('Error al cargar la acción de respuesta');

      const data = await response.json();

      // Actualizar el estado con los datos de la acción de respuesta
      setAccionRespuesta(prev => ({
        ...prev,
        detalle: data.detalle || '',
        fecha_final: data.fecha_final ? new Date(data.fecha_final) : new Date(),
        respuesta_estado_id: data.respuesta_estado_id || 0,
        emergencia_id: data.emergencia_id || 1,
        usuario_id: data.usuario_id || (datosLogin?.usuario_id || 0),
        creador: data.creador || (datosLogin?.usuario_login || '')
      }));

      // Aquí podrías cargar las resoluciones si es necesario
      // setResoluciones(data.resoluciones || []);

    } catch (error) {
      console.error('Error al cargar la acción de respuesta:', error);
      alert('Error al cargar la acción de respuesta');
      navigate('/acciones');
    } finally {
      setIsLoading(false);
    }
  }, [authFetch, navigate, datosLogin]);

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        setIsLoading(true);

        // Cargar mesas, estados de resolución y estados de respuesta en paralelo
        const [mesasResponse, estadosResponse, respuestaEstadosResponse] = await Promise.all([
          authFetch(apiBase + `/mesas/coe/3`),
          authFetch(apiBase + `/acta_coe_resolucion_estados`),
          authFetch(apiBase + `/acciones_respuesta`)
        ]);

        if (mesasResponse.ok) {
          const mesasData = await mesasResponse.json();
          setMesas(mesasData);
        }

        if (estadosResponse.ok) {
          const estadosData = await estadosResponse.json();
          setEstadosResolucion(estadosData);
        }

        if (respuestaEstadosResponse.ok) {
          const respuestaEstadosData = await respuestaEstadosResponse.json();
          // Extraer y formatear los estados de respuesta únicos
          const estadosUnicos: { id: number, nombre: string }[] = Array.from(
            new Map(
              (respuestaEstadosData as any[]).map((item) => [
                item.respuesta_estado_id,
                {
                  id: item.respuesta_estado_id,
                  nombre: item.estado_nombre || `Estado ${item.respuesta_estado_id}`
                }
              ])
            ).values()
          );
          setRespuestaEstados(estadosUnicos);
        }

        // Si es una acción de respuesta nueva, establecer el usuario actual
        if (datosLogin?.usuario_id && !editId) {
          setAccionRespuesta(prev => ({
            ...prev,
            usuario_id: datosLogin.usuario_id,
            creador: datosLogin.usuario_login
          }));
        }
      } catch (error) {
        console.error('Error cargando datos iniciales:', error);
        alert('Error al cargar los datos iniciales');
      } finally {
        setIsLoading(false);
      }
    };

    cargarDatosIniciales();
  }, [authFetch, datosLogin]);

  // Cargar datos de la acción de respuesta cuando el ID de edición cambia
  useEffect(() => {
    if (editId) {
      cargarAccionRespuesta(editId);
      cargarActividades(editId);
    } else {
      setActividades([]);
    }
  }, [editId, cargarAccionRespuesta]);

  // Cargar actividades de ejecución
  const cargarActividades = useCallback(async (id: number) => {
    try {
      setIsLoading(true);
      const response = await authFetch(apiBase + `/respuesta_accion_detalles/respuesta_accion/${id}`);

      if (!response.ok) throw new Error('Error al cargar las actividades de ejecución');

      const data = await response.json();
      setActividades(Array.isArray(data) ? data : []);

    } catch (error) {
      console.error('Error al cargar actividades:', error);
      setActividades([]);
    } finally {
      setIsLoading(false);
    }
  }, [authFetch]);

  const abrirDialogoActividad = () => {
    // Aquí podrías implementar la lógica para abrir un diálogo de actividad si es necesario
    alert('Función para agregar nueva actividad se implementará aquí');
  };

  const abrirDialogoResolucion = (resolucion?: Resolucion) => {
    if (resolucion) {
      // Modo edición
      setResolucionDraft({
        id: resolucion.id,
        mesaAsignadaId: resolucion.mesaAsignadaId,
        detalle: resolucion.detalle,
        fechaCumplimiento: resolucion.fechaCumplimiento || new Date(),
        responsable: resolucion.responsable,
        estadoId: resolucion.estadoId,
        activo: resolucion.activo
      });
    } else {
      // Modo nueva resolución
      setResolucionDraft({
        mesaAsignadaId: 0,
        detalle: '',
        fechaCumplimiento: new Date(),
        responsable: '',
        estadoId: estadosResolucion[0]?.id || 0,
        activo: true
      });
    }
    setShowResolucionDialog(true);
  };

  const guardarResolucion = async () => {
    if (!resolucionDraft.mesaAsignadaId || !resolucionDraft.detalle || !resolucionDraft.estadoId) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      setIsLoading(true);
      const mesaSeleccionada = mesas.find(m => m.id === resolucionDraft.mesaAsignadaId);
      const estadoSeleccionado = estadosResolucion.find(e => e.id === resolucionDraft.estadoId);

      const nuevaResolucion: Resolucion = {
        id: resolucionDraft.id || 0, // El ID será asignado por el backend
        mesaAsignadaId: resolucionDraft.mesaAsignadaId!,
        mesaAsignadaNombre: mesaSeleccionada?.nombre || '',
        detalle: resolucionDraft.detalle || '',
        fechaCumplimiento: resolucionDraft.fechaCumplimiento || null,
        responsable: resolucionDraft.responsable || '',
        estadoId: resolucionDraft.estadoId!,
        estadoNombre: estadoSeleccionado?.nombre || '',
        activo: true
      };

      // Aquí deberías implementar la lógica para guardar la resolución en el backend
      // Por ahora, solo mostramos un mensaje
      alert('Función de guardar resolución se implementará aquí');

      // Cerrar el diálogo después de guardar
      setShowResolucionDialog(false);

      setShowResolucionDialog(false);
    } catch (error) {
      console.error('Error al guardar la resolución:', error);
      alert('Error al guardar la resolución');
    } finally {
      setIsLoading(false);
    }
  };

  const eliminarResolucion = (id: number) => {
    if (window.confirm('¿Está seguro de eliminar esta actividad?')) {
      // Aquí iría la llamada a la API para eliminar la actividad
      console.log('Eliminar actividad con ID:', id);
    }
  };

  const guardarAccion = async () => {
    try {
      setIsLoading(true);

      // Validaciones básicas
      if (!accionRespuesta.detalle) {
        alert('El detalle es requerido');
        return;
      }

      if (!accionRespuesta.respuesta_estado_id) {
        alert('El estado es requerido');
        return;
      }

      const accionData = {
        activo: true,
        creador: accionRespuesta.creador,
        detalle: accionRespuesta.detalle,
        fecha_final: accionRespuesta.fecha_final.toISOString(),
        respuesta_estado_id: accionRespuesta.respuesta_estado_id,
        usuario_id: accionRespuesta.usuario_id,
        // Valores por defecto que pueden ser necesarios
        resolucion_id: 0,
        respuesta_accion_origen_id: 0
      };

      let response;

      if (editId) {
        // Actualizar acción existente
        response = await authFetch(apiBase + `/acciones_respuesta/${editId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(accionData)
        });
      } else {
        // Crear nueva acción
        response = await authFetch(apiBase + '/acciones_respuesta', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(accionData)
        });
      }

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error al ${editId ? 'actualizar' : 'guardar'} la acción: ${errorData}`);
      }

      const result = await response.json();

      alert(`Acción ${editId ? 'actualizada' : 'guardada'} exitosamente`);
      navigate('/acciones');

    } catch (error) {
      console.error('Error al guardar la acción:', error);
      alert(error instanceof Error ? error.message : 'Error al guardar la acción');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="mb-2">
        <Breadcrumb
          items={[
            { title: <Link to="/">Inicio</Link> },
            { title: <Link to="/acciones">Acciones Respuesta</Link> },
            { title: editId ? `Editar Acciones Respuesta` : 'Nueva Acciones Respuesta' },
          ]}
        />
      </div>

      <div className="col-12">
        <Card>
          <div className="mb-3">
            <h3>Nueva Accion de Respuesta</h3>
          </div>

          <div className="container-fluid">
            <div className="row col-12 pb-2">
              <div className="col-12 md:col-6">
                <label className="label-uniform">Detalle *</label>
                <InputTextarea
                  value={accionRespuesta.detalle}
                  onChange={(e) => setAccionRespuesta({ ...accionRespuesta, detalle: e.target.value })}
                  className="w-full m-1"
                  rows={3}
                  disabled={isReadOnly}
                />
              </div>

              <div className="col-12 md:col-3">
                <label className="label-uniform">Fecha Final *</label>
                <Calendar
                  value={accionRespuesta.fecha_final}
                  onChange={(e) => setAccionRespuesta({ ...accionRespuesta, fecha_final: e.value as Date })}
                  showIcon
                  showTime
                  hourFormat="24"
                  dateFormat="dd/mm/yy"
                  className="w-full m-1"
                  disabled={isReadOnly}
                />
              </div>

              <div className="col-12 md:col-3">
                <label className="label-uniform">Estado de Respuesta *</label>
                <Dropdown
                  value={accionRespuesta.respuesta_estado_id || null}
                  options={[
                    { label: 'Seleccionar estado', value: null },
                    ...respuestaEstados.map(e => ({ label: e.nombre, value: e.id }))
                  ]}
                  onChange={(e) => setAccionRespuesta({ ...accionRespuesta, respuesta_estado_id: e.value })}
                  className="w-full m-1"
                  disabled={isLoading || isReadOnly}
                  filter
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="col-12">
        <Card>
          <div className="flex align-items-center justify-content-between mb-3">
            <h3 className="m-0">Actividades de Ejecución</h3>
            {!isReadOnly && (
              <Button
                label="Añadir Actividad"
                icon="pi pi-plus"
                onClick={abrirDialogoActividad}
                className="m-2"
                disabled={isLoading}
              />
            )}
          </div>

          <DataTable
            value={actividades}
            emptyMessage={isLoading ? 'Cargando actividades...' : 'No hay actividades registradas'}
            responsiveLayout="scroll"
            loading={isLoading}
            paginator
            rows={5}
            rowsPerPageOptions={[5, 10, 25, 50]}
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
            currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} actividades"
          >
            <Column
              field="ejecucion_actividad_nombre"
              header="Actividad"
              sortable
              filter
              filterPlaceholder="Buscar por actividad"
            />
            <Column
              field="institucion_ejecutora_nombre"
              header="Institución"
              sortable
              filter
              filterPlaceholder="Buscar por institución"
            />
            <Column
              field="detalle"
              header="Detalle"
              sortable
              filter
              filterPlaceholder="Buscar en detalles"
            />
            <Column
              field="respuesta_accion_detalle_avance"
              header="Avance"
              sortable
              body={(row: any) => (
                <div className="flex align-items-center gap-2">
                  <span>{row.respuesta_accion_detalle_avance || 'Sin avance registrado'}</span>
                </div>
              )}
            />
            <Column
              header="Acciones"
              body={(row: any) => (
                <div className="flex gap-2">
                  {!isReadOnly && (
                    <Button
                      icon="pi pi-trash"
                      severity="danger"
                      text
                      onClick={() => {/* Implementar eliminación */ }}
                      disabled={isLoading}
                      tooltip="Eliminar actividad"
                      tooltipOptions={{ position: 'top' }}
                    />
                  )}
                </div>
              )}
              style={{ width: '6rem' }}
            />
          </DataTable>

          <div className="flex justify-content-end mt-4 gap-2">
            <Button
              label="Cancelar"
              icon="pi pi-times"
              className="p-button-text"
              onClick={() => navigate('/acciones')}
              disabled={isLoading}
            />
            <Button
              label={editId ? 'Actualizar Acción' : 'Guardar Acción'}
              icon="pi pi-save"
              onClick={guardarAccion}
              loading={isLoading}
              disabled={isLoading}
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default NuevoAccionesRespuesta;
