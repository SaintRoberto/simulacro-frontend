import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Button, Typography, Tag } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined, LogoutOutlined, HomeOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useMenu, MenuItem } from '../../context/MenuContext';
import { NotificationWatcher } from './NotificationWatcher';
import { NotificationsBell } from './NotificationsBell';
import logo from '../../assets/logo.png';

export const Layout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { Header, Sider, Content } = AntLayout;

  const { datosLogin, selectedEmergenciaId, authFetch } = useAuth();
  const { setMenuItems } = useMenu();
  const apiBase = process.env.REACT_APP_API_URL || '/api';
  type MenuItemAPI = { id: number; nombre: string; ruta: string; icono?: string; orden?: number; padre_id?: number };
  const [localMenuItems, setLocalMenuItems] = useState<MenuItemAPI[] | null>(null);
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

  // Cargar menú dinámico según perfil/coe/mesa
  useEffect(() => {
    const loadMenu = async () => {
      const perfilId = datosLogin?.perfil_id;
      const coeId = datosLogin?.coe_id;
      const mesaId = datosLogin?.mesa_id;
      // Verificar que existan (permitir 0 como valor válido)
      if (perfilId == null || coeId == null || mesaId == null) { 
        setMenuItems(null); 
        return; 
      }
      try {
        const url = `${apiBase}/menus/perfil/${perfilId}/coe/${coeId}/mesa/${mesaId}`;
        const res = await authFetch(url, { headers: { accept: 'application/json' } });
        const data = res.ok ? await res.json() : [];
        const menuItemsArray = Array.isArray(data) ? data : [];
        setLocalMenuItems(menuItemsArray);
        setMenuItems(menuItemsArray as MenuItem[]);
      } catch {
        setMenuItems(null);
      }
    };
    loadMenu();
  }, [datosLogin?.perfil_id, datosLogin?.coe_id, datosLogin?.mesa_id, apiBase, authFetch, setMenuItems]);

  return (
    <AntLayout style={{ minHeight: "100vh" }}>
      {/* Global notifications watcher */}
      <NotificationWatcher intervalMs={5000} />
      <Sider
        width={216}
        collapsedWidth={60}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{ width: "260px" }}
      >
        <div
          style={{
            height: 48,
            margin: 16,
            color: "#fff",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 600,
          }}
        >
          <img src={logo} alt="Logo" style={{ width: 100, height: 45 }} />
        </div>
        <Menu
          theme="dark"
          mode="vertical"
          selectedKeys={[location.pathname]}
          onClick={(e) => {
            const key = String(e.key);
            if (key && key !== "#") navigate(key);
          }}
          items={(() => {
            if (localMenuItems && localMenuItems.length > 0) {
              const parents = localMenuItems
                .filter((mi) => mi.orden === 0 && (!mi.ruta || mi.ruta === ""))
                .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
              const childrenByParent = new Map<number, MenuItemAPI[]>();
              for (const mi of localMenuItems) {
                if (
                  mi.ruta &&
                  mi.ruta !== "" &&
                  typeof mi.padre_id === "number"
                ) {
                  const arr = childrenByParent.get(mi.padre_id) || [];
                  arr.push(mi);
                  childrenByParent.set(mi.padre_id, arr);
                }
              }
              const flat: any[] = [];
              for (const p of parents) {
                flat.push({
                  key: `hdr-${p.id}`,
                  label: (
                    <span style={{ fontWeight: 700, color: "#fff" }}>
                      {p.nombre}
                    </span>
                  ),
                  disabled: true,
                });
                const childs = (childrenByParent.get(p.id) || []).sort(
                  (a, b) => (a.orden ?? 0) - (b.orden ?? 0)
                );
                for (const ch of childs) {
                  flat.push({
                    key: ch.ruta!,
                    label: (
                      <span
                        style={{
                          paddingLeft: 16,
                          display: "inline-block",
                          color: "#ffffffe7",
                        }}
                      >
                        {ch.nombre}
                      </span>
                    ),
                  });
                }
              }
              // Items con ruta sin padre válido
              const orphans = localMenuItems
                .filter(
                  (mi) =>
                    mi.ruta &&
                    mi.ruta !== "" &&
                    (!mi.padre_id || !parents.some((p) => p.id === mi.padre_id))
                )
                .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
              for (const mi of orphans) {
                flat.push({ key: mi.ruta!, label: mi.nombre });
              }
              return flat;
            }
            return [
              { key: "/", icon: <HomeOutlined />, label: "Dashboard" },
              { key: "/afectaciones", label: "Afectaciones" },
              { key: "/eventos", label: "Eventos" },
            ];
          })()}
        />
      </Sider>
      <AntLayout>
        <Header
          style={{
            background: "#fff",
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <Button
              type="text"
              onClick={() => setCollapsed(!collapsed)}
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            />
            <Typography.Title level={4} style={{ margin: 0 }}>
              {`Simulacros COE${
                selectedEmergenciaName ? " - " + selectedEmergenciaName : ""
              }`}
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
            <Button
              type="text"
              icon={<UserOutlined />}
              title="Usuario"
              style={{ fontSize: 12 }}
            >
              {datosLogin?.usuario_descripcion}
            </Button>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("userId");
                window.location.href = "/login";
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
