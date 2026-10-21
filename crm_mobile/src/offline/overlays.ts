import { Product, ProductList } from '../api/products';
import { Customer } from '../api/customers';
import { Repair, REPAIR_STAGES } from '../api/repairs';
import { fromYmd, todayYmd } from '../utils/formatDate';
import { Op } from './types';
import { OPS } from './operations';

// What the person should see while changes are still waiting to be sent: the
// server's data with their pending changes applied on top. Nothing is written
// back to the saved copy; once a change reaches the server and the screen
// refetches, the overlay simply has nothing left to add.

const daysUntil = (ymd: string) => Math.round((fromYmd(ymd).getTime() - fromYmd(todayYmd()).getTime()) / 86400000);

export function overlayProducts(data: ProductList, ops: Op[]): ProductList {
  let items = data.items;
  for (const op of ops) {
    const p = op.payload;
    switch (op.type) {
      case 'product.create':
        items = [...items, OPS['product.create'].optimistic(p, op.localId) as Product];
        break;
      case 'product.update':
        items = items.map(x => (x.id === p.id ? { ...x, ...p.data } : x));
        break;
      case 'product.delete':
        items = items.filter(x => x.id !== p.id);
        break;
      case 'product.restock':
        items = items.map(x => (x.id === p.id
          ? { ...x, stock: x.stock + p.qty, cost_price: p.unit_cost ?? x.cost_price }
          : x));
        break;
      case 'sale.create': {
        // Stock drops straight away, so the same item cannot be sold twice offline.
        const sold = new Map<number, number>();
        p.items.forEach((i: any) => sold.set(i.product_id, (sold.get(i.product_id) || 0) + i.qty));
        items = items.map(x => (sold.has(x.id) ? { ...x, stock: Math.max(0, x.stock - sold.get(x.id)!) } : x));
        break;
      }
    }
  }
  return items === data.items ? data : { ...data, items };
}

export function overlayCustomers(data: Customer[], ops: Op[]): Customer[] {
  let list = data;
  for (const op of ops) {
    const p = op.payload;
    switch (op.type) {
      case 'customer.create':
        list = [...list, OPS['customer.create'].optimistic(p, op.localId) as Customer];
        break;
      case 'customer.update':
        list = list.map(c => (c.id === p.id ? { ...c, ...p.data } : c));
        break;
      case 'sale.create':
        if (p.customer_id != null) {
          const total = p.items.reduce((s: number, i: any) => s + i.unit_price * i.qty, 0);
          list = list.map(c => (c.id === p.customer_id ? { ...c, total_spent: c.total_spent + total, buy_count: c.buy_count + 1 } : c));
        }
        break;
    }
  }
  return list;
}

export function overlayRepairs(data: Repair[], ops: Op[]): Repair[] {
  let list = data;
  const now = new Date().toISOString();
  for (const op of ops) {
    const p = op.payload;
    switch (op.type) {
      case 'repair.create':
        list = [OPS['repair.create'].optimistic(p, op.localId) as Repair, ...list];
        break;
      case 'repair.advance':
        list = list.map((r) => {
          const i = REPAIR_STAGES.indexOf(r.status);
          if (r.id !== p.id || i >= REPAIR_STAGES.length - 1) return r;
          const status = REPAIR_STAGES[i + 1];
          return {
            ...r, status, status_step: i + 2,
            completed_at: status === 'completed' ? now : r.completed_at,
            delivered_at: status === 'delivered' ? now : r.delivered_at,
            actual_cost: status === 'delivered' && p.handover ? p.handover.amount_collected : r.actual_cost,
            parts_cost: status === 'delivered' && p.handover?.parts_cost != null ? p.handover.parts_cost : r.parts_cost,
          };
        });
        break;
      case 'repair.update':
        list = list.map(r => (r.id === p.id && p.data.promised_date
          ? { ...r, promised_date: p.data.promised_date, days_until_due: daysUntil(p.data.promised_date), is_overdue: false }
          : r));
        break;
      case 'repair.assign':
        list = list.map(r => (r.id === p.id ? { ...r, technician_id: p.technician_id, technician_name: p.technician_name ?? null } : r));
        break;
    }
  }
  return list;
}
