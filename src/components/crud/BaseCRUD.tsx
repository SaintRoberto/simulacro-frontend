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
  onSave: (item: Partial<T>) => void;
  onDelete: (item: T) => void;
  initialItem: Partial<T>;
  idField?: string;
  showHeader?: boolean;
  leftToolbarTemplate?: () => ReactNode;
  rightToolbarTemplate?: () => ReactNode;
  emptyMessage?: string;
  onRead?: (item: T) => void;
  onEdit?: (item: T) => void;
  showCreateButton?: boolean;
  showDeleteButton?: boolean;
  showEditAction?: boolean;
  showDeleteAction?: boolean;
  showReadAction?: boolean;
  menuId?: number;
  resolveItemForEdit?: (item: T) => Promise<Partial<T>>;
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
  showCreateButton = true,
  showDeleteButton = true,
  showEditAction = true,
  showDeleteAction = true,
  onRead,
  showReadAction = true,
  menuId,
  resolveItemForEdit,
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

  const apiBase = process.env.REACT_APP_API_URL || '/api';

  // Obtener menuId: primero del prop, si no está, de la ruta actual
  const effectiveMenuId = useMemo(() => {
    if (menuId) return menuId;
    return getMenuIdByRoute(location.pathname);
  }, [menuId, location.pathname, getMenuIdByRoute]);

  // Cargar opciones del menú cada vez que cambia la ruta o el menuId
  useEffect(() => {
    const loadOpciones = async () => {
      if (!effectiveMenuId || !datosLogin?.perfil_id || !datosLogin?.coe_id || !datosLogin?.mesa_id) {
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
  const tieneOpciones = opciones.length > 0;
  const canCreate = tieneOpciones ? opcionesActivas.puedeCrear : showCreateButton;
  const canDelete = tieneOpciones ? opcionesActivas.puedeEliminar : showDeleteButton;
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

  const saveItem = () => {
    onSave(item);
    hideDialog();
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

  const defaultRightToolbarTemplate = () => {
    return (
      <Input.Search
        placeholder="Buscar..."
        allowClear
        onChange={(e) => setGlobalFilter(e.currentTarget.value)}
        style={{ maxWidth: 240 }}
      />
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
            title="Consultar"
          >
            <i className="pi pi-search" style={{ fontSize: '1.1rem' }}></i>
          </button>
        )}
        {canEdit && (
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
        {canDelete && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              confirmDelete(rowData);
            }} 
            className="btn btn-sm btn-link p-0 text-danger"
            title="Eliminar"
          >
            <i className="pi pi-trash" style={{ fontSize: '1.1rem' }}></i>
          </button>
        )}
      </div>
    );
  };

  const header = showHeader && (
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
      <h4 className="m-0">{title}</h4>
      {rightToolbarTemplate ? rightToolbarTemplate() : defaultRightToolbarTemplate()}
    </div>
  );

  const filteredItems = useMemo(() => {
    if (!globalFilter) return items;
    const q = globalFilter.toLowerCase();
    return items.filter((it) => JSON.stringify(it).toLowerCase().includes(q));
  }, [items, globalFilter]);

  // Determinar si hay acciones disponibles para mostrar la columna
  const tieneAcciones = canRead || canEdit || canDelete;

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between mb-3">
        {leftToolbarTemplate ? leftToolbarTemplate() : defaultLeftToolbarTemplate()}
        {/* header includes right side search when showHeader */}
      </div>

      {header}

      <div className="table-responsive">
        <table className="table table-hover">
          <thead className="table-light">
            <tr>
              {columns.map((col) => (
                <th key={col.field} className={col.headerClassName || ''}>
                  {col.header}
                </th>
              ))}
              {tieneAcciones && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <tr key={String(item[idField as keyof T])}>
                  {columns.map((col) => (
                    <td 
                      key={`${item[idField as keyof T]}-${col.field}`}
                      className={col.className || ''}
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

      <Modal
        open={showDialog}
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
        title="Confirmar"
        onCancel={hideDeleteDialog}
        onOk={deleteItem}
        okText="Sí"
        cancelText="No"
      >
        <div className="d-flex align-items-center justify-content-center">
          {item && (
            <span>¿Está seguro que desea eliminar este registro?</span>
          )}
        </div>
      </Modal>
    </div>
  );
}
