import { useAuthStore } from '../store/authStore';
import { Role } from '../api/auth';

// One place that says who may do what. The server enforces the same rules;
// this only decides what the app shows.
export function useRole() {
  const role: Role = useAuthStore(s => s.user?.role) ?? 'sales';
  return {
    role,
    isOwner: role === 'owner',
    isSales: role === 'sales',
    isTechnician: role === 'technician',
    canManageStock: role === 'owner',        // add / edit / restock / remove products
    canSeeCost: role === 'owner',            // cost price, profit
    canManageCustomers: role === 'owner',    // edit, VIP
  };
}
