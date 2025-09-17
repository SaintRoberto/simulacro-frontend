import React from 'react';
import { Card, Button, Tag, Progress } from 'antd';
import { ExclamationCircleOutlined, CheckCircleOutlined, TeamOutlined, TruckOutlined, BellOutlined } from '@ant-design/icons';

export const Dashboard: React.FC = () => {
  // Nota: graficas removidas temporalmente para evitar dependencias

  const recentActivities = [
    { id: 1, type: 'Afectación', description: 'Nueva afectación reportada en la zona norte', time: 'Hace 5 min' },
    { id: 2, type: 'Recurso', description: 'Se movilizaron recursos a la zona afectada', time: 'Hace 1 hora' },
    { id: 3, type: 'Acción', description: 'Se completó la acción de respuesta #123', time: 'Hace 3 horas' },
    { id: 4, type: 'COE', description: 'Nueva reunión de COE programada', time: 'Ayer' },
  ];

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12 d-flex align-items-center justify-content-between">
          <h1 className="m-0">Panel de Control</h1>
          <div className="d-flex gap-2">
            <Button type="primary">Nuevo Reporte</Button>
            <Button>Exportar</Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row g-3">
        <div className="col-12 col-md-6 col-lg-3">
          <Card>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="d-block text-muted fw-medium mb-2">Afectaciones Activas</span>
                <div className="fw-medium fs-4">24</div>
                <Tag color="green">+12%</Tag>
              </div>
              <div className="bg-light p-3 rounded-circle text-primary">
                <ExclamationCircleOutlined style={{ fontSize: 24 }} />
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 col-md-6 col-lg-3">
          <Card>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="d-block text-muted fw-medium mb-2">Acciones en Curso</span>
                <div className="fw-medium fs-4">18</div>
                <Tag color="gold">+5%</Tag>
              </div>
              <div className="bg-light p-3 rounded-circle text-success">
                <CheckCircleOutlined style={{ fontSize: 24 }} />
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 col-md-6 col-lg-3">
          <Card>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="d-block text-muted fw-medium mb-2">Recursos Movilizados</span>
                <div className="fw-medium fs-4">156</div>
                <Tag color="red">+8%</Tag>
              </div>
              <div className="bg-light p-3 rounded-circle text-warning">
                <TruckOutlined style={{ fontSize: 24 }} />
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 col-md-6 col-lg-3">
          <Card>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="d-block text-muted fw-medium mb-2">COEs Activos</span>
                <div className="fw-medium fs-4">7</div>
                <Tag color="blue">-2%</Tag>
              </div>
              <div className="bg-light p-3 rounded-circle text-secondary">
                <TeamOutlined style={{ fontSize: 24 }} />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="row g-3 mt-1">
        <div className="col-12 col-lg-8">
          <Card title="Actividad Reciente">
            <ul className="list-none p-0 m-0">
              {recentActivities.map((activity) => (
                <li key={activity.id} className="border-bottom p-3 d-flex align-items-center">
                  <div className="me-3 bg-light rounded-circle d-flex align-items-center justify-content-center" style={{ width: '3rem', height: '3rem' }}>
                    <BellOutlined className="text-primary" />
                  </div>
                  <div className="flex-grow-1">
                    <div className="fw-medium">{activity.type}</div>
                    <div className="text-muted">{activity.description}</div>
                  </div>
                  <span className="text-muted">{activity.time}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Progress */}
        <div className="col-12 col-lg-4">
          <Card title="Estado de Respuesta">
            <div className="mb-4">
              <div className="d-flex justify-content-between mb-2">
                <span className="font-medium">Respuesta Inmediata</span>
                <span className="font-medium">75%</span>
              </div>
              <Progress percent={75} showInfo={false} />
            </div>
            
            <div className="mb-4">
              <div className="d-flex justify-content-between mb-2">
                <span className="font-medium">Evaluación de Daños</span>
                <span className="font-medium">45%</span>
              </div>
              <Progress percent={45} status="active" showInfo={false} />
            </div>
          
          <div className="mb-4">
            <div className="d-flex justify-content-between mb-2">
              <span className="font-medium">Recuperación</span>
              <span className="font-medium">30%</span>
            </div>
            <Progress percent={30} status="exception" showInfo={false} />
          </div>
          
          <div>
            <div className="d-flex justify-content-between mb-2">
              <span className="font-medium">Mitigación</span>
              <span className="font-medium">60%</span>
            </div>
            <Progress percent={60} showInfo={false} />
          </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
