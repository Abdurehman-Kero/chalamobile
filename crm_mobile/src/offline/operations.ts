import * as productsApi from '../api/products';
import * as customersApi from '../api/customers';
import * as repairsApi from '../api/repairs';
import * as salesApi from '../api/sales';
import { RequestOpts } from '../api/axios';
import { useAuthStore } from '../store/authStore';
import { formatBr } from '../utils/formatCurrency';
import { todayYmd, fromYmd } from '../utils/formatDate';
import { OpType } from './types';

// One entry per kind of change. Adding offline support for a new kind of change
// means adding one entry here (and, if it changes what a list shows, one case
// in overlays.ts).
interface OpDef {
  // How the change is described in the "waiting to sync" list.
  label: (p: any) => string;
  // The real request.
  run: (p: any, opts: RequestOpts) => Promise<any>;
  // What the screen gets straight away when the change could not be sent yet.
  optimistic: (p: any, localId?: number) => any;
  // True when the server hands back a new record whose id replaces the temporary one.
  creates?: boolean;
}

const nowIso = () => new Date().toISOString();
const daysUntil = (ymd: string) => Math.round((fromYmd(ymd).getTime() - fromYmd(todayYmd()).getTime()) / 86400000);

export const OPS: Record<OpType, OpDef> = {
  'sale.create': {
    label: (p) => `Sale · ${formatBr(p.items.reduce((s: number, i: any) => s + i.unit_price * i.qty, 0))}`,
    run: (p, opts) => salesApi.createSale(p, opts),
    optimistic: (p, localId): salesApi.Sale => {
      const items = p.items.map((i: any) => ({
        product_name: i.product_name || 'Item', qty: i.qty, unit_price: i.unit_price, total: i.unit_price * i.qty,
      }));
      return {
        id: localId!, customer_name: p.customer_name || 'Walk-in', payment_method: p.payment_method,
        total: items.reduce((s: number, i: any) => s + i.total, 0), created_at: nowIso(), items,
      };
    },
    creates: true,
  },

  'product.create': {
    label: (p) => `New product · ${p.name}`,
    run: (p, opts) => productsApi.createProduct(p, opts),
    optimistic: (p, localId): productsApi.Product => ({
      id: localId!, name: p.name, brand: p.brand || null, category: p.category || null, specs: p.specs || null,
      selling_price: p.selling_price, cost_price: p.cost_price ?? null, stock: p.stock ?? 0,
      notes: p.notes || null, is_published: !!p.is_published, emoji: '📦',
    }),
    creates: true,
  },
  'product.update': {
    label: (p) => `Edit product${p.data?.name ? ` · ${p.data.name}` : ''}`,
    run: (p, opts) => productsApi.updateProduct(p.id, p.data, opts),
    optimistic: () => undefined,
  },
  'product.delete': {
    label: (p) => `Remove product${p.name ? ` · ${p.name}` : ''}`,
    run: (p, opts) => productsApi.deleteProduct(p.id, opts),
    optimistic: () => undefined,
  },
  'product.restock': {
    label: (p) => `Restock${p.name ? ` · ${p.name}` : ''} · +${p.qty}`,
    run: (p, opts) => productsApi.restockProduct(p.id, { qty: p.qty, unit_cost: p.unit_cost, supplier: p.supplier }, opts),
    optimistic: () => undefined,
  },

  'customer.create': {
    label: (p) => `New client · ${p.name}`,
    run: (p, opts) => customersApi.createCustomer(p, opts),
    optimistic: (p, localId): customersApi.Customer => ({
      id: localId!, name: p.name, phone: p.phone || null, address: p.address || null, notes: null,
      is_vip: false, total_spent: 0, buy_count: 0, created_at: nowIso(),
    }),
    creates: true,
  },
  'customer.update': {
    label: (p) => `Edit client${p.data?.name ? ` · ${p.data.name}` : ''}`,
    run: (p, opts) => customersApi.updateCustomer(p.id, p.data, opts),
    optimistic: () => undefined,
  },

  'repair.create': {
    label: (p) => `New repair · ${p.device_name}`,
    run: (p, opts) => repairsApi.createRepair(p, opts),
    optimistic: (p, localId): repairsApi.Repair => {
      const me = useAuthStore.getState().user;
      const mine = me?.role === 'technician';
      return {
        id: localId!, ticket_number: 'Not synced', device_name: p.device_name, issue: p.issue,
        customer_name: p.customer_name || null, customer_phone: p.customer_phone || null,
        status: 'received', status_step: 1, estimated_cost: p.estimated_cost ?? null, actual_cost: null, parts_cost: null,
        received_at: nowIso(), promised_date: p.promised_date, days_until_due: daysUntil(p.promised_date),
        is_overdue: false, days_in_shop: 0, completed_at: null, delivered_at: null,
        technician_id: mine ? me!.id : null, technician_name: mine ? me!.name : null,
      };
    },
    creates: true,
  },
  'repair.advance': {
    label: (p) => `${p.handover ? 'Hand over' : 'Move forward'} repair${p.name ? ` · ${p.name}` : ''}`,
    run: (p, opts) => repairsApi.advanceRepairStatus(p.id, p.handover, opts),
    optimistic: () => undefined,
  },
  'repair.update': {
    label: (p) => `Change promised day${p.name ? ` · ${p.name}` : ''}`,
    run: (p, opts) => repairsApi.updateRepair(p.id, p.data, opts),
    optimistic: () => undefined,
  },
  'repair.assign': {
    label: (p) => `Assign repair${p.name ? ` · ${p.name}` : ''}`,
    run: (p, opts) => repairsApi.assignRepair(p.id, p.technician_id, opts),
    optimistic: () => undefined,
  },
};

