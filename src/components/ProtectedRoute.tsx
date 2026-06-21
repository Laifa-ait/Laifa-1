import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('admin' | 'seller' | 'buyer')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
         <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  // Not logged in
  if (!currentUser) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Waiting for profile data
  if (!userProfile) {
     return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
         <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  // Role verification
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = userProfile?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};
