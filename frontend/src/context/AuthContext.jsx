import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './authContextValue';
import { TOKEN_STORAGE_KEY } from '../services/apiClient';
import { authService } from '../services/authService';
import { connectSocket, disconnectSocket } from '../services/socketService';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => window.localStorage.getItem(TOKEN_STORAGE_KEY) || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(window.localStorage.getItem(TOKEN_STORAGE_KEY)));

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken('');
    setUser(null);
    disconnectSocket();
  }, []);

  const refreshProfile = useCallback(async () => {
    const savedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!savedToken) {
      setLoading(false);
      return null;
    }
    try {
      const profile = await authService.getProfile();
      setUser(profile);
      connectSocket();
      return profile;
    } catch {
      clearSession();
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    const onUnauthorized = () => clearSession();
    window.addEventListener('taskflow:unauthorized', onUnauthorized);
    return () => window.removeEventListener('taskflow:unauthorized', onUnauthorized);
  }, [clearSession]);

  const login = useCallback(async (credentials) => {
    const res = await authService.login(credentials);
    window.localStorage.setItem(TOKEN_STORAGE_KEY, res.token);
    setToken(res.token);
    setUser(res.user);
    connectSocket();
    return res;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await authService.register(payload);
    window.localStorage.setItem(TOKEN_STORAGE_KEY, res.token);
    setToken(res.token);
    setUser(res.user);
    connectSocket();
    return res;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) await authService.logout();
    } catch {
      // ignore network error on logout
    } finally {
      clearSession();
    }
  }, [token, clearSession]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout,
      refreshProfile,
      setUser,
    }),
    [user, token, loading, login, register, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

