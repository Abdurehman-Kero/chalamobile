import { Product, ProductInput } from '../api/products';
import { Customer } from '../api/customers';
import { Repair } from '../api/repairs';
import { Sale, SaleInput } from '../api/sales';
import { submit } from './engine';
import { Outcome } from './types';

// Every change a screen can make. They look like the plain API calls, but they
// are saved on the phone first and sent when there is a connection. Each returns
// { data, queued }: `queued` is true when it is saved but not yet on the server.

export const createSale = (data: SaleInput) => submit<Sale>('sale.create', data);

export const createProduct = (data: ProductInput) => submit<Product>('product.create', data);
export const updateProduct = (id: number, data: Partial<ProductInput>) => submit<void>('product.update', { id, data });
export const deleteProduct = (id: number, name?: string) => submit<void>('product.delete', { id, name });
export const restockProduct = (id: number, data: { qty: number; unit_cost?: number; supplier?: string }, name?: string) =>
  submit<void>('product.restock', { id, ...data, name });

export const createCustomer = (data: { name: string; phone?: string; address?: string }) => submit<Customer>('customer.create', data);
export const updateCustomer = (
  id: number,
  data: Partial<{ name: string; phone: string; address: string; notes: string; is_vip: boolean }>,
) => submit<void>('customer.update', { id, data });

export const createRepair = (data: {
  device_name: string; issue: string; promised_date: string;
  customer_name?: string; customer_phone?: string; estimated_cost?: number;
}) => submit<Repair>('repair.create', data);
export const advanceRepair = (id: number, handover?: { amount_collected: number; parts_cost?: number }, name?: string) =>
  submit<void>('repair.advance', { id, handover, name });
export const updateRepair = (id: number, data: { promised_date?: string }, name?: string) =>
  submit<void>('repair.update', { id, data, name });
export const assignRepair = (id: number, technicianId: number | null, technicianName?: string, name?: string) =>
  submit<void>('repair.assign', { id, technician_id: technicianId, technician_name: technicianName, name });

// The success message for a toast: the normal one, or a note that it was saved offline.
export const savedMessage = (outcome: Outcome<any>, normal: string) =>
  outcome.queued ? 'Saved on this phone · will sync when you’re online' : normal;
