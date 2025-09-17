import React, { useState } from 'react';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { BaseCRUD } from '../../components/crud/BaseCRUD';
import { Button } from 'primereact/button';
import type { CalendarChangeEvent } from 'primereact/calendar';

interface Brecha {
  id: number;
  codigo: string;
  fechaIdentificacion: Date;
  tipoBrecha: string;
  descripcion: string;
  impacto: string;
  urgencia: string;
  prioridad: string;
  estado: string;
  responsableSeguimiento: string;
  fechaEstimadaSolucion: Date | null;
  solucionPropuesta: string;
  recursosNecesarios: string;
  observaciones: string;
}

export const Brechas: React.FC = () => {
  const [brechas, setBrechas] = useState<Brecha[]>([]);
  
  const tiposBrecha = [
    { label: 'Recursos Humanos', value: 'Recursos Humanos' },
    { label: 'Equipamiento', value: 'Equipamiento' },
    { label: 'Infraestructura', value: 'Infraestructura' },
    { label: 'Capacitación', value: 'Capacitación' },
    { label: 'Procedimientos', value: 'Procedimientos' },
    { label: 'Tecnología', value: 'Tecnología' },
    { label: 'Financiamiento', value: 'Financiamiento' },
    { label: 'Otro', value: 'Otro' },
  ];

  const niveles = [
    { label: 'Bajo', value: 'Bajo' },
    { label: 'Medio', value: 'Medio' },
    { label: 'Alto', value: 'Alto' },
    { label: 'Crítico', value: 'Crítico' },
  ];

  const estados = [
    { label: 'Identificada', value: 'Identificada' },
    { label: 'En Análisis', value: 'En Análisis' },
    { label: 'En Proceso de Solución', value: 'En Proceso de Solución' },
    { label: 'Solucionada', value: 'Solucionada' },
    { label: 'Cerrada', value: 'Cerrada' },
  ];

  const handleSave = (brecha: Partial<Brecha>) => {
    if (brecha.id) {
      setBrechas(brechas.map(b => b.id === brecha.id ? brecha as Brecha : b));
    } else {
      const newId = Math.max(...brechas.map(b => b.id), 0) + 1;
      setBrechas([...brechas, {
        ...brecha as Brecha,
        id: newId,
        codigo: `BR-${new Date().getFullYear()}-${String(newId).padStart(4, '0')}`,
        fechaIdentificacion: new Date()
      }]);
    }
  };

  const handleDelete = (brecha: Brecha) => {
    setBrechas(brechas.filter(b => b.id !== brecha.id));
  };

  const renderForm = (brecha: Partial<Brecha>, onChange: (e: any) => void) => {
    const onDateChange = (
      value: Date | Date[] | string | null,
      field: string
    ) => {
      // Only propagate when we have actual Date objects (ignore intermediate string input)
      if (value instanceof Date) {
        onChange({ target: { name: field, value: value } });
        return;
      }
      if (Array.isArray(value) && value.every((v) => v instanceof Date)) {
        onChange({ target: { name: field, value: value } });
        return;
      }
      if (value === null) {
        onChange({ target: { name: field, value: null } });
      }
      // If value is a string (user typing), do nothing to avoid storing an invalid type
    };

    const onDropdownChange = (e: { value: any }, field: string) => {
      onChange({ target: { name: field, value: e.value } });
    };

    return (
      <div className="grid p-fluid">
        <div className="field col-12 md:col-6">
          <label htmlFor="tipoBrecha">Tipo de Brecha</label>
          <Dropdown 
            id="tipoBrecha" 
            name="tipoBrecha"
            value={brecha.tipoBrecha} 
            options={tiposBrecha} 
            onChange={(e) => onDropdownChange(e, 'tipoBrecha')} 
            placeholder="Seleccione tipo de brecha" 
            className="w-full" 
            required
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="fechaIdentificacion">Fecha de Identificación</label>
          <Calendar 
            id="fechaIdentificacion" 
            name="fechaIdentificacion"
            value={brecha.fechaIdentificacion || new Date()} 
            onChange={(e) => onDateChange(e.value, 'fechaIdentificacion')} 
            showIcon 
            dateFormat="dd/mm/yy" 
            className="w-full"
            required 
          />
        </div>
        
        <div className="field col-12">
          <label htmlFor="descripcion">Descripción de la Brecha</label>
          <InputTextarea 
            id="descripcion" 
            name="descripcion"
            value={brecha.descripcion || ''} 
            onChange={onChange} 
            rows={3}
            autoResize
            required
          />
        </div>
        
        <div className="field col-12 md:col-4">
          <label htmlFor="impacto">Impacto</label>
          <Dropdown 
            id="impacto" 
            name="impacto"
            value={brecha.impacto} 
            options={niveles} 
            onChange={(e) => onDropdownChange(e, 'impacto')} 
            placeholder="Seleccione impacto" 
            className="w-full" 
            required
          />
        </div>
        
        <div className="field col-12 md:col-4">
          <label htmlFor="urgencia">Urgencia</label>
          <Dropdown 
            id="urgencia" 
            name="urgencia"
            value={brecha.urgencia} 
            options={niveles} 
            onChange={(e) => onDropdownChange(e, 'urgencia')} 
            placeholder="Seleccione urgencia" 
            className="w-full" 
            required
          />
        </div>
        
        <div className="field col-12 md:col-4">
          <label htmlFor="prioridad">Prioridad</label>
          <Dropdown 
            id="prioridad" 
            name="prioridad"
            value={brecha.prioridad} 
            options={niveles} 
            onChange={(e) => onDropdownChange(e, 'prioridad')} 
            placeholder="Seleccione prioridad" 
            className="w-full" 
            required
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="estado">Estado</label>
          <Dropdown 
            id="estado" 
            name="estado"
            value={brecha.estado} 
            options={estados} 
            onChange={(e) => onDropdownChange(e, 'estado')} 
            placeholder="Seleccione estado" 
            className="w-full" 
            required
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="responsableSeguimiento">Responsable de Seguimiento</label>
          <InputText 
            id="responsableSeguimiento" 
            name="responsableSeguimiento"
            value={brecha.responsableSeguimiento || ''} 
            onChange={onChange} 
            required 
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="fechaEstimadaSolucion">Fecha Estimada de Solución</label>
          <Calendar 
            id="fechaEstimadaSolucion" 
            name="fechaEstimadaSolucion"
            value={brecha.fechaEstimadaSolucion || null} 
            onChange={(e) => onDateChange(e.value, 'fechaEstimadaSolucion')} 
            showIcon 
            dateFormat="dd/mm/yy" 
            className="w-full"
          />
        </div>
        
        <div className="field col-12">
          <label htmlFor="solucionPropuesta">Solución Propuesta</label>
          <InputTextarea 
            id="solucionPropuesta" 
            name="solucionPropuesta"
            value={brecha.solucionPropuesta || ''} 
            onChange={onChange} 
            rows={2}
            autoResize
          />
        </div>
        
        <div className="field col-12">
          <label htmlFor="recursosNecesarios">Recursos Necesarios</label>
          <InputTextarea 
            id="recursosNecesarios" 
            name="recursosNecesarios"
            value={brecha.recursosNecesarios || ''} 
            onChange={onChange} 
            rows={2}
            autoResize
          />
        </div>
        
        <div className="field col-12">
          <label htmlFor="observaciones">Observaciones</label>
          <InputTextarea 
            id="observaciones" 
            name="observaciones"
            value={brecha.observaciones || ''} 
            onChange={onChange} 
            rows={2}
            autoResize
          />
        </div>
      </div>
    );
  };

  const prioridadBodyTemplate = (rowData: Brecha) => {
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

    return <span className={`p-tag p-tag-${getSeverity(rowData.prioridad)}`}>{rowData.prioridad}</span>;
  };

  const estadoBodyTemplate = (rowData: Brecha) => {
    const getSeverity = (estado: string) => {
      switch (estado) {
        case 'Solucionada':
          return 'success';
        case 'En Proceso de Solución':
          return 'info';
        case 'En Análisis':
          return 'warning';
        case 'Identificada':
          return 'danger';
        case 'Cerrada':
          return 'secondary';
        default:
          return null;
      }
    };

    return <span className={`p-tag p-tag-${getSeverity(rowData.estado)}`}>{rowData.estado}</span>;
  };

  const fechaTemplate = (rowData: Brecha, field: string) => {
    const date = rowData[field as keyof Brecha] as Date | null;
    return date ? new Date(date).toLocaleDateString() : '-';
  };

  const columns = [
    { field: 'codigo', header: 'Código', sortable: true },
    { field: 'tipoBrecha', header: 'Tipo', sortable: true },
    { 
      field: 'fechaIdentificacion', 
      header: 'Fecha Identificación', 
      sortable: true,
      body: (rowData: Brecha) => fechaTemplate(rowData, 'fechaIdentificacion')
    },
    { 
      field: 'prioridad', 
      header: 'Prioridad', 
      sortable: true,
      body: prioridadBodyTemplate 
    },
    { 
      field: 'estado', 
      header: 'Estado', 
      sortable: true,
      body: estadoBodyTemplate 
    },
    { field: 'responsableSeguimiento', header: 'Responsable', sortable: true },
    { 
      field: 'fechaEstimadaSolucion', 
      header: 'Fecha Estimada Solución', 
      sortable: true,
      body: (rowData: Brecha) => fechaTemplate(rowData, 'fechaEstimadaSolucion')
    },
  ];

  return (
    <Card title="Gestión de Brechas">
      <BaseCRUD<Brecha>
        title="Brecha"
        items={brechas}
        columns={columns}
        renderForm={renderForm}
        onSave={handleSave}
        onDelete={handleDelete}
        initialItem={{
          id: 0,
          codigo: '',
          fechaIdentificacion: new Date(),
          tipoBrecha: '',
          descripcion: '',
          impacto: '',
          urgencia: '',
          prioridad: '',
          estado: 'Identificada',
          responsableSeguimiento: '',
          fechaEstimadaSolucion: null,
          solucionPropuesta: '',
          recursosNecesarios: '',
          observaciones: ''
        }}
      />
    </Card>
  );
};
