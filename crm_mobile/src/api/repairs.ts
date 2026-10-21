import api, { RequestOpts } from './axios';

export type RepairStatus = 'received' | 'diagnosing' | 'fixing' | 'completed' | 'delivered';

export const REPAIR_STAGES: RepairStatus[] = ['received', 'diagnosing', 'fixing', 'completed', 'delivered'];

export interface Repair {
  id: number;
  ticket_number: string;
  device_name: string;
  issue: string;
  customer_name: string | null;
  customer_phone: string | null;
  status: RepairStatus;
  status_step: number;
  estimated_cost: number | null;
  actual_cost: number | null;
  parts_cost: number | null;
  // The received day is set by the server the moment the ticket is created.
  received_at: string;
  promised_date: string | null;     // 'YYYY-MM-DD'
  days_until_due: number | null;    // negative once the promised day has passed
  is_overdue: boolean;
  days_in_shop: number;
  completed_at: string | null;
  delivered_at: string | null;
  technician_id: number | null;
  technician_name: string | null;
}

const money = (v: any) => (v == null ? null : Number(v));

const toRepair = (r: any): Repair => ({
  ...r,
  estimated_cost: money(r.estimated_cost),
  actual_cost: money(r.actual_cost),
  parts_cost: money(r.parts_cost),
  is_overdue: !!r.is_overdue,
  days_in_shop: Number(r.days_in_shop) || 0,
  days_until_due: r.days_until_due == null ? null : Number(r.days_until_due),
  promised_date: r.promised_date ?? null,
  technician_id: r.technician_id ?? null,
  technician_name: r.technician_name ?? null,
});

export const getRepairs = async (): Promise<Repair[]> =>
  ((await api.get('/repairs')).data.tickets as any[]).map(toRepair);

export const createRepair = async (data: {
  device_name: string;
  issue: string;
  promised_date: string;
  customer_name?: string;
  customer_phone?: string;
  estimated_cost?: number;
}, opts?: RequestOpts): Promise<Repair> => toRepair((await api.post('/repairs', data, opts)).data.ticket);

// Moves the ticket to its next stage. Handing the device back (the last step)
// also records the money collected.
export const advanceRepairStatus = async (
  id: number,
  handover?: { amount_collected: number; parts_cost?: number },
  opts?: RequestOpts,
): Promise<Repair> => toRepair((await api.patch(`/repairs/${id}/status`, handover ?? {}, opts)).data.ticket);

export const updateRepair = async (
  id: number,
  data: { promised_date?: string; estimated_cost?: number | null },
  opts?: RequestOpts,
): Promise<Repair> => toRepair((await api.patch(`/repairs/${id}`, data, opts)).data.ticket);

export const assignRepair = async (id: number, technicianId: number | null, opts?: RequestOpts): Promise<Repair> =>
  toRepair((await api.patch(`/repairs/${id}/assign`, { technician_id: technicianId }, opts)).data.ticket);
