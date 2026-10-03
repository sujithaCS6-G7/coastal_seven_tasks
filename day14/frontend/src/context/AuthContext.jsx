import React, { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Day 14: AuthProvider & useAuth Hook powered by Zustand (useAuthStore)
 * Eliminates Context API re-render cascades while keeping clean hook ergonomics.
 */
export const AuthProvider = ({ children }) => {
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    restoreSession();

    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [restoreSession, logout]);

  return <>{children}</>;
};

export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const loading = useAuthStore((state) => state.loading);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const logout = useAuthStore((state) => state.logout);

  return {
    user,
    token,
    loading,
    isAuthenticated: Boolean(token && user),
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
  };
};

export default useAuthStore;
