import React, { useState } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { InputTextarea } from 'primereact/inputtextarea';
import { BaseCRUD } from '../../components/crud/BaseCRUD';

interface AccionEjecutada {
  id: number;
  codigo: string;
  descripcion: string;
  fechaInicio: Date;
  fechaFin: Date | null;
  responsable: string;
  estado: string;
  prioridad: string;
  observaciones: string;
}

export const AccionesEjecutadas: React.FC = () => {
  const [acciones, setAcciones] = useState<AccionEjecutada[]>([]);
  
  const estados = [
    { label: 'Pendiente', value: 'Pendiente' },
    { label: 'En Progreso', value: 'En Progreso' },
    { label: 'Completada', value: 'Completada' },
    { label: 'Cancelada', value: 'Cancelada' },
  ];

  const prioridades = [
    { label: 'Baja', value: 'Baja' },
    { label: 'Media', value: 'Media' },
    { label: 'Alta', value: 'Alta' },
    { label: 'Crítica', value: 'Crítica' },
  ];

  const handleSave = (accion: Partial<AccionEjecutada>) => {
    if (accion.id) {
      // Update existing
      setAcciones(acciones.map(a => a.id === accion.id ? accion as AccionEjecutada : a));
    } else {
      // Create new
      const newId = Math.max(...acciones.map(a => a.id), 0) + 1;
      setAcciones([...acciones, {
        ...accion as AccionEjecutada,
        id: newId,
        codigo: `ACC-${new Date().getFullYear()}-${String(newId).padStart(4, '0')}`
      }]);
    }
  };

  const handleDelete = (accion: AccionEjecutada) => {
    setAcciones(acciones.filter(a => a.id !== accion.id));
  };

  const renderForm = (accion: Partial<AccionEjecutada>, onChange: (e: any) => void) => {
    const onDateChange = (date: string | Date | Date[] | null, field: string) => {
      if (!date || Array.isArray(date)) return;

      let parsed: Date | null = null;
      if (typeof date === 'string') {
        // Try to parse strings in formats like dd/mm/yy or dd/mm/yyyy
        const match = date.match(/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/);
        if (match) {
          const dd = parseInt(match[1], 10);
          const mm = parseInt(match[2], 10) - 1; // JS months are 0-based
          let yyyy = parseInt(match[3], 10);
          if (match[3].length === 2) {
            // Interpret 2-digit year as 20xx
            yyyy = 2000 + yyyy;
          }
          const d = new Date(yyyy, mm, dd);
          // Validate date components to avoid invalid dates like 31/02/2025
          if (d.getFullYear() === yyyy && d.getMonth() === mm && d.getDate() === dd) {
            parsed = d;
          }
        }
        // Fallback: try native Date parsing (may be locale-dependent)
        if (!parsed) {
          const d = new Date(date);
          if (!isNaN(d.getTime())) parsed = d;
        }
      } else {
        parsed = date;
      }

      if (parsed) {
        onChange({ target: { name: field, value: parsed } });
      }
    };

    const onDropdownChange = (e: { value: any }, field: string) => {
      onChange({ target: { name: field, value: e.value } });
    };

    return (
      <div className="grid p-fluid">
        <div className="field col-12">
          <label htmlFor="descripcion">Descripción</label>
          <InputTextarea 
            id="descripcion" 
            name="descripcion"
            value={accion.descripcion || ''} 
            onChange={onChange} 
            rows={3}
            autoResize
            required 
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="fechaInicio">Fecha de Inicio</label>
          <Calendar 
            id="fechaInicio" 
            name="fechaInicio"
            value={accion.fechaInicio || new Date()} 
            onChange={(e) => onDateChange(e.value, 'fechaInicio')} 
            showIcon 
            dateFormat="dd/mm/yy" 
            required 
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="fechaFin">Fecha de Fin</label>
          <Calendar 
            id="fechaFin" 
            name="fechaFin"
            value={accion.fechaFin || null} 
            onChange={(e) => onDateChange(e.value, 'fechaFin')} 
            showIcon 
            dateFormat="dd/mm/yy" 
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="responsable">Responsable</label>
          <InputText 
            id="responsable" 
            name="responsable"
            value={accion.responsable || ''} 
            onChange={onChange} 
            required 
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="estado">Estado</label>
          <Dropdown 
            id="estado" 
            name="estado"
            value={accion.estado} 
            options={estados} 
            onChange={(e) => onDropdownChange(e, 'estado')} 
            placeholder="Seleccione estado" 
            className="w-full" 
            required
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="prioridad">Prioridad</label>
          <Dropdown 
            id="prioridad" 
            name="prioridad"
            value={accion.prioridad} 
            options={prioridades} 
            onChange={(e) => onDropdownChange(e, 'prioridad')} 
            placeholder="Seleccione prioridad" 
            className="w-full" 
            required
          />
        </div>
        
        <div className="field col-12">
          <label htmlFor="observaciones">Observaciones</label>
          <InputTextarea 
            id="observaciones" 
            name="observaciones"
            value={accion.observaciones || ''} 
            onChange={onChange} 
            rows={2}
            autoResize
          />
        </div>
      </div>
    );
  };

  const estadoBodyTemplate = (rowData: AccionEjecutada) => {
    const getSeverity = (estado: string) => {
      switch (estado) {
        case 'Completada':
          return 'success';
        case 'En Progreso':
          return 'info';
        case 'Pendiente':
          return 'warning';
        case 'Cancelada':
          return 'danger';
        default:
          return null;
      }
    };

    return <span className={`p-tag p-tag-${getSeverity(rowData.estado)}`}>{rowData.estado}</span>;
  };

  const prioridadBodyTemplate = (rowData: AccionEjecutada) => {
    const getSeverity = (prioridad: string) => {
      switch (prioridad) {
        case 'Baja':
          return 'success';
        case 'Media':
          return 'info';
        case 'Alta':
          return 'warning';
        case 'Crítica':
          return 'danger';
        default:
          return null;
      }
    };

    return <span className={`p-tag p-tag-${getSeverity(rowData.prioridad)}`}>{rowData.prioridad}</span>;
  };

  const columns = [
    { field: 'codigo', header: 'Código', sortable: true },
    { field: 'descripcion', header: 'Descripción', sortable: true },
    { field: 'responsable', header: 'Responsable', sortable: true },
    { 
      field: 'fechaInicio', 
      header: 'Fecha Inicio', 
      sortable: true,
      body: (rowData: AccionEjecutada) => rowData.fechaInicio?.toLocaleDateString() 
    },
    { 
      field: 'fechaFin', 
      header: 'Fecha Fin', 
      sortable: true,
      body: (rowData: AccionEjecutada) => rowData.fechaFin?.toLocaleDateString() || '-' 
    },
    { 
      field: 'estado', 
      header: 'Estado', 
      sortable: true,
      body: estadoBodyTemplate 
    },
    { 
      field: 'prioridad', 
      header: 'Prioridad', 
      sortable: true,
      body: prioridadBodyTemplate 
    },
  ];

  return (
    <Card title="Acciones Ejecutadas">
      <BaseCRUD<AccionEjecutada>
        title="Acción Ejecutada"
        items={acciones}
        columns={columns}
        renderForm={renderForm}
        onSave={handleSave}
        onDelete={handleDelete}
        initialItem={{
          id: 0,
          codigo: '',
          descripcion: '',
          fechaInicio: new Date(),
          fechaFin: null,
          responsable: '',
          estado: 'Pendiente',
          prioridad: 'Media',
          observaciones: ''
        }}
      />
    </Card>
  );
};
