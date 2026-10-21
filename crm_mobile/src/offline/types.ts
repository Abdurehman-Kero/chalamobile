// Every change a person makes (a sale, a new product, a repair step...) is an
// "operation". Operations are plain data, so they can be stored on the phone
// while offline and sent to the server later, in the order they were made.

export type OpType =
  | 'sale.create'
  | 'product.create' | 'product.update' | 'product.delete' | 'product.restock'
  | 'customer.create' | 'customer.update'
  | 'repair.create' | 'repair.advance' | 'repair.update' | 'repair.assign';

export interface Op {
  id: string;               // also the retry key sent to the server
  userId: number;           // who made it; only that person's phone session syncs it
  type: OpType;
  payload: any;
  createdAt: number;        // when it really happened (sent to the server)
  localId?: number;         // temporary id for things this operation creates (always negative)
  status: 'pending' | 'failed';
  attempts: number;
  error: string | null;     // why the server refused it, when status is 'failed'
}

// What a screen gets back. `queued` means "saved on this phone, not sent yet".
export interface Outcome<R> {
  data: R;
  queued: boolean;
}

// Things created offline get a negative id until the server gives them a real one.
export const isLocalId = (id: unknown): boolean => typeof id === 'number' && id < 0;
