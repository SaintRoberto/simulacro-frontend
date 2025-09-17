import React from 'react';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';

export interface RequerimientoEnviadoFormProps<T extends Record<string, any>> {
  item: Partial<T>;
  onChange: (e: any) => void;
}

const porcentajeOptions = [0, 25, 50, 75, 100].map(v => ({ label: `${v}%`, value: v }));
const estadoOptions = [
  { label: 'Inicio', value: 'Inicio' },
  { label: 'Proceso', value: 'Proceso' },
  { label: 'Finalizado', value: 'Finalizado' },
];

export function RequerimientoEnviadoForm<T extends { [key: string]: any }>({ item, onChange }: RequerimientoEnviadoFormProps<T>) {
  const trigger = (name: string, value: any) => onChange({ target: { name, value } });

  return (
    <div className="grid p-fluid">
      <div className="field col-12 md:col-6">
        <label className="form-label">Emisor</label>
        <InputText
          name="solicitante"
          value={item['solicitante'] || ''}
          onChange={onChange}
          placeholder="Nombre del emisor"
        />
      </div>
      <div className="field col-12 md:col-6">
        <label className="form-label">Receptor</label>
        <InputText
          name="destinatario"
          value={item['destinatario'] || ''}
          onChange={onChange}
          placeholder="Nombre del receptor"
        />
      </div>

      <div className="field col-12 md:col-6">
        <label className="form-label">Fecha y hora inicio</label>
        <Calendar
          value={(item['fechaSolicitud'] as Date) || null}
          onChange={(e) => trigger('fechaSolicitud', (e.value as Date) || null)}
          showIcon
          showTime
          dateFormat="dd/mm/yy"
          className="w-full"
        />
      </div>
      <div className="field col-12 md:col-6">
        <label className="form-label">Fecha y hora fin</label>
        <Calendar
          value={(item['fechaCumplimiento'] as Date) || null}
          onChange={(e) => trigger('fechaCumplimiento', (e.value as Date) || null)}
          showIcon
          showTime
          dateFormat="dd/mm/yy"
          className="w-full"
        />
      </div>

      <div className="field col-12 md:col-6">
        <label className="form-label">Porcentaje de avance</label>
        <Dropdown
          className="w-full"
          options={porcentajeOptions}
          value={typeof item['porcentajeAvance'] === 'number' ? item['porcentajeAvance'] : 0}
          onChange={(e) => trigger('porcentajeAvance', e.value)}
          placeholder="Seleccione porcentaje"
        />
      </div>

      <div className="field col-12 md:col-6">
        <label className="form-label">Estado</label>
        <Dropdown
          className="w-full"
          options={estadoOptions}
          value={item['estado'] || 'Inicio'}
          onChange={(e) => trigger('estado', e.value)}
          placeholder="Seleccione estado"
        />
      </div>
    </div>
  );
}

export default RequerimientoEnviadoForm;
