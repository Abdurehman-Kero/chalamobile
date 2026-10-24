import axios, { AxiosError } from 'axios';
import { API_URL } from '../lib/config';
import { tr, type Key } from '../i18n';
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

// What the server tells us, by its code, said in the customer's language.
const BY_CODE: Record<string, Key> = {
  INVALID_CREDS: 'err.invalidCreds',
  PHONE_TAKEN: 'err.phoneTaken',
  TOO_MANY_REQUESTS: 'err.tooMany',
  INVALID_TOKEN: 'err.session',
  SERVER_ERROR: 'err.server',
};

interface ServerError { error?: string; code?: string; reason?: string; name?: string; left?: number }

/** A message a customer can act on, never a raw error, in the language they chose. */
export function errorMessage(err: unknown, fallback: Key = 'err.generic'): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return tr('err.network');
    const data = err.response.data as ServerError | undefined;
    // The shop server answered but does not have the store yet (an older version is still running).
    if (err.response.status === 404 && data?.error === 'Route not found') return tr('err.updating');
    if (data?.code && BY_CODE[data.code]) return tr(BY_CODE[data.code]!);
    // A refused order says why, so the customer reads it in their own language.
    if (data?.reason === 'unavailable') return tr('err.unavailable');
    if (data?.reason === 'sold_out' && data.name) return tr('err.soldOut', { name: data.name });
    if (data?.reason === 'low_stock' && data.name) return tr('err.low', { name: data.name, left: data.left ?? 0 });
    if (err.response.status === 429) return tr('err.tooMany');
    if (err.response.status >= 500) return tr('err.server');
    if (data?.error) return data.error;
  }
  return tr(fallback);
}

export default api;
