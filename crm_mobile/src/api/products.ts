import api, { RequestOpts } from './axios';
import { absoluteImageUrl } from '../utils/images';

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
  // The cover photo's web address, or null when the owner has not added one.
  primary_image: string | null;
}

export interface ProductImage {
  id: number;
  url: string;
  is_primary: boolean;
}

// A photo picked on the phone, ready to upload.
export interface LocalPhoto {
  uri: string;
  name: string;
  type: string;
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
  primary_image: absoluteImageUrl(p.primary_image),
});

const toImage = (i: any): ProductImage => ({ id: i.id, url: absoluteImageUrl(i.url) || '', is_primary: !!i.is_primary });

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

// ── Photos (online only: files are not part of the offline queue) ──

export const getProductImages = async (id: number): Promise<ProductImage[]> =>
  ((await api.get(`/products/${id}`)).data.product.images as any[]).map(toImage);

export const uploadProductImages = async (id: number, photos: LocalPhoto[]): Promise<ProductImage[]> => {
  const form = new FormData();
  // React Native reads a file from its uri when given this shape.
  photos.forEach(p => form.append('images', { uri: p.uri, name: p.name, type: p.type } as any));
  const res = await api.post(`/products/${id}/images`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 90000,
    transformRequest: (data) => data,
  });
  return (res.data.images as any[]).map(toImage);
};

export const deleteProductImage = async (id: number, imageId: number): Promise<void> => {
  await api.delete(`/products/${id}/images/${imageId}`);
};

export const setProductCover = async (id: number, imageId: number): Promise<ProductImage[]> =>
  ((await api.put(`/products/${id}/images/${imageId}/cover`)).data.images as any[]).map(toImage);
