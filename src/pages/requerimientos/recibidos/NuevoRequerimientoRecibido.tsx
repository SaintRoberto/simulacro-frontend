import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { useAuth } from '../../../context/AuthContext';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { RequerimientoRequest, RequerimientoRecursoRequest } from '../../../context/AuthContext';
import { Tag, Breadcrumb, Progress } from 'antd';

interface Recurso {
  id: number;
  grupo: string;
  grupoId: number;
  grupoDescripcion?: string;
  tipo: string;
  tipoId: number;
  recursosComplementarios?: string;
  caracteristicasTecnicas?: string;
  cantidad: number;
  costoEstimado: string;
  especificacionesAdicionales?: string;
  destinoUbicacion?: string;
  activo: boolean;
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

interface RequerimientoRecibido {
  creacion: string,
  creador: string,
  emergencia_id: number,
  fecha_fin: string,
  fecha_inicio: string,
  id: number,
  modificacion: string,
  modificador: string,
  porcentaje_avance: number,
  requerimiento_estado_id: number,
  usuario_emisor_id: number,
  usuario_receptor_id: number
}


export const NuevoRequerimientoRecibido: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editId = useMemo(() => {
    const idStr = searchParams.get('id');
    const n = idStr ? Number(idStr) : NaN;
    return isNaN(n) ? null : n;
  }, [searchParams]);
  // Datos del requerimiento
  const [numero, setNumero] = useState<string>('REQ-0000');
  const [fechaSolicitud, setFechaSolicitud] = useState<Date | null>(new Date());
  const [fechaInicio, setFechaInicio] = useState<Date | null>(null);
  const [fechaFin, setFechaFin] = useState<Date | null>(null);
  const [mtt, setMtt] = useState<string | null>(null);
  // const [nivelCoe, setNivelCoe] = useState<string>('Provincial');

  // Recursos
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [showRecursoDialog, setShowRecursoDialog] = useState(false);
  const [recursoDraft, setRecursoDraft] = useState<Partial<Recurso>>({ cantidad: 1 });
  const [showDetalleDialog, setShowDetalleDialog] = useState<boolean>(false);

  const { datosLogin, authFetch, loadReceptores, receptores, receptoresStatus, recursoGrupos, recursoGruposStatus, recursoTipos, recursoTiposStatus, loadRecursoGrupos, loadRecursoTipos, createRequerimiento, createRequerimientoRecurso, getRequerimientoById, getRequerimientoRecursos, getRecursoTiposByGrupo, getRequerimientoEstados } = useAuth();
  const isReadOnly = false; // En respuestas, permitimos edición
  const apiBase = 'http://localhost:5000/api';

  // Respuesta actual (formulario)
  const [fechaRespuesta, setFechaRespuesta] = useState<Date>(new Date());
  const [responsable, setResponsable] = useState<string>('');
  const [estadoId, setEstadoId] = useState<number | null>(null);
  const [avance, setAvance] = useState<number>(0);
  const [situacion, setSituacion] = useState<string>('');

  // Estados del requerimiento para el selector
  const [estados, setEstados] = useState<Array<{ id: number; nombre: string }>>([]);

  // Historial
  const [historial, setHistorial] = useState<RespuestaHistorialItem[]>([]);

  //requerimiento
  const [requerimiento, setRequerimiento] = useState<RequerimientoRecibido[]>([]);

  useEffect(() => {
    if (datosLogin && receptoresStatus === 'idle') {
      loadReceptores();
    }
    if (recursoGruposStatus === 'idle') {
      loadRecursoGrupos();
    }
  }, [datosLogin, receptoresStatus, loadReceptores, recursoGruposStatus, loadRecursoGrupos]);

  // Carga estados y valores por defecto
  useEffect(() => {
    (async () => {
      const ests = await getRequerimientoEstados();
      setEstados(ests || []);
      if (ests && ests.length > 0 && estadoId == null) {
        setEstadoId(ests[0].id);
      }
      if (datosLogin && !responsable) setResponsable(datosLogin.usuario_login);
    })();
  }, [getRequerimientoEstados, datosLogin, estadoId, responsable]);

  const loadRequerimiento = useCallback(async (rid: number) => {
    try {
      // Nuevo endpoint: trae historial por requerimiento_id
      const res = await authFetch(`${apiBase}/requerimientos/recibidos/${rid}`, {
        headers: { accept: 'application/json' },
      });
      if (!res.ok) {
        setRequerimiento([]);
        return;
      }
      const data = (await res.json()) as any[];
      const mapped: RequerimientoRecibido[] = data.map((d: any) => ({
        id: d.id,
        creacion: d.creacion,
        creador: d.creador,
        modificacion: d.modificacion ?? d.creacion,
        modificador: d.modificador ?? d.creador,
        emergencia_id: d.emergencia_id,
        fecha_fin: d.fecha_fin,
        fecha_inicio: d.fecha_inicio,
        porcentaje_avance: d.porcentaje_avance,
        requerimiento_estado_id: d.requerimiento_estado_id,
        usuario_emisor_id: d.usuario_emisor_id,
        usuario_receptor_id: d.usuario_receptor_id,
      }));
      setRequerimiento(mapped);
    } catch (e) {
      setRequerimiento([]);
    }
  }, [apiBase]);

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

  // Load existing requerimiento (detalle), recursos, historial cuando hay id
  useEffect(() => {
    const loadForEdit = async () => {
      if (!editId) return;
      // Load requerimiento details
      const req = await getRequerimientoById(editId);
      if (req) {
        setNumero(`REQ-${req.id}`);
        setFechaSolicitud(new Date(req.creacion));
        setFechaInicio(req.fecha_inicio ? new Date(req.fecha_inicio) : null);
        setFechaFin(req.fecha_fin ? new Date(req.fecha_fin) : null);
        // Set receptor MTT dropdown value (we only have usuario_receptor_id; try to find matching receptor)
        if (receptores && receptores.length > 0) {
          const rec = receptores.find(r => r.usuario_id === req.usuario_receptor_id);
          if (rec) {
            setMtt(`${rec.mesa_id}-${rec.siglas}-${rec.usuario_id}`);
          }
        }
      }

      // Load recursos for the requerimiento
      const recursosApi = await getRequerimientoRecursos(editId);
      const recursosRows: Recurso[] = [];

      for (const r of recursosApi) {
        // Ensure we have tipos for the grupo to resolve type name
        let tipoNombre = '';
        let grupoNombre = '';
        const grupo = recursoGrupos.find(g => g.id === r.recurso_grupo_id);
        grupoNombre = grupo?.nombre || `Grupo ${r.recurso_grupo_id}`;
        let tipo = recursoTipos.find(t => t.id === r.recurso_tipo_id);
        if (!tipo) {
          const tipos = await getRecursoTiposByGrupo(r.recurso_grupo_id);
          tipo = tipos.find(t => t.id === r.recurso_tipo_id);
        }
        tipoNombre = tipo?.nombre || `Tipo ${r.recurso_tipo_id}`;

        recursosRows.push({
          id: r.id,
          grupo: grupoNombre,
          grupoId: r.recurso_grupo_id,
          grupoDescripcion: grupo?.descripcion,
          tipo: tipoNombre,
          tipoId: r.recurso_tipo_id,
          recursosComplementarios: tipo?.complemento,
          caracteristicasTecnicas: tipo?.descripcion,
          cantidad: r.cantidad,
          costoEstimado: tipo?.costo || '',
          especificacionesAdicionales: r.especificaciones,
          destinoUbicacion: r.destino,
          activo: r.activo,
        });
      }

      if (recursosRows.length) setRecursos(recursosRows);
      await loadHistorial(editId);
    };

    loadForEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, getRequerimientoById, getRequerimientoRecursos, recursoGrupos, recursoTipos, loadHistorial]);

  // const nivelOptions = [
  //   { label: 'Parroquial', value: 'Parroquial' },
  //   { label: 'Cantonal', value: 'Cantonal' },
  //   { label: 'Provincial', value: 'Provincial' },
  //   { label: 'Nacional', value: 'Nacional' },
  // ];

  const openRecurso = () => {
    setRecursoDraft({ cantidad: 1 });
    setShowRecursoDialog(true);
  };

  const handleGrupoChange = (grupoId: number) => {
    setRecursoDraft(prev => ({ ...prev, grupo: grupoId.toString(), grupoId }));
    loadRecursoTipos(grupoId);
  };

  const handleTipoChange = (tipoId: number) => {
    const tipo = recursoTipos.find(t => t.id === tipoId);
    if (tipo) {
      setRecursoDraft(prev => ({
        ...prev,
        tipo: tipo.nombre,
        tipoId,
        recursosComplementarios: tipo.complemento,
        caracteristicasTecnicas: tipo.descripcion,
        costoEstimado: tipo.costo
      }));
    }
  };

  const handleGuardarRespuesta = async () => {
    if (!editId) {
      alert('No hay un requerimiento seleccionado');
      return;
    }
    if (!responsable || estadoId == null) {
      alert('Complete los campos obligatorios');
      return;
    }
    try {
      const nowIso = (fechaRespuesta || new Date()).toISOString();
      const usuarioActual = datosLogin?.usuario_login || responsable || '';
      const payload = {
        activo: true,
        creacion: nowIso,
        creador: usuarioActual,
        modificacion: nowIso,
        modificador: usuarioActual,
        porcentaje_avance: avance,
        requerimiento_id: editId,
        responsable,
        respuesta_estado_id: estadoId,
        respuesta_fecha: nowIso,
        situacion_actual: situacion,
      };
      // 1) Crear respuesta (historial)
      const res = await authFetch(`${apiBase}/requerimiento-respuestas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        alert('No se pudo registrar la respuesta');
        return;
      }
      const created = await res.json();

      // 2) Actualizar estado del requerimiento
      const resUpd = await authFetch(`${apiBase}/requerimientos/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ porcentaje_avance: avance, requerimiento_estado_id: estadoId }),
      });
      if (!resUpd.ok) {
        alert('Respuesta guardada, pero no se pudo actualizar el estado del requerimiento');
      }

      // 3) Refrescar historial y UI
      setFechaRespuesta(new Date());
      setSituacion('');
      await loadHistorial(editId);
      alert('Respuesta guardada');
    } catch (e) {
      alert('Error al guardar la respuesta');
      console.error(e);
    }
  };

  return (
    <div className="container-fluid">
      <div className="mb-2">
        <Breadcrumb
          items={[
            { title: <Link to="/">Inicio</Link> },
            { title: <Link to="/requerimientos/recibidos">Requerimientos Recibidos</Link> },
            { title: editId ? `Ver REQ-${editId}` : 'Nuevo Requerimiento' },
          ]}
        />
      </div>
      {/* Respuesta a requerimiento */}
      <div className="col-12">
        <Card>
          <div className="mb-3">
            <h3>Respuesta a Requerimiento</h3>
          </div>
          <div className="container-fluid">
            <div className="row col-12 pb-2">
              <div className="col-lg-3 col-md-6 col-sm-12">
                <label className="label-uniform">Fecha de Respuesta *</label>
                <Calendar value={fechaRespuesta} onChange={(e) => setFechaRespuesta(e.value as Date)} showIcon showTime className="w-full m-1" dateFormat="dd/mm/yy" />
              </div>
              <div className="col-lg-3 col-md-6 col-sm-12">
                <label className="label-uniform">Responsable de Respuesta *</label>
                <InputText value={responsable} onChange={(e) => setResponsable(e.target.value)} className="w-full m-1" placeholder="Nombre del responsable" />
              </div>
              <div className="col-lg-3 col-md-6 col-sm-12">
                <label className="label-uniform">Estado del Requerimiento</label>
                <Dropdown value={estadoId} options={estados.map(e => ({ label: e.nombre, value: e.id }))} onChange={(e) => setEstadoId(e.value)} placeholder="Seleccionar" className="w-full m-1" filter />
              </div>
              <div className="col-lg-3 col-md-6 col-sm-12">
                <label className="label-uniform">Porcentaje de Avance *</label>
                <Dropdown value={avance} options={[0, 25, 50, 75, 100].map(v => ({ label: `${v}%`, value: v }))} onChange={(e) => setAvance(e.value)} className="m-1 w-full" />
              </div>
            </div>

            <div className="row col-12">
              <div className="col-12">
                <div className="flex align-items-center gap-2">
                  <div className="w-full m-1">
                    <Progress percent={avance} showInfo />
                  </div>
                </div>
              </div>
            </div>

            <div className="row col-12">
              <div className="col-12">
                <label className="label-uniform">Situación actual del requerimiento</label>
                </div>
              <div className="col-12">
                <InputTextarea value={situacion} onChange={(e) => setSituacion(e.target.value)} className="w-full m-1" placeholder="Describir la situación actual, avances, dificultades, próximos pasos..." rows={5} autoResize />
              </div>
            </div>

            <div className="row mt-3">
              <div className="col-12 text-end">
                <Button label="Ver Requerimiento" icon="pi pi-info-circle" className="m-1" onClick={() => setShowDetalleDialog(true)} />
                <Button label="Guardar" icon="pi pi-lock" className="m-1" severity="secondary" onClick={handleGuardarRespuesta} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="col-12">
        <Card>
          <div className="mb-3 flex align-items-center justify-content-between"></div>
          <div className="row mt-2">
            <h3 className="m-0">Historial de Respuestas</h3>
          </div>

          <DataTable value={historial} emptyMessage="Sin respuestas registradas" responsiveLayout="scroll">
            <Column header="#" body={(row: RespuestaHistorialItem, { rowIndex }) => `#${historial.length - rowIndex}`} style={{ width: '6rem' }} />
            <Column header="Fecha y Hora" body={(row: RespuestaHistorialItem) => (
              <div>
                {new Date(row.fecha_respuesta).toLocaleDateString()}<br />
                <small>{new Date(row.fecha_respuesta).toLocaleTimeString()}</small>
              </div>
            )} />
            <Column header="Responsable" field="responsable" />
            <Column header="Estado del Requerimiento" body={(row: RespuestaHistorialItem) => (
              <Tag color="blue">{row.requerimiento_estado_nombre || (estados.find(e => e.id === row.requerimiento_estado_id)?.nombre || row.requerimiento_estado_id)}</Tag>
            )} />
            <Column header="Progreso" body={(row: RespuestaHistorialItem) => (
              <div style={{ minWidth: 120 }}>
                <Progress percent={row.porcentaje_avance} showInfo size="small" />
              </div>
            )} />
            <Column header="Situación Actual" field="situacion_actual" />
            {/* <Column header="Acciones" body={() => (
              <Button icon="pi pi-trash" severity="danger" text disabled />
            )} style={{ width: '8rem' }} /> */}
          </DataTable>


        </Card>
      </div>



      {/* Dialogo: Detalle del Requerimiento */}
      <Dialog
        visible={showDetalleDialog}
        header="Detalle del Requerimiento"
        onHide={() => setShowDetalleDialog(false)}
        style={{ width: '640px' }}
        modal
      >
        <div className="grid p-fluid">
          <div className="field col-12"><strong>Número:</strong> {numero}</div>
          <div className="field col-6"><strong>Fecha Solicitud:</strong> {fechaSolicitud ? new Date(fechaSolicitud).toLocaleString() : '-'}</div>
          <div className="field col-6"><strong>Fecha Fin:</strong> {fechaFin ? new Date(fechaFin).toLocaleString() : '-'}</div>
        </div>

        <div className="field col-12 mt-3">
          <h5>Recursos solicitados</h5>
          <DataTable value={recursos} emptyMessage="Sin recursos" responsiveLayout="scroll" size="small">
            <Column field="grupo" header="Grupo" />
            <Column field="tipo" header="Tipo" />
            <Column field="cantidad" header="Cantidad" />
            <Column field="destinoUbicacion" header="Destino" />
          </DataTable>
        </div>
      </Dialog>

    </div>
  );
};

export default NuevoRequerimientoRecibido;
