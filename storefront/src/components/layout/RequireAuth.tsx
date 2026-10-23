import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../store/auth';

/** Pages for signed-in customers. Everyone else is sent to sign in and brought straight back. */
export function RequireAuth() {
  const signedIn = useAuth(s => !!s.token);
  const location = useLocation();
  if (!signedIn) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  return <Outlet />;
}
