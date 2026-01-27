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

  // Modal / actividad draft
  const [showActividadDialog, setShowActividadDialog] = useState(false);
  const [isActividadConsulta, setIsActividadConsulta] = useState(false);
  const [actividadDraft, setActividadDraft] = useState<any>({
    ejecucion_id: undefined,
    descripcion: '',
    detalle: '',
    fecha_inicio: null,
    fecha_final: null,
    porcentaje_avance_id: 0,
    institucion_ejecutora_id: undefined,
    institucion_ejecutora_nombre: '',
    instituciones_apoyo: '',
    ubicaciones_atendidas: '',
    funcion_id: 0,
    actividad_ejecucion_estado_id: 0,
  });
  const [instituciones, setInstituciones] = useState<{ id: number; nombre: string }[]>([]);

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

  // Cargar actividades de ejecución (usa endpoint por COE / mesa_grupo cuando haya datos de login)
  const cargarActividades = useCallback(async (id: number) => {
    try {
      setIsLoading(true);
      const coeId = datosLogin?.coe_id;
      const mesaGrupoId = datosLogin?.mesa_grupo_id;
      const url = (coeId && mesaGrupoId)
        ? `${apiBase}/actividades_ejecucion/coe/${coeId}/mesa_grupo/${mesaGrupoId}/accion_respuesta/${id}`
        : `${apiBase}/respuesta_accion_detalles/respuesta_accion/${id}`;

      const response = await authFetch(url);

      if (!response.ok) throw new Error('Error al cargar las actividades de ejecución');

      const data = await response.json();
      // Asegurar que campos nulos sean manejables en la UI
      const normalized = (Array.isArray(data) ? data : []).map((r: any) => ({
        descripcion: r.descripcion ?? '',
        detalle: r.detalle ?? '',
        ejecucion_id: r.ejecucion_id ?? null,
        estado_actividad: r.estado_actividad ?? '',
        fecha_inicio: r.fecha_inicio ?? null,
        fecha_final: r.fecha_final ?? null,
        funcion_id: r.funcion_id ?? null,
        institucion_ejecutora_id: r.institucion_ejecutora_id ?? undefined,
        institucion_ejecutora_nombre: r.institucion_ejecutora_nombre ?? '',
        instituciones_apoyo: r.instituciones_apoyo ?? '',
        porcentaje_avance: r.porcentaje_avance ?? '',
        porcentaje_avance_id: r.porcentaje_avance_id ?? r.porcentaje_avance ?? 0,
        ubicaciones_atendidas: r.ubicaciones_atendidas ?? ''
      }));

      setActividades(normalized);

    } catch (error) {
      console.error('Error al cargar actividades:', error);
      setActividades([]);
    } finally {
      setIsLoading(false);
    }
  }, [authFetch, datosLogin?.coe_id, datosLogin?.mesa_grupo_id, apiBase]);

  // Abrir modal de actividad (crear / editar / consultar)
  const abrirDialogoActividad = async (actividad?: any, isConsulta = false) => {
    setIsActividadConsulta(isConsulta);
    if (actividad) {
      // En modo edición/consulta, hacer fetch al endpoint para obtener datos completos
      try {
        setIsLoading(true);
        const res = await authFetch(`${apiBase}/actividades_ejecucion/${actividad.ejecucion_id}`);
        if (res.ok) {
          const data = await res.json();
          setActividadDraft({
            ejecucion_id: data.id ?? data.ejecucion_id ?? undefined,
            descripcion: data.funcion_descripcion ?? data.descripcion ?? '',
            detalle: data.detalle ?? '',
            fecha_inicio: data.fecha_inicio ? new Date(data.fecha_inicio) : null,
            fecha_final: data.fecha_final ? new Date(data.fecha_final) : null,
            porcentaje_avance_id: data.porcentaje_avance_id ?? 0,
            institucion_ejecutora_id: data.institucion_ejecutora_id ?? undefined,
            institucion_ejecutora_nombre: data.institucion_ejecutora_nombre ?? '',
            instituciones_apoyo: data.instituciones_apoyo ?? '',
            ubicaciones_atendidas: data.ubicaciones_atendidas ?? '',
            funcion_id: data.actividad_ejecucion_funcion_id ?? 0,
            actividad_ejecucion_estado_id: data.actividad_ejecucion_estado_id ?? 0,
          });
        } else {
          // Fallback si falla el fetch: usar datos de la grilla
          setActividadDraft({
            ejecucion_id: actividad.ejecucion_id ?? undefined,
            descripcion: actividad.descripcion ?? '',
            detalle: actividad.detalle ?? '',
            fecha_inicio: actividad.fecha_inicio ? new Date(actividad.fecha_inicio) : null,
            fecha_final: actividad.fecha_final ? new Date(actividad.fecha_final) : null,
            porcentaje_avance_id: actividad.porcentaje_avance_id ?? 0,
            institucion_ejecutora_id: actividad.institucion_ejecutora_id ?? undefined,
            institucion_ejecutora_nombre: actividad.institucion_ejecutora_nombre ?? '',
            instituciones_apoyo: actividad.instituciones_apoyo ?? '',
            ubicaciones_atendidas: actividad.ubicaciones_atendidas ?? '',
            funcion_id: actividad.funcion_id ?? 0,
            actividad_ejecucion_estado_id: actividad.actividad_ejecucion_estado_id ?? 0,
          });
        }
      } catch (error) {
        console.error('Error cargando datos de la actividad:', error);
        // Fallback: usar datos de la grilla
        setActividadDraft({
          ejecucion_id: actividad.ejecucion_id ?? undefined,
          descripcion: actividad.descripcion ?? '',
          detalle: actividad.detalle ?? '',
          fecha_inicio: actividad.fecha_inicio ? new Date(actividad.fecha_inicio) : null,
          fecha_final: actividad.fecha_final ? new Date(actividad.fecha_final) : null,
          porcentaje_avance_id: actividad.porcentaje_avance_id ?? 0,
          institucion_ejecutora_id: actividad.institucion_ejecutora_id ?? undefined,
          institucion_ejecutora_nombre: actividad.institucion_ejecutora_nombre ?? '',
          instituciones_apoyo: actividad.instituciones_apoyo ?? '',
          ubicaciones_atendidas: actividad.ubicaciones_atendidas ?? '',
          funcion_id: actividad.funcion_id ?? 0,
          actividad_ejecucion_estado_id: actividad.actividad_ejecucion_estado_id ?? 0,
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      // Modo nueva actividad
      setActividadDraft({
        ejecucion_id: undefined,
        descripcion: '',
        detalle: '',
        fecha_inicio: null,
        fecha_final: null,
        porcentaje_avance_id: 0,
        institucion_ejecutora_id: undefined,
        institucion_ejecutora_nombre: '',
        instituciones_apoyo: '',
        ubicaciones_atendidas: '',
        funcion_id: 0,
        actividad_ejecucion_estado_id: 0,
      });
    }
    setShowActividadDialog(true);
  };

  // Cargar catálogo de instituciones para el dropdown
  useEffect(() => {
    const run = async () => {
      try {
        const res = await authFetch(`${apiBase}/instituciones`);
        setInstituciones(res.ok ? await res.json() : []);
      } catch (e) {
        setInstituciones([]);
      }
    };
    run();
  }, [apiBase, authFetch]);

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

  // Guardar actividad (POST /actividades_ejecucion o PUT /actividades_ejecucion/{id})
  const guardarActividad = async () => {
    try {
      setIsLoading(true);
      const payload: any = {
        accion_respuesta_id: editId ?? 0,
        actividad_ejecucion_estado_id: actividadDraft.actividad_ejecucion_estado_id ?? 0,
        actividad_ejecucion_funcion_id: actividadDraft.funcion_id ?? 0,
        creador: datosLogin?.usuario_login ?? '',
        detalle: actividadDraft.detalle ?? '',
        fecha_final: actividadDraft.fecha_final ? new Date(actividadDraft.fecha_final).toISOString() : undefined,
        fecha_inicio: actividadDraft.fecha_inicio ? new Date(actividadDraft.fecha_inicio).toISOString() : undefined,
        institucion_ejecutora_id: actividadDraft.institucion_ejecutora_id ?? 0,
        instituciones_apoyo: actividadDraft.instituciones_apoyo ?? '',
        porcentaje_avance_id: actividadDraft.porcentaje_avance_id ?? 0,
        ubicaciones_atendidas: actividadDraft.ubicaciones_atendidas ?? '',
        descripcion: actividadDraft.funcion_descripcion ?? ''
      };

      const isEdit = actividadDraft.ejecucion_id != null && actividadDraft.ejecucion_id !== undefined;
      const url = isEdit ? `${apiBase}/actividades_ejecucion/${actividadDraft.ejecucion_id}` : `${apiBase}/actividades_ejecucion`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined)))
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Error guardando actividad');
      }

      setShowActividadDialog(false);
      if (editId) await cargarActividades(editId);
    } catch (error) {
      console.error('Error guardando actividad:', error);
      alert(error instanceof Error ? error.message : 'Error guardando actividad');
    } finally {
      setIsLoading(false);
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
        response = await authFetch(apiBase + `/actividades_ejecucion/${editId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(accionData)
        });
      } else {
        // Crear nueva acción
        response = await authFetch(apiBase + '/actividades_ejecucion', {
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
            {/* {!isReadOnly && (
              <Button
                label="Añadir Actividad"
                icon="pi pi-plus"
                onClick={abrirDialogoActividad}
                className="m-2"
                disabled={isLoading}
              />
            )} */}
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
            <Column field="descripcion" header="Descripción" sortable filter filterPlaceholder="Buscar descripción" />
            <Column field="ejecucion_id" header="ID" className="d-none d-md-table-cell" headerClassName="d-none d-md-table-cell" />
            <Column field="estado_actividad" header="Estado" sortable filter filterPlaceholder="Buscar estado" />
            <Column field="fecha_inicio" header="Fecha inicio" body={(row: any) => (row.fecha_inicio ? String(row.fecha_inicio).slice(0,19).replace('T',' ') : '')} />
            <Column field="fecha_final" header="Fecha final" body={(row: any) => (row.fecha_final ? String(row.fecha_final).slice(0,19).replace('T',' ') : '')} />
            <Column field="institucion_ejecutora_nombre" header="Institución ejecutora" sortable filter filterPlaceholder="Buscar institución" />
            <Column field="instituciones_apoyo" header="Instituciones apoyo" />
            <Column field="porcentaje_avance" header="% Avance" />
            <Column field="ubicaciones_atendidas" header="Ubicaciones atendidas" />
            <Column
              header="Acciones"
              body={(row: any) => (
                <div className="flex gap-2">
                  <Button
                    icon="pi pi-eye"
                    text
                    onClick={() => abrirDialogoActividad(row, true)}
                    disabled={isLoading}
                    tooltip="Consultar"
                    tooltipOptions={{ position: 'top' }}
                  />

                  <Button
                    icon="pi pi-pencil"
                    severity="secondary"
                    text
                    onClick={() => abrirDialogoActividad(row, false)}
                    disabled={isLoading}
                    tooltip="Modificar"
                    tooltipOptions={{ position: 'top' }}
                  />
                  
                </div>
              )}
              style={{ width: '8rem' }}
            />
          </DataTable>

          <Dialog header={actividadDraft.ejecucion_id ? 'Editar Actividad' : 'Actividad'} visible={showActividadDialog} style={{ width: '600px' }} onHide={() => setShowActividadDialog(false)} modal>
            <div className="p-fluid">
              <div className="row g-2">
                <div className="col-12">
                  <label className="form-label">Actividad</label>
                  <InputText disabled={isActividadConsulta} value={actividadDraft.descripcion || ''} onChange={(e) => setActividadDraft({ ...actividadDraft, descripcion: e.target.value })} />
                </div>
                <div className="col-12">
                  <label className="form-label">Detalle</label>
                  <InputTextarea disabled={isActividadConsulta} rows={3} value={actividadDraft.detalle || ''} onChange={(e) => setActividadDraft({ ...actividadDraft, detalle: e.target.value })} />
                </div>
                <div className="col-6">
                  <label className="form-label">Inicio</label>
                  <Calendar disabled={isActividadConsulta} showIcon showTime hourFormat="24" value={actividadDraft.fecha_inicio} onChange={(e) => setActividadDraft({ ...actividadDraft, fecha_inicio: e.value })} className="w-full" />
                </div>
                <div className="col-6">
                  <label className="form-label">Fin</label>
                  <Calendar disabled={isActividadConsulta} showIcon showTime hourFormat="24" value={actividadDraft.fecha_final} onChange={(e) => setActividadDraft({ ...actividadDraft, fecha_final: e.value })} className="w-full" />
                </div>
                <div className="col-6">
                  <label className="form-label">% Avance</label>
                  <Dropdown disabled={isActividadConsulta} value={actividadDraft.porcentaje_avance_id ?? 0} options={[{label:'0',value:0},{label:'25',value:25},{label:'50',value:50},{label:'75',value:75},{label:'100',value:100}]} onChange={(e) => setActividadDraft({ ...actividadDraft, porcentaje_avance_id: e.value })} placeholder="Seleccione %" />
                </div>
                <div className="col-6">
                  <label className="form-label">Institución ejecutora</label>
                  <Dropdown disabled={isActividadConsulta} showClear value={actividadDraft.institucion_ejecutora_id} filter options={instituciones.map(i=>({label:i.nombre,value:i.id}))} onChange={(e) => setActividadDraft({ ...actividadDraft, institucion_ejecutora_id: e.value })} placeholder="Seleccione institución" />
                </div>
                <div className="col-12">
                  <label className="form-label">Instituciones de apoyo</label>
                  <InputText disabled={isActividadConsulta} value={actividadDraft.instituciones_apoyo || ''} onChange={(e) => setActividadDraft({ ...actividadDraft, instituciones_apoyo: e.target.value })} />
                </div>
                <div className="col-12">
                  <label className="form-label">Ubicaciones atendidas</label>
                  <InputText disabled={isActividadConsulta} value={actividadDraft.ubicaciones_atendidas || ''} onChange={(e) => setActividadDraft({ ...actividadDraft, ubicaciones_atendidas: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex justify-content-end mt-3 gap-2">
              <Button label="Cancelar" icon="pi pi-times" className="p-button-text" onClick={() => setShowActividadDialog(false)} />
              {!isActividadConsulta && <Button label="Guardar" icon="pi pi-save" onClick={async () => { await guardarActividad(); }} loading={isLoading} />}
            </div>
          </Dialog>

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
