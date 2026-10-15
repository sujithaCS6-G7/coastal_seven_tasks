import { create } from 'zustand';
import { authService } from '../api/authService';
import type { UserOut, UserRole } from '../types/api';

/**
 * Day 15: Typed Zustand Global Authentication Store
 */
export interface AuthState {
  token: string | null;
  user: UserOut | null;
  loading: boolean;
  restoreSession: () => Promise<UserOut | null>;
  login: (username: string, password: string) => Promise<UserOut>;
  register: (
    username: string,
    email: string,
    password: string,
    role?: UserRole
  ) => Promise<UserOut>;
  logout: () => void;
}

const getInitialToken = (): string | null => localStorage.getItem('access_token') || null;

const getInitialUser = (): UserOut | null => {
  try {
    const saved = localStorage.getItem('user');
    return saved ? (JSON.parse(saved) as UserOut) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: getInitialToken(),
  user: getInitialUser(),
  loading: Boolean(getInitialToken() && !getInitialUser()),

  restoreSession: async () => {
    const storedToken = localStorage.getItem('access_token');
    if (storedToken) {
      try {
        const profile = await authService.getMe();
        set({ user: profile, token: storedToken, loading: false });
        localStorage.setItem('user', JSON.stringify(profile));
        return profile;
      } catch {
        get().logout();
      }
    }
    set({ loading: false });
    return null;
  },

  login: async (username: string, password: string) => {
    const data = await authService.login(username, password);
    set({ token: data.access_token, user: data.user, loading: false });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  },

  register: async (
    username: string,
    email: string,
    password: string,
    role: UserRole = 'customer'
  ) => {
    const newUser = await authService.register(username, email, password, role);
    return newUser;
  },

  logout: () => {
    authService.logout();
    set({ token: null, user: null, loading: false });
  },
}));

export default useAuthStore;
