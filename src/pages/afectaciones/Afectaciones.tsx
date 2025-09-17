import React, { useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { Card } from 'primereact/card';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Toolbar } from 'primereact/toolbar';
import { FilterMatchMode } from 'primereact/api';

interface Afectacion {
  id: number;
  codigo: string;
  descripcion: string;
  fechaInicio: Date;
  fechaFin: Date | null;
  nivelRiesgo: string;
  estado: string;
  ubicacion: string;
}

export const Afectaciones: React.FC = () => {
  // Sample data
  const [afectaciones, setAfectaciones] = useState<Afectacion[]>([
    {
      id: 1,
      codigo: 'AF-2023-001',
      descripcion: 'Inundación en la zona norte',
      fechaInicio: new Date(2023, 5, 15),
      fechaFin: null,
      nivelRiesgo: 'Alto',
      estado: 'Activo',
      ubicacion: 'Zona Norte'
    },
    // Add more sample data as needed
  ]);

  const [selectedAfectaciones, setSelectedAfectaciones] = useState<Afectacion[]>([]);
  const [editingRows, setEditingRows] = useState<any>({});
  const [afectacion, setAfectacion] = useState<Partial<Afectacion> | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [filters, setFilters] = useState({
    'global': { value: null, matchMode: FilterMatchMode.CONTAINS },
    'estado': { value: null, matchMode: FilterMatchMode.EQUALS },
    'nivelRiesgo': { value: null, matchMode: FilterMatchMode.EQUALS },
  });

  const nivelesRiesgo = [
    { label: 'Bajo', value: 'Bajo' },
    { label: 'Medio', value: 'Medio' },
    { label: 'Alto', value: 'Alto' },
    { label: 'Crítico', value: 'Crítico' },
  ];

  const estados = [
    { label: 'Activo', value: 'Activo' },
    { label: 'En Proceso', value: 'En Proceso' },
    { label: 'Resuelto', value: 'Resuelto' },
    { label: 'Cerrado', value: 'Cerrado' },
  ];

  const openNew = () => {
    // Crear nueva fila inline con un nuevo id y valores por defecto
    const newId = Math.max(...afectaciones.map(a => a.id), 0) + 1;
    const nueva: Afectacion = {
      id: newId,
      codigo: `AF-${new Date().getFullYear()}-${String(newId).padStart(3, '0')}`,
      descripcion: '',
      fechaInicio: new Date(),
      fechaFin: null,
      nivelRiesgo: 'Medio',
      estado: 'Activo',
      ubicacion: ''
    };
    setAfectaciones(prev => [...prev, nueva]);
    // activar edición de la nueva fila
    setEditingRows((prev: any) => ({ [newId]: true, ...prev }));
  };

  const hideDeleteDialog = () => {
    setDeleteDialog(false);
  };

  // Guardar cambios de una fila luego de editar en la grilla
  const onRowEditComplete = (e: any) => {
    const { newData } = e; // newData contiene la fila editada
    setAfectaciones(prev => prev.map(item => (item.id === newData.id ? { ...newData } : item)));
  };

  const confirmDelete = (afectacion: Afectacion) => {
    setAfectacion(afectacion);
    setDeleteDialog(true);
  };

  const deleteAfectacion = () => {
    if (afectacion) {
      let _afectaciones = afectaciones.filter(val => val.id !== afectacion.id);
      setAfectaciones(_afectaciones);
      hideDeleteDialog();
    }
  };

  // Eliminadas funciones de edición vía modal

  // Cell editors for DataTable (editable por celda)
  const textEditor = (options: any) => {
    return (
      <InputText
        value={options?.value || ''}
        onChange={(e) => options?.editorCallback?.(e.target.value)}
        className="w-full"
      />
    );
  };

  const dropdownEditor = (
    options: any,
    data: { label: string; value: string }[]
  ) => {
    return (
      <Dropdown
        value={options?.value}
        options={data}
        onChange={(e) => options?.editorCallback?.(e.value)}
        className="w-full"
        placeholder="Seleccione"
      />
    );
  };

  const dateEditor = (options: any) => {
    return (
      <Calendar
        value={(options?.value as Date) || null}
        onChange={(e) => options?.editorCallback?.((e.value as Date) || null)}
        showIcon
        dateFormat="dd/mm/yy"
        className="w-full"
      />
    );
  };

  // Validaciones adicionales podrían agregarse en editores/guardar

  const leftToolbarTemplate = () => {
    return (
      <div className="flex flex-wrap gap-2">
        <Button 
          label="Nuevo" 
          icon="pi pi-plus" 
          severity="success"
          onClick={openNew} 
        />
        <Button 
          label="Eliminar" 
          icon="pi pi-trash" 
          severity="danger" 
          onClick={() => confirmDelete(selectedAfectaciones[0])} 
          disabled={!selectedAfectaciones || !selectedAfectaciones.length} 
        />
      </div>
    );
  };

  const rightToolbarTemplate = () => {
    return (
      <span className="p-input-icon-left">
        <i className="pi pi-search" />
        <InputText 
          type="search" 
          placeholder="Buscar..." 
          onInput={(e) => setGlobalFilter(e.currentTarget.value)} 
        />
      </span>
    );
  };

  const deleteBodyTemplate = (rowData: Afectacion) => {
    return (
      <div className="flex gap-1">
        <Button 
          icon="pi pi-trash" 
          rounded 
          text 
          severity="danger" 
          onClick={() => confirmDelete(rowData)} 
        />
      </div>
    );
  };

  const nivelRiesgoBodyTemplate = (rowData: Afectacion) => {
    return <Tag value={rowData.nivelRiesgo} severity={getSeverity(rowData.nivelRiesgo)} />;
  };

  const estadoBodyTemplate = (rowData: Afectacion) => {
    return <Tag value={rowData.estado} severity={getEstadoSeverity(rowData.estado)} />;
  };

  const getSeverity = (nivel: string) => {
    switch (nivel) {
      case 'Bajo':
        return 'success';
      case 'Medio':
        return 'info';
      case 'Alto':
        return 'warning';
      case 'Crítico':
        return 'danger';
      default:
        return null;
    }
  };

  const getEstadoSeverity = (estado: string) => {
    switch (estado) {
      case 'Activo':
        return 'danger';
      case 'En Proceso':
        return 'warning';
      case 'Resuelto':
        return 'success';
      case 'Cerrado':
        return 'info';
      default:
        return null;
    }
  };

  const header = (
    <div className="flex flex-wrap align-items-center justify-content-between gap-2">
      <h4 className="m-0">Gestionar Afectaciones</h4>
      <span className="p-input-icon-left">
        <i className="pi pi-search" />
        <InputText 
          type="search" 
          placeholder="Buscar..." 
          onInput={(e) => setGlobalFilter(e.currentTarget.value)} 
        />
      </span>
    </div>
  );

  const afectacionDialogFooter = (
    <>
      {/* Modal de edición eliminado */}
    </>
  );

  const deleteDialogFooter = (
    <>
      <Button label="No" icon="pi pi-times" text onClick={hideDeleteDialog} />
      <Button label="Sí" icon="pi pi-check" text onClick={deleteAfectacion} />
    </>
  );

  return (
    <div className="grid">
      <div className="col-12">
        <Card>
          <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate}></Toolbar>
          
          <DataTable
            value={afectaciones}
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            className="datatable-responsive"
            selectionMode="multiple"
            selection={selectedAfectaciones}
            onSelectionChange={(e) => setSelectedAfectaciones(e.value as Afectacion[])}
            dataKey="id"
            header={header}
            emptyMessage="No se encontraron afectaciones."
            globalFilter={globalFilter}
            filters={filters}
            filterDisplay="menu"
            responsiveLayout="scroll"
            editMode="row"
            editingRows={editingRows}
            onRowEditChange={(e) => setEditingRows(e.data)}
            onRowEditComplete={onRowEditComplete}
          >
            <Column
              field="codigo"
              header="Código"
              sortable
              filter
              filterPlaceholder="Buscar por código"
              editor={(options) => textEditor(options)}
            />
            <Column
              field="descripcion"
              header="Descripción"
              sortable
              filter
              filterPlaceholder="Buscar por descripción"
              editor={(options) => textEditor(options)}
            />
            <Column
              field="ubicacion"
              header="Ubicación"
              sortable
              filter
              filterPlaceholder="Buscar por ubicación"
              editor={(options) => textEditor(options)}
            />
            <Column
              field="fechaInicio"
              header="Fecha Inicio"
              sortable
              body={(data) => data.fechaInicio.toLocaleDateString()}
              editor={(options) => dateEditor(options)}
            />
            <Column
              field="fechaFin"
              header="Fecha Fin"
              sortable
              body={(data) => (data.fechaFin ? data.fechaFin.toLocaleDateString() : '-')}
              editor={(options) => dateEditor(options)}
            />
            <Column field="nivelRiesgo" header="Nivel de Riesgo" sortable body={nivelRiesgoBodyTemplate} filter filterElement={(options) => (
              <Dropdown 
                value={options.value} 
                options={nivelesRiesgo} 
                onChange={(e) => options.filterApplyCallback(e.value)} 
                placeholder="Seleccione nivel" 
                className="p-column-filter" 
                showClear 
              />
            )} 
              editor={(options) => dropdownEditor(options, nivelesRiesgo)}
            />
            <Column field="estado" header="Estado" sortable body={estadoBodyTemplate} filter filterElement={(options) => (
              <Dropdown 
                value={options.value} 
                options={estados} 
                onChange={(e) => options.filterApplyCallback(e.value)} 
                placeholder="Seleccione estado" 
                className="p-column-filter" 
                showClear 
              />
            )} 
              editor={(options) => dropdownEditor(options, estados)}
            />
            {/* Columna con controles de edición por fila */}
            <Column rowEditor headerStyle={{ width: '8rem' }} bodyStyle={{ textAlign: 'center' }}></Column>
            {/* Columna para borrar */}
            <Column body={deleteBodyTemplate} headerStyle={{ width: '6rem', textAlign: 'center' }} bodyStyle={{ textAlign: 'center', overflow: 'visible' }} />
          </DataTable>
        </Card>
      </div>

      {/* Modal de edición eliminado; se mantiene únicamente el modal de confirmación de borrado */}

      {/* Delete confirmation dialog */}
      <Dialog 
        visible={deleteDialog} 
        style={{ width: '450px' }} 
        header="Confirmar" 
        modal 
        footer={deleteDialogFooter} 
        onHide={hideDeleteDialog}
      >
        <div className="flex align-items-center justify-content-center">
          <i className="pi pi-exclamation-triangle mr-3" style={{ fontSize: '2rem' }} />
          {afectacion && (
            <span>¿Está seguro que desea eliminar la afectación <b>{afectacion.descripcion}</b>?</span>
          )}
        </div>
      </Dialog>
    </div>
  );
};

// Add Tag component if not already imported
const Tag = ({ value, severity }: { value: string; severity: string }) => {
  return <span className={`p-tag p-tag-${severity}`}>{value}</span>;
};
