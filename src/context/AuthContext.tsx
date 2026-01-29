import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface LoginResponse {
  descripcion: string;
  id: number;
  success: boolean;
  token?: string;
  usuario: string;
}

export interface DatosLogin {
  emergencia_id: number;
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

export interface RequerimientoRecibido {
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

export interface RequerimientoRecibidoNotificacion {
  id: number;
  activo: boolean;
  creacion: string;
  creador: string;
  emergencia_id: number;
  porcentaje_avance: number;
  requerimiento_estado_id: number;
  requerimiento_id: number;
  usuario_emisor: string;
  usuario_emisor_id: number;
  usuario_receptor: string;
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

// Detail response for a single requerimiento by ID
export interface RequerimientoByIdResponse {
  id: number;
  activo: boolean;
  creacion: string;
  creador: string;
  emergencia_id: number;
  fecha_fin: string;
  fecha_inicio: string;
  modificacion: string | null;
  modificador: string | null;
  usuario_emisor_id: number;
  usuario_receptor_id: number;
}

// Response for requerimiento-recursos entries
export interface RequerimientoRecursoResponse {
  id: number;
  activo: boolean;
  cantidad: number;
  creacion: string;
  creador: string;
  destino: string;
  especificaciones: string;
  modificacion: string | null;
  modificador: string | null;
  recurso_grupo_id: number;
  recurso_tipo_id: number;
  requerimiento_id: number;
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
  isRestoringSession: boolean;
  login: (usuario: string, clave: string) => Promise<boolean>;
  loadReceptores: () => Promise<void>;
  loadRecursoGrupos: () => Promise<void>;
  loadRecursoTipos: (grupoId: number) => Promise<void>;
  createRequerimiento: (data: RequerimientoRequest) => Promise<RequerimientoResponse | null>;
  createRequerimientoRecurso: (data: RequerimientoRecursoRequest) => Promise<boolean>;
  getRequerimientosEnviados: () => Promise<RequerimientoEnviado[]>;
  getRequerimientosRecibidos: () => Promise<RequerimientoRecibido[]>;
  getRequerimientoEstados: () => Promise<RequerimientoEstado[]>;
  getRequerimientoById: (id: number) => Promise<RequerimientoByIdResponse | null>;
  getRequerimientoRecursos: (requerimientoId: number) => Promise<RequerimientoRecursoResponse[]>;
  getRecursoTiposByGrupo: (grupoId: number) => Promise<RecursoTipo[]>;
  getRequerimientosRecibidosNotificaciones: () => Promise<RequerimientoRecibidoNotificacion[]>;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  selectedEmergenciaId: number | null;
  setSelectedEmergenciaId: (id: number | null) => void;

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
  const [isRestoringSession, setIsRestoringSession] = useState<boolean>(true);
  const [selectedEmergenciaId, _setSelectedEmergenciaId] = useState<number | null>(() => {
    const v = localStorage.getItem('selectedEmergenciaId');
    return v ? Number(v) : null;
  });

  const apiBase = process.env.REACT_APP_API_URL || '/api';

  // Función para restaurar la sesión desde localStorage
  const restoreSession = useCallback(async () => {
    setIsRestoringSession(true);
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    if (!token || !userId) {
      setIsRestoringSession(false);
      return;
    }

    try {
      // Obtener datos adicionales del usuario
      const datosUrl = `${apiBase}/usuarios/${userId}/datos-login`;
      const resDatos = await fetch(datosUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (resDatos.ok) {
        const datos = (await resDatos.json()) as DatosLogin;
        setDatosLogin(datos);

        // Crear un loginResponse básico con la información disponible
        setLoginResponse({
          descripcion: datos.usuario_descripcion,
          id: Number(userId),
          success: true,
          token: token,
          usuario: datos.usuario_login
        });
      } else {
        // Limpiar datos inválidos si la respuesta no es ok
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        setLoginResponse(null);
        setDatosLogin(null);
      }
    } catch (error) {
      console.error('Error al restaurar la sesión:', error);
      // Limpiar datos inválidos
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      setLoginResponse(null);
      setDatosLogin(null);
    } finally {
      setIsRestoringSession(false);
    }
  }, [apiBase]);

  // Restaurar sesión cuando se monta el componente
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Helper to automatically attach JWT token to all requests
  const authFetch = useCallback(
    (input: RequestInfo | URL, init: RequestInit = {}) => {
      const token = localStorage.getItem('token');
      const mergedHeaders: Record<string, string> = {
        accept: 'application/json',
        ...(init.headers as Record<string, string> | undefined),
      };
      if (token) {
        mergedHeaders['Authorization'] = `Bearer ${token}`;
      }
      return fetch(input, { ...init, headers: mergedHeaders });
    },
    []
  );

  const login = useCallback(async (usuario: string, clave: string) => {
    // Limpiar estados
    setReceptoresStatus('idle');
    setReceptores([]);
    setRecursoGruposStatus('idle');
    setRecursoGrupos([]);
    setRecursoTiposStatus('idle');
    setRecursoTipos([]);
    _setSelectedEmergenciaId(null);
    localStorage.removeItem('selectedEmergenciaId');
    
    try {
      // Hacer la petición de login
      const url = `${apiBase}/usuarios/login`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ usuario, clave }),
      });
      
      if (!res.ok) {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        setLoginResponse(null);
        setDatosLogin(null);
        return false;
      }
      
      const data = (await res.json()) as LoginResponse;
      setLoginResponse(data);
      
      if (data?.success && data?.id) {
        // Guardar token y userId en localStorage
        if (data.token) {
          localStorage.setItem('token', data.token);
        } else {
          localStorage.removeItem('token');
        }
        localStorage.setItem('userId', String(data.id));
        
        // Obtener datos adicionales del usuario
        try {
          const datosUrl = `${apiBase}/usuarios/${data.id}/datos-login`;
          const token = localStorage.getItem('token');
          const resDatos = await fetch(datosUrl, { 
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : ''
            } 
          });
          
          if (resDatos.ok) {
            const datos = (await resDatos.json()) as DatosLogin;
            setDatosLogin(datos);
          }
        } catch (error) {
          console.error('Error al cargar datos adicionales del usuario:', error);
        }
        return true;
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        setLoginResponse(null);
        setDatosLogin(null);
        return false;
      }
    } catch (error) {
      console.error('Error en el proceso de login:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      setLoginResponse(null);
      setDatosLogin(null);
      return false;
    }
  }, [apiBase, datosLogin?.usuario_id]);

  const getRequerimientoById = useCallback(async (id: number): Promise<RequerimientoByIdResponse | null> => {
    try {
      const url = `${apiBase}/requerimientos/id/${id}`;
      const res = await authFetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) return null;
      return (await res.json()) as RequerimientoByIdResponse;
    } catch (e) {
      return null;
    }
  }, [apiBase, authFetch]);

  const getRequerimientoRecursos = useCallback(async (requerimientoId: number): Promise<RequerimientoRecursoResponse[]> => {
    try {
      const url = `${apiBase}/requerimiento-recursos/${requerimientoId}`;
      const res = await authFetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? (data as RequerimientoRecursoResponse[]) : [data as RequerimientoRecursoResponse];
    } catch (e) {
      return [];
    }
  }, [apiBase, authFetch]);

  const getRecursoTiposByGrupo = useCallback(async (grupoId: number): Promise<RecursoTipo[]> => {
    try {
      const url = `${apiBase}/recurso-tipos/grupo/${grupoId}`;
      const res = await authFetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) return [];
      return (await res.json()) as RecursoTipo[];
    } catch (e) {
      return [];
    }
  }, [apiBase, authFetch]);

  const getRequerimientoEstados = useCallback(async (): Promise<RequerimientoEstado[]> => {
    try {
      const url = `${apiBase}/respuesta-estados`;
      const res = await authFetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) {
        return [];
      }
      return (await res.json()) as RequerimientoEstado[];
    } catch (e) {
      return [];
    }
  }, [apiBase, authFetch]);

  const loadReceptores = useCallback(async () => {
    if (!datosLogin) return;
    setReceptoresStatus('loading');
    try {
      const url = `${apiBase}/mesas/${datosLogin.coe_id}/${datosLogin.mesa_id}/${datosLogin.mesa_grupo_id}/${datosLogin.provincia_id}/${datosLogin.canton_id}`;
      const res = await authFetch(url, { headers: { 'Content-Type': 'application/json' } });
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
  }, [apiBase, datosLogin, authFetch]);

  const loadRecursoGrupos = useCallback(async () => {
    setRecursoGruposStatus('loading');
    try {
      const url = `${apiBase}/recurso_grupos`;
      const res = await authFetch(url, { headers: { 'Content-Type': 'application/json' } });
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
  }, [apiBase, authFetch]);

  const loadRecursoTipos = useCallback(async (grupoId: number) => {
    setRecursoTiposStatus('loading');
    try {
      const url = `${apiBase}/recurso-tipos/grupo/${grupoId}`;
      const res = await authFetch(url, { headers: { 'Content-Type': 'application/json' } });
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
  }, [apiBase, authFetch]);

  const createRequerimiento = useCallback(async (data: RequerimientoRequest): Promise<RequerimientoResponse | null> => {
    try {
      const url = `${apiBase}/requerimientos`;
      const res = await authFetch(url, {
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
  }, [apiBase, authFetch]);

  const createRequerimientoRecurso = useCallback(async (data: RequerimientoRecursoRequest): Promise<boolean> => {
    try {
      const url = `${apiBase}/requerimiento-recursos`;
      const res = await authFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }, [apiBase, authFetch]);

  const getRequerimientosEnviados = useCallback(async (): Promise<RequerimientoEnviado[]> => {
    try {
      const effectiveId = datosLogin?.usuario_id ?? Number(localStorage.getItem('userId') || 'NaN');
      const perfilId = 3;
      const coeId = datosLogin?.coe_id ?? 0;
      const provinciaId = datosLogin?.provincia_id ?? 0;
      const cantonId = datosLogin?.canton_id ?? 0;
      const userId = Number(effectiveId);
      if (isNaN(userId)) {
        return [];
      }
      
      const url = `${apiBase}/requerimientos/enviados/usuario/${userId}/perfil/${perfilId}/coe/${coeId}/provincia/${provinciaId}/canton/${cantonId}`;
      const res = await authFetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) {
        return [];
      }
      return (await res.json()) as RequerimientoEnviado[];
    } catch (e) {
      return [];
    }
  }, [apiBase, authFetch, datosLogin?.usuario_id, datosLogin?.perfil_id, datosLogin?.coe_id, datosLogin?.provincia_id, datosLogin?.canton_id]);

  const getRequerimientosRecibidos = useCallback(async (): Promise<RequerimientoRecibido[]> => {
    try {
      const effectiveId = datosLogin?.usuario_id ?? Number(localStorage.getItem('userId') || 'NaN');
      const perfilId = 3;
      const coeId = datosLogin?.coe_id ?? 0;
      const provinciaId = datosLogin?.provincia_id ?? 0;
      const cantonId = datosLogin?.canton_id ?? 0;
      const userId = Number(effectiveId);
      if (isNaN(userId)) {
        return [];
      }
      const url = `${apiBase}/requerimientos/recibidos/usuario/${userId}/perfil/${perfilId}/coe/${coeId}/provincia/${provinciaId}/canton/${cantonId}`;
      const res = await authFetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) {
        return [];
      }
      return (await res.json()) as RequerimientoRecibido[];
    } catch (e) {
      return [];
    }
  }, [apiBase, authFetch, datosLogin?.usuario_id, datosLogin?.perfil_id, datosLogin?.coe_id, datosLogin?.provincia_id, datosLogin?.canton_id]);

  const getRequerimientosRecibidosNotificaciones = useCallback(async (): Promise<RequerimientoRecibidoNotificacion[]> => {
    try {
      const effectiveId = datosLogin?.usuario_id ?? Number(localStorage.getItem('userId') || 'NaN');
      const userId = Number(effectiveId);
      if (isNaN(userId)) {
        return [];
      }
      const url = `${apiBase}/requerimientos/recibidos/notificacion/${userId}`;
      const res = await authFetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) {
        return [];
      }
      return (await res.json()) as RequerimientoRecibidoNotificacion[];
    } catch (e) {
      return [];
    }
  }, [apiBase, authFetch]);


  const value = useMemo<AuthContextValue>(() => ({
    loginResponse,
    datosLogin,
    receptores,
    receptoresStatus,
    recursoGrupos,
    recursoGruposStatus,
    recursoTipos,
    recursoTiposStatus,
    isRestoringSession,
    login,
    loadReceptores,
    loadRecursoGrupos,
    loadRecursoTipos,
    createRequerimiento,
    createRequerimientoRecurso,
    getRequerimientosEnviados,
    getRequerimientosRecibidos,
    getRequerimientoEstados,
    getRequerimientoById,
    getRequerimientoRecursos,
    getRecursoTiposByGrupo,
    getRequerimientosRecibidosNotificaciones,
    authFetch,
    selectedEmergenciaId,
    setSelectedEmergenciaId: (id: number | null) => {
      _setSelectedEmergenciaId(id);
      if (id == null) localStorage.removeItem('selectedEmergenciaId');
      else localStorage.setItem('selectedEmergenciaId', String(id));
    }
  }), [loginResponse, datosLogin, receptores, receptoresStatus, recursoGrupos, recursoGruposStatus, recursoTipos, recursoTiposStatus, isRestoringSession, login, loadReceptores, loadRecursoGrupos, loadRecursoTipos, createRequerimiento, createRequerimientoRecurso, getRequerimientosEnviados, getRequerimientosRecibidos, getRequerimientoEstados, getRequerimientoById, getRequerimientoRecursos, getRecursoTiposByGrupo, getRequerimientosRecibidosNotificaciones, authFetch, selectedEmergenciaId]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};


