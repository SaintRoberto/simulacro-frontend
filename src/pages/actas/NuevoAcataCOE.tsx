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
import { MultiSelect } from 'primereact/multiselect';

interface Mesa {
  id: number;
  nombre: string;
  siglas: string;
  grupo_mesa_abreviatura?: string;
  grupo_mesa_nombre?: string;
  mesa_nombre?: string;
  mesa_siglas?: string;
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
  mesaAsignadaIds?: number[];  // Para soportar múltiples selecciones
  mesaAsignadaNombre: string;
  detalle: string;
  fechaCumplimiento: Date | null;
  responsable: string;
  estadoId: number;
  estadoNombre: string;
  activo: boolean;
  mesas?: Array<{
    id: number;
    nombre: string;
    siglas: string;
    mesa_abreviatura?: string;
  }>;
}

interface EstadoActa {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
  creacion: string;
  creador: string;
  modificacion: string;
  modificador: string;
}

interface ActaCOE {
  id?: number;
  detalle: string;
  fechaHoraSesion: Date | null;
  resoluciones: Resolucion[];
  emergencia_id: number;
  usuario_id: number;
  creador: string;
  acta_coe_estado_id?: number;
}

export const NuevoActaCOE: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { authFetch, datosLogin } = useAuth();

  const editId = useMemo(() => {
    const idStr = searchParams.get('id');
    const n = idStr ? Number(idStr) : NaN;
    return isNaN(n) ? null : n;
  }, [searchParams]);

  // Datos del acta
  const [estadosActa, setEstadosActa] = useState<EstadoActa[]>([]);
  const [acta, setActa] = useState<ActaCOE>({
    detalle: '',
    fechaHoraSesion: new Date(),
    resoluciones: [],
    emergencia_id: datosLogin?.emergencia_id || 4, // Valor por defecto, ajustar según sea necesario
    usuario_id: datosLogin?.usuario_id || 0,
    creador: datosLogin?.usuario_login || '',
    acta_coe_estado_id: undefined
  });

  // Estados para el diálogo de resolución
  const [showResolucionDialog, setShowResolucionDialog] = useState(false);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<EstadoResolucion | null>(null);
  const [resolucionDraft, setResolucionDraft] = useState<Partial<Resolucion>>({
    // Para creación múltiple usaremos un arreglo de IDs (solo para el borrador del diálogo)
    // Al guardar, se crearán múltiples resoluciones, una por cada mesa seleccionada
    detalle: '',
    fechaCumplimiento: new Date(),
    responsable: '',
    estadoId: 0,
    estadoNombre: '',
    activo: true
  });
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [estadosResolucion, setEstadosResolucion] = useState<EstadoResolucion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isReadOnly = !!editId;
  const apiBase = process.env.REACT_APP_API_URL;

  // Agrupar resoluciones por detalle
  const resolucionesAgrupadas = useMemo(() => {
    const grupos = new Map<string, Resolucion[]>();

    // Agrupar por detalle
    acta.resoluciones.forEach((resolucion) => {
      const key = resolucion.detalle;
      if (!grupos.has(key)) {
        grupos.set(key, []);
      }
      grupos.get(key)?.push(resolucion);
    });

    // Crear un array con una entrada por grupo de resoluciones
    return Array.from(grupos.entries()).map(([detalle, resoluciones]) => {
      // Tomar la primera resolución como base
      const base = resoluciones[0];
      return {
        id: base.id, // Usar el ID real de la resolución
        key: base.id || detalle, // Key única para React basada en ID o detalle
        detalle: detalle,
        fechaCumplimiento: base.fechaCumplimiento,
        responsable: base.responsable,
        estadoId: base.estadoId,
        estadoNombre: base.estadoNombre,
        activo: base.activo,
        // Mantener las mesas como un array para mostrarlas como tags
        mesas: base.mesas || [],
        // Mantener referencia a todas las resoluciones originales para acciones
        resoluciones: resoluciones
      };
    });
  }, [acta.resoluciones]);

  // Cargar datos del acta cuando está en modo edición
  const cargarActa = useCallback(async (id: number) => {
    try {
      if (!id) return;
      setIsLoading(true);

      // Get acta data
      const actaResponse = await authFetch(apiBase + `/actas_coe/${id}`);
      if (!actaResponse.ok) throw new Error('Error al cargar el acta');
      const actaData = await actaResponse.json();

      // Get all resolutions for this acta
      const resolucionesResponse = await authFetch(apiBase + `/acta_coe_resoluciones/acta_coe/${id}`);
      if (!resolucionesResponse.ok) throw new Error('Error al cargar las resoluciones');
      const resolucionesData = await resolucionesResponse.json();

      // Get mesas for each resolution in parallel
      const resolucionesConMesas = await Promise.all(resolucionesData.map(async (resolucion: any) => {
        // Get mesas for this specific resolution
        const mesasResponse = await authFetch(
          apiBase + `/acta_coe_resolucion_mesas/acta_coe_resolucion/${resolucion.id}`
        );
        
        const mesasData = mesasResponse.ok ? await mesasResponse.json() : [];
        const mesaIds = mesasData.map((m: any) => m.mesa_id);
        
        const mesasCompletas = mesasData.map((m: any) => {
          const mesa = mesas.find(me => me.id === m.mesa_id);
          return mesa ? { 
            id: mesa.id, 
            nombre: mesa.mesa_nombre, 
            siglas: mesa.siglas,
            mesa_abreviatura: m.mesa_abreviatura
          } : null;
        }).filter(Boolean);

        return {
          ...resolucion,
          id: resolucion.id,
          mesaAsignadaId: mesaIds[0], // For backward compatibility
          mesaAsignadaIds: mesaIds,
          mesas: mesasCompletas,
          fechaCumplimiento: resolucion.fecha_cumplimiento ? new Date(resolucion.fecha_cumplimiento) : null,
          estadoId: resolucion.acta_coe_resolucion_estado_id,
          estadoNombre: resolucion.acta_coe_resolucion_estado_nombre || 'Desconocido',
          responsable: resolucion.responsable || ''
        };
      }));

      // Update state with the acta and its resolutions
      setActa({
        ...actaData,
        fechaHoraSesion: actaData.fecha_sesion ? new Date(actaData.fecha_sesion) : null,
        resoluciones: resolucionesConMesas
      });

    } catch (error) {
      console.error('Error al cargar el acta:', error);
      alert(error instanceof Error ? error.message : 'Error al cargar el acta');
    } finally {
      setIsLoading(false);
    }
  }, [authFetch, mesas, estadosResolucion]);

  // Cargar mesas, estados y estados de acta una sola vez al montar el componente
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        setIsLoading(true);

        // Cargar mesas, estados de resolución y estados de acta en paralelo
        const [mesasResponse, estadosResponse, estadosActaResponse] = await Promise.all([
          authFetch(apiBase + '/mesas/coe/3'),
          authFetch(apiBase + '/acta_coe_resolucion_estados'),
          authFetch(apiBase + '/acta_coe_estados')
        ]);

        if (mesasResponse.ok) {
          const mesasData = await mesasResponse.json();
          setMesas(mesasData);
        }

        if (estadosResponse.ok) {
          const estadosData = await estadosResponse.json();
          setEstadosResolucion(estadosData);
        }

        if (estadosActaResponse.ok) {
          const estadosActaData = await estadosActaResponse.json();
          setEstadosActa(estadosActaData);

          // Si es un acta nueva, establecer el primer estado como valor por defecto
          if (estadosActaData.length > 0 && !acta.acta_coe_estado_id) {
            setActa(prev => ({
              ...prev,
              acta_coe_estado_id: estadosActaData[0].id
            }));
          }
        }

        // Si es un acta nueva, establecer el usuario actual
        if (datosLogin?.usuario_id && !editId) {
          setActa(prev => ({
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

  // Cargar datos del acta cuando el ID de edición cambia y las mesas/estados están cargados
  useEffect(() => {
    if (editId && mesas.length > 0 && estadosResolucion.length > 0 && estadosActa.length > 0) {
      cargarActa(editId);
    }
  }, [editId, mesas, estadosResolucion, estadosActa]);

  const abrirDialogoResolucion = (resolucion?: Resolucion) => {
    if (resolucion) {
      // Modo edición
      setResolucionDraft({
        id: resolucion.id,
        // En edición mantenemos selección única como primer valor del arreglo
        // Usaremos 'mesaAsignadaIds' solo a nivel lógico del borrador
        detalle: resolucion.detalle,
        fechaCumplimiento: resolucion.fechaCumplimiento || new Date(),
        responsable: resolucion.responsable,
        estadoId: resolucion.estadoId,
        activo: resolucion.activo
      });
    } else {
      // Modo nueva resolución
      setResolucionDraft({
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
    // Obtenemos el arreglo de mesas seleccionadas desde una propiedad temporal del draft
    const draftAny = resolucionDraft as any;
    const ids: number[] | undefined = Array.isArray(draftAny.mesaAsignadaIds) ? draftAny.mesaAsignadaIds : undefined;
    const singleId: number | undefined = typeof draftAny.mesaAsignadaId === 'number' ? draftAny.mesaAsignadaId : undefined;
    const mesasSeleccionadas: number[] = (ids && ids.length > 0) ? ids : (singleId ? [singleId] : []);

    if (!mesasSeleccionadas.length || !resolucionDraft.detalle || !resolucionDraft.estadoId) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      setIsLoading(true);
      const estadoSeleccionado = estadosResolucion.find(e => e.id === resolucionDraft.estadoId);

      if (resolucionDraft.id) {
      // Edición: tomar el primer elemento
        const mesaId = mesasSeleccionadas[0];
      const mesaSeleccionada = mesas.find(m => m.id === mesaId);
        const nuevaResolucion: Resolucion = {
          id: resolucionDraft.id || Math.max(0, ...acta.resoluciones.map(r => r.id || 0)) + 1,
        mesaAsignadaId: mesaId,
        mesaAsignadaNombre: mesaSeleccionada?.nombre || '',
          detalle: resolucionDraft.detalle || '',
          fechaCumplimiento: resolucionDraft.fechaCumplimiento || null,
          responsable: resolucionDraft.responsable || '',
          estadoId: resolucionDraft.estadoId!,
          estadoNombre: estadoSeleccionado?.nombre || '',
          activo: true,
          mesas: mesaSeleccionada ? [{
            id: mesaSeleccionada.id,
            nombre: mesaSeleccionada.nombre,
            siglas: mesaSeleccionada.siglas,
            mesa_abreviatura: mesaSeleccionada.siglas // Usar siglas como abreviatura
          }] : []
      };
      setActa(prev => ({
        ...prev,
          resoluciones: prev.resoluciones.map(r => r.id === resolucionDraft.id ? nuevaResolucion : r)
      }));
    } else {
      // Creación: agregar una resolución por cada mesa seleccionada
        const nuevasResoluciones: Resolucion[] = mesasSeleccionadas.map(mesaId => {
          const mesaSeleccionada = mesas.find(m => m.id === mesaId);
          return {
            id: undefined, // El ID será asignado por la base de datos
            mesaAsignadaId: mesaId,
            mesaAsignadaIds: mesasSeleccionadas, // Asegurar que los IDs se guarden
            mesaAsignadaNombre: mesaSeleccionada?.mesa_nombre || mesaSeleccionada?.nombre || '',
            detalle: resolucionDraft.detalle || '',
            fechaCumplimiento: resolucionDraft.fechaCumplimiento || null,
            responsable: resolucionDraft.responsable || '',
            estadoId: resolucionDraft.estadoId!,
            estadoNombre: estadoSeleccionado?.nombre || '',
            activo: true,
            mesas: mesasSeleccionadas.map(id => {
              const m = mesas.find(x => x.id === id);
              return {
                id: m?.id || 0,
                nombre: m?.mesa_nombre || m?.nombre || '',
                siglas: m?.mesa_siglas || m?.siglas || '',
                grupo_mesa_abreviatura: m?.grupo_mesa_abreviatura || '',
                grupo_mesa_nombre: m?.grupo_mesa_nombre || m?.nombre || '',
                mesa_nombre: m?.mesa_nombre || m?.nombre || '',
                mesa_siglas: m?.mesa_siglas || m?.siglas || ''
              };
            })
          };
        });
        setActa(prev => ({
          ...prev,
          resoluciones: [...prev.resoluciones, ...nuevasResoluciones]
        }));
      }

      setShowResolucionDialog(false);
    } catch (error) {
      console.error('Error al guardar la resolución:', error);
      alert('Error al guardar la resolución');
    } finally {
      setIsLoading(false);
    }
  };

  const eliminarResolucion = (detalle: string) => {
    if (window.confirm('¿Está seguro de eliminar esta resolución?')) {
      setActa(prev => ({
        ...prev,
        resoluciones: prev.resoluciones.filter(r => r.detalle !== detalle)
      }));

      // Aquí iría la llamada a la API para eliminar si es necesario
    }
  };

 const guardarActa = async () => {
    try {
      setIsLoading(true);

      // Validaciones básicas
      if (!acta.detalle) {
        alert('La descripción es requerida');
        return;
      }

      if (!acta.fechaHoraSesion) {
        alert('La fecha y hora de sesión son requeridas');
        return;
      }

      let actaId = acta.id;
      let actaData;

      // 1. Guardar o actualizar el acta
      if (editId) {
        // Modo edición - Actualizar acta existente
        const actaResponse = await authFetch(apiBase + `/actas_coe/${editId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            activo: true,
            creador: acta.creador,
            detalle: acta.detalle,
            emergencia_id: acta.emergencia_id,
            fecha_sesion: acta.fechaHoraSesion?.toISOString(),
            usuario_id: acta.usuario_id,
            acta_coe_estado_id: acta.acta_coe_estado_id
          })
        });

        if (!actaResponse.ok) {
          throw new Error('Error al actualizar el acta');
        }

        actaData = await actaResponse.json();
      } else {
        // Modo creación - Crear nuevo acta
        const actaResponse = await authFetch(apiBase + `/actas_coe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            activo: true,
            creador: acta.creador,
            detalle: acta.detalle,
            emergencia_id: acta.emergencia_id,
            fecha_sesion: acta.fechaHoraSesion?.toISOString(),
            usuario_id: acta.usuario_id,
            acta_coe_estado_id: acta.acta_coe_estado_id
          })
        });

        if (!actaResponse.ok) {
          throw new Error('Error al guardar el acta');
        }

        actaData = await actaResponse.json();
        actaId = actaData.id;
      }

      // 2. Para simplificar, primero eliminamos todas las resoluciones existentes
      // y luego creamos las nuevas. Esto evita tener que manejar actualizaciones individuales
      if (editId && actaId) {
        const deleteResponse = await authFetch(apiBase + `/acta_coe_resoluciones/acta_coe/${actaId}`, {
          method: 'DELETE'
        });

        if (!deleteResponse.ok) {
          console.error('Error al limpiar resoluciones anteriores:', await deleteResponse.text());
          // Continuamos de todos modos, ya que podrían no existir resoluciones
        }
      }

      // 3. Crear resoluciones agrupando por contenido y luego crear mesas 1:N
      const grupos = new Map<string, Resolucion[]>();
      for (const r of acta.resoluciones) {
        const key = JSON.stringify({
          detalle: r.detalle,
          fechaCumplimiento: r.fechaCumplimiento
            ? new Date(r.fechaCumplimiento).toISOString()
            : null,
          responsable: r.responsable || '',
          estadoId: r.estadoId
        });
        const arr = grupos.get(key) || [];
        arr.push(r);
        grupos.set(key, arr);
      }

      const gruposValores = Array.from(grupos.values());

      // Procesar cada grupo de resoluciones
      for (let gi = 0; gi < gruposValores.length; gi++) {
        const resolucionesGrupo = gruposValores[gi];
        const base = resolucionesGrupo[0];
        
        // Crear una sola acta_coe_resolucion por grupo
        const resolucionResponse = await authFetch(apiBase + '/acta_coe_resoluciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activo: true,
            acta_coe_id: actaId,
            creador: acta.creador,
            detalle: base.detalle,
            fecha_cumplimiento: base.fechaCumplimiento ? new Date(base.fechaCumplimiento).toISOString().replace('Z', '+00:00') : null,
            acta_coe_resolucion_estado_id: base.estadoId,
            responsable: base.responsable || ''
          })
        });
        
        if (!resolucionResponse.ok) {
          console.error('Error al guardar resolución:', await resolucionResponse.text());
          throw new Error('Error al guardar la resolución');
        }
        const resolucionCreada = await resolucionResponse.json();

        // Por cada fila (mesa) del grupo, crear acta_coe_resolucion_mesas y su acción 1:1
        for (const resolucion of resolucionesGrupo) {
          const resolucionMesaResponse = await authFetch(apiBase + '/acta_coe_resolucion_mesas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              acta_coe_resolucion_id: resolucionCreada.id,
              acta_coe_resolucion_mesa_estado_id: 0,
              activo: true,
              creador: acta.creador,
              fecha_cumplimiento: (resolucion.fechaCumplimiento || new Date()).toISOString().replace('Z', '+00:00'),
              mesa_id: resolucion.mesaAsignadaId,
              responsable: resolucion.responsable || ''
            })
          });
          
          if (!resolucionMesaResponse.ok) {
            console.error('Error al crear acta_coe_resolucion_mesas:', await resolucionMesaResponse.text());
            throw new Error('Error al crear la mesa asociada a la resolución');
          }

          const resolucionMesa = await resolucionMesaResponse.json();

          // Obtener el ID del usuario desde el nuevo endpoint usando los datos del usuario logueado
          if (!datosLogin) {
            console.error('No se encontraron los datos del usuario logueado');
            throw new Error('Error al obtener los datos del usuario');
          }

          // Obtener el ID del usuario desde el nuevo endpoint
          const usuarioResponse = await authFetch(
            `${apiBase}/acta_coe_resolucion_mesas/coe/${datosLogin.coe_id}/provincia/${datosLogin.provincia_id}/canton/${datosLogin.canton_id}/mesa/${resolucion.mesaAsignadaId}`
          );

          if (!usuarioResponse.ok) {
            console.error('Error al obtener el usuario de la mesa:', await usuarioResponse.text());
            throw new Error('Error al obtener el usuario responsable de la mesa');
          }

          const usuarioData = await usuarioResponse.json();
          const usuarioId = usuarioData.usuario_id;

          // Crear acción de respuesta para cada mesa con el usuario obtenido
          const accionResponse = await authFetch(apiBase + '/acciones_respuesta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accion_respuesta_estado_id: 1,
              accion_respuesta_origen_id: 1,
              activo: true,
              coe_acta_resolucion_mesa_id: resolucionMesa.id,
              creador: acta.creador,
              detalle: base.detalle,
              fecha_final: (resolucion.fechaCumplimiento || new Date()).toISOString(),
              usuario_id: usuarioId  // Usar el ID de usuario obtenido
            })
          });
          
          if (!accionResponse.ok) {
            console.error('Error al crear acción de respuesta:', await accionResponse.text());
            throw new Error('Error al crear acción de respuesta');
          }
        }
      }

      // Si todo salió bien, volvemos al listado
      navigate('/actas');
    } catch (error) {
      console.error('Error al guardar el acta:', error);
      alert(error instanceof Error ? error.message : `Error al ${editId ? 'actualizar' : 'guardar'} el acta`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | { name?: string; value: any }>) => {
    const { name, value } = e.target || {};
    if (!name) return;

    setActa(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDropdownChange = (e: { value: any }, field: string) => {
    setActa(prev => ({
      ...prev,
      [field]: e.value
    }));
  };

  return (
    <div className="container-fluid">
      <div className="mb-2">
        <Breadcrumb
          items={[
            { title: <Link to="/">Inicio</Link> },
            { title: <Link to="/actas">Actas COE</Link> },
            { title: editId ? `Editar Acta COE` : 'Nueva Acta COE' },
          ]}
        />
      </div>

      <div className="col-12">
        <Card>
          <div className="mb-3">
            <h3>Datos del Acta COE</h3>
          </div>

          <div className="container-fluid">
            <div className="row col-12 pb-2">
              <div className="col-6">
                <label className="label-uniform">Fecha y Hora de inicio de Sesión *</label>
                <Calendar
                  value={acta.fechaHoraSesion}
                  onChange={(e) => setActa({ ...acta, fechaHoraSesion: e.value as Date })}
                  showIcon
                  showTime
                  hourFormat="24"
                  dateFormat="dd/mm/yy"
                  className="w-full m-1"
                  disabled={isReadOnly}
                />
              </div>

              <div className="col-6">
                <label className="label-uniform">Estado de Acta *</label>

                <Dropdown
                  id="acta_coe_estado_id"
                  name="acta_coe_estado_id"
                  value={acta.acta_coe_estado_id}
                  options={estadosActa.map(estado => ({
                    label: estado.nombre.toUpperCase(),
                    value: estado.id
                  }))}
                  onChange={(e) => {
                    setActa(prev => ({
                      ...prev,
                      acta_coe_estado_id: e.value
                    }));
                  }}
                  placeholder="Seleccione un estado"
                  disabled={isReadOnly}
                  className="w-full"
                />
              </div>
            </div>
            <div className="row">
              <div className="col-12">
                <label className="label-uniform">Descripción *</label>
                <InputTextarea
                  value={acta.detalle}
                  onChange={(e) => setActa({ ...acta, detalle: e.target.value })}
                  className="w-full m-1"
                  rows={3}
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="col-12">
        <Card>
          <div className="flex align-items-center justify-content-between mb-3">
            <h3 className="m-0">Resoluciones</h3>
            {!isReadOnly && (
              <Button
                label="Añadir Resolución"
                icon="pi pi-plus"
                onClick={() => abrirDialogoResolucion()}
                className="m-2"
                disabled={isLoading}
              />
            )}
          </div>

          <DataTable
            value={resolucionesAgrupadas}
            emptyMessage="No hay resoluciones registradas"
            responsiveLayout="scroll"
            loading={isLoading}
            sortMode="single"
          >
            <Column
              field="id"
              header="ID Resolución"
              sortable
              body={(row: any) => row.id ? `${row.id}` : '-'}
              style={{ width: '100px' }}
            ></Column>
            <Column
              field="detalle"
              header="Detalle"
              sortable
              style={{ minWidth: '250px' }}
            ></Column>
            <Column
              field="fechaCumplimiento"
              header="Fecha Cumplimiento"
              sortable
              body={(row: any) => {
                const date = row.fechaCumplimiento || row.fecha_cumplimiento;
                if (!date) return '-';
                // Handle both Date objects and date strings
                const dateObj = date instanceof Date ? date : new Date(date);
                return dateObj instanceof Date && !isNaN(dateObj.getTime())
                  ? dateObj.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                  : '-';
              }}
              style={{ width: '180px' }}
            ></Column>
            <Column
              field="mesas"
              header="Mesas"
              body={(row: any) => (
                <div className="flex flex-wrap gap-1">
                  {row.mesas?.map((mesa: any) => (
                    <Tag key={mesa.id} color="blue" className="mb-1">
                      {mesa.nombre || mesa.grupo_mesa_nombre || mesa.siglas}
                    </Tag>
                  ))}
                </div>
              )}
              style={{ minWidth: '250px' }}
            ></Column>
            <Column
              field="responsable"
              header="Responsable"
              sortable
              style={{ width: '150px' }}
            ></Column>
            <Column
              field="estadoNombre"
              header="Estado"
              sortable
              body={(row: any) => (
                <Tag color={row.activo ? 'blue' : 'red'}>
                  {row.estadoNombre}
                </Tag>
              )}
              style={{ width: '120px' }}
            ></Column>
            <Column
              header="Acciones"
              body={(row: any) => (
                <div className="flex gap-2">
                  {!isReadOnly && (
                    <Button
                      icon="pi pi-trash"
                      severity="danger"
                      text
                      onClick={() => eliminarResolucion(row.detalle)}
                      disabled={isLoading}
                    />
                  )}
                </div>
              )}
              style={{ width: '6rem' }}
            />
          </DataTable>

          <div className="flex justify-content-end mt-4">
            <Button
              label="Cancelar"
              icon="pi pi-times"
              className="p-button-text mr-2"
              onClick={() => navigate('/actas')}
              disabled={isLoading}
            />
            <Button
              label="Guardar Acta"
              icon="pi pi-save"
              onClick={guardarActa}
              loading={isLoading}
              disabled={isLoading}
            />
          </div>
        </Card>
      </div>

      {/* Diálogo para agregar/editar resolución */}
      <Dialog
        visible={showResolucionDialog}
        header="Agregar Resolución"
        onHide={() => setShowResolucionDialog(false)}
        style={{ width: '600px' }}
        modal
      >
        <div className="grid p-fluid">
          <div className="field col-12">
            <label>Mesa Asignada *</label>
            <MultiSelect
              value={(resolucionDraft as any).mesaAsignadaIds || []}
              options={mesas.map(mesa => ({
                ...mesa,
                displayName: `${mesa.mesa_nombre} - ${mesa.grupo_mesa_abreviatura}`
              }))}
              optionLabel="displayName"
              optionValue="id"
              onChange={(e) => {
                const ids = Array.isArray(e.value) ? e.value : [];
                setResolucionDraft({
                  ...resolucionDraft,
                  mesaAsignadaId: ids[0], // Mantener compatibilidad con código existente
                  mesaAsignadaIds: ids    // Actualizar el array de IDs
                });
              }}
              placeholder="Seleccionar mesas"
              className="w-full m-1"
              disabled={isLoading}
              display="chip"
              filter
            />
          </div>

          <div className="field col-12">
            <label>Detalle *</label>
            <InputTextarea
              value={resolucionDraft.detalle || ''}
              onChange={(e) => setResolucionDraft({ ...resolucionDraft, detalle: e.target.value })}
              rows={3}
              className="w-full m-1"
              disabled={isLoading}
            />
          </div>

          <div className="field col-12 md:col-6">
            <label>Fecha de Cumplimiento</label>
            <Calendar
              value={resolucionDraft.fechaCumplimiento || null}
              onChange={(e) => setResolucionDraft({ ...resolucionDraft, fechaCumplimiento: e.value as Date })}
              showIcon
              dateFormat="dd/mm/yy"
              className="w-full m-1"
              disabled={isLoading}
            />
          </div>

          <div className="field col-12 md:6">
            <label>Responsable</label>
            <InputText
              value={resolucionDraft.responsable || ''}
              onChange={(e) => setResolucionDraft({ ...resolucionDraft, responsable: e.target.value })}
              className="w-full m-1"
              disabled={isLoading}
            />
          </div>

          <div className="field col-12">
            <label>Estado *</label>
            <Dropdown
              value={estadoSeleccionado}
              options={estadosResolucion}
              onChange={(e) => {
                setEstadoSeleccionado(e.value);
                setResolucionDraft({
                  ...resolucionDraft,
                  estadoId: e.value?.id || 0,
                  estadoNombre: e.value?.nombre || ''
                });
              }}
              optionLabel="nombre"
              placeholder="Seleccionar estado"
              className="w-full m-1"
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-content-end gap-2 mt-4 col-12">
            <Button
              label="Cancelar"
              text
              onClick={() => setShowResolucionDialog(false)}
              disabled={isLoading}
            />
            <Button
              label="Guardar"
              icon="pi pi-check"
              onClick={guardarResolucion}
              loading={isLoading}
              disabled={isLoading}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default NuevoActaCOE;
