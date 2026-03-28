import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

interface AuthState {
  userId: string | null;
  username: string | null;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  userId: null,
  username: null,
  accessToken: null,
  loading: false,
  error: null,
};

export const register = createAsyncThunk(
  'auth/register',
  async (data: { username: string; email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await api.post('/api/auth/register', data);
      return res.data;
    } catch (e: any) {
      return rejectWithValue(e.response?.data?.message || 'Registration failed');
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async (data: { username: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await api.post('/api/auth/login', data);
      return res.data;
    } catch (e: any) {
      return rejectWithValue(e.response?.data?.message || 'Login failed');
    }
  }
);

export const refreshToken = createAsyncThunk('auth/refresh', async (_, { rejectWithValue }) => {
  try {
    const res = await api.post('/api/auth/refresh');
    return res.data;
  } catch {
    return rejectWithValue('Session expired');
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await api.post('/api/auth/logout').catch(() => {});
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setTokenFromStorage(state, action) {
      state.accessToken = action.payload.accessToken;
      state.userId = action.payload.userId;
      state.username = action.payload.username;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const handleAuthSuccess = (state: AuthState, action: any) => {
      state.loading = false;
      state.accessToken = action.payload.accessToken;
      state.userId = action.payload.userId;
      state.username = action.payload.username;
      state.error = null;
    };

    builder
      .addCase(register.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(register.fulfilled, handleAuthSuccess)
      .addCase(register.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; })
      .addCase(login.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(login.fulfilled, handleAuthSuccess)
      .addCase(login.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; })
      .addCase(refreshToken.fulfilled, handleAuthSuccess)
      .addCase(refreshToken.rejected, (s) => { s.accessToken = null; s.userId = null; s.username = null; })
      .addCase(logout.fulfilled, () => initialState);
  },
});

export const { setTokenFromStorage, clearError } = authSlice.actions;
export default authSlice.reducer;
