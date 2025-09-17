import React, { useState } from 'react';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { InputNumber } from 'primereact/inputnumber';
import { BaseCRUD } from '../../components/crud/BaseCRUD';

interface RecursoMovilizado {
  id: number;
  codigo: string;
  tipoRecurso: string;
  descripcion: string;
  cantidad: number;
  unidadMedida: string;
  fechaMovilizacion: Date;
  origen: string;
  destino: string;
  responsable: string;
  estado: string;
}

export const RecursosMovilizados: React.FC = () => {
  const [recursos, setRecursos] = useState<RecursoMovilizado[]>([]);
  
  const tiposRecurso = [
    { label: 'Alimentos', value: 'Alimentos' },
    { label: 'Agua', value: 'Agua' },
    { label: 'Medicamentos', value: 'Medicamentos' },
    { label: 'Equipos Médicos', value: 'Equipos Médicos' },
    { label: 'Vehículos', value: 'Vehículos' },
    { label: 'Personal', value: 'Personal' },
    { label: 'Otros', value: 'Otros' },
  ];

  const unidadesMedida = [
    { label: 'Unidades', value: 'unidades' },
    { label: 'Litros', value: 'litros' },
    { label: 'Kilogramos', value: 'kg' },
    { label: 'Cajas', value: 'cajas' },
    { label: 'Personas', value: 'personas' },
  ];

  const estados = [
    { label: 'Pendiente', value: 'Pendiente' },
    { label: 'En Tránsito', value: 'En Tránsito' },
    { label: 'Entregado', value: 'Entregado' },
    { label: 'Devuelto', value: 'Devuelto' },
  ];

  const handleSave = (recurso: Partial<RecursoMovilizado>) => {
    if (recurso.id) {
      setRecursos(recursos.map(r => r.id === recurso.id ? recurso as RecursoMovilizado : r));
    } else {
      const newId = Math.max(...recursos.map(r => r.id), 0) + 1;
      setRecursos([...recursos, {
        ...recurso as RecursoMovilizado,
        id: newId,
        codigo: `REC-${new Date().getFullYear()}-${String(newId).padStart(5, '0')}`
      }]);
    }
  };

  const handleDelete = (recurso: RecursoMovilizado) => {
    setRecursos(recursos.filter(r => r.id !== recurso.id));
  };

  const renderForm = (recurso: Partial<RecursoMovilizado>, onChange: (e: any) => void) => {
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
          return;
        }
      } else {
        value = date;
      }
      onChange({ target: { name: field, value } });
    };

    const onDropdownChange = (e: { value: any }, field: string) => {
      onChange({ target: { name: field, value: e.value } });
    };

    const onNumberChange = (e: { value: number | null }, field: string) => {
      onChange({ target: { name: field, value: e.value || 0 } });
    };

    return (
      <div className="grid p-fluid">
        <div className="field col-12 md:col-6">
          <label htmlFor="tipoRecurso">Tipo de Recurso</label>
          <Dropdown 
            id="tipoRecurso" 
            name="tipoRecurso"
            value={recurso.tipoRecurso} 
            options={tiposRecurso} 
            onChange={(e) => onDropdownChange(e, 'tipoRecurso')} 
            placeholder="Seleccione tipo" 
            className="w-full" 
            required
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="descripcion">Descripción</label>
          <InputText 
            id="descripcion" 
            name="descripcion"
            value={recurso.descripcion || ''} 
            onChange={onChange} 
            required 
          />
        </div>
        
        <div className="field col-12 md:col-4">
          <label htmlFor="cantidad">Cantidad</label>
          <InputNumber 
            id="cantidad" 
            name="cantidad"
            value={recurso.cantidad || 0} 
            onValueChange={(e) => onNumberChange(e, 'cantidad')} 
            mode="decimal"
            min={0}
            className="w-full"
            required
          />
        </div>
        
        <div className="field col-12 md:col-4">
          <label htmlFor="unidadMedida">Unidad de Medida</label>
          <Dropdown 
            id="unidadMedida" 
            name="unidadMedida"
            value={recurso.unidadMedida} 
            options={unidadesMedida} 
            onChange={(e) => onDropdownChange(e, 'unidadMedida')} 
            placeholder="Seleccione unidad" 
            className="w-full" 
            required
          />
        </div>
        
        <div className="field col-12 md:col-4">
          <label htmlFor="fechaMovilizacion">Fecha de Movilización</label>
          <Calendar 
            id="fechaMovilizacion" 
            name="fechaMovilizacion"
            value={recurso.fechaMovilizacion || new Date()} 
            onChange={(e) => onDateChange(e.value, 'fechaMovilizacion')} 
            showIcon 
            dateFormat="dd/mm/yy" 
            className="w-full"
            required 
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="origen">Origen</label>
          <InputText 
            id="origen" 
            name="origen"
            value={recurso.origen || ''} 
            onChange={onChange} 
            required 
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="destino">Destino</label>
          <InputText 
            id="destino" 
            name="destino"
            value={recurso.destino || ''} 
            onChange={onChange} 
            required 
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="responsable">Responsable</label>
          <InputText 
            id="responsable" 
            name="responsable"
            value={recurso.responsable || ''} 
            onChange={onChange} 
            required 
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="estado">Estado</label>
          <Dropdown 
            id="estado" 
            name="estado"
            value={recurso.estado} 
            options={estados} 
            onChange={(e) => onDropdownChange(e, 'estado')} 
            placeholder="Seleccione estado" 
            className="w-full" 
            required
          />
        </div>
      </div>
    );
  };

  const estadoBodyTemplate = (rowData: RecursoMovilizado) => {
    const getSeverity = (estado: string) => {
      switch (estado) {
        case 'Entregado':
          return 'success';
        case 'En Tránsito':
          return 'info';
        case 'Pendiente':
          return 'warning';
        case 'Devuelto':
          return 'danger';
        default:
          return null;
      }
    };

    return <span className={`p-tag p-tag-${getSeverity(rowData.estado)}`}>{rowData.estado}</span>;
  };

  const cantidadTemplate = (rowData: RecursoMovilizado) => {
    return `${rowData.cantidad} ${rowData.unidadMedida}`;
  };

  const columns = [
    { field: 'codigo', header: 'Código', sortable: true },
    { field: 'tipoRecurso', header: 'Tipo', sortable: true },
    { field: 'descripcion', header: 'Descripción', sortable: true },
    { 
      field: 'cantidad', 
      header: 'Cantidad', 
      sortable: true,
      body: cantidadTemplate 
    },
    { 
      field: 'fechaMovilizacion', 
      header: 'Fecha Movilización', 
      sortable: true,
      body: (rowData: RecursoMovilizado) => rowData.fechaMovilizacion?.toLocaleDateString() 
    },
    { field: 'origen', header: 'Origen', sortable: true },
    { field: 'destino', header: 'Destino', sortable: true },
    { 
      field: 'estado', 
      header: 'Estado', 
      sortable: true,
      body: estadoBodyTemplate 
    },
  ];

  return (
    <Card title="Recursos Movilizados">
      <BaseCRUD<RecursoMovilizado>
        title="Recurso Movilizado"
        items={recursos}
        columns={columns}
        renderForm={renderForm}
        onSave={handleSave}
        onDelete={handleDelete}
        initialItem={{
          id: 0,
          codigo: '',
          tipoRecurso: '',
          descripcion: '',
          cantidad: 1,
          unidadMedida: 'unidades',
          fechaMovilizacion: new Date(),
          origen: '',
          destino: '',
          responsable: '',
          estado: 'Pendiente'
        }}
      />
    </Card>
  );
};
