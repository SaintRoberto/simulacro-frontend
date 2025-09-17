import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../store/store';

export interface ReceptorItem {
  coe_id: number;
  mesa_id: number;
  mesa_nombre: string;
  mesa_siglas: string;
  siglas: string;
}

interface ReceptorState {
  items: ReceptorItem[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error?: string;
}

const initialState: ReceptorState = {
  items: [],
  status: 'idle',
};

export const fetchReceptores = createAsyncThunk<ReceptorItem[], void, { state: RootState }>(
  'receptores/fetch',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { authLogin } = getState();
      const login = authLogin.data;
      if (!login || login.coe_id == null || login.mesa_id == null || (login as any).mesa_grupo_id == null) {
        throw new Error('Faltan datos de login para consultar receptores');
      }
      const coeId = login.coe_id as number;
      const mesaId = login.mesa_id as number;
      const mesaGrupoId = (login as any).mesa_grupo_id as number;
      const apiBase = process.env.REACT_APP_API_URL || '/api';
      const url = `${apiBase}/mesas/${coeId}/${mesaId}/${mesaGrupoId}`;
      const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const data = (await res.json()) as ReceptorItem[];
      return data;
    } catch (err: any) {
      return rejectWithValue(err?.message || 'Error al cargar receptores') as any;
    }
  }
);

const receptorSlice = createSlice({
  name: 'receptores',
  initialState,
  reducers: {
    clearReceptores(state) {
      state.items = [];
      state.status = 'idle';
      state.error = undefined;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReceptores.pending, (state) => {
        state.status = 'loading';
        state.error = undefined;
      })
      .addCase(fetchReceptores.fulfilled, (state, action: PayloadAction<ReceptorItem[]>) => {
        state.status = 'succeeded';
        state.items = action.payload || [];
      })
      .addCase(fetchReceptores.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || action.error.message;
      });
  },
});

export const { clearReceptores } = receptorSlice.actions;

export const selectReceptores = (state: RootState) => state.receptores.items;
export const selectReceptoresOptions = (state: RootState) =>
  (state.receptores.items || []).map((r) => ({
    label: `${r.mesa_nombre} ${r.siglas}`.trim(),
    value: `${r.coe_id}-${r.mesa_id}-${r.siglas}`,
  }));
export const selectReceptoresStatus = (state: RootState) => state.receptores.status;
export const selectReceptoresError = (state: RootState) => state.receptores.error;

export default receptorSlice.reducer;


