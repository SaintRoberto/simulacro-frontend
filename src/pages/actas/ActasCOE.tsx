import React, { useCallback, useEffect, useState } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { BaseCRUD } from '../../components/crud/BaseCRUD';
import { useNavigate } from 'react-router-dom';
import { useAuth, type DatosLogin } from '../../context/AuthContext';
import { Modal, Button as AntButton, Tag, message } from 'antd';

interface ActaCOEApi {
  creador: string;
  detalle: string;
  fecha_sesion: string;
  id: number;
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

type PdfDocumentKind = 'actaCompleta' | 'resoluciones';

interface PdfPreview {
  urls: Record<PdfDocumentKind, string>;
  nombres: Record<PdfDocumentKind, string>;
}

const DISASTER_DATE_STORAGE_VERSION = 'v1';

const getActaDisasterDateStorageKey = (actaId: number) =>
  `actaCoeFechaInicioDesastre:${DISASTER_DATE_STORAGE_VERSION}:${actaId}`;

const readActaDisasterDateValue = (actaId: number): string | null => {
  try {
    const storedValue = localStorage.getItem(getActaDisasterDateStorageKey(actaId));
    if (!storedValue) return null;
    const parsedDate = new Date(storedValue);
    return Number.isNaN(parsedDate.getTime()) ? null : storedValue;
  } catch {
    return null;
  }
};

const formatDate = (date: string | null): string => {
  if (!date) return '-';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
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
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<PdfPreview | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<PdfDocumentKind>('actaCompleta');
  const [generatingActaId, setGeneratingActaId] = useState<number | null>(null);
  const [pdfError, setPdfError] = useState('');
  const apiBase = process.env.REACT_APP_API_URL || '/api';

  const loadActas = useCallback(async () => {
    try {
      setIsLoading(true);
      const storedId = Number(localStorage.getItem('selectedEmergenciaId') || 'NaN');
      const emergenciaId = Number.isNaN(storedId) ? (datosLogin?.emergencia_id ?? 0) : storedId;
      if (!emergenciaId) {
        setActas([]);
        return;
      }

      const url = `${apiBase}/actas_coe/emergencia/${emergenciaId}/provincia/${datosLogin?.provincia_id}/canton/${datosLogin?.canton_id}`;
      const response = await authFetch(url, { headers: { accept: 'application/json' } });
      if (!response.ok) {
        console.error('No se pudo cargar la lista de actas COE', response.status, response.statusText);
        setActas([]);
        return;
      }

      const data = (await response.json()) as ActaCOEApi[];
      setActas((Array.isArray(data) ? data : []).map((item) => ({
        id: item.id,
        detalle: item.detalle,
        fechaSesion: formatDate(item.fecha_sesion),
        creador: String(item.creador || '').toUpperCase(),
      })));
    } catch (error) {
      console.error('Error cargando actas COE:', error);
      setActas([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, authFetch, datosLogin?.emergencia_id, datosLogin?.provincia_id, datosLogin?.canton_id]);

  useEffect(() => {
    loadActas();
  }, [loadActas]);

  useEffect(() => () => {
    if (!pdfPreview) return;
    URL.revokeObjectURL(pdfPreview.urls.actaCompleta);
    URL.revokeObjectURL(pdfPreview.urls.resoluciones);
  }, [pdfPreview]);

  const fetchSavedActa = useCallback(async (actaId: number) => {
    const [actaResponse, resolucionesResponse] = await Promise.all([
      authFetch(`${apiBase}/actas_coe/${actaId}`, { headers: { accept: 'application/json' } }),
      authFetch(`${apiBase}/acta_coe_resoluciones/acta_coe/${actaId}`, { headers: { accept: 'application/json' } }),
    ]);
    if (!actaResponse.ok) throw new Error('No se pudo cargar el acta guardada.');
    if (!resolucionesResponse.ok) throw new Error('No se pudieron cargar las resoluciones guardadas.');

    const actaData = await actaResponse.json() as ActaCOEDetalle;
    const resolucionesData = await resolucionesResponse.json() as Resolucion[];
    const resolucionesArray = Array.isArray(resolucionesData) ? resolucionesData : [];
    const loadCreatorContext = async (): Promise<Partial<DatosLogin> | null> => {
      if (!actaData.usuario_id) return null;
      try {
        const response = await authFetch(`${apiBase}/usuarios/${actaData.usuario_id}/datos-login`, {
          headers: { accept: 'application/json' },
        });
        if (!response.ok) return null;
        return await response.json() as Partial<DatosLogin>;
      } catch (error) {
        console.error('Error cargando el contexto DPA del creador del acta:', error);
        return null;
      }
    };

    const mesasPromise = Promise.all(resolucionesArray.map(async (resolucion) => {
      try {
        const response = await authFetch(
          `${apiBase}/acta_coe_resolucion_mesas/acta_coe_resolucion/${resolucion.id}`,
          { headers: { accept: 'application/json' } },
        );
        const data = response.ok ? await response.json() as ResolucionMesa[] : [];
        return [resolucion.id, Array.isArray(data) ? data : []] as const;
      } catch (error) {
        console.error(`Error cargando mesas para resolución ${resolucion.id}:`, error);
        return [resolucion.id, [] as ResolucionMesa[]] as const;
      }
    }));
    const [creatorContext, mesasEntries] = await Promise.all([
      loadCreatorContext(),
      mesasPromise,
    ]);

    return {
      acta: actaData,
      resoluciones: resolucionesArray,
      mesas: new Map<number, ResolucionMesa[]>(mesasEntries),
      creatorContext,
    };
  }, [apiBase, authFetch]);

  const handleRead = useCallback(async (item: ActaCOEItem) => {
    try {
      setLoadingDetalle(true);
      setShowConsultaModal(true);
      setActaDetalle(null);
      setResoluciones([]);
      setResolucionesMesas(new Map());
      const savedActa = await fetchSavedActa(item.id);
      setActaDetalle(savedActa.acta);
      setResoluciones(savedActa.resoluciones);
      setResolucionesMesas(savedActa.mesas);
    } catch (error) {
      console.error('Error cargando detalle del acta:', error);
    } finally {
      setLoadingDetalle(false);
    }
  }, [fetchSavedActa]);

  const handlePdfPreview = useCallback(async (item: ActaCOEItem) => {
    setShowPdfModal(true);
    setPdfPreview(null);
    setPdfError('');
    setSelectedPdf('actaCompleta');
    setGeneratingActaId(item.id);
    try {
      const [savedActa, pdfModule] = await Promise.all([
        fetchSavedActa(item.id),
        import('../../utils/actaCoePdf'),
      ]);
      let emergenciaNombre = '';
      try { emergenciaNombre = localStorage.getItem('selectedEmergenciaName') || ''; } catch {}
      const fechaInicioDesastre = readActaDisasterDateValue(item.id);
      const dpaContext = savedActa.creatorContext || datosLogin;

      const generated = await pdfModule.createActaCoePdfs({
        acta: savedActa.acta,
        resoluciones: savedActa.resoluciones.map((resolucion) => ({
          ...resolucion,
          mesas: savedActa.mesas.get(resolucion.id) || [],
        })),
        emergenciaNombre,
        fechaInicioDesastre,
        dpa: {
          coeAbreviatura: dpaContext?.coe_abreviatura,
          provinciaId: dpaContext?.provincia_id,
          provinciaNombre: dpaContext?.provincia_nombre,
          cantonId: dpaContext?.canton_id,
          cantonNombre: dpaContext?.canton_nombre,
        },
      });

      setPdfPreview({
        urls: {
          actaCompleta: URL.createObjectURL(generated.actaCompleta),
          resoluciones: URL.createObjectURL(generated.resoluciones),
        },
        nombres: generated.nombres,
      });
    } catch (error) {
      console.error('Error generando los PDF del acta:', error);
      const detail = error instanceof Error ? error.message : 'No se pudieron generar los documentos.';
      setPdfError(detail);
      message.error(detail);
    } finally {
      setGeneratingActaId(null);
    }
  }, [datosLogin, fetchSavedActa]);

  const columns = [
    { field: 'id', header: 'ID', sortable: true },
    { field: 'detalle', header: 'Detalle', sortable: true },
    { field: 'fechaSesion', header: 'Fecha de Sesión', sortable: true },
    { field: 'creador', header: 'Creador', sortable: true },
  ];

  const closeDetailModal = () => {
    setShowConsultaModal(false);
    setActaDetalle(null);
    setResoluciones([]);
    setResolucionesMesas(new Map());
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
              visible={datosLogin?.perfil_id === 3}
            />
          )}
          onEdit={(row) => navigate(`/actas/nueva?id=${row.id}`)}
          onRead={handleRead}
          showDeleteButton={false}
          showDeleteAction={false}
          onSave={() => undefined}
          onDelete={() => undefined}
          additionalActions={(row) => (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handlePdfPreview(row);
              }}
              className="btn btn-sm btn-link p-0 text-danger"
              title="Visualizar PDF del acta y resoluciones"
              aria-label={`Visualizar PDF del acta ${row.id} y sus resoluciones`}
              disabled={generatingActaId === row.id}
            >
              <i
                className={generatingActaId === row.id ? 'pi pi-spin pi-spinner' : 'pi pi-file-pdf'}
                style={{ fontSize: '1.1rem' }}
                aria-hidden="true"
              />
            </button>
          )}
          initialItem={{ id: 0, detalle: '', fechaSesion: '' }}
          emptyMessage={isLoading ? 'Cargando actas...' : 'No existen actas registradas.'}
        />
      </Card>

      <Modal
        open={showConsultaModal}
        title="Consultar Acta COE"
        onCancel={closeDetailModal}
        footer={[<AntButton key="close" type="primary" onClick={closeDetailModal}>Cerrar</AntButton>]}
        width={900}
      >
        {loadingDetalle ? (
          <div className="text-center py-4">Cargando información...</div>
        ) : actaDetalle ? (
          <div>
            <div className="mb-4">
              <div className="row mb-2"><div className="col-md-3"><strong>ID:</strong></div><div className="col-md-9">{actaDetalle.id}</div></div>
              <div className="row mb-2"><div className="col-md-3"><strong>Detalle:</strong></div><div className="col-md-9">{actaDetalle.detalle || '-'}</div></div>
              <div className="row mb-2"><div className="col-md-3"><strong>Fecha de Sesión:</strong></div><div className="col-md-9">{formatDate(actaDetalle.fecha_sesion)}</div></div>
              <div className="row mb-2"><div className="col-md-3"><strong>Fecha Finalizado:</strong></div><div className="col-md-9">{formatDate(actaDetalle.fecha_finalizado)}</div></div>
              <div className="row mb-2"><div className="col-md-3"><strong>Estado:</strong></div><div className="col-md-9"><Tag color="green">{actaDetalle.acta_coe_estado_nombre.toUpperCase()}</Tag></div></div>
              <div className="row mb-2"><div className="col-md-3"><strong>Usuario ID:</strong></div><div className="col-md-9">{actaDetalle.usuario_id}</div></div>
              <div className="row mb-2"><div className="col-md-3"><strong>Creador:</strong></div><div className="col-md-9">{actaDetalle.creador || '-'}</div></div>
            </div>

            <div className="mt-4">
              <h5 className="mb-3">Resoluciones</h5>
              {resoluciones.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-bordered table-hover">
                    <thead className="table-light"><tr><th>ID</th><th>Detalle</th><th>Responsable</th><th>Estado</th><th>Fecha Cumplimiento</th><th>Mesas</th></tr></thead>
                    <tbody>
                      {resoluciones.map((resolucion) => {
                        const mesas = resolucionesMesas.get(resolucion.id) || [];
                        return (
                          <tr key={resolucion.id}>
                            <td>{resolucion.id}</td><td>{resolucion.detalle || '-'}</td><td>{resolucion.responsable || '-'}</td>
                            <td>{resolucion.acta_coe_resolucion_estado_nombre || '-'}</td><td>{formatDate(resolucion.fecha_cumplimiento)}</td>
                            <td>{mesas.length > 0 ? <div className="d-flex flex-wrap gap-1">{mesas.map((mesa) => <Tag color="blue" key={mesa.id}>{mesa.mesa_abreviatura || mesa.mesa_nombre}</Tag>)}</div> : <span className="text-muted">-</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-muted">No hay resoluciones registradas para este acta.</p>}
            </div>
          </div>
        ) : <div className="text-center py-4 text-muted">No se pudo cargar la información del acta.</div>}
      </Modal>

      <Modal
        open={showPdfModal}
        title="Documentos PDF del Acta COE"
        onCancel={() => setShowPdfModal(false)}
        footer={null}
        width="min(1100px, 96vw)"
        destroyOnClose
      >
        {generatingActaId !== null ? (
          <div className="text-center py-5"><i className="pi pi-spin pi-spinner me-2" aria-hidden="true" />Generando los documentos desde el acta guardada...</div>
        ) : pdfError ? (
          <div className="text-center text-danger py-5">{pdfError}</div>
        ) : pdfPreview ? (
          <div>
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
              <div className="d-flex flex-wrap gap-2">
                <AntButton type={selectedPdf === 'actaCompleta' ? 'primary' : 'default'} onClick={() => setSelectedPdf('actaCompleta')}>Acta completa</AntButton>
                <AntButton type={selectedPdf === 'resoluciones' ? 'primary' : 'default'} onClick={() => setSelectedPdf('resoluciones')}>Solo resoluciones</AntButton>
              </div>
              <a href={pdfPreview.urls[selectedPdf]} download={pdfPreview.nombres[selectedPdf]} className="text-decoration-none">
                <AntButton type="primary" danger><i className="pi pi-download me-2" aria-hidden="true" />Descargar PDF</AntButton>
              </a>
            </div>
            <iframe
              key={pdfPreview.urls[selectedPdf]}
              src={pdfPreview.urls[selectedPdf]}
              title={selectedPdf === 'actaCompleta' ? 'Vista previa del acta completa' : 'Vista previa de resoluciones'}
              style={{ width: '100%', height: '70vh', border: '1px solid #d9d9d9' }}
            />
          </div>
        ) : null}
      </Modal>
    </>
  );
};

export default ActasCOE;
