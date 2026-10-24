import api from './axios';

export type Role = 'owner' | 'sales' | 'technician';

export interface User { id: number; name: string; email: string; role: Role; }

export const login = async (email: string, password: string): Promise<{ token: string; user: User }> =>
  (await api.post('/auth/login', { email, password })).data;

export interface ProfileChange { name?: string; email?: string; password?: string; current_password?: string }

/** The signed-in person edits their own details. Changing the email or password needs the current password. */
export const updateProfile = async (data: ProfileChange): Promise<{ token: string; user: User }> =>
  (await api.patch('/auth/me', data)).data;

export const forgotPassword = async (email: string): Promise<{ method: 'email' | 'none'; recovery_key: boolean }> =>
  (await api.post('/auth/forgot', { email })).data;

export const resetPassword = async (email: string, code: string, password: string): Promise<void> => {
  await api.post('/auth/reset', { email, code, password });
};

export const getProfile = async (): Promise<User> => (await api.get('/auth/me')).data;
