import api from './axios';

export type OrderStatus = 'pending' | 'confirmed' | 'ready' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: number;
  product_id: number | null;
  name: string;
  qty: number;
  unit_price: number;
}

// An order a customer placed on the web store.
export interface Order {
  id: number;
  order_number: string;
  status: OrderStatus;
  customer_name: string;
  phone: string;
  delivery_method: 'delivery' | 'pickup';
  address: string | null;
  payment_method: 'telebirr' | 'cbe' | 'cash';
  note: string | null;
  total: number;
  created_at: string;
  items: OrderItem[];
}

export interface OrderList {
  orders: Order[];
  pending: number;
}

const toOrder = (o: any): Order => ({
  ...o,
  total: Number(o.total) || 0,
  items: (o.items || []).map((i: any) => ({ ...i, unit_price: Number(i.unit_price) || 0 })),
});

export const getOrders = async (): Promise<OrderList> => {
  const res = await api.get('/orders');
  return { orders: (res.data.orders as any[]).map(toOrder), pending: Number(res.data.pending) || 0 };
};

// Online only: confirming records a sale and takes the stock, which must be decided by the server.
export const setOrderStatus = async (id: number, status: OrderStatus): Promise<Order> =>
  toOrder((await api.put(`/orders/${id}/status`, { status })).data.order);
