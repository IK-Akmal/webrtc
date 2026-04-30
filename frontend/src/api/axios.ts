import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { dispatchToast } from '../contexts/ToastContext';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

/** Returns true when the interceptor already dispatched a toast for this error. */
export function isGloballyHandled(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  const status = err.response?.status;
  return !err.response || status === 429 || (status !== undefined && status >= 500);
}

let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    const status = error.response?.status;

    // Fire global toasts for network / rate-limit / server errors
    if (!error.response) {
      dispatchToast?.('error', 'Network error. Check your connection.');
    } else if (status === 429) {
      dispatchToast?.('warning', 'Too many requests. Please try again in a minute.');
    } else if (status !== undefined && status >= 500) {
      dispatchToast?.('error', 'Server error. Please try again later.');
    }

    // 401 silent refresh flow
    const original = error.config;
    if (status !== 401 || !original) return Promise.reject(error);

    if ((original as { _retry?: boolean })._retry) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(error);
    }
    (original as { _retry?: boolean })._retry = true;

    if (!refreshing) {
      refreshing = axios
        .post<{ accessToken: string }>('/api/auth/refresh', {}, { withCredentials: true })
        .then((r) => {
          useAuthStore.getState().setAccessToken(r.data.accessToken);
          return r.data.accessToken;
        })
        .catch(() => {
          useAuthStore.getState().logout();
          window.location.href = '/login';
          return null;
        })
        .finally(() => {
          refreshing = null;
        });
    }

    const newToken = await refreshing;
    if (!newToken) return Promise.reject(error);
    original.headers['Authorization'] = `Bearer ${newToken}`;
    return api(original);
  },
);

export default api;
