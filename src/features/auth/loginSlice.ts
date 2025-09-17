import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../../store/store';

// Tipado de la respuesta del endpoint /usuarios/:id/datos-login
export interface LoginData {
  canton_id: number;
  canton_nombre: string;
  coe_abreviatura: string;
  coe_id: number;
  mesa_id: number;
  mesa_nombre: string;
  mesa_siglas: string;
  mesa_grupo_id: number;
  nick_name: string;
  nivel_coe: number;
  perfil_id: number;
  perfil_nombre: string;
  provincia_id: number;
  provincia_nombre: string;
  usuario_id: number;
  usuario_descripcion: string;
}

interface LoginState {
  data: LoginData | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error?: string;
  authenticated: boolean;
}

const initialState: LoginState = {
  data: null,
  status: 'idle',
  authenticated: false,
};

// Obtiene y guarda en el store los datos de login para el usuario dado
export const fetchLoginData = createAsyncThunk<LoginData, number>(
  'auth/fetchLoginData',
  async (userId: number, { rejectWithValue }) => {
    try {
      const apiBase = process.env.REACT_APP_API_URL || '/api';
      const url = `${apiBase}/usuarios/${userId}/datos-login`;
      const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const data = (await res.json()) as LoginData;
      return data;
    } catch (err: any) {
      return rejectWithValue(err?.message || 'Error al cargar datos de login') as any;
    }
  }
);

// Realiza POST /usuarios/login. Este endpoint devuelve { success: boolean }
export const postLogin = createAsyncThunk<{ success: boolean; usuario_descripcion?: string; usuario_id?: number }, { usuario: string; clave: string }>(
  'auth/postLogin',
  async (payload, { rejectWithValue }) => {
    try {
      const apiBase = process.env.REACT_APP_API_URL || '/api';
      const url = `${apiBase}/usuarios/login`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const data = (await res.json()) as { success: boolean; usuario_descripcion?: string; usuario_id?: number };
      return data;
    } catch (err: any) {
      return rejectWithValue(err?.message || 'Error al iniciar sesión') as any;
    }
  }
);

// Flujo combinado: login -> si success, cargar datos de usuario por id
export const loginAndLoad = (args: { usuario: string; clave: string; userId: number }) =>
  async (dispatch: AppDispatch) => {
    const loginRes = await dispatch(postLogin({ usuario: args.usuario, clave: args.clave }));
    if (postLogin.fulfilled.match(loginRes) && loginRes.payload.success) {
      const uid = loginRes.payload.usuario_id ?? args.userId;
      if (uid) {
        await dispatch(fetchLoginData(uid));
      }
      dispatch(setAuthenticated(true));
      // Persist simple auth flag for PrivateRoute actual (basado en localStorage)
      localStorage.setItem('token', 'true');
      if (uid) localStorage.setItem('userId', String(uid));
      return true;
    }
    dispatch(setAuthenticated(false));
    localStorage.removeItem('token');
    return false;
  };

const loginSlice = createSlice({
  name: 'authLogin',
  initialState,
  reducers: {
    setLoginData(state, action: PayloadAction<LoginData | null>) {
      state.data = action.payload;
      state.status = action.payload ? 'succeeded' : 'idle';
      state.error = undefined;
    },
    setAuthenticated(state, action: PayloadAction<boolean>) {
      state.authenticated = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLoginData.pending, (state) => {
        state.status = 'loading';
        state.error = undefined;
      })
      .addCase(fetchLoginData.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchLoginData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || action.error.message;
      })
      .addCase(postLogin.pending, (state) => {
        state.error = undefined;
      })
      .addCase(postLogin.fulfilled, (state, action) => {
        state.authenticated = !!action.payload.success;
        if (!action.payload.success) {
          state.error = 'Usuario o contraseña incorrectos';
        }
      })
      .addCase(postLogin.rejected, (state, action) => {
        state.authenticated = false;
        state.error = (action.payload as string) || action.error.message;
      });
  },
});

export const { setLoginData, setAuthenticated } = loginSlice.actions;

// Selectores
export const selectLoginData = (state: RootState) => state.authLogin.data;
export const selectLoginStatus = (state: RootState) => state.authLogin.status;
export const selectLoginError = (state: RootState) => state.authLogin.error;
export const selectAuthenticated = (state: RootState) => state.authLogin.authenticated;

export default loginSlice.reducer;
