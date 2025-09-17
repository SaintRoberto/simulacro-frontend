import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AppDispatch, RootState } from '../../store/store';

export interface CatalogEntry<T = any> {
  data: T;
  fetchedAt: number; // epoch ms
}

interface CatalogState {
  items: Record<string, CatalogEntry>;
  ttlMs: number; // time to live for cache
}

const initialState: CatalogState = {
  items: {},
  ttlMs: 1000 * 60 * 30, // 30 min por defecto
};

const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {
    setTTL(state, action: PayloadAction<number>) {
      state.ttlMs = action.payload;
    },
    setCatalog<T = any>(state, action: PayloadAction<{ key: string; data: T; fetchedAt?: number }>) {
      const { key, data, fetchedAt } = action.payload;
      state.items[key] = { data, fetchedAt: fetchedAt ?? Date.now() } as CatalogEntry;
    },
    setManyCatalogs(state, action: PayloadAction<Record<string, any>>) {
      const now = Date.now();
      for (const [key, data] of Object.entries(action.payload)) {
        state.items[key] = { data, fetchedAt: now };
      }
    },
    clearCatalog(state) {
      state.items = {};
    },
  },
});

export const { setTTL, setCatalog, setManyCatalogs, clearCatalog } = catalogSlice.actions;

// Selectors
export const selectCatalog = <T = any>(state: RootState, key: string): T | undefined => {
  return state.catalog.items[key]?.data as T | undefined;
};

export const selectCatalogEntry = (state: RootState, key: string): CatalogEntry | undefined => {
  return state.catalog.items[key];
};

export const isCatalogStale = (state: RootState, key: string): boolean => {
  const entry = state.catalog.items[key];
  if (!entry) return true;
  return Date.now() - entry.fetchedAt > state.catalog.ttlMs;
};

// Thunk helper: cargar solo si hace falta
export const loadCatalogIfNeeded = <T = any>(
  key: string,
  fetcher: () => Promise<T>,
) => async (dispatch: AppDispatch, getState: () => RootState) => {
  const state = getState();
  const stale = isCatalogStale(state, key);
  if (!stale) return selectCatalog<T>(state, key);

  const data = await fetcher();
  dispatch(setCatalog({ key, data }));
  return data;
};

export default catalogSlice.reducer;
