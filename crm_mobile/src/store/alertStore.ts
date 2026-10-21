import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { todayYmd } from '../utils/formatDate';

const KEY = 'alert_state';

// Per phone, per day: which alerts were seen and which were ignored. Ignoring
// an alert hides it until tomorrow. If the situation changes (more stock sold,
// a new promised day) the server sends a different key, so it comes back.
interface AlertState {
  day: string;
  seen: Record<string, true>;
  ignored: Record<string, true>;
  loaded: boolean;
  load: () => Promise<void>;
  markSeen: (keys: string[]) => void;
  ignore: (keys: string[]) => void;
}

const persist = (s: AlertState) =>
  AsyncStorage.setItem(KEY, JSON.stringify({ day: s.day, seen: s.seen, ignored: s.ignored })).catch(() => {});

export const useAlertStore = create<AlertState>((set, get) => ({
  day: todayYmd(),
  seen: {},
  ignored: {},
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const saved = raw ? JSON.parse(raw) : null;
      // A new day starts clean.
      if (saved && saved.day === todayYmd()) set({ day: saved.day, seen: saved.seen || {}, ignored: saved.ignored || {} });
    } catch { /* start fresh */ }
    set({ loaded: true });
  },

  markSeen: (keys) => {
    const seen = { ...get().seen };
    keys.forEach(k => { seen[k] = true; });
    set({ seen });
    persist(get());
  },

  ignore: (keys) => {
    const ignored = { ...get().ignored };
    const seen = { ...get().seen };
    keys.forEach(k => { ignored[k] = true; seen[k] = true; });
    set({ ignored, seen });
    persist(get());
  },
}));
