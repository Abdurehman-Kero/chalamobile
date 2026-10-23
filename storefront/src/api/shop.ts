import api from './client';
import type {
  Account, DeliveryMethod, HomeData, Notice, Order, PaymentMethod, Product, ProductDetail, ProductPage, Sort, Tab,
} from '../types';

export interface ProductQuery { q?: string; category?: string; tab?: Tab; sort?: Sort; page?: number; limit?: number }

export const getHome = async (): Promise<HomeData> => (await api.get('/home')).data;

export const getCategories = async (): Promise<{ name: string; count: number }[]> =>
  (await api.get('/categories')).data.categories;

export const getProducts = async (query: ProductQuery): Promise<ProductPage> =>
  (await api.get('/products', { params: query })).data;

export const getProduct = async (id: number): Promise<{ product: ProductDetail; related: Product[] }> =>
  (await api.get(`/products/${id}`)).data;

// ── Accounts ──
interface AuthResult { token: string; account: Account }
export const register = async (body: { name: string; phone: string; password: string; email?: string }): Promise<AuthResult> =>
  (await api.post('/auth/register', body)).data;
export const login = async (body: { phone: string; password: string }): Promise<AuthResult> =>
  (await api.post('/auth/login', body)).data;

// ── Orders ──
export interface OrderInput {
  items: { product_id: number; qty: number }[];
  name: string;
  phone: string;
  delivery_method: DeliveryMethod;
  address?: string;
  payment_method: PaymentMethod;
  note?: string;
}
// The key makes a double tap or a retry after a bad connection create only one order.
export const placeOrder = async (body: OrderInput, key: string): Promise<Order> =>
  (await api.post('/orders', body, { headers: { 'Idempotency-Key': key } })).data.order;
export const getOrders = async (): Promise<Order[]> => (await api.get('/orders')).data.orders;
export const getOrder = async (id: number): Promise<Order> => (await api.get(`/orders/${id}`)).data.order;

// ── Notifications ──
export const getNotifications = async (): Promise<{ notifications: Notice[]; unread: number }> =>
  (await api.get('/notifications')).data;
export const markNotificationsRead = async (): Promise<void> => { await api.post('/notifications/read'); };
