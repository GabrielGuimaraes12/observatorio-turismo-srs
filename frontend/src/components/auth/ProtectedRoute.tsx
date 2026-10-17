
import { Navigate, Outlet } from 'react-router-dom';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function ProtectedRoute() {
  const token = sessionStorage.getItem('authToken');
  const storedUser = sessionStorage.getItem('authUser');

  if (!token || !storedUser) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user: AuthUser = JSON.parse(storedUser);

    if (user.role !== 'ADMIN') {
      return <Navigate to="/" replace />;
    }

    const payload = JSON.parse(
      atob(token.split('.')[1])
    );

    if (
      typeof payload.exp !== 'number' ||
      payload.exp * 1000 <= Date.now()
    ) {
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('authUser');

      return <Navigate to="/login" replace />;
    }

    return <Outlet />;
  } catch {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('authUser');

    return <Navigate to="/login" replace />;
  }
}
