import api from './axios';

export interface Alert {
  key: string;              // changes when the situation changes (e.g. after restocking)
  type: 'low_stock' | 'repair_due';
  severity: 'warning' | 'danger';
  title: string;
  detail: string;
  // low stock
  product_id?: number;
  stock?: number;
  emoji?: string;
  // repair due
  repair_id?: number;
  ticket_number?: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  days_until_due?: number;
}

export const getAlerts = async (): Promise<Alert[]> => (await api.get('/alerts')).data.alerts;
