export type StockState = 'in' | 'low' | 'out';

/** A product as shown in lists. Never includes cost or private notes. */
export interface Product {
  id: number;
  name: string;
  brand: string | null;
  category: string | null;
  specs: string | null;
  price: number;
  image: string | null;
  stock: StockState;
  sold: number;
  created_at: string;
}

export interface ProductDetail extends Product {
  storage_gb: number | null;
  ram_gb: number | null;
  images: { id: number; url: string }[];
}

export interface Category { name: string; count: number }

export interface HomeData {
  hero: Product | null;
  trending: Product[];
  featured: Product[];
  picks: Product[];
  categories: Category[];
  total: number;
}

export interface ProductPage {
  products: Product[];
  total: number;
  page: number;
  has_more: boolean;
}

export type Tab = 'all' | 'top' | 'featured' | 'new';
export type Sort = 'name' | 'price_asc' | 'price_desc' | 'new' | 'top';

export interface Account { id: number; name: string; phone: string; email: string | null }

export type OrderStatus = 'pending' | 'confirmed' | 'ready' | 'delivered' | 'cancelled';
export type PaymentMethod = 'telebirr' | 'cbe' | 'cash';
export type DeliveryMethod = 'delivery' | 'pickup';

export interface Order {
  id: number;
  order_number: string;
  status: OrderStatus;
  total: number;
  delivery_method: DeliveryMethod;
  address: string | null;
  payment_method: PaymentMethod;
  note: string | null;
  customer_name: string;
  phone: string;
  created_at: string;
  updated_at: string;
  items: { product_id: number | null; name: string; qty: number; unit_price: number }[];
}

export interface Notice {
  id: number;
  order_id: number | null;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}
