import React, { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui/Spinner';

interface AppGuardProps {
  requireAuth?: boolean;
  allowedRoles?: ('admin' | 'seller' | 'buyer')[];
  children?: ReactNode;
}

export const AppGuard: React.FC<AppGuardProps> = ({ requireAuth = false, allowedRoles, children }) => {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (requireAuth && !currentUser) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requireAuth && allowedRoles && userProfile) {
    if (!allowedRoles.includes(userProfile.role)) {
       // Redirect to their respective dashboard
       return <Navigate to={`/dashboard/${userProfile.role}`} replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
};
