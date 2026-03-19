import React from 'react';
import { Card } from 'primereact/card';
import AfectacionesParroquiasMatrixSidePanel from '../../components/afectaciones/AfectacionesParroquiasMatrixSidePanel';

export const Afectaciones: React.FC = () => {
  return (
    <div className="grid">
      <div className="col-12">
        <Card>
          <AfectacionesParroquiasMatrixSidePanel 
            cantonId={901} 
            mesaGrupoId={0}
            tableTitle="Matriz de Afectaciones por Parroquia" 
          />
        </Card>
      </div>
    </div>
  );
};

export default Afectaciones;
