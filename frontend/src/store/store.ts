import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import gameReducer from './gameSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    game: gameReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
