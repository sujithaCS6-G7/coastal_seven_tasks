import apiClient from './axiosClient';
import type {
  TokenResponse,
  UserOut,
  UserRole,
  UserLoginPayload,
  UserRegisterPayload,
} from '../types/api';

/**
 * Day 15: Typed Authentication API Service connecting to FastAPI /auth routes.
 */
export const authService = {
  async login(username: string, password: string): Promise<TokenResponse> {
    const payload: UserLoginPayload = {
      username: username.trim(),
      password,
    };
    const response = await apiClient.post<TokenResponse>('/auth/login', payload);
    return response.data;
  },

  async register(
    username: string,
    email: string,
    password: string,
    role: UserRole = 'customer'
  ): Promise<UserOut> {
    const payload: UserRegisterPayload = {
      username: username.trim(),
      email: email.trim(),
      password,
      role,
    };
    const response = await apiClient.post<UserOut>('/auth/register', payload);
    return response.data;
  },

  async getMe(): Promise<UserOut> {
    const response = await apiClient.get<UserOut>('/auth/me');
    return response.data;
  },

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  },
};

export default authService;
