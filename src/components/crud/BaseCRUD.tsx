import React, { useMemo, useState, ReactNode, useEffect, cloneElement, isValidElement } from 'react';
import { Modal, Input, Button } from 'antd';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useMenu } from '../../context/MenuContext';

interface Opcion {
  abreviatura: string;
  activo: boolean;
  creacion: string;
  creador: string;
  id: number;
  modificacion: string;
  modificador: string | null;
  nombre: string;
  ruta: string;
}

interface BaseCRUDProps<T> {
  title: string;
  items: T[];
  columns: {
    field: string;
    header: string;
    body?: (rowData: T) => ReactNode;
    sortable?: boolean;
    filter?: boolean;
    filterElement?: (options: any) => ReactNode;
    className?: string;
    headerClassName?: string;
  }[];
  renderForm?: (item: Partial<T>, onChange: (e: any) => void, readOnly?: boolean) => ReactNode;
  onSave: (item: Partial<T>) => void | boolean | Promise<void | boolean>;
  onDelete: (item: T) => void;
  initialItem: Partial<T>;
  idField?: string;
  showHeader?: boolean;
  leftToolbarTemplate?: () => ReactNode;
  rightToolbarTemplate?: () => ReactNode;
  emptyMessage?: string;
  onRead?: (item: T) => void;
  onEdit?: (item: T) => void;
  canEditRow?: (item: T) => boolean;
  canDeleteRow?: (item: T) => boolean;
  showCreateButton?: boolean;
  showDeleteButton?: boolean;
  showEditAction?: boolean;
  showDeleteAction?: boolean;
  showReadAction?: boolean;
  menuId?: number;
  resolveItemForEdit?: (item: T) => Promise<Partial<T>>;
  deleteActionTitle?: string;
  deleteActionIconClassName?: string;
  deleteActionButtonClassName?: string;
  deleteDialogTitle?: string;
  deleteDialogMessage?: string;
  deleteDialogOkText?: string;
  forceDeleteAction?: boolean;
  useMenuPermissions?: boolean;
  modalWidth?: number | string;
  exportToExcel?: boolean;
  exportFileName?: string;
}

export function BaseCRUD<T extends Record<string, any>>({
  title,
  items,
  columns,
  renderForm,
  onSave,
  onDelete,
  initialItem,
  idField = 'id',
  showHeader = true,
  leftToolbarTemplate,
  rightToolbarTemplate,
  emptyMessage = 'No se encontraron registros.',
  onEdit,
  canEditRow,
  canDeleteRow,
  showCreateButton = true,
  showDeleteButton = true,
  showEditAction = true,
  showDeleteAction = true,
  onRead,
  showReadAction = true,
  menuId,
  resolveItemForEdit,
  deleteActionTitle = 'Eliminar',
  deleteActionIconClassName = 'pi pi-trash',
  deleteActionButtonClassName = 'btn btn-sm btn-link p-0 text-danger',
  deleteDialogTitle = 'Confirmar',
  deleteDialogMessage = '¿Está seguro que desea eliminar este registro?',
  deleteDialogOkText = 'Sí',
  forceDeleteAction = false,
  useMenuPermissions = true,
  modalWidth,
  exportToExcel = false,
  exportFileName,
}: BaseCRUDProps<T>) {
  const { authFetch, datosLogin } = useAuth();
  const { getMenuIdByRoute } = useMenu();
  const location = useLocation();
  const [item, setItem] = useState<Partial<T>>(initialItem);
  const [showDialog, setShowDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [opciones, setOpciones] = useState<Opcion[]>([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(5);

  const apiBase = process.env.REACT_APP_API_URL || '/api';

  // Obtener menuId: primero del prop, si no está, de la ruta actual
  const effectiveMenuId = useMemo(() => {
    if (menuId) return menuId;
    return getMenuIdByRoute(location.pathname);
  }, [menuId, location.pathname, getMenuIdByRoute]);

  // Cargar opciones del menú cada vez que cambia la ruta o el menuId
  useEffect(() => {
    const loadOpciones = async () => {
      // Verificar que existan (permitir 0 como valor válido para mesa_id)
      if (!effectiveMenuId || 
          datosLogin?.perfil_id == null || 
          datosLogin?.coe_id == null || 
          datosLogin?.mesa_id == null) {
        setOpciones([]);
        return;
      }

      try {
        const url = `${apiBase}/opciones/usuario/${datosLogin.perfil_id}/coe/${datosLogin.coe_id}/mesa/${datosLogin.mesa_id}/menu/${effectiveMenuId}`;
        const res = await authFetch(url, { headers: { accept: 'application/json' } });
        
        if (res.ok) {
          const data = await res.json();
          setOpciones(Array.isArray(data) ? data : []);
        } else {
          setOpciones([]);
        }
      } catch (error) {
        console.error('Error al cargar opciones:', error);
        setOpciones([]);
      }
    };

    loadOpciones();
  }, [effectiveMenuId, datosLogin?.perfil_id, datosLogin?.coe_id, datosLogin?.mesa_id, apiBase, authFetch]);

  // Determinar qué acciones están permitidas basándose en las opciones
  const opcionesActivas = useMemo(() => {
    const activas = opciones.filter(op => op.activo);
    return {
      puedeCrear: activas.some(op => op.abreviatura === 'C'),
      puedeConsultar: activas.some(op => op.abreviatura === 'R'),
      puedeActualizar: activas.some(op => op.abreviatura === 'U'),
      puedeEliminar: activas.some(op => op.abreviatura === 'D'),
    };
  }, [opciones]);

  // Si hay opciones cargadas, usar esas para controlar las acciones
  // Si no hay opciones (menuId no proporcionado o no hay opciones), usar los props por defecto
  const tieneOpciones = useMenuPermissions && opciones.length > 0;
  const canCreate = tieneOpciones ? opcionesActivas.puedeCrear : showCreateButton;
  const canDelete = forceDeleteAction
    ? true
    : (tieneOpciones ? opcionesActivas.puedeEliminar : showDeleteButton);
  const canEdit = tieneOpciones ? opcionesActivas.puedeActualizar : showEditAction;
  const canRead = tieneOpciones ? opcionesActivas.puedeConsultar : showReadAction;

  const openNew = () => {
    setItem(initialItem);
    setIsReadOnly(false);
    setShowDialog(true);
  };

  const hideDialog = () => {
    setShowDialog(false);
    setItem(initialItem);
    setIsReadOnly(false);
  };

  const hideDeleteDialog = () => {
    setDeleteDialog(false);
  };

  const saveItem = async () => {
    const result = await onSave(item);
    if (result !== false) hideDialog();
  };

  const editItem = (itemToEdit: T) => {
    setItem({ ...itemToEdit });
    setIsReadOnly(false);
    setShowDialog(true);
  };

  const handleEdit = async (rowData: T) => {
    if (resolveItemForEdit) {
      try {
        const resolved = await resolveItemForEdit(rowData);
        setItem({ ...resolved });
        setIsReadOnly(false);
        setShowDialog(true);
        return;
      } catch {}
    }
    if (onEdit) {
      onEdit(rowData);
    } else {
      editItem(rowData);
    }
  };

  const handleRead = async (rowData: T) => {
    if (onRead) {
      onRead(rowData);
      return;
    }
    
    // Si hay resolveItemForEdit, usarlo para cargar los datos completos
    if (resolveItemForEdit) {
      try {
        const resolved = await resolveItemForEdit(rowData);
        setItem({ ...resolved });
        setIsReadOnly(true);
        setShowDialog(true);
        return;
      } catch {}
    }
    
    // Si no, usar los datos directamente
    setItem({ ...rowData });
    setIsReadOnly(true);
    setShowDialog(true);
  };

  const confirmDelete = (itemToDelete: T) => {
    setItem(itemToDelete);
    setDeleteDialog(true);
  };

  const deleteItem = () => {
    if (item) {
      onDelete(item as T);
      hideDeleteDialog();
    }
  };

  const onInputChange = (e: any) => {
    // No permitir cambios en modo solo lectura
    if (isReadOnly) return;
    
    const target = e?.target || {};
    const name = target.name as string;
    const val = target.value ?? '';
    if (!name) return;
    setItem((prev) => ({
      ...prev!,
      [name]: val,
    }));
  };

  // Función onChange que respeta el modo read-only
  const getOnChange = (originalOnChange?: (e: any) => void) => {
    return (e: any) => {
      if (isReadOnly) return;
      if (originalOnChange) {
        originalOnChange(e);
      } else {
        onInputChange(e);
      }
    };
  };

  // Función helper para deshabilitar automáticamente los componentes del formulario
  const disableFormElements = (element: ReactNode, readOnly: boolean): ReactNode => {
    if (!readOnly || !isValidElement(element)) {
      return element;
    }

    const elementType = element.type;
    const props = element.props || {};
    let componentName = '';
    
    // Obtener el nombre del componente de diferentes formas
    if (typeof elementType === 'string') {
      componentName = elementType;
    } else if (typeof elementType === 'function') {
      componentName = (elementType as any).displayName || (elementType as any).name || '';
      // Para componentes de PrimeReact, verificar también el nombre del constructor
      if (!componentName && (elementType as any).$$typeof) {
        const typeStr = String(elementType);
        const match = typeStr.match(/function\s+(\w+)/);
        if (match) componentName = match[1];
      }
    } else if (elementType && typeof elementType === 'object') {
      componentName = (elementType as any).displayName || (elementType as any).name || '';
    }

    // Lista de componentes que deben deshabilitarse (case insensitive)
    const componentsToDisable = [
      'InputText', 'InputTextarea', 'InputNumber', 'Dropdown', 'Calendar', 
      'Select', 'DatePicker', 'TimePicker', 'Checkbox', 'Radio', 'Switch',
      'InputSwitch', 'MultiSelect', 'AutoComplete',
      'input', 'select', 'textarea'
    ];

    const componentNameLower = componentName.toLowerCase();
    
    // Verificar si tiene props que indiquen que es un componente de formulario
    // Los Dropdown de PrimeReact tienen la prop 'options'
    const isDropdownLike = props.options !== undefined;
    const hasFormProps = isDropdownLike ||
                        props.onChange !== undefined || // Cualquier input
                        props.value !== undefined || // Inputs con valor
                        props.placeholder !== undefined; // Inputs con placeholder
    
    const shouldDisable = componentsToDisable.some(name => 
      componentNameLower.includes(name.toLowerCase()) || 
      componentNameLower === name.toLowerCase()
    ) || isDropdownLike || // Si tiene options, es un Dropdown
        (hasFormProps && (componentNameLower.includes('input') || 
                           componentNameLower.includes('select') || 
                           componentNameLower.includes('dropdown') ||
                           componentNameLower.includes('calendar')));

    // Si es un componente que debe deshabilitarse
    if (shouldDisable) {
      // Para Dropdown y componentes similares, asegurar que disabled esté presente
      const newProps: any = {
        ...props,
        disabled: true,
        readOnly: true
      };
      
      // Para componentes de PrimeReact, también deshabilitar el onChange
      if (isDropdownLike || 
          componentNameLower.includes('dropdown') || 
          componentNameLower.includes('select') ||
          componentNameLower.includes('calendar') ||
          componentNameLower.includes('input') ||
          hasFormProps) {
        // Bloquear todos los handlers de cambio
        newProps.onChange = () => {}; // Bloquear onChange
        newProps.onValueChange = () => {}; // Para InputNumber
        newProps.onSelect = () => {}; // Para algunos componentes
        newProps.onClick = (e: any) => {
          // Prevenir que se abra el dropdown
          if (isDropdownLike) {
            e.preventDefault();
            e.stopPropagation();
          }
          if (props.onClick) props.onClick(e);
        };
      }
      
      return cloneElement(element, newProps);
    }

    // Si tiene hijos, procesarlos recursivamente
    if (props?.children) {
      const children = React.Children.map(props.children, (child) => 
        disableFormElements(child, readOnly)
      );
      return cloneElement(element, { ...props, children } as any);
    }

    return element;
  };

  const defaultLeftToolbarTemplate = () => {
    return (
      <div className="d-flex gap-2">
        {canCreate && (
          <Button type="primary" onClick={openNew}>
            Nuevo
        </Button>
      )}
      </div>
    );
  };

  const filteredItems = useMemo(() => {
    if (!globalFilter) return items;
    const q = globalFilter.toLowerCase();
    return items.filter((it) => JSON.stringify(it).toLowerCase().includes(q));
  }, [items, globalFilter]);

  const getExportCellValue = (row: T, field: string) => {
    const value = row[field as keyof T] as any;
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toLocaleString();
    return String(value);
  };

  const escapeXml = (value: string) => {
    const cleaned = Array.from(value).filter((char) => {
      const code = char.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || code >= 32;
    }).join('');
    return cleaned
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const getColumnName = (index: number) => {
    let column = '';
    let n = index;
    while (n >= 0) {
      column = String.fromCharCode((n % 26) + 65) + column;
      n = Math.floor(n / 26) - 1;
    }
    return column;
  };

  const createZipFile = (files: Array<{ name: string; content: string }>) => {
    const encoder = new TextEncoder();
    const crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
      let c = i;
      for (let j = 0; j < 8; j += 1) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      crcTable[i] = c >>> 0;
    }

    const crc32 = (data: Uint8Array) => {
      let crc = 0xffffffff;
      for (let i = 0; i < data.length; i += 1) {
        crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
      }
      return (crc ^ 0xffffffff) >>> 0;
    };

    const parts: Uint8Array[] = [];
    const centralParts: Uint8Array[] = [];
    let offset = 0;

    const writeUint16 = (view: DataView, viewOffset: number, value: number) => {
      view.setUint16(viewOffset, value, true);
    };
    const writeUint32 = (view: DataView, viewOffset: number, value: number) => {
      view.setUint32(viewOffset, value, true);
    };

    files.forEach((file) => {
      const nameData = encoder.encode(file.name);
      const contentData = encoder.encode(file.content);
      const crc = crc32(contentData);

      const localHeader = new Uint8Array(30 + nameData.length);
      const localView = new DataView(localHeader.buffer);
      writeUint32(localView, 0, 0x04034b50);
      writeUint16(localView, 4, 20);
      writeUint16(localView, 6, 0);
      writeUint16(localView, 8, 0);
      writeUint16(localView, 10, 0);
      writeUint16(localView, 12, 0);
      writeUint32(localView, 14, crc);
      writeUint32(localView, 18, contentData.length);
      writeUint32(localView, 22, contentData.length);
      writeUint16(localView, 26, nameData.length);
      writeUint16(localView, 28, 0);
      localHeader.set(nameData, 30);
      parts.push(localHeader, contentData);

      const centralHeader = new Uint8Array(46 + nameData.length);
      const centralView = new DataView(centralHeader.buffer);
      writeUint32(centralView, 0, 0x02014b50);
      writeUint16(centralView, 4, 20);
      writeUint16(centralView, 6, 20);
      writeUint16(centralView, 8, 0);
      writeUint16(centralView, 10, 0);
      writeUint16(centralView, 12, 0);
      writeUint16(centralView, 14, 0);
      writeUint32(centralView, 16, crc);
      writeUint32(centralView, 20, contentData.length);
      writeUint32(centralView, 24, contentData.length);
      writeUint16(centralView, 28, nameData.length);
      writeUint16(centralView, 30, 0);
      writeUint16(centralView, 32, 0);
      writeUint16(centralView, 34, 0);
      writeUint16(centralView, 36, 0);
      writeUint32(centralView, 38, 0);
      writeUint32(centralView, 42, offset);
      centralHeader.set(nameData, 46);
      centralParts.push(centralHeader);

      offset += localHeader.length + contentData.length;
    });

    const centralDirectoryOffset = offset;
    const centralDirectorySize = centralParts.reduce((total, part) => total + part.length, 0);
    const endRecord = new Uint8Array(22);
    const endView = new DataView(endRecord.buffer);
    writeUint32(endView, 0, 0x06054b50);
    writeUint16(endView, 4, 0);
    writeUint16(endView, 6, 0);
    writeUint16(endView, 8, files.length);
    writeUint16(endView, 10, files.length);
    writeUint32(endView, 12, centralDirectorySize);
    writeUint32(endView, 16, centralDirectoryOffset);
    writeUint16(endView, 20, 0);

    return new Blob([...parts, ...centralParts, endRecord], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  };

  const exportExcel = () => {
    const rowsXml = [
      columns.map((col) => col.header),
      ...filteredItems.map((row) => columns.map((col) => getExportCellValue(row, col.field))),
    ].map((rowValues, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const cells = rowValues.map((value, colIndex) => {
        const cellRef = `${getColumnName(colIndex)}${rowNumber}`;
        return `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
      }).join('');
      return `<row r="${rowNumber}">${cells}</row>`;
    }).join('');

    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rowsXml}</sheetData>
</worksheet>`;
    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Datos" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;
    const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;
    const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

    const blob = createZipFile([
      { name: '[Content_Types].xml', content: contentTypesXml },
      { name: '_rels/.rels', content: rootRelsXml },
      { name: 'xl/workbook.xml', content: workbookXml },
      { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
      { name: 'xl/worksheets/sheet1.xml', content: sheetXml },
    ]);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTitle = (exportFileName || title || 'reporte').trim().replace(/[\\/:*?"<>|]+/g, '_') || 'reporte';
    link.href = url;
    link.download = `${safeTitle}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const defaultRightToolbarTemplate = () => {
    return (
      <div className="d-flex gap-2 align-items-center">
        {exportToExcel && (
          <Button
            onClick={exportExcel}
            disabled={filteredItems.length === 0}
            title="Exportar Excel"
            aria-label="Exportar Excel"
            style={{ backgroundColor: '#217346', borderColor: '#217346', color: '#fff' }}
          >
            <i className="pi pi-file-excel" aria-hidden="true"></i>
          </Button>
        )}
        <Input.Search
          placeholder="Buscar..."
          allowClear
          onChange={(e) => setGlobalFilter(e.currentTarget.value)}
          style={{ maxWidth: 240 }}
        />
      </div>
    );
  };

  const actionBodyTemplate = (rowData: T) => {
    return (
      <div className="d-flex gap-2">
        {canRead && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleRead(rowData);
            }} 
            className="btn btn-sm btn-link p-0 text-info"
            title="Detalle"
          >
            <i className="pi pi-search" style={{ fontSize: '1.1rem' }}></i>
          </button>
        )}
        {canEdit && (!canEditRow || canEditRow(rowData)) && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(rowData);
            }} 
            className="btn btn-sm btn-link p-0 text-primary"
            title="Editar"
          >
            <i className="pi pi-pencil" style={{ fontSize: '1.1rem' }}></i>
          </button>
        )}
        {canDelete && (!canDeleteRow || canDeleteRow(rowData)) && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              confirmDelete(rowData);
            }} 
            className={deleteActionButtonClassName}
            title={deleteActionTitle}
          >
            <i className={deleteActionIconClassName} style={{ fontSize: '1.1rem' }}></i>
          </button>
        )}
      </div>
    );
  };

  const header = showHeader && (
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 base-crud-header">
      <h4 className="m-0 base-crud-title">{title}</h4>
      {rightToolbarTemplate ? rightToolbarTemplate() : defaultRightToolbarTemplate()}
    </div>
  );

  // Calcular items paginados
  const paginatedItems = useMemo(() => {
    return filteredItems.slice(first, first + rows);
  }, [filteredItems, first, rows]);

  // Determinar si hay acciones disponibles para mostrar la columna
  const tieneAcciones = canRead || canEdit || canDelete;

  // Manejador de cambio de página
  const onPageChange = (event: any) => {
    setFirst(event.first);
    setRows(event.rows);
  };

  return (
    <div className="container-fluid base-crud">
      <div className="d-flex align-items-center justify-content-between mb-3">
        {leftToolbarTemplate ? leftToolbarTemplate() : defaultLeftToolbarTemplate()}
        {/* header includes right side search when showHeader */}
      </div>

      {header}

      <div className="table-responsive base-crud-table">
        <table className="table table-hover">
          <thead className="table-light">
            <tr>
              {columns.map((col) => (
                <th 
                  key={col.field} 
                  className={col.headerClassName || ''}
                  style={col.field === 'situacion' || col.field === 'descripcion' ? { minWidth: '250px' } : {}}
                >
                  {col.header}
                </th>
              ))}
              {tieneAcciones && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedItems.length > 0 ? (
              paginatedItems.map((item) => (
                <tr key={String(item[idField as keyof T])}>
                  {columns.map((col) => (
                    <td 
                      key={`${item[idField as keyof T]}-${col.field}`}
                      className={col.className || ''}
                      style={col.field === 'situacion' || col.field === 'descripcion' ? { minWidth: '250px' } : {}}
                      title={col.field === 'detalle' ? String(item[col.field as keyof T] || '') : undefined}
                    >
                      {col.body ? 
                        col.body(item) : 
                        String(item[col.field as keyof T] || '')
                      }
                    </td>
                  ))}
                  {tieneAcciones && (
                  <td>
                    {actionBodyTemplate(item)}
                  </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + (tieneAcciones ? 1 : 0)} className="text-center py-4">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {filteredItems.length > 0 && (
        <div className="d-flex align-items-center justify-content-between mt-3 p-3 base-crud-pagination">
          <div>
            <span className="text-muted">
              Mostrando {filteredItems.length === 0 ? 0 : first + 1} a {Math.min(first + rows, filteredItems.length)} de {filteredItems.length} registros
            </span>
          </div>
          <div className="d-flex gap-2 align-items-center">
            <label className="me-2">Filas por página:</label>
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
                onClick={() => setFirst(Math.max(0, first - rows))}
                disabled={first === 0}
              >
                Anterior
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setFirst(first + rows)}
                disabled={first + rows >= filteredItems.length}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={showDialog}
        width={modalWidth}
        title={
          isReadOnly 
            ? `Consultar ${title}` 
            : item && item[idField] 
              ? `Editar ${title}` 
              : `Nuevo ${title}`
        }
        onCancel={hideDialog}
        onOk={isReadOnly ? hideDialog : saveItem}
        okText={isReadOnly ? "Cerrar" : "Guardar"}
        cancelText="Cancelar"
        footer={isReadOnly ? [
          <Button key="close" type="primary" onClick={hideDialog}>
            Cerrar
          </Button>
        ] : undefined}
      >
        {renderForm ? (
          <div className={isReadOnly ? 'read-only-form' : ''}>
            {isReadOnly 
              ? React.Children.map(
                  renderForm(item, getOnChange(), isReadOnly),
                  (child) => disableFormElements(child, isReadOnly)
                )
              : renderForm(item, getOnChange(), isReadOnly)
            }
          </div>
        ) : null}
      </Modal>

      <Modal
        open={deleteDialog}
        title={deleteDialogTitle}
        onCancel={hideDeleteDialog}
        onOk={deleteItem}
        okText={deleteDialogOkText}
        cancelText="No"
      >
        <div className="d-flex align-items-center justify-content-center">
          {item && (
            <span>{deleteDialogMessage}</span>
          )}
        </div>
      </Modal>
    </div>
  );
}
