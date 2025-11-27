import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { PrivateRoute } from './components/auth/PrivateRoute';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { Afectaciones } from './pages/afectaciones/Afectaciones';
import { AccionesEjecutadas } from './pages/acciones/AccionesEjecutadas';
import { ActasCOE } from './pages/actas/ActasCOE';
import { NuevoActaCOE } from './pages/actas/NuevoAcataCOE';
import { RecursosMovilizados } from './pages/recursos/RecursosMovilizados';
import { Brechas } from './pages/brechas/Brechas';
import { CoesActivados } from './pages/coes/CoesActivados';
import { EntradaSalidaAT } from './pages/alojamientos/EntradaSalidaAT';
import { AlojamientosActivados } from './pages/alojamientos/AlojamientosActivados';
import { EntregaHumanitaria } from './pages/entrega/EntregaHumanitaria';
import { RequerimientosEnviados } from './pages/requerimientos/enviados/RequerimientosEnviados';
import { RequerimientosRecibidos } from './pages/requerimientos/recibidos/RequerimientosRecibidos';
import { NuevoRequerimientoEnviado } from './pages/requerimientos/enviados/NuevoRequerimientoEnviado';
import { NuevoRequerimientoRecibido } from './pages/requerimientos/recibidos/NuevoRequerimientoRecibido'; 
import { NotificationsProvider } from './context/NotificationsContext';
import { AccionesRespuestas } from './pages/acciones/AccionesRespuestas';
import { NuevoAccionesRespuesta } from './pages/acciones/NuevoAccionesRespuesta';
import EmergencySelection from './pages/EmergencySelection';
import { Eventos } from './pages/eventos/Eventos';

const App: React.FC = () => {
  return (
    <NotificationsProvider>
      <Routes>
      {/* Auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected application routes */}
      <Route element={<PrivateRoute />}>
        <Route path="/emergencias" element={<EmergencySelection />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="afectaciones" element={<Afectaciones />} />
          <Route path="eventos" element={<Eventos />} />
          <Route path="acciones" element={<AccionesRespuestas />} />
          <Route path="acciones/nueva" element={<NuevoAccionesRespuesta />} />
          <Route path="actas" element={<ActasCOE />} />
          <Route path="actas/nueva" element={<NuevoActaCOE />} />
          <Route path="recursos" element={<RecursosMovilizados />} />
          <Route path="brechas" element={<Brechas />} />
          <Route path="coes" element={<CoesActivados />} />
          <Route path="entrada-salida" element={<AlojamientosActivados />} />
          <Route path="entrega" element={<EntregaHumanitaria />} />
          <Route path="requerimientos">
            <Route path="enviados" element={<RequerimientosEnviados />} />
            <Route path="enviados/nuevo" element={<NuevoRequerimientoEnviado />} />
            <Route path="recibidos" element={<RequerimientosRecibidos />} />
            <Route path="recibidos/nuevo" element={<NuevoRequerimientoRecibido />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback: if unknown route, go to login (initial screen) */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    </NotificationsProvider>
  );
};

export default App;

