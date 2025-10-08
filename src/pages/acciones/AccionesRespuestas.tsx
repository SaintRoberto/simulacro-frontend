import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { BaseCRUD } from '../../components/crud/BaseCRUD';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface AccionesRespuestasItem {
  respuesta_accion_id: number;
  detalle: string;
  estado_id: number;
  estado_nombre: string;
  fecha_final: string;
  origen_id: number;
  origen_nombre: string;
  resolucion_id: number;
}

const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateString;
  }
};

export const AccionesRespuestas: React.FC = () => {
  const navigate = useNavigate();
  const { authFetch, datosLogin } = useAuth();
  const [acciones, setAcciones] = useState<AccionesRespuestasItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const loadAcciones = useCallback(async () => {
    try {
      setIsLoading(true);
      const storedUserId = Number(localStorage.getItem('userId') || '0');
      const usuarioId = datosLogin?.usuario_id || storedUserId || 75; // Usar 75 como valor por defecto
      
      const url = `${apiBase}/respuesta_acciones/usuario/${usuarioId}`;
      const response = await authFetch(url, { 
        headers: { 
          'accept': 'application/json',
          'Content-Type': 'application/json'
        } 
      });
      
      if (!response.ok) {
        console.error('No se pudo cargar la lista de Acciones de Respuesta', response.status, response.statusText);
        setAcciones([]);
        return;
      }

      const data = await response.json();
      const mapped = Array.isArray(data) ? data.map(item => ({
        respuesta_accion_id: item.respuesta_accion_id || 0,
        detalle: item.detalle || '',
        estado_id: item.estado_id || 0,
        estado_nombre: item.estado_nombre || 'Sin estado',
        fecha_final: item.fecha_final || '',
        origen_id: item.origen_id || 0,
        origen_nombre: item.origen_nombre || 'Sin origen',
        resolucion_id: item.resolucion_id || 0
      })) : [];

      setAcciones(mapped);
    } catch (error) {
      console.error('Error cargando Acciones de Respuesta:', error);
      setAcciones([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, authFetch, datosLogin?.usuario_id]);

  useEffect(() => {
    loadAcciones();
  }, [loadAcciones]);

  const handleSave = (_item: Partial<AccionesRespuestasItem>) => {
    // Persistencia se definirá en una iteración futura
  };

  const handleDelete = (_item: AccionesRespuestasItem) => {
    // Pendiente de definir con el backend
  };

  const columns = [
    { 
      field: 'respuesta_accion_id', 
      header: 'ID', 
      sortable: true 
    },
    { 
      field: 'estado_nombre', 
      header: 'Estado', 
      sortable: true 
    },
    { 
      field: 'origen_nombre', 
      header: 'Origen', 
      sortable: true 
    },
    { 
      field: 'resolucion_id', 
      header: 'ID Resolución', 
      sortable: true 
    },
    { 
      field: 'fecha_final', 
      header: 'Fecha Final', 
      sortable: true,
      body: (row: AccionesRespuestasItem) => formatDate(row.fecha_final)
    },
    { 
      field: 'detalle', 
      header: 'Detalle', 
      sortable: true 
    },

  ];

  // Ensure each item has a unique key
  const itemsWithKeys = useMemo(() => 
    acciones.map(item => ({
      ...item,
      key: item.respuesta_accion_id.toString()
    })),
    [acciones]
  );

  return (
    <Card title="Acciones de respuesta">
      <BaseCRUD<AccionesRespuestasItem>
        key="acciones-crud"
        title=""
        items={itemsWithKeys}
        columns={columns}
        leftToolbarTemplate={() => (
          <Button
            label="Nueva Acción"
            icon="pi pi-plus"
            severity="success"
            onClick={() => navigate('/acciones/nueva')}
            disabled={isLoading}
          />
        )}
        onEdit={(row) => navigate(`/acciones/nueva?id=${row.respuesta_accion_id}`)}
        showDeleteButton={false}
        showDeleteAction={false}
        onSave={handleSave}
        onDelete={handleDelete}
        initialItem={{
          respuesta_accion_id: 0,
          detalle: '',
          estado_id: 0,
          estado_nombre: '',
          fecha_final: '',
          origen_id: 0,
          origen_nombre: '',
          resolucion_id: 0
        }}
        emptyMessage={isLoading ? 'Cargando acciones de respuesta...' : 'No existen acciones de respuesta registradas.'}
      />
    </Card>
  );
};

export default AccionesRespuestas;

