import React, { useMemo, useState, ReactNode } from 'react';
import { Table, Modal, Input, Button, Space, Typography, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';

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
      <Space wrap>
        {showCreateButton && (
          <Button type="primary" onClick={openNew}>
            Nuevo
          </Button>
        )}
        {showDeleteButton && (
          <Button danger onClick={() => selectedItem && confirmDelete(selectedItem)} disabled={!selectedItem}>
            Eliminar
          </Button>
        )}
      </Space>
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
      <Space>
        {showEditAction && (
          <Tooltip title="Editar">
            <Button onClick={() => (onEdit ? onEdit(rowData) : editItem(rowData))} type="link" icon={<EditOutlined style={{ fontSize: '22px' }} />}
              aria-label="Editar" />
          </Tooltip>
        )}
        {showDeleteAction && (
          <Tooltip title="Eliminar">
            <Button onClick={() => confirmDelete(rowData)} type="link" danger icon={<DeleteOutlined />} style={{ fontSize: '22px' }} 
            aria-label="Eliminar" />
          </Tooltip>
        )}
      </Space>
    );
  };

  const header = showHeader ? (
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
      <Typography.Title level={4} style={{ margin: 0 }}>{title}</Typography.Title>
      {rightToolbarTemplate ? rightToolbarTemplate() : defaultRightToolbarTemplate()}
    </div>
  ) : undefined;

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

      <Table
        rowKey={idField as string}
        dataSource={filteredItems}
        pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [5, 10, 25, 50] as any }}
        onRow={(record) => ({ onClick: () => setSelectedItem(record) })}
        locale={{ emptyText: emptyMessage }}
        columns={[
          ...columns.map((col) => ({
            key: col.field,
            dataIndex: col.field,
            title: col.header,
            sorter: col.sortable
              ? (a: any, b: any) => {
                const va = a[col.field];
                const vb = b[col.field];
                return String(va ?? '').localeCompare(String(vb ?? ''));
              }
              : undefined,
            render: col.body
              ? (_value: any, record: any) => (col.body as any)(record)
              : undefined,
          })),
          {
            key: '__actions',
            title: 'Acciones',
            render: (_: any, row: T) => actionBodyTemplate(row),
            width: 160,
          }
        ]}
      />

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
