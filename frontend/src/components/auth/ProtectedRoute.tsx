import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { clearSession, getSessionUser } from '../../services/authService';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export function ProtectedRoute({
  allowedRoles = ['ADMIN'],
}: ProtectedRouteProps) {
  const user = getSessionUser();

  useEffect(() => {
    if (!user) clearSession();
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;

  return <Outlet />;
}
