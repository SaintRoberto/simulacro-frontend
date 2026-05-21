import React from 'react';
import { Button, Card, Space, Typography } from 'antd';
import { ClockCircleOutlined, HomeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

export const SeccionEnConstruccion: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 140px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 680,
          borderRadius: 12,
          borderColor: '#e8edf3',
          boxShadow: '0 8px 24px rgba(16, 24, 40, 0.06)',
        }}
      >
        <Space direction="vertical" size={18} style={{ width: '100%' }}>
          <Space align="start" size={12}>
            <ClockCircleOutlined style={{ fontSize: 28, color: '#1677ff', marginTop: 2 }} />
            <div>
              <Typography.Title level={3} style={{ margin: 0 }}>
                Sección en construcción
              </Typography.Title>
              <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0, color: '#4b5563' }}>
                Esta funcionalidad estará disponible próximamente. Mientras tanto, puedes regresar al panel principal.
              </Typography.Paragraph>
            </div>
          </Space>

          <div>
            <Button type="primary" icon={<HomeOutlined />} onClick={() => navigate('/')}>
              Volver al inicio
            </Button>
          </div>
        </Space>
      </Card>
    </div>
  );
};
