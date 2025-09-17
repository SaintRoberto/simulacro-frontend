import React, { useState } from 'react';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { InputTextarea } from 'primereact/inputtextarea';
import { MultiSelect } from 'primereact/multiselect';
import { BaseCRUD } from '../../components/crud/BaseCRUD';
import { Tag } from 'primereact/tag';

interface COEActivado {
  id: number;
  codigo: string;
  fechaActivacion: Date;
  horaActivacion: string;
  motivoActivacion: string;
  nivelAlerta: string;
  ubicacion: string;
  coordenadas: string;
  descripcionSituacion: string;
  impactoPotencial: string;
  recursosMovilizados: string[];
  responsables: string[];
  estado: string;
  fechaDesactivacion: Date | null;
  motivoDesactivacion: string;
  leccionesAprendidas: string;
  recomendaciones: string;
}

const nivelesAlerta = [
  { label: 'Nivel 1 - Alerta Temprana', value: 'Nivel 1' },
  { label: 'Nivel 2 - Alerta', value: 'Nivel 2' },
  { label: 'Nivel 3 - Alerta Máxima', value: 'Nivel 3' },
];

const estadosCOE = [
  { label: 'En Evaluación', value: 'En Evaluación' },
  { label: 'Activado', value: 'Activado' },
  { label: 'En Curso', value: 'En Curso' },
  { label: 'En Transición', value: 'En Transición' },
  { label: 'Desactivado', value: 'Desactivado' },
  { label: 'Cancelado', value: 'Cancelado' },
];

const recursosDisponibles = [
  'Equipos de Respuesta Inmediata (ERI)',
  'Unidades de Búsqueda y Rescate (USAR)',
  'Equipos Médicos',
  'Equipos de Logística',
  'Equipos de Comunicaciones',
  'Unidades de Transporte',
  'Equipos de Evaluación de Daños',
  'Equipos de Albergue',
  'Equipos de Agua y Saneamiento',
  'Equipos de Seguridad',
];

const rolesResponsables = [
  'Coordinador General',
  'Coordinador Operativo',
  'Coordinador Logístico',
  'Coordinador de Comunicaciones',
  'Coordinador de Salud',
  'Coordinador de Seguridad',
  'Coordinador de Albergues',
  'Coordinador de Evaluación de Daños',
  'Coordinador de Agua y Saneamiento',
  'Coordinador de Búsqueda y Rescate',
];

export const CoesActivados: React.FC = () => {
  const [coes, setCoes] = useState<COEActivado[]>([]);
  
  const handleSave = (coe: Partial<COEActivado>) => {
    if (coe.id) {
      setCoes(coes.map(c => c.id === coe.id ? coe as COEActivado : c));
    } else {
      const newId = Math.max(...coes.map(c => c.id), 0) + 1;
      setCoes([...coes, {
        ...coe as COEActivado,
        id: newId,
        codigo: `COE-${new Date().getFullYear()}-${String(newId).padStart(4, '0')}`,
        fechaActivacion: new Date(),
        recursosMovilizados: [],
        responsables: []
      }]);
    }
  };

  const handleDelete = (coe: COEActivado) => {
    setCoes(coes.filter(c => c.id !== coe.id));
  };

  const renderForm = (coe: Partial<COEActivado>, onChange: (e: any) => void) => {
    const onDateChange = (date: string | Date | Date[] | null, field: string) => {
      if (!date) return;
      let value: Date | Date[] | null = null;
      if (Array.isArray(date)) {
        value = date as Date[];
      } else if (typeof date === 'string') {
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) {
          value = parsed;
        } else {
          return; // ignore invalid date strings
        }
      } else {
        value = date;
      }
      onChange({ target: { name: field, value } });
    };

    const onDropdownChange = (e: { value: any }, field: string) => {
      onChange({ target: { name: field, value: e.value } });
    };

    const onMultiSelectChange = (e: { value: any[] }, field: string) => {
      onChange({ target: { name: field, value: e.value } });
    };

    const onTimeChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
      onChange({ target: { name: field, value: e.target.value } });
    };

    return (
      <div className="grid p-fluid">
        <div className="field col-12">
          <h4>Información Básica</h4>
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="nivelAlerta">Nivel de Alerta</label>
          <Dropdown 
            id="nivelAlerta" 
            name="nivelAlerta"
            value={coe.nivelAlerta} 
            options={nivelesAlerta} 
            onChange={(e) => onDropdownChange(e, 'nivelAlerta')} 
            placeholder="Seleccione nivel de alerta" 
            className="w-full" 
            required
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="fechaActivacion">Fecha de Activación</label>
          <Calendar 
            id="fechaActivacion" 
            name="fechaActivacion"
            value={coe.fechaActivacion || new Date()} 
            onChange={(e) => onDateChange(e.value, 'fechaActivacion')} 
            showIcon 
            dateFormat="dd/mm/yy" 
            className="w-full"
            required 
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="horaActivacion">Hora de Activación</label>
          <input 
            type="time" 
            id="horaActivacion" 
            name="horaActivacion"
            value={coe.horaActivacion || ''} 
            onChange={(e) => onTimeChange(e, 'horaActivacion')} 
            className="p-inputtext p-component w-full"
            required 
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="ubicacion">Ubicación del COE</label>
          <InputText 
            id="ubicacion" 
            name="ubicacion"
            value={coe.ubicacion || ''} 
            onChange={onChange} 
            placeholder="Ej: Edificio Principal, Piso 3"
            required 
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="coordenadas">Coordenadas (opcional)</label>
          <InputText 
            id="coordenadas" 
            name="coordenadas"
            value={coe.coordenadas || ''} 
            onChange={onChange} 
            placeholder="Ej: -12.123456, -77.123456"
          />
        </div>
        
        <div className="field col-12">
          <label htmlFor="motivoActivacion">Motivo de la Activación</label>
          <InputText 
            id="motivoActivacion" 
            name="motivoActivacion"
            value={coe.motivoActivacion || ''} 
            onChange={onChange} 
            required 
          />
        </div>
        
        <div className="field col-12">
          <label htmlFor="descripcionSituacion">Descripción de la Situación</label>
          <InputTextarea 
            id="descripcionSituacion" 
            name="descripcionSituacion"
            value={coe.descripcionSituacion || ''} 
            onChange={onChange} 
            rows={3}
            autoResize
            required
          />
        </div>
        
        <div className="field col-12">
          <label htmlFor="impactoPotencial">Impacto Potencial</label>
          <InputTextarea 
            id="impactoPotencial" 
            name="impactoPotencial"
            value={coe.impactoPotencial || ''} 
            onChange={onChange} 
            rows={2}
            autoResize
            required
          />
        </div>
        
        <div className="field col-12">
          <h4>Recursos Movilizados</h4>
          <MultiSelect 
            value={coe.recursosMovilizados || []} 
            options={recursosDisponibles}
            onChange={(e) => onMultiSelectChange(e, 'recursosMovilizados')}
            placeholder="Seleccione recursos"
            display="chip"
            className="w-full"
            filter
          />
        </div>
        
        <div className="field col-12">
          <h4>Equipo de Respuesta</h4>
          <MultiSelect 
            value={coe.responsables || []} 
            options={rolesResponsables}
            onChange={(e) => onMultiSelectChange(e, 'responsables')}
            placeholder="Seleccione responsables"
            display="chip"
            className="w-full"
            filter
          />
        </div>
        
        <div className="field col-12">
          <h4>Información de Cierre</h4>
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="estado">Estado Actual</label>
          <Dropdown 
            id="estado" 
            name="estado"
            value={coe.estado} 
            options={estadosCOE} 
            onChange={(e) => onDropdownChange(e, 'estado')} 
            placeholder="Seleccione estado" 
            className="w-full" 
            required
          />
        </div>
        
        {(coe.estado === 'Desactivado' || coe.estado === 'Cancelado') && (
          <>
            <div className="field col-12 md:col-6">
              <label htmlFor="fechaDesactivacion">Fecha de {coe.estado === 'Desactivado' ? 'Desactivación' : 'Cancelación'}</label>
              <Calendar 
                id="fechaDesactivacion" 
                name="fechaDesactivacion"
                value={coe.fechaDesactivacion || new Date()} 
                onChange={(e) => onDateChange(e.value, 'fechaDesactivacion')} 
                showIcon 
                dateFormat="dd/mm/yy" 
                className="w-full"
                required={coe.estado === 'Desactivado' || coe.estado === 'Cancelado'}
              />
            </div>
            
            <div className="field col-12">
              <label htmlFor="motivoDesactivacion">Motivo de {coe.estado === 'Desactivado' ? 'Desactivación' : 'Cancelación'}</label>
              <InputTextarea 
                id="motivoDesactivacion" 
                name="motivoDesactivacion"
                value={coe.motivoDesactivacion || ''} 
                onChange={onChange} 
                rows={2}
                autoResize
                required={coe.estado === 'Desactivado' || coe.estado === 'Cancelado'}
              />
            </div>
            
            {coe.estado === 'Desactivado' && (
              <>
                <div className="field col-12">
                  <label htmlFor="leccionesAprendidas">Lecciones Aprendidas</label>
                  <InputTextarea 
                    id="leccionesAprendidas" 
                    name="leccionesAprendidas"
                    value={coe.leccionesAprendidas || ''} 
                    onChange={onChange} 
                    rows={3}
                    autoResize
                  />
                </div>
                
                <div className="field col-12">
                  <label htmlFor="recomendaciones">Recomendaciones</label>
                  <InputTextarea 
                    id="recomendaciones" 
                    name="recomendaciones"
                    value={coe.recomendaciones || ''} 
                    onChange={onChange} 
                    rows={3}
                    autoResize
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>
    );
  };

  const nivelAlertaTemplate = (rowData: COEActivado) => {
    const getSeverity = (nivel: string) => {
      switch (nivel) {
        case 'Nivel 1':
          return 'info';
        case 'Nivel 2':
          return 'warning';
        case 'Nivel 3':
          return 'danger';
        default:
          return null;
      }
    };

    return <Tag value={rowData.nivelAlerta} severity={getSeverity(rowData.nivelAlerta)} />;
  };

  const estadoTemplate = (rowData: COEActivado) => {
    const getSeverity = (estado: string) => {
      switch (estado) {
        case 'Activado':
        case 'En Curso':
          return 'danger';
        case 'En Evaluación':
          return 'warning';
        case 'En Transición':
          return 'info';
        case 'Desactivado':
          return 'success';
        case 'Cancelado':
          return 'danger';
        default:
          return null;
      }
    };

    return <Tag value={rowData.estado} severity={getSeverity(rowData.estado)} />;
  };

  const fechaTemplate = (rowData: COEActivado, field: string) => {
    const date = rowData[field as keyof COEActivado];
    return date ? new Date(date as string).toLocaleDateString() : '-';
  };

  const recursosTemplate = (rowData: COEActivado) => {
    if (!rowData.recursosMovilizados || rowData.recursosMovilizados.length === 0) {
      return <span className="text-500">Sin recursos</span>;
    }
    
    return (
      <div>
        <Tag 
          value={rowData.recursosMovilizados.length} 
          icon="pi pi-box" 
          className="mr-2"
        />
      </div>
    );
  };

  const responsablesTemplate = (rowData: COEActivado) => {
    if (!rowData.responsables || rowData.responsables.length === 0) {
      return <span className="text-500">Sin asignar</span>;
    }
    
    return (
      <div>
        <Tag 
          value={rowData.responsables.length} 
          icon="pi pi-users" 
          className="mr-2"
        />
      </div>
    );
  };

  const columns = [
    { field: 'codigo', header: 'Código COE', sortable: true },
    { 
      field: 'nivelAlerta', 
      header: 'Nivel', 
      sortable: true,
      body: nivelAlertaTemplate 
    },
    { 
      field: 'fechaActivacion', 
      header: 'Fecha Activación', 
      sortable: true,
      body: (rowData: COEActivado) => fechaTemplate(rowData, 'fechaActivacion')
    },
    { field: 'ubicacion', header: 'Ubicación', sortable: true },
    { 
      field: 'recursosMovilizados', 
      header: 'Recursos', 
      sortable: false,
      body: recursosTemplate,
      style: { width: '100px' }
    },
    { 
      field: 'responsables', 
      header: 'Equipo', 
      sortable: false,
      body: responsablesTemplate,
      style: { width: '100px' }
    },
    { 
      field: 'estado', 
      header: 'Estado', 
      sortable: true,
      body: estadoTemplate 
    },
    { 
      field: 'fechaDesactivacion', 
      header: 'Fecha Cierre', 
      sortable: true,
      body: (rowData: COEActivado) => fechaTemplate(rowData, 'fechaDesactivacion')
    },
  ];

  return (
    <Card title="COEs Activados">
      <BaseCRUD<COEActivado>
        title="COE Activado"
        items={coes}
        columns={columns}
        renderForm={renderForm}
        onSave={handleSave}
        onDelete={handleDelete}
        initialItem={{
          id: 0,
          codigo: '',
          fechaActivacion: new Date(),
          horaActivacion: '',
          motivoActivacion: '',
          nivelAlerta: 'Nivel 1',
          ubicacion: '',
          coordenadas: '',
          descripcionSituacion: '',
          impactoPotencial: '',
          recursosMovilizados: [],
          responsables: [],
          estado: 'En Evaluación',
          fechaDesactivacion: null,
          motivoDesactivacion: '',
          leccionesAprendidas: '',
          recomendaciones: ''
        }}
      />
    </Card>
  );
};
