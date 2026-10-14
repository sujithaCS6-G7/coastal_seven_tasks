import React, { useEffect, ReactNode } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import type { UserOut, UserRole } from '../types/api';

export interface AuthProviderProps {
  children: ReactNode;
}

export interface UseAuthReturn {
  user: UserOut | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<UserOut>;
  register: (
    username: string,
    email: string,
    password: string,
    role?: UserRole
  ) => Promise<UserOut>;
  logout: () => void;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
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

export const useAuth = (): UseAuthReturn => {
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
