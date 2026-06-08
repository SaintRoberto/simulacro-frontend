import React, { useEffect, useMemo, useState } from 'react';
import { Input, Progress, Tag } from 'antd';

export interface RequerimientoEnviadoGrupoRow {
  id?: number;
  requerimiento_numero: string;
  cantidad_solicitada: number;
  porcentaje_avance: number;
  detalle?: string;
  creacion: string;
  estado?: string;
}

export interface RequerimientoEnviadoDetalleRow {
  id: number;
  usuario_receptor: string;
  recurso_grupo_nombre: string;
  recurso_tipo_nombre: string;
  cantidad_solicitada: number;
  especificaciones: string;
  porcentaje_avance: number;
  requerimiento_estado_nombre?: string;
  detalle: string;
  requerimiento_id?: number;
  creacion: string;
}

interface RequerimientosEnviadosAgrupadosTableProps {
  items: RequerimientoEnviadoGrupoRow[];
  loading: boolean;
  error: string | null;
  onRead?: (item: RequerimientoEnviadoGrupoRow) => void;
  onEdit?: (item: RequerimientoEnviadoGrupoRow) => void;
  onDelete?: (item: RequerimientoEnviadoGrupoRow) => void;
  loadDetalle: (requerimientoNumero: string) => Promise<RequerimientoEnviadoDetalleRow[]>;
  detalleData?: Record<string, RequerimientoEnviadoDetalleRow[]>;
  emptyMessage?: string;
}

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
};

const progressPercent = (value: number | null | undefined): number => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const estadoTagColor = (estado: string): string => {
  const normalized = estado.toLowerCase();
  if (normalized.includes('rechaz')) return 'red';
  if (normalized.includes('final') || normalized.includes('complet')) return 'green';
  if (normalized.includes('proceso') || normalized.includes('seguim')) return 'gold';
  if (normalized.includes('reasign') || normalized.includes('escal')) return 'purple';
  if (normalized.includes('inici') || normalized.includes('solicit')) return 'blue';
  return 'default';
};

export const RequerimientosEnviadosAgrupadosTable: React.FC<RequerimientosEnviadosAgrupadosTableProps> = ({
  items,
  loading,
  error,
  onRead,
  onEdit,
  onDelete,
  loadDetalle,
  detalleData,
  emptyMessage = 'No se encontraron registros.',
}) => {
  const [globalFilter, setGlobalFilter] = useState('');
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(5);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [detalleCache, setDetalleCache] = useState<Record<string, RequerimientoEnviadoDetalleRow[]>>({});
  const [detalleLoading, setDetalleLoading] = useState<Record<string, boolean>>({});
  const [detalleError, setDetalleError] = useState<Record<string, string>>({});

  const normalizedItems = useMemo(
    () =>
      (items || []).map((item) => ({
        ...item,
        estado: item.estado || 'Iniciada',
      })),
    [items]
  );

  const filteredItems = useMemo(() => {
    if (!globalFilter) return normalizedItems;
    const q = globalFilter.toLowerCase();
    return normalizedItems.filter((it) => {
      const searchable = `${it.requerimiento_numero} ${it.cantidad_solicitada} ${it.estado} ${it.detalle || ''} ${formatDate(it.creacion)}`;
      return searchable.toLowerCase().includes(q);
    });
  }, [normalizedItems, globalFilter]);

  const paginatedItems = useMemo(() => filteredItems.slice(first, first + rows), [filteredItems, first, rows]);

  useEffect(() => {
    if (first >= filteredItems.length && first > 0) {
      setFirst(Math.max(0, filteredItems.length - rows));
    }
  }, [filteredItems.length, first, rows]);

  useEffect(() => {
    if (detalleData) {
      setDetalleCache(detalleData);
    }
  }, [detalleData]);

  const fetchDetalleIfNeeded = async (requerimientoNumero: string) => {
    if (detalleCache[requerimientoNumero] || detalleLoading[requerimientoNumero]) return;
    setDetalleLoading((prev) => ({ ...prev, [requerimientoNumero]: true }));
    setDetalleError((prev) => ({ ...prev, [requerimientoNumero]: '' }));
    try {
      const data = await loadDetalle(requerimientoNumero);
      setDetalleCache((prev) => ({ ...prev, [requerimientoNumero]: data || [] }));
    } catch {
      setDetalleError((prev) => ({
        ...prev,
        [requerimientoNumero]: 'No se pudo cargar el detalle del requerimiento.',
      }));
    } finally {
      setDetalleLoading((prev) => ({ ...prev, [requerimientoNumero]: false }));
    }
  };

  const toggleExpand = (item: RequerimientoEnviadoGrupoRow) => {
    const numero = item.requerimiento_numero;
    const nextExpanded = !expandedRows[numero];
    setExpandedRows((prev) => ({ ...prev, [numero]: nextExpanded }));
    if (nextExpanded) fetchDetalleIfNeeded(numero);
  };

  const onPagePrev = () => setFirst((prev) => Math.max(0, prev - rows));
  const onPageNext = () => setFirst((prev) => prev + rows);

  return (
    <div className="container-fluid base-crud">
      <div className="d-flex align-items-center justify-content-end mb-3">
        <Input.Search
          placeholder="Buscar..."
          allowClear
          value={globalFilter}
          onChange={(e) => {
            setGlobalFilter(e.currentTarget.value);
            setFirst(0);
          }}
          style={{ maxWidth: 240 }}
        />
      </div>

      {error && (
        <div className="alert alert-danger py-2" role="alert">
          {error}
        </div>
      )}

      <div className="table-responsive base-crud-table">
        <table className="table table-hover">
          <thead className="table-light">
            <tr>
              <th>#</th>
              <th>Cod. Req</th>
              <th>Cantidad Total</th>
              <th>Detalle</th>
              <th>Porcentaje Avance</th>
              
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-4">
                  Cargando informacion...
                </td>
              </tr>
            ) : paginatedItems.length > 0 ? (
              paginatedItems.map((item, index) => {
                const numero = item.requerimiento_numero;
                const isExpanded = !!expandedRows[numero];
                const detalleRows = detalleCache[numero] || [];
                const isDetalleLoading = !!detalleLoading[numero];
                const detalleErrorMsg = detalleError[numero];
                const sequentialNumber = first + index + 1;

                return (
                  <React.Fragment key={numero}>
                    <tr onClick={() => toggleExpand(item)} style={{ cursor: 'pointer' }}>
                      <td>{sequentialNumber}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-link p-0 me-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(item);
                          }}
                          title={isExpanded ? 'Contraer' : 'Expandir'}
                        >
                          <i className={`pi ${isExpanded ? 'pi-chevron-down' : 'pi-chevron-right'}`} />
                        </button>
                        <span title={numero}>{numero.slice(0, 8)}</span>
                      </td>
                      <td>{Number(item.cantidad_solicitada ?? 0)}</td>
                      <td>{item.detalle || '-'}</td>
                      <td>
                        <Progress
                          percent={progressPercent(item.porcentaje_avance)}
                          size="small"
                          status={progressPercent(item.porcentaje_avance) === 100 ? 'success' : undefined}
                        />
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRead?.(item);
                              toggleExpand(item);
                            }}
                            className="btn btn-sm btn-link p-0 text-info"
                            title="Detalle"
                          >
                            <i className="pi pi-search" style={{ fontSize: '1.1rem' }} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit?.(item);
                            }}
                            className="btn btn-sm btn-link p-0 text-primary"
                            title="Editar"
                          >
                            <i className="pi pi-pencil" style={{ fontSize: '1.1rem' }} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete?.(item);
                            }}
                            className="btn btn-sm btn-link p-0 text-danger"
                            title="Eliminar"
                          >
                            <i className="pi pi-trash" style={{ fontSize: '1.1rem' }} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="bg-light">
                          {isDetalleLoading ? (
                            <div className="py-2">Cargando detalle...</div>
                          ) : detalleErrorMsg ? (
                            <div className="py-2 text-danger">{detalleErrorMsg}</div>
                          ) : detalleRows.length === 0 ? (
                            <div className="py-2 text-muted">Sin detalle para este requerimiento.</div>
                          ) : (
                            <div className="table-responsive">
                              <table className="table table-sm table-bordered mb-0">
                                <thead className="table-light">
                                  <tr>
                                    <th>ID</th>
                                    <th>Enviado a</th>
                                    <th>Grupo</th>
                                    <th>Tipo</th>
                                    <th>Cantidad</th>
                                    <th>Especificaciones</th>
                                    <th>Porcentaje Avance</th>
                                    <th>Estado</th>
                                    <th>Creacion</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {detalleRows.map((detalle) => (
                                    <tr key={detalle.id}>
                                      <td>{detalle.id}</td>
                                      <td>{detalle.usuario_receptor || '-'}</td>
                                      <td>{detalle.recurso_grupo_nombre || '-'}</td>
                                      <td>{detalle.recurso_tipo_nombre || '-'}</td>
                                      <td>{Number(detalle.cantidad_solicitada ?? 0)}</td>
                                      <td>{detalle.especificaciones || '-'}</td>
                                      <td>
                                        <Progress
                                          percent={progressPercent(detalle.porcentaje_avance)}
                                          size="small"
                                          status={progressPercent(detalle.porcentaje_avance) === 100 ? 'success' : undefined}
                                        />
                                      </td>
                                      <td>
                                        {detalle.requerimiento_estado_nombre ? (
                                          <Tag color={estadoTagColor(detalle.requerimiento_estado_nombre)}>
                                            {detalle.requerimiento_estado_nombre}
                                          </Tag>
                                        ) : (
                                          '-'
                                        )}
                                      </td>
                                      <td>{formatDate(detalle.creacion)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-4">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!loading && filteredItems.length > 0 && (
        <div className="d-flex align-items-center justify-content-between mt-3 p-3 bg-light border-top">
          <div>
            <span className="text-muted">
              Mostrando {first + 1} a {Math.min(first + rows, filteredItems.length)} de {filteredItems.length} registros
            </span>
          </div>
          <div className="d-flex gap-2 align-items-center">
            <label className="me-2">Filas por pagina:</label>
            <select
              className="form-select form-select-sm"
              style={{ width: 'auto' }}
              value={rows}
              onChange={(e) => {
                setRows(Number(e.target.value));
                setFirst(0);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <div className="btn-group ms-3" role="group">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={onPagePrev}
                disabled={first === 0}
              >
                Anterior
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={onPageNext}
                disabled={first + rows >= filteredItems.length}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequerimientosEnviadosAgrupadosTable;
