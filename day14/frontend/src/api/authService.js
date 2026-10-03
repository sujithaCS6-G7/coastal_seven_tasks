import apiClient from './axiosClient';

/**
 * Authentication API Service connecting to FastAPI /auth routes.
 */
export const authService = {
  /**
   * Authenticate user with credentials and return JWT token payload.
   */
  async login(username, password) {
    const response = await apiClient.post('/auth/login', {
      username: username.trim(),
      password,
    });
    return response.data; // { access_token, token_type, user }
  },

  /**
   * Register a new account (default role: customer).
   */
  async register(username, email, password, role = 'customer') {
    const response = await apiClient.post('/auth/register', {
      username: username.trim(),
      email: email.trim(),
      password,
      role,
    });
    return response.data; // { id, username, email, role, is_active }
  },

  /**
   * Fetch current authenticated user's profile.
   */
  async getMe() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  /**
   * Client-side session clear.
   */
  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  },
};

export default authService;
