import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const URL_KEY = 'custom_backend_url';
const TOKEN_KEY = 'auth_token';

// The live server. Every build talks to it by default.
export const PRODUCTION_URL = 'https://chalamob-backend.onrender.com/api';
// Only offered while developing: an emulator, or a phone on a USB cable.
export const EMULATOR_URL = 'http://10.0.2.2:3001/api';
export const USB_URL = 'http://127.0.0.1:3001/api';
export const DEFAULT_BASE_URL = PRODUCTION_URL;

// A free-tier host puts the server to sleep when idle, and the first request wakes
// it, which can take up to a minute. A generous timeout lets that first request
// succeed instead of looking like "no connection".
const REQUEST_TIMEOUT_MS = 45000;

const api = axios.create({
  baseURL: DEFAULT_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

// The saved server address is read asynchronously. Every request waits for it,
// so the first request after launch never goes to the wrong server.
const urlReady: Promise<void> = AsyncStorage.getItem(URL_KEY)
  .then(async (saved) => {
    const url = saved?.trim();
    if (!url) return;
    // A release build cannot use plain http, so an old developer address (a USB or
    // emulator address saved by a debug build) is dropped and the live server is used.
    if (!__DEV__ && !/^https:\/\//i.test(url)) { await AsyncStorage.removeItem(URL_KEY); return; }
    api.defaults.baseURL = url;
  })
  .catch(() => {});

export const getApiBaseUrl = (): string => api.defaults.baseURL || DEFAULT_BASE_URL;

/** "192.168.1.5:3001" -> "http://192.168.1.5:3001/api" */
export const normalizeBaseUrl = (input: string): string => {
  let url = input.trim().replace(/\/+$/, '');
  // A bare address defaults to https in a release build (the only thing it can reach).
  if (!/^https?:\/\//i.test(url)) url = `${__DEV__ ? 'http' : 'https'}://${url}`;
  if (!/\/api$/i.test(url)) url += '/api';
  return url;
};

export const setApiBaseUrl = async (input: string): Promise<string> => {
  const url = normalizeBaseUrl(input);
  api.defaults.baseURL = url;
  await AsyncStorage.setItem(URL_KEY, url);
  return url;
};

export const resetApiBaseUrl = async (): Promise<string> => {
  api.defaults.baseURL = DEFAULT_BASE_URL;
  await AsyncStorage.removeItem(URL_KEY);
  return DEFAULT_BASE_URL;
};

/** Pings the server's public /health endpoint (served next to /api, not under it). */
export const testConnection = async (input?: string, timeout = 6000): Promise<{ ok: boolean; error?: string }> => {
  const base = input ? normalizeBaseUrl(input) : getApiBaseUrl();
  const healthUrl = base.replace(/\/api$/i, '') + '/health';
  try {
    const res = await axios.get(healthUrl, { timeout });
    return res.data?.status === 'ok'
      ? { ok: true }
      : { ok: false, error: 'Something answered, but it is not the ChalaMob server.' };
  } catch (err: any) {
    return {
      ok: false,
      error: err.code === 'ECONNABORTED' ? 'Timed out. Check the address and Wi-Fi.' : 'Could not reach this address.',
    };
  }
};

// A quick "can I reach the server right now?" check, used to notice when it is back.
export const pingServer = async (): Promise<boolean> => (await testConnection(undefined, 8000)).ok;

// The connectivity store registers this. Every real request tells it whether the
// server answered, so "online" always means "the server is reachable", which is
// what matters here (a shop Wi-Fi without internet can still reach the server).
let onReachability: ((up: boolean) => void) | null = null;
export const setReachabilityHandler = (fn: ((up: boolean) => void) | null) => { onReachability = fn; };

// The auth store registers this so an expired session signs the user out
// instead of leaving the app on screens that can no longer load anything.
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => { onUnauthorized = fn; };

api.interceptors.request.use(async (config) => {
  await urlReady;
  config.baseURL = api.defaults.baseURL;
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => {
    onReachability?.(true);
    return response;
  },
  (error) => {
    // Any answer from the server, even an error, proves it is reachable. No answer means it is not.
    onReachability?.(!!error.response);
    const isLogin = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLogin) onUnauthorized?.();
    return Promise.reject(error);
  },
);

// Extra headers for one request. The offline sync engine uses them to send a
// retry key and the time a change really happened.
export interface RequestOpts { headers?: Record<string, string> }

export default api;
