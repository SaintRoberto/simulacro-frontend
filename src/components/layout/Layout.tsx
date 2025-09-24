import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Button, Typography, Tag } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined, LogoutOutlined, HomeOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchLoginData, selectLoginData } from '../../features/auth/loginSlice';
import { NotificationWatcher } from './NotificationWatcher';
import { NotificationsBell } from './NotificationsBell';

export const Layout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { Header, Sider, Content } = AntLayout;

  const dispatch = useAppDispatch();
  const loginData = useAppSelector(selectLoginData);

  // Al montar el layout, si hay token y no hay datos de usuario, intentar cargarlos usando userId del localStorage
  useEffect(() => {
    const hasToken = !!localStorage.getItem('token');
    const uidStr = localStorage.getItem('userId');
    if (hasToken && !loginData && uidStr) {
      const uid = Number(uidStr);
      if (!Number.isNaN(uid) && uid > 0) {
        dispatch(fetchLoginData(uid));
      }
    }
  }, [dispatch, loginData]);

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      {/* Global notifications watcher */}
      <NotificationWatcher intervalMs={5000} />
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} style={{ width: '250px' }}>
        <div style={{ height: 48, margin: 16, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>SNGRE</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={(e) => navigate(e.key)}
          items={[
            { key: '/', icon: <HomeOutlined />, label: 'Dashboard' },
            { key: '/afectaciones', label: 'Afectaciones' },
            { key: '/acciones', label: 'Acciones Ejecutadas' },
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
            <Typography.Title level={4} style={{ margin: 0 }}>Simulacros COE </Typography.Title>
          </div>
          <div className="d-flex align-items-center gap-1">
            {loginData?.coe_abreviatura && (
              <Tag color="green">{loginData.coe_abreviatura}</Tag>
            )}
             {loginData?.provincia_nombre && (
              <Tag color="purple">{loginData.provincia_nombre}</Tag>
            )}           
            {loginData?.canton_nombre && (
              <Tag color="red">{loginData.canton_nombre}</Tag>
            )}
             {loginData?.mesa_nombre && (
              <Tag color="blue">{loginData.mesa_nombre}</Tag>
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
