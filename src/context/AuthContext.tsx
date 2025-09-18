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
  usuario_id: number;
}

export interface RecursoGrupo {
  activo: boolean;
  creacion: string;
  creador: string;
  descripcion: string;
  id: number;
  modificacion: string;
  modificador: string;
  nombre: string;
}

export interface RecursoTipo {
  complemento: string;
  costo: string;
  descripcion: string;
  id: number;
  nombre: string;
}

export interface RequerimientoRequest {
  activo: boolean;
  creador: string;
  emergencia_id: number;
  fecha_fin: string;
  fecha_inicio: string;
  usuario_emisor_id: number;
  usuario_receptor_id: number;
}

export interface RequerimientoResponse {
  activo: boolean;
  creacion: string;
  creador: string;
  emergencia_id: number;
  fecha_fin: string;
  fecha_inicio: string;
  id: number;
  modificacion: string;
  modificador: string;
  usuario_emisor_id: number;
  usuario_receptor_id: number;
}

export interface RequerimientoRecursoRequest {
  activo: boolean;
  cantidad: number;
  creador: string;
  destino: string;
  especificaciones: string;
  recurso_grupo_id: number;
  recurso_tipo_id: number;
  requerimiento_id: number;
}

export interface RequerimientoEnviado {
  id: number;
  activo: boolean;
  creacion: string;
  creador: string;
  emergencia_id: number;
  fecha_fin: string;
  fecha_inicio: string;
  modificacion: string;
  modificador: string;
  usuario_emisor_id: number;
  usuario_receptor_id: number;
}

export interface RequerimientoEstado {
  id: number;
  nombre: string;
  activo: boolean;
  creacion?: string | null;
  creador?: string | null;
  modificacion?: string | null;
  modificador?: string | null;
  descripcion?: string | null;
}

interface AuthContextValue {
  loginResponse: LoginResponse | null;
  datosLogin: DatosLogin | null;
  receptores: ReceptorItem[];
  receptoresStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  recursoGrupos: RecursoGrupo[];
  recursoGruposStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  recursoTipos: RecursoTipo[];
  recursoTiposStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  login: (usuario: string, clave: string) => Promise<boolean>;
  loadReceptores: () => Promise<void>;
  loadRecursoGrupos: () => Promise<void>;
  loadRecursoTipos: (grupoId: number) => Promise<void>;
  createRequerimiento: (data: RequerimientoRequest) => Promise<RequerimientoResponse | null>;
  createRequerimientoRecurso: (data: RequerimientoRecursoRequest) => Promise<boolean>;
  getRequerimientosEnviados: () => Promise<RequerimientoEnviado[]>;
  getRequerimientoEstados: () => Promise<RequerimientoEstado[]>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loginResponse, setLoginResponse] = useState<LoginResponse | null>(null);
  const [datosLogin, setDatosLogin] = useState<DatosLogin | null>(null);
  const [receptores, setReceptores] = useState<ReceptorItem[]>([]);
  const [receptoresStatus, setReceptoresStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle');
  const [recursoGrupos, setRecursoGrupos] = useState<RecursoGrupo[]>([]);
  const [recursoGruposStatus, setRecursoGruposStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle');
  const [recursoTipos, setRecursoTipos] = useState<RecursoTipo[]>([]);
  const [recursoTiposStatus, setRecursoTiposStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle');

  const apiBase = process.env.REACT_APP_API_URL || '/api';

  const login = useCallback(async (usuario: string, clave: string) => {
    setReceptoresStatus('idle');
    setReceptores([]);
    setRecursoGruposStatus('idle');
    setRecursoGrupos([]);
    setRecursoTiposStatus('idle');
    setRecursoTipos([]);
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

  const getRequerimientoEstados = useCallback(async (): Promise<RequerimientoEstado[]> => {
    try {
      const url = `${apiBase}/requerimiento_estados`;
      const res = await fetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) {
        return [];
      }
      return (await res.json()) as RequerimientoEstado[];
    } catch (e) {
      return [];
    }
  }, [apiBase]);

  const loadReceptores = useCallback(async () => {
    if (!datosLogin) return;
    setReceptoresStatus('loading');
    try {
      const url = `${apiBase}/mesas/${datosLogin.coe_id}/${datosLogin.mesa_id}/${datosLogin.mesa_grupo_id}/${datosLogin.provincia_id}/${datosLogin.canton_id}`;
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

  const loadRecursoGrupos = useCallback(async () => {
    setRecursoGruposStatus('loading');
    try {
      const url = `${apiBase}/recurso-grupos`;
      const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) {
        setRecursoGruposStatus('failed');
        return;
      }
      const data = (await res.json()) as RecursoGrupo[];
      setRecursoGrupos(data || []);
      setRecursoGruposStatus('succeeded');
    } catch (e) {
      setRecursoGruposStatus('failed');
    }
  }, [apiBase]);

  const loadRecursoTipos = useCallback(async (grupoId: number) => {
    setRecursoTiposStatus('loading');
    try {
      const url = `${apiBase}/recurso-tipos/grupo/${grupoId}`;
      const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) {
        setRecursoTiposStatus('failed');
        return;
      }
      const data = (await res.json()) as RecursoTipo[];
      setRecursoTipos(data || []);
      setRecursoTiposStatus('succeeded');
    } catch (e) {
      setRecursoTiposStatus('failed');
    }
  }, [apiBase]);

  const createRequerimiento = useCallback(async (data: RequerimientoRequest): Promise<RequerimientoResponse | null> => {
    try {
      const url = `${apiBase}/requerimientos`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        return null;
      }
      return (await res.json()) as RequerimientoResponse;
    } catch (e) {
      return null;
    }
  }, [apiBase]);

  const createRequerimientoRecurso = useCallback(async (data: RequerimientoRecursoRequest): Promise<boolean> => {
    try {
      const url = `${apiBase}/requerimiento-recursos`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }, [apiBase]);

  const getRequerimientosEnviados = useCallback(async (): Promise<RequerimientoEnviado[]> => {
    try {
      const userIdStr = localStorage.getItem('userId');
      if (!userIdStr) {
        return [];
      }
      const userId = Number(userIdStr);
      if (isNaN(userId)) {
        return [];
      }
      const url = `${apiBase}/requerimientos/${userId}`;
      const res = await fetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) {
        return [];
      }
      return (await res.json()) as RequerimientoEnviado[];
    } catch (e) {
      return [];
    }
  }, [apiBase]);

  const value = useMemo<AuthContextValue>(() => ({
    loginResponse,
    datosLogin,
    receptores,
    receptoresStatus,
    recursoGrupos,
    recursoGruposStatus,
    recursoTipos,
    recursoTiposStatus,
    login,
    loadReceptores,
    loadRecursoGrupos,
    loadRecursoTipos,
    createRequerimiento,
    createRequerimientoRecurso,
    getRequerimientosEnviados,
    getRequerimientoEstados,
  }), [loginResponse, datosLogin, receptores, receptoresStatus, recursoGrupos, recursoGruposStatus, recursoTipos, recursoTiposStatus, login, loadReceptores, loadRecursoGrupos, loadRecursoTipos, createRequerimiento, createRequerimientoRecurso, getRequerimientosEnviados, getRequerimientoEstados]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};


