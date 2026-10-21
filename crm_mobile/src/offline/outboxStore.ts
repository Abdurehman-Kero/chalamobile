import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Op } from './types';

const KEY = 'outbox';

// Replaces a temporary (negative) id with the real one, wherever an id appears.
const ID_KEYS = new Set(['id', 'product_id', 'customer_id', 'technician_id']);
export function mapIds(value: any, from: number, to: number): any {
  if (Array.isArray(value)) return value.map(v => mapIds(v, from, to));
  if (value && typeof value === 'object') {
    const out: any = {};
    for (const k of Object.keys(value)) {
      out[k] = ID_KEYS.has(k) && value[k] === from ? to : mapIds(value[k], from, to);
    }
    return out;
  }
  return value;
}

// True while a payload still points at something that has not reached the server.
export function hasLocalIds(value: any): boolean {
  if (Array.isArray(value)) return value.some(hasLocalIds);
  if (value && typeof value === 'object') {
    return Object.keys(value).some(k => (ID_KEYS.has(k) && typeof value[k] === 'number' && value[k] < 0) || hasLocalIds(value[k]));
  }
  return false;
}

interface OutboxState {
  ops: Op[];
  loaded: boolean;
  running: boolean;
  // Bumped after changes reach the server, so screens fetch the fresh data.
  syncTick: number;
  load: () => Promise<void>;
  add: (op: Op) => void;
  remove: (id: string) => void;
  patch: (id: string, patch: Partial<Op>) => void;
  rewriteIds: (from: number, to: number) => void;
  setRunning: (v: boolean) => void;
  bump: () => void;
}

// The queue lives in AsyncStorage (SQLite on Android), so it survives the app
// being closed or the phone restarting.
const save = (ops: Op[]) => AsyncStorage.setItem(KEY, JSON.stringify(ops)).catch(() => {});

export const useOutboxStore = create<OutboxState>((set, get) => {
  const commit = (ops: Op[]) => { set({ ops }); save(ops); };
  return {
    ops: [],
    loaded: false,
    running: false,
    syncTick: 0,

    load: async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) set({ ops: JSON.parse(raw) });
      } catch { /* start with an empty queue */ }
      set({ loaded: true });
    },

    add: (op) => commit([...get().ops, op]),
    remove: (id) => commit(get().ops.filter(o => o.id !== id)),
    patch: (id, patch) => commit(get().ops.map(o => (o.id === id ? { ...o, ...patch } : o))),
    rewriteIds: (from, to) => commit(get().ops.map(o => ({ ...o, payload: mapIds(o.payload, from, to) }))),
    setRunning: (running) => set({ running }),
    bump: () => set({ syncTick: get().syncTick + 1 }),
  };
});
