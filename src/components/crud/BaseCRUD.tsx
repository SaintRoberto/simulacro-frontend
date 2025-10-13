import React, { useMemo, useState, ReactNode } from 'react';
import { Modal, Input, Button } from 'antd';

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
  renderForm?: (item: Partial<T>, onChange: (e: any) => void) => ReactNode;
  onSave: (item: Partial<T>) => void;
  onDelete: (item: T) => void;
  initialItem: Partial<T>;
  idField?: string;
  showHeader?: boolean;
  leftToolbarTemplate?: () => ReactNode;
  rightToolbarTemplate?: () => ReactNode;
  emptyMessage?: string;
  onEdit?: (item: T) => void;
  showCreateButton?: boolean;
  showDeleteButton?: boolean;
  showEditAction?: boolean;
  showDeleteAction?: boolean;
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
}: BaseCRUDProps<T>) {
  const [item, setItem] = useState<Partial<T>>(initialItem);
  const [showDialog, setShowDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedItem, setSelectedItem] = useState<T | null>(null);

  const openNew = () => {
    setItem(initialItem);
    setShowDialog(true);
  };

  const hideDialog = () => {
    setShowDialog(false);
    setItem(initialItem);
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
    const target = e?.target || {};
    const name = target.name as string;
    const val = target.value ?? '';
    if (!name) return;
    setItem((prev) => ({
      ...prev!,
      [name]: val,
    }));
  };

  const defaultLeftToolbarTemplate = () => {
    return (
      <div className="d-flex gap-2">
        {showCreateButton && (
          <Button type="primary" onClick={openNew}>
            Nuevo
          </Button>
        )}
        {showDeleteButton && (
          <Button 
            danger 
            onClick={() => selectedItem && confirmDelete(selectedItem)} 
            disabled={!selectedItem}
          >
            Eliminar
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
        {showEditAction && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEdit ? onEdit(rowData) : editItem(rowData);
            }} 
            className="btn btn-sm btn-link p-0 text-primary"
            title="Editar"
          >
            <i className="pi pi-pencil" style={{ fontSize: '1.1rem' }}></i>
          </button>
        )}
        {showDeleteAction && (
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
              <th>Acciones</th>
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
                  <td>
                    {actionBodyTemplate(item)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + 1} className="text-center py-4">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={showDialog}
        title={item && item[idField] ? `Editar ${title}` : `Nuevo ${title}`}
        onCancel={hideDialog}
        onOk={saveItem}
        okText="Guardar"
        cancelText="Cancelar"
      >
        {renderForm ? renderForm(item, onInputChange) : null}
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
