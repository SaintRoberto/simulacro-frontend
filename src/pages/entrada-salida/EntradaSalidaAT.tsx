import React, { useState } from 'react';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { BaseCRUD } from '../../components/crud/BaseCRUD';

interface EntradaSalidaAT {
  id: number;
  codigo: string;
  tipoMovimiento: 'Entrada' | 'Salida';
  fechaHora: Date;
  persona: string;
  documentoIdentidad: string;
  organizacion: string;
  cargo: string;
  telefono: string;
  destinoOrigen: string;
  motivo: string;
  observaciones: string;
  responsableRegistro: string;
}

export const EntradaSalidaAT: React.FC = () => {
  const [movimientos, setMovimientos] = useState<EntradaSalidaAT[]>([]);
  const [showEntryForm, setShowEntryForm] = useState(true);
  
  const tiposMovimiento = [
    { label: 'Entrada', value: 'Entrada' },
    { label: 'Salida', value: 'Salida' },
  ];

  const organizaciones = [
    { label: 'Cruz Roja', value: 'Cruz Roja' },
    { label: 'Defensa Civil', value: 'Defensa Civil' },
    { label: 'Bomberos', value: 'Bomberos' },
    { label: 'Policía Nacional', value: 'Policía Nacional' },
    { label: 'Ejército', value: 'Ejército' },
    { label: 'Otra', value: 'Otra' },
  ];

  const handleSave = (movimiento: Partial<EntradaSalidaAT>) => {
    if (movimiento.id) {
      setMovimientos(movimientos.map(m => m.id === movimiento.id ? movimiento as EntradaSalidaAT : m));
    } else {
      const newId = Math.max(...movimientos.map(m => m.id), 0) + 1;
      setMovimientos([...movimientos, {
        ...movimiento as EntradaSalidaAT,
        id: newId,
        codigo: `AT-${new Date().getFullYear()}-${String(newId).padStart(5, '0')}`,
        fechaHora: new Date()
      }]);
    }
  };

  const handleDelete = (movimiento: EntradaSalidaAT) => {
    setMovimientos(movimientos.filter(m => m.id !== movimiento.id));
  };

  const toggleFormType = (isEntry: boolean) => {
    setShowEntryForm(isEntry);
  };

  const renderForm = (movimiento: Partial<EntradaSalidaAT>, onChange: (e: any) => void) => {
    const onDateChange = (date: Date | Date[] | string | null | undefined, field: string) => {
      if (!date) return;

      // Only single date is expected; ignore ranges/arrays for now
      if (!Array.isArray(date)) {
        if (date instanceof Date) {
          onChange({ target: { name: field, value: date } });
        } else if (typeof date === 'string') {
          const parsed = new Date(date);
          if (!isNaN(parsed.getTime())) {
            onChange({ target: { name: field, value: parsed } });
          }
        }
      }
    };

    const onDropdownChange = (e: { value: any }, field: string) => {
      onChange({ target: { name: field, value: e.value } });
    };

    return (
      <div className="grid p-fluid">
        <div className="col-12">
          <div className="flex justify-content-center mb-4">
            <div className="p-buttonset">
              <Button 
                label="Registrar Entrada" 
                icon="pi pi-sign-in" 
                className={showEntryForm ? 'p-button-success' : 'p-button-outlined'}
                onClick={() => toggleFormType(true)} 
              />
              <Button 
                label="Registrar Salida" 
                icon="pi pi-sign-out" 
                className={!showEntryForm ? 'p-button-danger' : 'p-button-outlined'}
                onClick={() => toggleFormType(false)} 
              />
            </div>
          </div>
        </div>

        <div className="field col-12 md:col-6">
          <label htmlFor="tipoMovimiento">Tipo de Movimiento</label>
          <Dropdown 
            id="tipoMovimiento" 
            name="tipoMovimiento"
            value={showEntryForm ? 'Entrada' : 'Salida'} 
            options={tiposMovimiento} 
            onChange={(e) => onDropdownChange(e, 'tipoMovimiento')} 
            className="w-full" 
            disabled
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="fechaHora">Fecha y Hora</label>
          <Calendar 
            id="fechaHora" 
            name="fechaHora"
            value={movimiento.fechaHora || new Date()} 
            onChange={(e) => onDateChange(e.value, 'fechaHora')} 
            showTime 
            showSeconds
            dateFormat="dd/mm/yy" 
            className="w-full"
            required 
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="persona">Nombre Completo</label>
          <InputText 
            id="persona" 
            name="persona"
            value={movimiento.persona || ''} 
            onChange={onChange} 
            required 
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="documentoIdentidad">Documento de Identidad</label>
          <InputText 
            id="documentoIdentidad" 
            name="documentoIdentidad"
            value={movimiento.documentoIdentidad || ''} 
            onChange={onChange} 
            required 
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="organizacion">Organización</label>
          <Dropdown 
            id="organizacion" 
            name="organizacion"
            value={movimiento.organizacion} 
            options={organizaciones} 
            onChange={(e) => onDropdownChange(e, 'organizacion')} 
            placeholder="Seleccione organización" 
            className="w-full" 
            required
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="cargo">Cargo/Función</label>
          <InputText 
            id="cargo" 
            name="cargo"
            value={movimiento.cargo || ''} 
            onChange={onChange} 
            required 
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="telefono">Teléfono de Contacto</label>
          <InputText 
            id="telefono" 
            name="telefono"
            value={movimiento.telefono || ''} 
            onChange={onChange} 
          />
        </div>
        
        <div className="field col-12 md:col-6">
          <label htmlFor="destinoOrigen">
            {showEntryForm ? 'Lugar de Procedencia' : 'Destino'}
          </label>
          <InputText 
            id="destinoOrigen" 
            name="destinoOrigen"
            value={movimiento.destinoOrigen || ''} 
            onChange={onChange} 
            required 
          />
        </div>
        
        <div className="field col-12">
          <label htmlFor="motivo">Motivo de la {showEntryForm ? 'Entrada' : 'Salida'}</label>
          <InputTextarea 
            id="motivo" 
            name="motivo"
            value={movimiento.motivo || ''} 
            onChange={onChange} 
            rows={2}
            autoResize
            required
          />
        </div>
        
        <div className="field col-12">
          <label htmlFor="observaciones">Observaciones</label>
          <InputTextarea 
            id="observaciones" 
            name="observaciones"
            value={movimiento.observaciones || ''} 
            onChange={onChange} 
            rows={2}
            autoResize
          />
        </div>
        
        <div className="field col-12">
          <label htmlFor="responsableRegistro">Registrado por</label>
          <InputText 
            id="responsableRegistro" 
            name="responsableRegistro"
            value={movimiento.responsableRegistro || ''} 
            onChange={onChange} 
            required 
          />
        </div>
      </div>
    );
  };

  const tipoMovimientoTemplate = (rowData: EntradaSalidaAT) => {
    return (
      <span className={`p-tag p-tag-${rowData.tipoMovimiento === 'Entrada' ? 'success' : 'danger'}`}>
        {rowData.tipoMovimiento}
      </span>
    );
  };

  const fechaHoraTemplate = (rowData: EntradaSalidaAT) => {
    return rowData.fechaHora?.toLocaleString();
  };

  const columns = [
    { field: 'codigo', header: 'Código', sortable: true },
    { 
      field: 'tipoMovimiento', 
      header: 'Tipo', 
      sortable: true,
      body: tipoMovimientoTemplate 
    },
    { 
      field: 'fechaHora', 
      header: 'Fecha y Hora', 
      sortable: true,
      body: fechaHoraTemplate 
    },
    { field: 'persona', header: 'Persona', sortable: true },
    { field: 'documentoIdentidad', header: 'Documento', sortable: true },
    { field: 'organizacion', header: 'Organización', sortable: true },
    { field: 'destinoOrigen', header: 'Destino/Origen', sortable: true },
  ];

  return (
    <Card title="Registro de Entrada/Salida de Personal AT">
      <BaseCRUD<EntradaSalidaAT>
        title="Movimiento"
        items={movimientos}
        columns={columns}
        renderForm={renderForm}
        onSave={handleSave}
        onDelete={handleDelete}
        initialItem={{
          id: 0,
          codigo: '',
          tipoMovimiento: 'Entrada',
          fechaHora: new Date(),
          persona: '',
          documentoIdentidad: '',
          organizacion: '',
          cargo: '',
          telefono: '',
          destinoOrigen: '',
          motivo: '',
          observaciones: '',
          responsableRegistro: ''
        }}
      />
    </Card>
  );
};
