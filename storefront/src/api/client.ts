import axios, { AxiosError } from 'axios';
import { API_URL } from '../lib/config';
import { useAuth } from '../store/auth';

// A free-tier host sleeps when idle and the first request can take up to a minute.
const api = axios.create({ baseURL: `${API_URL}/public`, timeout: 60000 });

api.interceptors.request.use((config) => {
  const token = useAuth.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    // An expired or invalid session: forget it so the person is asked to sign in again.
    const isAuthCall = error.config?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && useAuth.getState().token && !isAuthCall) useAuth.getState().signOut();
    return Promise.reject(error);
  },
);

/** Starts waking a sleeping server as soon as the site opens. */
export function warmUpServer(): void {
  fetch(`${API_URL.replace(/\/api$/i, '')}/health`, { mode: 'cors' }).catch(() => {});
}

/** A message a customer can act on, never a raw error. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return 'We could not reach the shop server. If your internet is fine, it may be waking up: please try again in a moment.';
    const message = (err.response.data as { error?: string } | undefined)?.error;
    // The shop server answered but does not have the store yet (an older version is still running).
    if (err.response.status === 404 && message === 'Route not found') {
      return 'The shop server is being updated. Please try again in a few minutes.';
    }
    if (message) return message;
    if (err.response.status === 429) return 'Too many attempts. Please wait a few minutes.';
    if (err.response.status >= 500) return 'The shop server had a problem. Please try again in a moment.';
  }
  return fallback;
}

export default api;
