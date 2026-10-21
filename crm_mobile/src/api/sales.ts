import api, { RequestOpts } from './axios';

export interface SaleLine {
  product_id: number;
  qty: number;
  unit_price: number;
  // Only used on this phone (receipt and offline queue); the server ignores it.
  product_name?: string;
}

export interface SaleItem {
  product_name: string;
  qty: number;
  unit_price: number;
  total: number;
}

export interface Sale {
  id: number;
  customer_name: string | null;
  payment_method: string;
  total: number;
  created_at: string;
  items?: SaleItem[];
  summary?: string | null;
  item_count?: number;
}

const toSale = (s: any): Sale => ({
  ...s,
  total: Number(s.total) || 0,
  items: s.items?.map((i: any) => ({
    ...i,
    unit_price: Number(i.unit_price) || 0,
    total: Number(i.total) || 0,
  })),
});

export interface SaleInput {
  customer_id?: number;
  customer_name?: string;
  payment_method: string;
  items: SaleLine[];
}

export const createSale = async (data: SaleInput, opts?: RequestOpts): Promise<Sale> =>
  toSale((await api.post('/sales', data, opts)).data.sale);

export const getSales = async (): Promise<Sale[]> =>
  ((await api.get('/sales')).data.sales as any[]).map(toSale);
