import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = () => {
  const { user, getToken } = useAuth();
  const location = useLocation();
  
  if (!user || !getToken()) {
    const next = `${location.pathname}${location.search || ''}`;
    return <Navigate to={`/?redirect=${encodeURIComponent(next)}`} replace />;
  }
  
  return <Outlet />;
};

export const AdminRoute = () => {
  const { user, checkRole } = useAuth();
  
  if (!user || !checkRole('ROLE_ADMIN')) {
    return <Navigate to="/" replace />;
  }
  
  return <Outlet />;
};
