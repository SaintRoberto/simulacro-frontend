import React, { useCallback, useEffect, useState } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { BaseCRUD } from '../../components/crud/BaseCRUD';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ActaCOEApi {
  activo: boolean;
  creacion: string;
  creador: string;
  descripcion: string;
  emergencia_id: number;
  fecha_sesion: string;
  hora_sesion: string;
  id: number;
  modificacion: string;
  modificador: string;
  usuario_id: number;
}

interface ActaCOEItem {
  id: number;
  descripcion: string;
  fechaSesion: string;
  creador: string;
}

const formatDate = (date: String | null): string => {
  if (!date) return '-';
  const [year, month, day] = date.split('T')[0].split('-');
  const [hour, minute] = date.split('T')[1].split(':');
  return `${day}-${month}-${year} ${hour}:${minute}`;

};

const formatHour = (value: string): string => {
  if (!value) return '-';
  const [hour, minute] = value.split(':');
  return minute !== undefined ? `${hour}:${minute}` : value;
};

export const ActasCOE: React.FC = () => {
  const navigate = useNavigate();
  const { authFetch, datosLogin } = useAuth();
  const [actas, setActas] = useState<ActaCOEItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const apiBase = process.env.REACT_APP_API_URL || '/api';

  const loadActas = useCallback(async () => {
    try {
      setIsLoading(true);
      const storedUserId = Number(localStorage.getItem('userId') || '0');
      const usuarioId = datosLogin?.usuario_id || (storedUserId > 0 ? storedUserId : 84);
      const emergenciaId = 1;
      const url = `${apiBase}/actas_coe/usuario/${usuarioId}/emergencia/${emergenciaId}`;
      const response = await authFetch(url, { headers: { accept: 'application/json' } });
      if (!response.ok) {
        console.error('No se pudo cargar la lista de actas COE', response.status, response.statusText);
        setActas([]);
        return;
      }

      const data = (await response.json()) as ActaCOEApi[];
      const mapped = (Array.isArray(data) ? data : []).map<ActaCOEItem>((item) => ({
        id: item.id,
        descripcion: item.descripcion,
        fechaSesion: item.fecha_sesion ? formatDate(item.fecha_sesion) : null,
        creador: (item.creador).toUpperCase() || '',
      }));

      setActas(mapped);
    } catch (error) {
      console.error('Error cargando actas COE:', error);
      setActas([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, authFetch, datosLogin?.usuario_id]);

  useEffect(() => {
    loadActas();
  }, [loadActas]);

  const handleSave = (_item: Partial<ActaCOEItem>) => {
    // Persistencia se definira en una iteracion futura
  };

  const handleDelete = (_item: ActaCOEItem) => {
    // Pendiente de definir con el backend
  };

  const columns = [
    { field: 'id', header: 'ID', sortable: true },
    { field: 'descripcion', header: 'Descripcion', sortable: true },
    {
      field: 'fechaSesion',
      header: 'Fecha de Sesion',
      sortable: true,
      body: (row: ActaCOEItem) => (row.fechaSesion),
    },
    { field: 'creador', header: 'Creador', sortable: true },

  ];

  return (
    <Card title="Actas COE">
      <BaseCRUD<ActaCOEItem>
        title=""
        items={actas}
        columns={columns}
        leftToolbarTemplate={() => (
          <Button
            label="Nueva Acta"
            icon="pi pi-plus"
            severity="success"
            onClick={() => navigate('/actas/nueva')}
            disabled={isLoading}
          />
        )}
        onEdit={(row) => navigate(`/actas/nueva?id=${row.id}`)}
        showDeleteButton={false}
        showDeleteAction={false}
        onSave={handleSave}
        onDelete={handleDelete}
        initialItem={{
          id: 0,
          descripcion: '',
          fechaSesion: null,
        }}
        emptyMessage={isLoading ? 'Cargando actas...' : 'No existen actas registradas.'}
      />
    </Card>
  );
};

export default ActasCOE;

