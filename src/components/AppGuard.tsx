import React, { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "./ui/Spinner";

interface AppGuardProps {
  requireAuth?: boolean;
  allowedRoles?: ("admin" | "seller" | "buyer")[];
  children?: ReactNode;
}

export const AppGuard: React.FC<AppGuardProps> = ({ requireAuth = false, allowedRoles, children }) => {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();
  const [tokenRole, setTokenRole] = React.useState<string | null>(null);
  const [verifyingClaims, setVerifyingClaims] = React.useState(requireAuth);

  React.useEffect(() => {
    let active = true;
    if (!currentUser || !requireAuth) {
      setTokenRole(null);
      setVerifyingClaims(false);
      return;
    }

    setVerifyingClaims(true);
    // Cryptographically verified token signature check
    currentUser
      .getIdTokenResult(true)
      .then((idTokenResult) => {
        if (active) {
          const role = idTokenResult.claims.role as string;
          setTokenRole(role || null);
          setVerifyingClaims(false);
        }
      })
      .catch((err) => {
        console.error("Error securing AppGuard with token claims:", err);
        if (active) {
          setTokenRole(null);
          setVerifyingClaims(false);
        }
      });

    return () => {
      active = false;
    };
  }, [currentUser, requireAuth]);

  if (loading || verifyingClaims) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (requireAuth && !currentUser) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  const activeRole = tokenRole || userProfile?.role;

  if (requireAuth && allowedRoles && activeRole) {
    if (!allowedRoles.includes(activeRole as any)) {
      // Redirect to homepage or dashboard safely
      console.warn(`[Security Alert AppGuard] Unauthorized role ${activeRole} for user ${currentUser?.email}`);
      return <Navigate to="/" replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
};
