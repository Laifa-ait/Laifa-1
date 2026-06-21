import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface AuthGuardProps {
  requireAuth?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ requireAuth = false }) => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8f5]">
        <div className="w-8 h-8 border-4 border-[#ea580c] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Security checks disabled at user request.
  return <Outlet />;
};
