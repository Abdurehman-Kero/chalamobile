import api from './axios';
import { Role } from './auth';

// The server sends only the figures a role is allowed to see, so most fields
// are optional: owner, sales and technician each get their own set.
export interface Metrics {
  role: Role;
  // owner + sales
  todayRevenue?: number;
  unitsSold?: number;
  salesCount?: number;
  lowStockCount?: number;
  totalCustomers?: number;
  // owner only
  salesRevenue?: number;
  repairRevenue?: number;
  todayProfit?: number;
  weekProfit?: number;
  purchasesToday?: number;
  // owner + technician
  activeRepairs?: number;
  readyRepairs?: number;
  // technician only
  dueSoonCount?: number;
  completedToday?: number;
}

export interface Weekly {
  labels: string[];
  values: number[];
  total: number;
  changePct: number | null;
}

export interface ActivityItem {
  type: 'sale' | 'repair';
  id: number;
  description: string;
  customer?: string;
  item_count?: number;
  amount?: number;
  method?: string;
  ticket?: string;
  status?: string;
  time: string;
}

export interface DashboardData {
  metrics: Metrics;
  weekly: Weekly | null;
  activity: ActivityItem[];
}

export async function getDashboard(role: Role): Promise<DashboardData> {
  // Technicians have no sales chart.
  const [m, w, a] = await Promise.all([
    api.get('/dashboard/metrics'),
    role === 'technician' ? Promise.resolve(null) : api.get('/dashboard/weekly'),
    api.get('/dashboard/activity'),
  ]);
  return {
    metrics: m.data,
    weekly: w ? w.data : null,
    activity: (a.data.items as any[]).map(i => ({ ...i, amount: i.amount == null ? undefined : Number(i.amount) })),
  };
}
