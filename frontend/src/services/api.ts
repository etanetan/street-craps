import axios from 'axios';
import { store } from '../store/store';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true, // include cookies for refresh token
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, attempt silent refresh then retry
let refreshing = false;
let queue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (refreshing) {
        return new Promise((resolve) => {
          queue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }
      refreshing = true;
      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL || ''}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const { accessToken } = res.data;
        store.dispatch({ type: 'auth/setTokenFromStorage', payload: res.data });
        queue.forEach((cb) => cb(accessToken));
        queue = [];
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        store.dispatch({ type: 'auth/logout/fulfilled' });
        return Promise.reject(error);
      } finally {
        refreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
