import api, { getApiBaseUrl } from './axios';

export interface DailyReport {
  date: string;
  generated_at: string;
  summary: {
    sales_revenue: number;
    repair_revenue: number;
    total_revenue: number;
    sales_profit: number;
    repair_profit: number;
    total_profit: number;
    purchases_total: number;
    purchases_count: number;
    sales_count: number;
    units_sold: number;
    repairs_completed: number;
    repairs_delivered: number;
  };
  sales: {
    id: number; time: string; customer: string; sold_by: string | null; payment_method: string;
    total: number; profit: number; items: { name: string; qty: number; unit_price: number }[];
  }[];
  repairs: {
    id: number; ticket_number: string; device_name: string; customer_name: string | null; technician_name: string | null;
    status: string; completed_today: boolean; delivered_today: boolean; time: string | null; amount: number | null; profit: number | null;
  }[];
  purchases: {
    id: number; time: string; product_name: string; qty: number; unit_cost: number; total: number;
    supplier: string | null; bought_by: string | null;
  }[];
}

export const getDailyReport = async (date?: string): Promise<DailyReport> =>
  (await api.get('/reports/daily', { params: date ? { date } : {} })).data;

// Absolute URLs for the PDF and the image. They carry a short-lived token so the
// phone's browser can open them without the app's login header.
export async function getExportLinks(date: string): Promise<{ pdf: string; image: string }> {
  const { data } = await api.post('/reports/export-links', { date });
  const origin = getApiBaseUrl().replace(/\/api$/i, '');
  return { pdf: origin + data.pdf, image: origin + data.image };
}
