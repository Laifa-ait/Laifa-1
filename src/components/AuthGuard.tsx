import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface AuthGuardProps {
  requireAuth?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ requireAuth = false }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF9EC]">
        <div className="w-8 h-8 border-4 border-[#ea580c] border-[#ffebd5] border-t-[#ea580c] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (requireAuth && !currentUser) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
