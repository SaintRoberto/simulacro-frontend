import React from 'react';
import { Card } from 'primereact/card';
import AfectacionesParroquiasMatrix from '../../components/afectaciones/AfectacionesParroquiasMatrix';
import AfectacionesParroquiasAntdTable from '../../components/afectaciones/AfectacionesParroquiasAntdTable';

export const Afectaciones: React.FC = () => {
  return (
    <div className="grid">
      <div className="col-12">
        <Card>
          <AfectacionesParroquiasMatrix cantonId={901} mesaGrupoId={1} tableTitle="Matriz de Afectaciones por Parroquia" />
        </Card>
      </div>
    </div>
  );
};

export default Afectaciones;
