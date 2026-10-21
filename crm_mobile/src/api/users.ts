import api from './axios';
import { Role } from './auth';

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export const ROLE_LABEL: Record<Role, string> = { owner: 'Admin', sales: 'Sales', technician: 'Technician' };

export const getUsers = async (): Promise<TeamMember[]> => (await api.get('/users')).data.users;

export const getTechnicians = async (): Promise<TeamMember[]> =>
  (await api.get('/users', { params: { role: 'technician' } })).data.users;

export const createUser = async (data: { name: string; email: string; password: string; role: Role }): Promise<TeamMember> =>
  (await api.post('/users', data)).data.user;

export const updateUser = async (
  id: number,
  data: Partial<{ name: string; role: Role; is_active: boolean; password: string }>,
): Promise<TeamMember> => (await api.patch(`/users/${id}`, data)).data.user;
