import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Button, Typography, Tag } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined, LogoutOutlined, HomeOutlined } from '@ant-design/icons';
import { useAppDispatch } from '../../store/hooks';
import { useAuth } from '../../context/AuthContext';
import { NotificationWatcher } from './NotificationWatcher';
import { NotificationsBell } from './NotificationsBell';

export const Layout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { Header, Sider, Content } = AntLayout;

  const { datosLogin, loginResponse, selectedEmergenciaId } = useAuth();
  const dispatch = useAppDispatch();
  const [selectedEmergenciaName, setSelectedEmergenciaName] = useState<string | null>(() => {
    try { return localStorage.getItem('selectedEmergenciaName'); } catch { return null; }
  });
  
  // Verificar autenticación al cargar
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    
    // Si no hay token o userId, redirigir al login
    if (!token || !userId) {
      navigate('/login');
    }
  }, [navigate]);

  // Actualizar el nombre de la emergencia cuando cambie la selección o la ruta
  useEffect(() => {
    try {
      setSelectedEmergenciaName(localStorage.getItem('selectedEmergenciaName'));
    } catch {}
  }, [selectedEmergenciaId, location.pathname]);

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      {/* Global notifications watcher */}
      <NotificationWatcher intervalMs={5000} />
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} style={{ width: '210px' }}>
        <div style={{ height: 48, margin: 16, color: '#fff', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>SNGRE</div>
        <Menu
          theme="dark"
          mode="vertical"
          selectedKeys={[location.pathname]}
          onClick={(e) => navigate(e.key)}
          items={[
            { key: '/', icon: <HomeOutlined />, label: 'Dashboard' },
            { key: '/afectaciones', label: 'Afectaciones' },
            { key: '/eventos', label: 'Eventos' },
            { key: '/acciones', label: 'Acciones Respuesta' },
            { key: '/actas', label: 'Actas COE' },
            { key: '/recursos', label: 'Recursos Movilizados' },
            { key: '/brechas', label: 'Brechas' },
            { key: '/coes', label: 'COEs Activados' },
            { key: '/entrada-salida', label: 'Entrada / Salida AT' },
            { key: '/entrega', label: 'Entrega Humanitaria' },
            { key: '/requerimientos/enviados', label: 'Requerimientos Enviados' },
            { key: '/requerimientos/recibidos', label: 'Requerimientos Recibidos' },
          ]}
        />
      </Sider>
      <AntLayout>
        <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="d-flex align-items-center gap-2">
            <Button type="text" onClick={() => setCollapsed(!collapsed)} icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} />
            <Typography.Title level={4} style={{ margin: 0 }}>
              {`Simulacros COE${selectedEmergenciaName ? ' - ' + selectedEmergenciaName : ''}`}
            </Typography.Title>
          </div>
          <div className="d-flex align-items-center gap-1">
            {datosLogin?.coe_abreviatura && (
              <Tag color="green">{datosLogin.coe_abreviatura}</Tag>
            )}
            {datosLogin?.provincia_nombre && (
              <Tag color="purple">{datosLogin.provincia_nombre}</Tag>
            )}           
            {datosLogin?.canton_nombre && (
              <Tag color="red">{datosLogin.canton_nombre}</Tag>
            )}
            {datosLogin?.mesa_nombre && (
              <Tag color="blue">{datosLogin.mesa_nombre}</Tag>
            )}
            {/* Notifications bell */}
            <NotificationsBell />
            <Button type="text" icon={<UserOutlined />} />
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('userId');
                window.location.href = '/login';
              }}
            />
          </div>
        </Header>
        <Content style={{ margin: 16 }}>
          <div className="container-fluid">
            <Outlet />
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
};
