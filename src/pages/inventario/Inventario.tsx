import React from 'react';
import { Card } from 'primereact/card';
import InventarioMatrixSidePanel from '../../components/inventario/InventarioMatrixSidePanel';

export const Inventario: React.FC = () => {
  return (
    <div className="grid">
      <div className="col-12">
        <Card>
          <InventarioMatrixSidePanel tableTitle="Matriz de Inventario por Institución" />
        </Card>
      </div>
    </div>
  );
};

export default Inventario;
