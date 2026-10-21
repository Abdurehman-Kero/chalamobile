import { useEffect } from 'react';
import { AppState } from 'react-native';
import { getErrorMessage } from '../api/errors';
import { useAuthStore } from '../store/authStore';
import { useConnectivityStore } from '../store/connectivityStore';
import { hasLocalIds, useOutboxStore } from './outboxStore';
import { OPS } from './operations';
import { Op, OpType, Outcome } from './types';

// ---------------------------------------------------------------------------
// How offline works, in one place:
//
//  1. A screen calls submit(type, payload). The change is written to the outbox
//     (saved on the phone) first, so it can never be lost.
//  2. If the phone is online, the outbox is sent to the server straight away,
//     oldest change first. The screen waits for the answer, exactly as it
//     always did, and shows server errors the same way.
//  3. If the phone is offline (or the server cannot be reached), the change just
//     stays in the outbox, and the screen is told it was "queued".
//  4. When the connection returns, the outbox is sent automatically.
//
// Each request carries a retry key (so a repeat can never double-apply) and the
// time the change really happened (so a sale made at 10am is reported at 10am).
// ---------------------------------------------------------------------------

interface Waiter {
  resolve: (o: Outcome<any>) => void;
  reject: (e: any) => void;
  optimistic: any;
}
const waiters = new Map<string, Waiter>();
let running: Promise<void> | null = null;
let seq = 0;

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${(seq++).toString(36)}`;
// Negative so it can never clash with a real (positive) database id.
const newLocalId = () => -(Date.now() * 1000 + (seq++ % 1000));

const isOnline = () => useConnectivityStore.getState().isOnline;
const currentUserId = () => useAuthStore.getState().user?.id ?? null;
const mine = (ops: Op[]) => ops.filter(o => o.userId === currentUserId());

/** Saves a change and sends it now if it can be, or keeps it for later. */
export function submit<R = any>(type: OpType, payload: any): Promise<Outcome<R>> {
  const userId = currentUserId();
  if (userId == null) return Promise.reject(new Error('Not signed in'));

  const def = OPS[type];
  const op: Op = {
    id: newId(), userId, type, payload, createdAt: Date.now(),
    localId: def.creates ? newLocalId() : undefined, status: 'pending', attempts: 0, error: null,
  };
  const optimistic = def.optimistic(payload, op.localId);

  return new Promise((resolve, reject) => {
    waiters.set(op.id, { resolve, reject, optimistic });
    useOutboxStore.getState().add(op);
    if (isOnline()) processQueue();
    else settleQueued();
  });
}

// Anyone still waiting when the queue stops gets "queued" (saved on the phone).
function settleQueued() {
  waiters.forEach((w, id) => {
    w.resolve({ data: w.optimistic, queued: true });
    waiters.delete(id);
  });
}

/** Sends everything waiting, oldest first. Safe to call at any time. */
export function processQueue(): Promise<void> {
  if (running) return running;
  // Starts on the next tick, so `running` is always set before the work can finish.
  // (With an empty outbox the work ends at once; setting the flag afterwards would leave it stuck.)
  running = Promise.resolve().then(async () => {
    const store = useOutboxStore.getState();
    store.setRunning(true);
    let synced = false;
    let blocked = false;   // stopped because the server could not be reached
    try {
      // Always take the oldest waiting change, so changes made while this runs are picked up too.
      for (;;) {
        const userId = currentUserId();
        if (userId == null) break;
        const next = useOutboxStore.getState().ops.find(o => o.userId === userId && o.status === 'pending');
        if (!next) break;

        // It points at something that never reached the server, so it cannot be sent.
        if (hasLocalIds(next.payload)) {
          useOutboxStore.getState().patch(next.id, { status: 'failed', error: 'It depends on an item that could not be saved.' });
          rejectWaiter(next.id, new Error('It depends on an item that could not be saved.'));
          continue;
        }

        const outcome = await attempt(next);
        if (outcome === 'stop') { blocked = true; break; }
        if (outcome === 'auth') break;
        if (outcome === 'synced') synced = true;
      }
    } finally {
      running = null;
      useOutboxStore.getState().setRunning(false);
      settleQueued();
      if (synced) useOutboxStore.getState().bump();
      if (blocked) scheduleRetry();
      else resetRetry();
    }
  });
  return running;
}

// Right after a connection returns, the first request often fails because the
// network is not fully ready yet. So after a failure we try again by ourselves,
// quickly at first and then more gently, until the server answers.
const RETRY_DELAYS = [2000, 5000, 10000, 20000, 30000];
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryStep = 0;

/** Stops any scheduled automatic retry (used when signing out). */
export function resetRetry() {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  retryStep = 0;
}

function scheduleRetry() {
  if (retryTimer) return;
  const delay = RETRY_DELAYS[Math.min(retryStep, RETRY_DELAYS.length - 1)];
  retryStep++;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    const userId = currentUserId();
    const waiting = useOutboxStore.getState().ops.some(o => o.userId === userId && o.status === 'pending');
    if (waiting) processQueue(); else resetRetry();
  }, delay);
}

/** Call whenever the server has just answered something: if changes are waiting, send them now. */
export function syncIfWaiting() {
  const userId = currentUserId();
  if (running || userId == null) return;
  if (useOutboxStore.getState().ops.some(o => o.userId === userId && o.status === 'pending')) processQueue();
}

function rejectWaiter(id: string, error: any) {
  const w = waiters.get(id);
  if (w) { w.reject(error); waiters.delete(id); }
}

async function attempt(op: Op): Promise<'synced' | 'handled' | 'stop' | 'auth'> {
  const store = useOutboxStore.getState();
  try {
    const data = await OPS[op.type].run(op.payload, {
      headers: { 'Idempotency-Key': op.id, 'X-Occurred-At': new Date(op.createdAt).toISOString() },
    });
    store.remove(op.id);
    // The server gave a new record its real id; fix every later change that refers to it.
    if (op.localId != null && data && typeof data.id === 'number') store.rewriteIds(op.localId, data.id);
    const w = waiters.get(op.id);
    if (w) { w.resolve({ data, queued: false }); waiters.delete(op.id); }
    return 'synced';
  } catch (err: any) {
    const status = err?.response?.status;
    // The login ran out: keep everything; it is sent as soon as the person signs in again.
    if (status === 401) return 'auth';
    // No connection, or the server is down or busy: keep it and try again shortly.
    if (!status || status >= 500 || status === 408 || status === 429) {
      store.patch(op.id, { attempts: op.attempts + 1 });
      return 'stop';
    }
    // The server understood and refused it (not enough stock, missing field...).
    const message = getErrorMessage(err, 'The server did not accept this change.');
    if (waiters.has(op.id)) {
      // The person is looking at the form: show the error there, as always.
      store.remove(op.id);
      rejectWaiter(op.id, err);
    } else {
      // It was sent later, in the background: keep it so the person can review it.
      store.patch(op.id, { status: 'failed', error: message });
    }
    return 'handled';
  }
}

/** Put a refused change back in the queue to try again. */
export function retryOp(id: string) {
  useOutboxStore.getState().patch(id, { status: 'pending', error: null });
  if (isOnline()) processQueue();
}

/** Throw a refused change away. */
export function discardOp(id: string) {
  useOutboxStore.getState().remove(id);
  useOutboxStore.getState().bump();
}

/** How many changes are waiting / refused for the signed-in person. */
export function useOutboxCounts() {
  const ops = useOutboxStore(s => s.ops);
  const running = useOutboxStore(s => s.running);
  const userId = useAuthStore(s => s.user?.id);
  const own = ops.filter(o => o.userId === userId);
  return {
    ops: own,
    pending: own.filter(o => o.status === 'pending').length,
    failed: own.filter(o => o.status === 'failed').length,
    running,
  };
}

/** Starts the automatic syncing. Mount once, while signed in. */
export function useSyncTriggers() {
  const loaded = useOutboxStore(s => s.loaded);
  const reconnectTick = useConnectivityStore(s => s.reconnectTick);
  const userId = useAuthStore(s => s.user?.id);

  useEffect(() => { if (!loaded) useOutboxStore.getState().load(); }, [loaded]);

  // Whenever the phone is online and something is waiting: on start, on sign-in, when the
  // connection comes back, and after anything is added. Nobody has to press a button.
  const online = useConnectivityStore(s => s.isOnline);
  const waiting = useOutboxStore(s => s.ops.filter(o => o.userId === userId && o.status === 'pending').length);
  useEffect(() => {
    if (loaded && userId != null && online && waiting > 0) processQueue();
  }, [loaded, userId, online, waiting, reconnectTick]);

  // Coming back to the app from the background, and a gentle retry while anything is waiting.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active' && isOnline()) processQueue(); });
    const timer = setInterval(() => {
      const waiting = mine(useOutboxStore.getState().ops).some(o => o.status === 'pending');
      if (waiting && isOnline()) processQueue();
    }, 30000);
    return () => { sub.remove(); clearInterval(timer); };
  }, []);
}
