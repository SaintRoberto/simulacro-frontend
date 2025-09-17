import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface LoginResponse {
  descripcion: string;
  id: number;
  success: boolean;
  usuario: string;
}

export interface DatosLogin {
  canton_id: number;
  canton_nombre: string;
  coe_abreviatura: string;
  mesa_grupo_id: number;
  mesa_grupo_nombre: string;
  mesa_id: number;
  mesa_nombre: string;
  mesa_siglas: string;
  usuario_login: string;
  coe_id: number;
  perfil_id: number;
  perfil_nombre: string;
  provincia_id: number;
  provincia_nombre: string;
  usuario_descripcion: string;
  usuario_id: number;
}

export interface ReceptorItem {
  coe_id: number;
  mesa_id: number;
  mesa_nombre: string;
  mesa_siglas: string;
  siglas: string;
}

interface AuthContextValue {
  loginResponse: LoginResponse | null;
  datosLogin: DatosLogin | null;
  receptores: ReceptorItem[];
  receptoresStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  login: (usuario: string, clave: string) => Promise<boolean>;
  loadReceptores: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loginResponse, setLoginResponse] = useState<LoginResponse | null>(null);
  const [datosLogin, setDatosLogin] = useState<DatosLogin | null>(null);
  const [receptores, setReceptores] = useState<ReceptorItem[]>([]);
  const [receptoresStatus, setReceptoresStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle');

  const apiBase = process.env.REACT_APP_API_URL || '/api';

  const login = useCallback(async (usuario: string, clave: string) => {
    setReceptoresStatus('idle');
    setReceptores([]);
    const url = `${apiBase}/usuarios/login`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ usuario, clave }),
    });
    if (!res.ok) {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      return false;
    }
    const data = (await res.json()) as LoginResponse;
    setLoginResponse(data);
    if (data?.success && data?.id) {
      localStorage.setItem('token', 'true');
      localStorage.setItem('userId', String(data.id));
      const datosUrl = `${apiBase}/usuarios/${data.id}/datos-login`;
      const resDatos = await fetch(datosUrl, { headers: { 'Content-Type': 'application/json' } });
      if (resDatos.ok) {
        const datos = (await resDatos.json()) as DatosLogin;
        setDatosLogin(datos);
      }
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
    }
    return !!data?.success;
  }, [apiBase]);

  const loadReceptores = useCallback(async () => {
    if (!datosLogin) return;
    setReceptoresStatus('loading');
    try {
      const url = `${apiBase}/mesas/${datosLogin.coe_id}/${datosLogin.mesa_id}/${datosLogin.mesa_grupo_id}`;
      const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) {
        setReceptoresStatus('failed');
        return;
      }
      const data = (await res.json()) as ReceptorItem[];
      setReceptores(data || []);
      setReceptoresStatus('succeeded');
    } catch (e) {
      setReceptoresStatus('failed');
    }
  }, [apiBase, datosLogin]);

  const value = useMemo<AuthContextValue>(() => ({
    loginResponse,
    datosLogin,
    receptores,
    receptoresStatus,
    login,
    loadReceptores,
  }), [loginResponse, datosLogin, receptores, receptoresStatus, login, loadReceptores]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};


