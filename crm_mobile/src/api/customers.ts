import api, { RequestOpts } from './axios';

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_vip: boolean;
  total_spent: number;
  buy_count: number;
  created_at: string;
}

export interface CustomerSale {
  id: number;
  total: number;
  payment_method: string;
  created_at: string;
  summary: string | null;
}

export interface CustomerRepair {
  id: number;
  ticket_number: string;
  device_name: string;
  status: string;
  received_at: string;
}

export interface CustomerDetail {
  customer: Customer;
  sales: CustomerSale[];
  repairs: CustomerRepair[];
}

export const toCustomer = (c: any): Customer => ({
  id: c.id,
  name: c.name,
  phone: c.phone ?? null,
  address: c.address ?? null,
  notes: c.notes ?? null,
  is_vip: !!c.is_vip,
  total_spent: Number(c.total_spent) || 0,
  buy_count: Number(c.buy_count) || 0,
  created_at: c.created_at,
});

export const getCustomers = async (): Promise<Customer[]> =>
  ((await api.get('/customers')).data.customers as any[]).map(toCustomer);

export const getCustomer = async (id: number): Promise<CustomerDetail> => {
  const d = (await api.get(`/customers/${id}`)).data;
  return {
    customer: toCustomer(d.customer),
    sales: (d.sales as any[]).map(s => ({ ...s, total: Number(s.total) || 0 })),
    repairs: d.repairs,
  };
};

export const createCustomer = async (data: { name: string; phone?: string; address?: string }, opts?: RequestOpts): Promise<Customer> =>
  toCustomer((await api.post('/customers', data, opts)).data.customer);

export const updateCustomer = async (
  id: number,
  data: Partial<{ name: string; phone: string; address: string; notes: string; is_vip: boolean }>,
  opts?: RequestOpts,
): Promise<Customer> => toCustomer((await api.put(`/customers/${id}`, data, opts)).data.customer);
