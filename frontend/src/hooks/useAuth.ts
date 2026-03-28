import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store/store';
import { refreshToken } from '../store/authSlice';

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const auth = useSelector((s: RootState) => s.auth);

  // Attempt silent refresh on mount if no token in memory
  useEffect(() => {
    if (!auth.accessToken) {
      dispatch(refreshToken());
    }
  }, []);

  return {
    isAuthenticated: !!auth.accessToken,
    userId: auth.userId,
    username: auth.username,
    accessToken: auth.accessToken,
    loading: auth.loading,
  };
}
