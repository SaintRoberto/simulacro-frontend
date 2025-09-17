import { configureStore } from '@reduxjs/toolkit';
import catalogReducer from '../features/catalog/catalogSlice';
import authLoginReducer from '../features/auth/loginSlice';
import receptoresReducer from '../features/requerimientos/receptorSlice';

export const store = configureStore({
  reducer: {
    catalog: catalogReducer,
    authLogin: authLoginReducer,
    receptores: receptoresReducer,
  },
  // middleware: (getDefault) => getDefault(), // customize if needed
});

export type AppStore = typeof store;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
