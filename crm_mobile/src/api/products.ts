import api, { RequestOpts } from './axios';

export interface Product {
  id: number;
  name: string;
  brand: string | null;
  category: string | null;
  specs: string | null;
  selling_price: number;
  cost_price: number | null;
  stock: number;
  notes: string | null;
  is_published: boolean;
  emoji: string;
}

export interface ProductInput {
  name: string;
  brand?: string;
  category?: string;
  specs?: string;
  selling_price: number;
  cost_price?: number | null;
  stock?: number;
  notes?: string;
  is_published?: boolean;
}

// Postgres returns DECIMAL columns as strings; convert once here.
const toProduct = (p: any): Product => ({
  id: p.id,
  name: p.name,
  brand: p.brand ?? null,
  category: p.category ?? null,
  specs: p.specs ?? null,
  selling_price: Number(p.selling_price) || 0,
  cost_price: p.cost_price == null ? null : Number(p.cost_price),
  stock: Number(p.stock) || 0,
  notes: p.notes ?? null,
  is_published: !!p.is_published,
  emoji: p.emoji || '📦',
});

export interface ProductList {
  items: Product[];
  // Set by the server so the app and the dashboard agree on what "low" means.
  lowStockAt: number;
}

export const getProducts = async (): Promise<ProductList> => {
  const res = await api.get('/products');
  return {
    items: (res.data.products as any[]).map(toProduct),
    lowStockAt: Number(res.data.low_stock_threshold) || 0,
  };
};

export const createProduct = async (data: ProductInput, opts?: RequestOpts): Promise<Product> =>
  toProduct((await api.post('/products', data, opts)).data.product);

export const updateProduct = async (id: number, data: Partial<ProductInput>, opts?: RequestOpts): Promise<Product> =>
  toProduct((await api.put(`/products/${id}`, data, opts)).data.product);

export const deleteProduct = async (id: number, opts?: RequestOpts): Promise<void> => {
  await api.delete(`/products/${id}`, opts);
};

export const restockProduct = async (
  id: number,
  data: { qty: number; unit_cost?: number; supplier?: string },
  opts?: RequestOpts,
): Promise<Product> => toProduct((await api.post(`/products/${id}/restock`, data, opts)).data.product);
