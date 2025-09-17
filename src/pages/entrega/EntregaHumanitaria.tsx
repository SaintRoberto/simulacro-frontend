import React, { useState } from 'react';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { BaseCRUD } from '../../components/crud/BaseCRUD';

interface EntregaHumanitaria {
  id: number;
  codigo: string;
  fechaEntrega: Date;
  beneficiario: string;
  documentoIdentidad: string;
  telefono: string;
  direccion: string;
  tipoAyuda: string;
  descripcion: string;
  cantidad: number;
  unidadMedida: string;
  responsableEntrega: string;
  observaciones: string;
  estado: string;
}

export const EntregaHumanitaria: React.FC = () => {
  const [entregas, setEntregas] = useState<EntregaHumanitaria[]>([]);
  
  const tiposAyuda = [
    { label: 'Alimentos', value: 'Alimentos' },
    { label: 'Agua', value: 'Agua' },
    { label: 'Kit de Higiene', value: 'Kit de Higiene' },
    { label: 'Medicamentos', value: 'Medicamentos' },
    { label: 'Ropa', value: 'Ropa' },
    { label: 'Cobertores', value: 'Cobertores' },
    { label: 'Otros', value: 'Otros' },
  ];

  const unidadesMedida = [
    { label: 'Kits', value: 'kits' },
    { label: 'Unidades', value: 'unidades' },
    { label: 'Litros', value: 'litros' },
    { label: 'Kilogramos', value: 'kg' },
    { label: 'Cajas', value: 'cajas' },
  ];

  const estados = [
    { label: 'Pendiente', value: 'Pendiente' },
    { label: 'Entregado', value: 'Entregado' },
    { label: 'Anulado', value: 'Anulado' },
  ];

  const handleSave = (entrega: Partial<EntregaHumanitaria>) => {
    if (entrega.id) {
      setEntregas(entregas.map(e => e.id === entrega.id ? entrega as EntregaHumanitaria : e));
    } else {
      const newId = Math.max(...entregas.map(e => e.id), 0) + 1;
      setEntregas([...entregas, {
        ...entrega as EntregaHumanitaria,
        id: newId,
        codigo: `ENT-${new Date().getFullYear()}-${String(newId).padStart(5, '0')}`
      }]);
    }
  };

  const handleDelete = (entrega: EntregaHumanitaria) => {
    setEntregas(entregas.filter(e => e.id !== entrega.id));
  };

  const renderForm = (entrega: Partial<EntregaHumanitaria>, onChange: (e: any) => void) => {
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
          <label htmlFor="fechaEntrega">Fecha de Entrega</label>
          <Calendar 
            id="fechaEntrega" 
            name="fechaEntrega"
            value={entrega.fechaEntrega || new Date()} 
            onChange={(e) => onDateChange(e.value, 'fechaEntrega')} 
            showIcon 
            dateFormat="dd/mm/yy" 
            className="w-full"
            required 
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="tipoAyuda">Tipo de Ayuda</label>
          <Dropdown 
            id="tipoAyuda" 
            name="tipoAyuda"
            value={entrega.tipoAyuda} 
            options={tiposAyuda} 
            onChange={(e) => onDropdownChange(e, 'tipoAyuda')} 
            placeholder="Seleccione tipo de ayuda" 
            className="w-full" 
            required
          />
        </div>
        
        <div className="field col-12">
          <label htmlFor="descripcion">Descripción del Bien</label>
          <InputText 
            id="descripcion" 
            name="descripcion"
            value={entrega.descripcion || ''} 
            onChange={onChange} 
            required 
          />
        </div>
        
        <div className="field col-12 md:col-4">
          <label htmlFor="cantidad">Cantidad</label>
          <InputNumber 
            id="cantidad" 
            name="cantidad"
            value={entrega.cantidad || 1} 
            onValueChange={(e) => onNumberChange(e, 'cantidad')} 
            mode="decimal"
            min={1}
            className="w-full"
            required
          />
        </div>
        
        <div className="field col-12 md:col-4">
          <label htmlFor="unidadMedida">Unidad de Medida</label>
          <Dropdown 
            id="unidadMedida" 
            name="unidadMedida"
            value={entrega.unidadMedida} 
            options={unidadesMedida} 
            onChange={(e) => onDropdownChange(e, 'unidadMedida')} 
            placeholder="Seleccione unidad" 
            className="w-full" 
            required
          />
        </div>
        
        <div className="field col-12 md:col-4">
          <label htmlFor="estado">Estado</label>
          <Dropdown 
            id="estado" 
            name="estado"
            value={entrega.estado} 
            options={estados} 
            onChange={(e) => onDropdownChange(e, 'estado')} 
            placeholder="Seleccione estado" 
            className="w-full" 
            required
          />
        </div>
        
        <div className="col-12">
          <h4>Datos del Beneficiario</h4>
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="beneficiario">Nombre del Beneficiario</label>
          <InputText 
            id="beneficiario" 
            name="beneficiario"
            value={entrega.beneficiario || ''} 
            onChange={onChange} 
            required 
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="documentoIdentidad">Documento de Identidad</label>
          <InputText 
            id="documentoIdentidad" 
            name="documentoIdentidad"
            value={entrega.documentoIdentidad || ''} 
            onChange={onChange} 
            required 
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="telefono">Teléfono</label>
          <InputText 
            id="telefono" 
            name="telefono"
            value={entrega.telefono || ''} 
            onChange={onChange} 
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="direccion">Dirección</label>
          <InputText 
            id="direccion" 
            name="direccion"
            value={entrega.direccion || ''} 
            onChange={onChange} 
          />
        </div>
        
        <div className="field col-12">
          <label htmlFor="responsableEntrega">Responsable de Entrega</label>
          <InputText 
            id="responsableEntrega" 
            name="responsableEntrega"
            value={entrega.responsableEntrega || ''} 
            onChange={onChange} 
            required 
          />
        </div>
        
        <div className="field col-12">
          <label htmlFor="observaciones">Observaciones</label>
          <InputTextarea 
            id="observaciones" 
            name="observaciones"
            value={entrega.observaciones || ''} 
            onChange={onChange} 
            rows={2}
            autoResize
          />
        </div>
      </div>
    );
  };

  const estadoBodyTemplate = (rowData: EntregaHumanitaria) => {
    const getSeverity = (estado: string) => {
      switch (estado) {
        case 'Entregado':
          return 'success';
        case 'Pendiente':
          return 'warning';
        case 'Anulado':
          return 'danger';
        default:
          return null;
      }
    };

    return <span className={`p-tag p-tag-${getSeverity(rowData.estado)}`}>{rowData.estado}</span>;
  };

  const cantidadTemplate = (rowData: EntregaHumanitaria) => {
    return `${rowData.cantidad} ${rowData.unidadMedida}`;
  };

  const columns = [
    { field: 'codigo', header: 'Código', sortable: true },
    { 
      field: 'fechaEntrega', 
      header: 'Fecha Entrega', 
      sortable: true,
      body: (rowData: EntregaHumanitaria) => rowData.fechaEntrega?.toLocaleDateString() 
    },
    { field: 'beneficiario', header: 'Beneficiario', sortable: true },
    { field: 'documentoIdentidad', header: 'Documento', sortable: true },
    { field: 'tipoAyuda', header: 'Tipo de Ayuda', sortable: true },
    { 
      field: 'cantidad', 
      header: 'Cantidad', 
      sortable: true,
      body: cantidadTemplate 
    },
    { 
      field: 'estado', 
      header: 'Estado', 
      sortable: true,
      body: estadoBodyTemplate 
    },
  ];

  return (
    <Card title="Entrega Humanitaria">
      <BaseCRUD<EntregaHumanitaria>
        title="Entrega Humanitaria"
        items={entregas}
        columns={columns}
        renderForm={renderForm}
        onSave={handleSave}
        onDelete={handleDelete}
        initialItem={{
          id: 0,
          codigo: '',
          fechaEntrega: new Date(),
          beneficiario: '',
          documentoIdentidad: '',
          telefono: '',
          direccion: '',
          tipoAyuda: '',
          descripcion: '',
          cantidad: 1,
          unidadMedida: 'unidades',
          responsableEntrega: '',
          observaciones: '',
          estado: 'Pendiente'
        }}
      />
    </Card>
  );
};
