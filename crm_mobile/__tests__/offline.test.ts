/* The offline engine: saving, queuing, ordering, retries and what the screens see meanwhile. */
const mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (k: string) => mockStore[k] ?? null,
    setItem: async (k: string, v: string) => { mockStore[k] = v; },
    removeItem: async (k: string) => { delete mockStore[k]; },
  },
}));
// Keeps the listener so a test can play the part of the phone's connection changing.
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: (cb: any) => { (globalThis as any).__netListener = cb; return () => {}; },
  fetch: jest.fn(),
}));
// The real server is not involved in these tests; the app's "can I reach it?" check is played by hand.
jest.mock('../src/api/axios', () => ({
  __esModule: true,
  default: {},
  pingServer: (...a: any[]) => (globalThis as any).__ping(...a),
  setReachabilityHandler: (fn: any) => { (globalThis as any).__reach = fn; },
}));
jest.mock('../src/store/authStore', () => {
  const user = { id: 1, role: 'owner', name: 'Owner' };
  const useAuthStore: any = (sel: any) => sel({ user });
  useAuthStore.getState = () => ({ user });
  return { useAuthStore };
});

const mockApi = {
  createSale: jest.fn(),
  createProduct: jest.fn(),
  updateProduct: jest.fn(),
  deleteProduct: jest.fn(),
  restockProduct: jest.fn(),
  createCustomer: jest.fn(),
  updateCustomer: jest.fn(),
  createRepair: jest.fn(),
  advanceRepairStatus: jest.fn(),
  updateRepair: jest.fn(),
  assignRepair: jest.fn(),
};
jest.mock('../src/api/sales', () => ({ createSale: (...a: any[]) => mockApi.createSale(...a) }));
jest.mock('../src/api/customers', () => ({
  createCustomer: (...a: any[]) => mockApi.createCustomer(...a),
  updateCustomer: (...a: any[]) => mockApi.updateCustomer(...a),
}));
jest.mock('../src/api/products', () => ({
  createProduct: (...a: any[]) => mockApi.createProduct(...a),
  updateProduct: (...a: any[]) => mockApi.updateProduct(...a),
  deleteProduct: (...a: any[]) => mockApi.deleteProduct(...a),
  restockProduct: (...a: any[]) => mockApi.restockProduct(...a),
}));
jest.mock('../src/api/repairs', () => ({
  REPAIR_STAGES: ['received', 'diagnosing', 'fixing', 'completed', 'delivered'],
  createRepair: (...a: any[]) => mockApi.createRepair(...a),
  advanceRepairStatus: (...a: any[]) => mockApi.advanceRepairStatus(...a),
  updateRepair: (...a: any[]) => mockApi.updateRepair(...a),
  assignRepair: (...a: any[]) => mockApi.assignRepair(...a),
}));

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { discardOp, processQueue, resetRetry, retryOp, useSyncTriggers } from '../src/offline/engine';
import { useOutboxStore } from '../src/offline/outboxStore';
import * as offline from '../src/offline/mutations';
import { overlayCustomers, overlayProducts, overlayRepairs } from '../src/offline/overlays';
import { isLocalId } from '../src/offline/types';
import { useConnectivityStore } from '../src/store/connectivityStore';

const setOnline = (v: boolean) => useConnectivityStore.setState({ isOnline: v });
const ops = () => useOutboxStore.getState().ops;
const networkError = () => Object.assign(new Error('Network Error'), {});            // no response at all
const serverError = (status: number, error: string) => Object.assign(new Error('x'), { response: { status, data: { error } } });

const sale = {
  payment_method: 'cash',
  items: [{ product_id: 7, qty: 2, unit_price: 1000, product_name: 'Phone' }],
};

afterEach(() => { resetRetry(); });

beforeEach(() => {
  (globalThis as any).__ping = jest.fn().mockResolvedValue(true);
  useConnectivityStore.setState({ deviceConnected: true, serverUp: true, isOnline: true });
  resetRetry();
  Object.keys(mockStore).forEach(k => delete mockStore[k]);
  useOutboxStore.setState({ ops: [], running: false, syncTick: 0, loaded: true });
  Object.values(mockApi).forEach(f => f.mockReset());
  setOnline(true);
});

describe('online: behaves like a normal request', () => {
  it('sends the change with a retry key and the time it happened, and returns the real answer', async () => {
    mockApi.createSale.mockResolvedValue({ id: 99, total: 2000 });
    const out = await offline.createSale(sale);

    expect(out.queued).toBe(false);
    expect(out.data).toEqual({ id: 99, total: 2000 });
    const [, opts] = mockApi.createSale.mock.calls[0];
    expect(opts.headers['Idempotency-Key']).toBeTruthy();
    expect(new Date(opts.headers['X-Occurred-At']).getTime()).toBeGreaterThan(Date.now() - 5000);
    expect(ops()).toHaveLength(0);
  });

  it('shows the server’s refusal to the person, and does not keep the change', async () => {
    mockApi.createSale.mockRejectedValue(serverError(400, 'Only 1 left in stock for Phone'));
    await expect(offline.createSale(sale)).rejects.toMatchObject({ response: { status: 400 } });
    expect(ops()).toHaveLength(0);
  });
});

describe('offline: saved on the phone', () => {
  it('queues the change, returns a usable result, and sends nothing', async () => {
    setOnline(false);
    const out = await offline.createSale(sale);

    expect(out.queued).toBe(true);
    expect(out.data.total).toBe(2000);                       // the receipt still works
    expect(out.data.items?.[0].product_name).toBe('Phone');
    expect(isLocalId(out.data.id)).toBe(true);
    expect(mockApi.createSale).not.toHaveBeenCalled();
    expect(ops()).toHaveLength(1);
    expect(mockStore.outbox).toContain('sale.create');        // persisted: survives closing the app
  });

  it('sends everything in order when the connection returns', async () => {
    setOnline(false);
    await offline.createCustomer({ name: 'Ahmed' });
    await offline.createSale(sale);
    await offline.updateCustomer(5, { is_vip: true });
    expect(ops()).toHaveLength(3);

    const order: string[] = [];
    mockApi.createCustomer.mockImplementation(async () => { order.push('customer'); return { id: 50 }; });
    mockApi.createSale.mockImplementation(async () => { order.push('sale'); return { id: 60 }; });
    mockApi.updateCustomer.mockImplementation(async () => { order.push('vip'); return {}; });

    setOnline(true);
    await processQueue();

    expect(order).toEqual(['customer', 'sale', 'vip']);
    expect(ops()).toHaveLength(0);
    expect(useOutboxStore.getState().syncTick).toBe(1);       // screens are told to refetch
  });

  it('swaps a temporary id for the real one in later changes', async () => {
    setOnline(false);
    const created = await offline.createProduct({ name: 'New Phone', selling_price: 500, stock: 3 });
    const localId = created.data.id;
    expect(isLocalId(localId)).toBe(true);
    await offline.restockProduct(localId, { qty: 10 }, 'New Phone');
    await offline.createSale({ payment_method: 'cash', items: [{ product_id: localId, qty: 1, unit_price: 500 }] });

    mockApi.createProduct.mockResolvedValue({ id: 321 });
    mockApi.restockProduct.mockResolvedValue({});
    mockApi.createSale.mockResolvedValue({ id: 1 });
    setOnline(true);
    await processQueue();

    expect(mockApi.restockProduct.mock.calls[0][0]).toBe(321);
    expect(mockApi.createSale.mock.calls[0][0].items[0].product_id).toBe(321);
    expect(ops()).toHaveLength(0);
  });

  it('stops at the first connection failure and keeps the rest, in order', async () => {
    setOnline(false);
    await offline.createCustomer({ name: 'A' });
    await offline.createCustomer({ name: 'B' });
    await offline.createCustomer({ name: 'C' });

    mockApi.createCustomer
      .mockResolvedValueOnce({ id: 1 })
      .mockRejectedValueOnce(networkError());
    setOnline(true);
    await processQueue();

    expect(mockApi.createCustomer).toHaveBeenCalledTimes(2);   // A sent, B failed, C not tried
    expect(ops().map(o => o.payload.name)).toEqual(['B', 'C']);
    expect(ops().every(o => o.status === 'pending')).toBe(true);
  });

  it('retries with the same key, so a lost answer cannot double-apply', async () => {
    setOnline(false);
    await offline.createSale(sale);
    const key = ops()[0].id;

    mockApi.createSale.mockRejectedValueOnce(networkError()).mockResolvedValueOnce({ id: 8 });
    setOnline(true);
    await processQueue();
    await processQueue();

    const keys = mockApi.createSale.mock.calls.map(c => c[1].headers['Idempotency-Key']);
    expect(keys).toEqual([key, key]);
    expect(ops()).toHaveLength(0);
  });

  it('keeps the time the sale really happened, not the time it synced', async () => {
    setOnline(false);
    await offline.createSale(sale);
    const madeAt = ops()[0].createdAt;
    await new Promise<void>(r => setTimeout(() => r(), 15));

    mockApi.createSale.mockResolvedValue({ id: 1 });
    setOnline(true);
    await processQueue();

    expect(new Date(mockApi.createSale.mock.calls[0][1].headers['X-Occurred-At']).getTime()).toBe(madeAt);
  });
});

describe('when the server refuses a change that was made offline', () => {
  it('marks it failed for review instead of losing it, and carries on with the rest', async () => {
    setOnline(false);
    await offline.createSale(sale);
    await offline.createCustomer({ name: 'Zed' });

    mockApi.createSale.mockRejectedValue(serverError(400, 'Only 0 left in stock for Phone'));
    mockApi.createCustomer.mockResolvedValue({ id: 2 });
    setOnline(true);
    await processQueue();

    expect(ops()).toHaveLength(1);
    expect(ops()[0]).toMatchObject({ type: 'sale.create', status: 'failed', error: 'Only 0 left in stock for Phone' });
    expect(mockApi.createCustomer).toHaveBeenCalled();
  });

  it('fails changes that depend on something that could not be saved', async () => {
    setOnline(false);
    const p = await offline.createProduct({ name: 'Bad', selling_price: 1 });
    await offline.restockProduct(p.data.id, { qty: 5 });

    mockApi.createProduct.mockRejectedValue(serverError(400, 'Product name is required'));
    setOnline(true);
    await processQueue();

    expect(mockApi.restockProduct).not.toHaveBeenCalled();
    expect(ops().map(o => o.status)).toEqual(['failed', 'failed']);
  });

  it('can be retried or discarded', async () => {
    setOnline(false);
    await offline.createSale(sale);
    mockApi.createSale.mockRejectedValueOnce(serverError(400, 'nope'));
    setOnline(true);
    await processQueue();
    const id = ops()[0].id;
    expect(ops()[0].status).toBe('failed');

    mockApi.createSale.mockResolvedValue({ id: 3 });
    retryOp(id);
    await processQueue();
    expect(ops()).toHaveLength(0);

    setOnline(false);
    await offline.createSale(sale);
    discardOp(ops()[0].id);
    expect(ops()).toHaveLength(0);
  });
});

describe('what the screens see while changes are waiting', () => {
  const list = { items: [{ id: 7, name: 'Phone', brand: 'S', category: 'C', specs: null, selling_price: 1000, cost_price: 600, stock: 3, notes: null, is_published: true, emoji: '📱' }], lowStockAt: 4 };

  it('a queued sale lowers stock so the same item cannot be sold twice', async () => {
    setOnline(false);
    await offline.createSale(sale);
    const shown = overlayProducts(list as any, ops());
    expect(shown.items[0].stock).toBe(1);
    expect(list.items[0].stock).toBe(3);                      // the saved server copy is untouched
  });

  it('a queued restock raises stock, a queued product appears, a removed one disappears', async () => {
    setOnline(false);
    await offline.restockProduct(7, { qty: 5 });
    await offline.createProduct({ name: 'Fresh', selling_price: 10, stock: 1 });
    expect(overlayProducts(list as any, ops()).items.map(i => [i.name, i.stock])).toEqual([['Phone', 8], ['Fresh', 1]]);
    await offline.deleteProduct(7);
    expect(overlayProducts(list as any, ops()).items.map(i => i.name)).toEqual(['Fresh']);
  });

  it('a queued sale to a client updates their totals', async () => {
    setOnline(false);
    await offline.createSale({ ...sale, customer_id: 4 });
    const customers = [{ id: 4, name: 'Ahmed', total_spent: 500, buy_count: 1 }] as any;
    expect(overlayCustomers(customers, ops())[0]).toMatchObject({ total_spent: 2500, buy_count: 2 });
  });

  it('a queued ticket appears, and moving it forward changes its stage', async () => {
    setOnline(false);
    const t = await offline.createRepair({ device_name: 'A15', issue: 'screen', promised_date: '2099-01-02' });
    await offline.advanceRepair(t.data.id);
    const shown = overlayRepairs([], ops());
    expect(shown).toHaveLength(1);
    expect(shown[0]).toMatchObject({ device_name: 'A15', status: 'diagnosing', status_step: 2 });
  });

  it('handing a repair over records the money in the meantime', async () => {
    setOnline(false);
    await offline.advanceRepair(9, { amount_collected: 1800, parts_cost: 500 });
    const repairs = [{ id: 9, status: 'completed', status_step: 4, actual_cost: null, parts_cost: null, completed_at: null, delivered_at: null }] as any;
    expect(overlayRepairs(repairs, ops())[0]).toMatchObject({ status: 'delivered', actual_cost: 1800, parts_cost: 500 });
  });
});

describe('syncing without anyone pressing anything', () => {
  it('keeps retrying by itself after a failed attempt, until the server answers', async () => {
    jest.useFakeTimers();
    try {
      setOnline(false);
      await offline.createSale(sale);
      mockApi.createSale
        .mockRejectedValueOnce(networkError())   // the network is not fully ready yet
        .mockRejectedValueOnce(networkError())
        .mockResolvedValueOnce({ id: 1 });
      setOnline(true);

      await processQueue();                       // first attempt fails
      expect(ops()).toHaveLength(1);

      await jest.advanceTimersByTimeAsync(2100);  // retried on its own after 2s: fails again
      expect(mockApi.createSale).toHaveBeenCalledTimes(2);
      expect(ops()).toHaveLength(1);

      await jest.advanceTimersByTimeAsync(5100);  // and again after 5s: succeeds
      expect(mockApi.createSale).toHaveBeenCalledTimes(3);
      expect(ops()).toHaveLength(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('sends the saved changes the moment the phone reports a connection again', async () => {
    const net = (state: any) => (globalThis as any).__netListener(state);
    const stopWatching = useConnectivityStore.getState().startMonitoring();
    net({ isConnected: true, isInternetReachable: true });

    const Probe = () => { useSyncTriggers(); return null; };
    let tree: any;
    await ReactTestRenderer.act(async () => { tree = ReactTestRenderer.create(React.createElement(Probe)); });

    // Lose the connection and keep working.
    await ReactTestRenderer.act(async () => { net({ isConnected: false, isInternetReachable: false }); });
    const saved = await offline.createSale(sale);
    expect(saved.queued).toBe(true);
    expect(mockApi.createSale).not.toHaveBeenCalled();

    // The connection comes back. Nobody taps anything.
    mockApi.createSale.mockResolvedValue({ id: 5 });
    await ReactTestRenderer.act(async () => {
      net({ isConnected: true, isInternetReachable: true });
      await new Promise<void>(r => setTimeout(() => r(), 30));
    });

    expect(mockApi.createSale).toHaveBeenCalledTimes(1);
    expect(ops()).toHaveLength(0);

    tree.unmount();
    stopWatching();
  });

  it('does not wait for the connection event when the server answers something else first', async () => {
    const { syncIfWaiting } = require('../src/offline/engine');
    setOnline(false);
    await offline.createCustomer({ name: 'Late' });
    mockApi.createCustomer.mockResolvedValue({ id: 9 });
    setOnline(true);
    syncIfWaiting();                              // e.g. a screen just loaded data successfully
    await new Promise<void>(r => setTimeout(() => r(), 20));
    expect(mockApi.createCustomer).toHaveBeenCalledTimes(1);
    expect(ops()).toHaveLength(0);
  });
});

describe('online means "the server answers", not "the phone has internet"', () => {
  it('counts a Wi-Fi without internet as online, and sends straight away', async () => {
    const net = (state: any) => (globalThis as any).__netListener(state);
    const stop = useConnectivityStore.getState().startMonitoring();

    // A shop network that reaches the server but has no internet.
    net({ isConnected: true, isInternetReachable: false });
    expect(useConnectivityStore.getState().isOnline).toBe(true);

    mockApi.createSale.mockResolvedValue({ id: 4 });
    const out = await offline.createSale(sale);
    expect(out.queued).toBe(false);
    expect(mockApi.createSale).toHaveBeenCalledTimes(1);
    expect(ops()).toHaveLength(0);
    stop();
  });

  it('goes offline by itself when the server stops answering, and syncs when it answers again', async () => {
    jest.useFakeTimers();
    const reach = (up: boolean) => (globalThis as any).__reach(up);
    const Probe = () => { useSyncTriggers(); return null; };
    let tree: any;
    try {
      await ReactTestRenderer.act(async () => { tree = ReactTestRenderer.create(React.createElement(Probe)); });

      // A request gets no answer: the server is down. The phone still has a network.
      await ReactTestRenderer.act(async () => { reach(false); });
      expect(useConnectivityStore.getState()).toMatchObject({ deviceConnected: true, serverUp: false, isOnline: false });

      const saved = await offline.createSale(sale);           // no 12-second wait: it is saved at once
      expect(saved.queued).toBe(true);
      expect(mockApi.createSale).not.toHaveBeenCalled();

      // The server comes back. Within a few seconds the app notices and sends the sale.
      mockApi.createSale.mockResolvedValue({ id: 6 });
      await ReactTestRenderer.act(async () => { await jest.advanceTimersByTimeAsync(4200); });

      expect((globalThis as any).__ping).toHaveBeenCalled();
      expect(useConnectivityStore.getState().isOnline).toBe(true);
      expect(mockApi.createSale).toHaveBeenCalledTimes(1);
      expect(ops()).toHaveLength(0);
    } finally {
      tree?.unmount();
      jest.useRealTimers();
    }
  });

  it('any answer from the server, even an error, means it is reachable', () => {
    const reach = (up: boolean) => (globalThis as any).__reach(up);
    reach(false);
    expect(useConnectivityStore.getState().isOnline).toBe(false);
    reach(true);   // e.g. a 400 or 500 response still came from the server
    expect(useConnectivityStore.getState().isOnline).toBe(true);
  });
});
