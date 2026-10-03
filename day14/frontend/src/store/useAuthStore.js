import { create } from 'zustand';
import { authService } from '../api/authService';

/**
 * Day 14: Zustand Global Authentication Store
 * Eliminates Context API wrapper re-render cascades and provides reactive, decoupled state.
 */
export const useAuthStore = create((set, get) => ({
  token: localStorage.getItem('access_token') || null,
  user: (() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })(),
  loading: true,

  get isAuthenticated() {
    return Boolean(get().token && get().user);
  },

  get isAdmin() {
    return get().user?.role === 'admin';
  },

  restoreSession: async () => {
    const storedToken = localStorage.getItem('access_token');
    if (storedToken) {
      try {
        const profile = await authService.getMe();
        set({ user: profile, token: storedToken, loading: false });
        localStorage.setItem('user', JSON.stringify(profile));
        return profile;
      } catch (err) {
        console.warn('[Zustand useAuthStore] Session restore failed, logging out.');
        get().logout();
      }
    }
    set({ loading: false });
    return null;
  },

  login: async (username, password) => {
    const data = await authService.login(username, password);
    set({ token: data.access_token, user: data.user, loading: false });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  },

  register: async (username, email, password, role = 'customer') => {
    const newUser = await authService.register(username, email, password, role);
    return newUser;
  },

  logout: () => {
    authService.logout();
    set({ token: null, user: null, loading: false });
  },
}));

export default useAuthStore;
