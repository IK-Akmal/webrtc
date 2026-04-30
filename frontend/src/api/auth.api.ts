import api from './axios';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserProfile;
}

export const authApi = {
  register: (email: string, displayName: string, password: string) =>
    api.post<AuthResponse>('/auth/register', { email, displayName, password }),

  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<UserProfile>('/users/me'),
};
