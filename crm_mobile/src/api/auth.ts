import api from './axios';

export type Role = 'owner' | 'sales' | 'technician';

export interface User { id: number; name: string; email: string; role: Role; }

export const login = async (email: string, password: string): Promise<{ token: string; user: User }> =>
  (await api.post('/auth/login', { email, password })).data;
