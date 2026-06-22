import React, { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ("admin" | "seller" | "buyer")[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();
  const [tokenRole, setTokenRole] = React.useState<string | null>(null);
  const [verifyingClaims, setVerifyingClaims] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    if (!currentUser) {
      setTokenRole(null);
      setVerifyingClaims(false);
      return;
    }

    setVerifyingClaims(true);
    // Securely retrieve cryptographically-signed custom claims directly from Firebase auth session
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
        console.error("Error securing ProtectedRoute with token claims:", err);
        if (active) {
          setTokenRole(null);
          setVerifyingClaims(false);
        }
      });

    return () => {
      active = false;
    };
  }, [currentUser]);

  if (loading || verifyingClaims) {
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

  // Verify role using secure cryptographic custom claims, falling back safely to verified profile
  const activeRole = tokenRole || userProfile?.role;

  // Waiting for profile / role data
  if (!activeRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  // Cryptographically backed validation of assigned roles
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(activeRole as any)) {
      console.warn(`[Security Intervention] Unauthorized access attempt by ${currentUser.email} (${activeRole})`);
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};
