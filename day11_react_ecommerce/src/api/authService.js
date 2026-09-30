/**
 * Authentication API Service connecting to FastAPI /auth endpoints.
 */
import axiosClient from './axiosClient';

export const authService = {
  /**
   * Register a new user
   * POST /auth/register
   */
  async register(username, email, password, role = 'customer') {
    const response = await axiosClient.post('/auth/register', {
      username,
      email,
      password,
      role,
    });
    return response.data;
  },

  /**
   * Log in to receive JWT Bearer token
   * POST /auth/login
   */
  async login(username, password) {
    const response = await axiosClient.post('/auth/login', {
      username,
      password,
    });
    return response.data; // { access_token, token_type, expires_in_minutes, user }
  },

  /**
   * Retrieve current authenticated user profile
   * GET /auth/me
   */
  async getMe() {
    const response = await axiosClient.get('/auth/me');
    return response.data; // { id, username, email, role, is_active, created_at }
  },
};
