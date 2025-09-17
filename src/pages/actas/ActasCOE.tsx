import React, { useState } from 'react';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { InputTextarea } from 'primereact/inputtextarea';
import { FileUpload, FileUploadUploadEvent } from 'primereact/fileupload';
import { Button } from 'primereact/button';
import { BaseCRUD } from '../../components/crud/BaseCRUD';

interface ActaCOE {
  id: number;
  codigo: string;
  fechaReunion: Date;
  horaInicio: string;
  horaFin: string;
  lugar: string;
  tema: string;
  objetivo: string;
  acuerdos: string;
  responsables: string;
  fechaSeguimiento: Date | null;
  estado: string;
  archivoAdjunto: string | null;
  participantes: string;
  convocante: string;
  tipoReunion: string;
}

export const ActasCOE: React.FC = () => {
  const [actas, setActas] = useState<ActaCOE[]>([]);
  const [archivoSubido, setArchivoSubido] = useState<File | null>(null);
  
  const tiposReunion = [
    { label: 'Ordinaria', value: 'Ordinaria' },
    { label: 'Extraordinaria', value: 'Extraordinaria' },
    { label: 'De Emergencia', value: 'Emergencia' },
    { label: 'Seguimiento', value: 'Seguimiento' },
  ];

  const estados = [
    { label: 'Programada', value: 'Programada' },
    { label: 'En Curso', value: 'En Curso' },
    { label: 'Finalizada', value: 'Finalizada' },
    { label: 'Cancelada', value: 'Cancelada' },
  ];

  const handleSave = (acta: Partial<ActaCOE>) => {
    if (acta.id) {
      setActas(actas.map(a => a.id === acta.id ? acta as ActaCOE : a));
    } else {
      const newId = Math.max(...actas.map(a => a.id), 0) + 1;
      setActas([...actas, {
        ...acta as ActaCOE,
        id: newId,
        codigo: `ACTA-${new Date().getFullYear()}-${String(newId).padStart(4, '0')}`,
        archivoAdjunto: archivoSubido ? archivoSubido.name : null
      }]);
      setArchivoSubido(null);
    }
  };

  const handleDelete = (acta: ActaCOE) => {
    setActas(actas.filter(a => a.id !== acta.id));
  };

  const handleFileUpload = (event: FileUploadUploadEvent) => {
    if (event.files && event.files.length > 0) {
      setArchivoSubido(event.files[0]);
    }
  };

  const renderForm = (acta: Partial<ActaCOE>, onChange: (e: any) => void) => {
    const onDateChange = (date: string | Date | Date[] | null, field: string) => {
      if (date && !Array.isArray(date)) {
        const value = typeof date === 'string' ? new Date(date) : date;
        onChange({ target: { name: field, value } });
      }
    };

    const onDropdownChange = (e: { value: any }, field: string) => {
      onChange({ target: { name: field, value: e.value } });
    };

    return (
      <div className="grid p-fluid">
        <div className="field col-12 md:col-6">
          <label htmlFor="tipoReunion">Tipo de Reunión</label>
          <select 
            id="tipoReunion" 
            name="tipoReunion"
            value={acta.tipoReunion || ''} 
            onChange={onChange} 
            className="p-dropdown p-component p-inputtext p-inputtext-sm w-full"
            required
          >
            <option value="">Seleccione tipo</option>
            {tiposReunion.map(tipo => (
              <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
            ))}
          </select>
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="fechaReunion">Fecha de Reunión</label>
          <Calendar 
            id="fechaReunion" 
            name="fechaReunion"
            value={acta.fechaReunion || new Date()} 
            onChange={(e) => onDateChange(e.value, 'fechaReunion')} 
            showIcon 
            dateFormat="dd/mm/yy" 
            className="w-full"
            required 
          />
        </div>
        
        <div className="field col-12 md:col-3">
          <label htmlFor="horaInicio">Hora de Inicio</label>
          <input 
            type="time" 
            id="horaInicio" 
            name="horaInicio"
            value={acta.horaInicio || ''} 
            onChange={onChange} 
            className="p-inputtext p-component w-full"
            required 
          />
        </div>
        
        <div className="field col-12 md:col-3">
          <label htmlFor="horaFin">Hora de Finalización</label>
          <input 
            type="time" 
            id="horaFin" 
            name="horaFin"
            value={acta.horaFin || ''} 
            onChange={onChange} 
            className="p-inputtext p-component w-full"
            required 
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="lugar">Lugar de Reunión</label>
          <InputText 
            id="lugar" 
            name="lugar"
            value={acta.lugar || ''} 
            onChange={onChange} 
            required 
          />
        </div>
        
        <div className="field col-12">
          <label htmlFor="tema">Tema de la Reunión</label>
          <InputText 
            id="tema" 
            name="tema"
            value={acta.tema || ''} 
            onChange={onChange} 
            required 
          />
        </div>
        
        <div className="field col-12">
          <label htmlFor="objetivo">Objetivo de la Reunión</label>
          <InputTextarea 
            id="objetivo" 
            name="objetivo"
            value={acta.objetivo || ''} 
            onChange={onChange} 
            rows={2}
            autoResize
            required
          />
        </div>
        
        <div className="field col-12">
          <label htmlFor="participantes">Participantes (separados por comas)</label>
          <InputTextarea 
            id="participantes" 
            name="participantes"
            value={acta.participantes || ''} 
            onChange={onChange} 
            rows={2}
            autoResize
            required
          />
        </div>
        
        <div className="field col-12">
          <label htmlFor="convocante">Convocante</label>
          <InputText 
            id="convocante" 
            name="convocante"
            value={acta.convocante || ''} 
            onChange={onChange} 
            required 
          />
        </div>
        
        <div className="field col-12">
          <label htmlFor="acuerdos">Acuerdos y Decisiones</label>
          <InputTextarea 
            id="acuerdos" 
            name="acuerdos"
            value={acta.acuerdos || ''} 
            onChange={onChange} 
            rows={4}
            autoResize
            required
          />
        </div>
        
        <div className="field col-12">
          <label htmlFor="responsables">Responsables y Plazos</label>
          <InputTextarea 
            id="responsables" 
            name="responsables"
            value={acta.responsables || ''} 
            onChange={onChange} 
            rows={3}
            autoResize
            required
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="fechaSeguimiento">Fecha de Seguimiento</label>
          <Calendar 
            id="fechaSeguimiento" 
            name="fechaSeguimiento"
            value={acta.fechaSeguimiento || null} 
            onChange={(e) => onDateChange(e.value, 'fechaSeguimiento')} 
            showIcon 
            dateFormat="dd/mm/yy" 
            className="w-full"
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="estado">Estado</label>
          <select 
            id="estado" 
            name="estado"
            value={acta.estado || ''} 
            onChange={onChange} 
            className="p-dropdown p-component p-inputtext p-inputtext-sm w-full"
            required
          >
            <option value="">Seleccione estado</option>
            {estados.map(estado => (
              <option key={estado.value} value={estado.value}>{estado.label}</option>
            ))}
          </select>
        </div>
        
        <div className="field col-12">
          <label>Acta en Formato Digital</label>
          <FileUpload 
            mode="basic" 
            name="archivoActa" 
            url="/api/upload" 
            accept=".pdf,.doc,.docx" 
            maxFileSize={1000000} 
            onUpload={handleFileUpload} 
            chooseLabel={archivoSubido ? archivoSubido.name : 'Seleccionar Archivo'}
            className="w-full"
          />
          <small className="p-error">Formatos aceptados: PDF, DOC, DOCX (Máx. 1MB)</small>
        </div>
      </div>
    );
  };

  const estadoBodyTemplate = (rowData: ActaCOE) => {
    const getSeverity = (estado: string) => {
      switch (estado) {
        case 'Finalizada':
          return 'success';
        case 'En Curso':
          return 'info';
        case 'Programada':
          return 'warning';
        case 'Cancelada':
          return 'danger';
        default:
          return null;
      }
    };

    return <span className={`p-tag p-tag-${getSeverity(rowData.estado)}`}>{rowData.estado}</span>;
  };

  const fechaTemplate = (rowData: ActaCOE, field: string) => {
    const date = rowData[field as keyof ActaCOE];
    if (!date) return '-';
    
    if (field === 'horaInicio' || field === 'horaFin') {
      return date as string;
    }
    
    const d = date instanceof Date ? date : new Date(date as string);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
  };

  const archivoTemplate = (rowData: ActaCOE) => {
    if (!rowData.archivoAdjunto) return <span className="text-500">Sin archivo</span>;
    
    return (
      <Button 
        icon="pi pi-download" 
        className="p-button-text p-button-sm" 
        tooltip="Descargar archivo"
        tooltipOptions={{ position: 'top' }}
      />
    );
  };

  const columns = [
    { field: 'codigo', header: 'Código', sortable: true },
    { field: 'tipoReunion', header: 'Tipo', sortable: true },
    { 
      field: 'fechaReunion', 
      header: 'Fecha', 
      sortable: true,
      body: (rowData: ActaCOE) => fechaTemplate(rowData, 'fechaReunion')
    },
    { 
      field: 'horaInicio', 
      header: 'Hora Inicio', 
      sortable: true,
      body: (rowData: ActaCOE) => fechaTemplate(rowData, 'horaInicio')
    },
    { 
      field: 'horaFin', 
      header: 'Hora Fin', 
      sortable: true,
      body: (rowData: ActaCOE) => fechaTemplate(rowData, 'horaFin')
    },
    { field: 'lugar', header: 'Lugar', sortable: true },
    { field: 'tema', header: 'Tema', sortable: true },
    { 
      field: 'estado', 
      header: 'Estado', 
      sortable: true,
      body: estadoBodyTemplate 
    },
    { 
      field: 'archivoAdjunto', 
      header: 'Archivo', 
      sortable: false,
      body: archivoTemplate,
      style: { width: '100px', textAlign: 'center' }
    },
  ];

  return (
    <Card title="Actas de Reuniones COE">
      <BaseCRUD<ActaCOE>
        title="Acta de Reunión COE"
        items={actas}
        columns={columns}
        renderForm={renderForm}
        onSave={handleSave}
        onDelete={handleDelete}
        initialItem={{
          id: 0,
          codigo: '',
          fechaReunion: new Date(),
          horaInicio: '',
          horaFin: '',
          lugar: '',
          tema: '',
          objetivo: '',
          acuerdos: '',
          responsables: '',
          fechaSeguimiento: null,
          estado: 'Programada',
          archivoAdjunto: null,
          participantes: '',
          convocante: '',
          tipoReunion: 'Ordinaria'
        }}
      />
    </Card>
  );
};
