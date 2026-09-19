import type { ReactNode } from "react";
import { Navigate, Outlet, useOutletContext } from "react-router-dom";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { isParishAdminRole } from "@/features/parish-admin/permissions";

export function RequireParishAdmin({
  children,
  fallback = "..",
}: {
  children?: ReactNode;
  fallback?: string;
}) {
  const user = useCurrentUser();
  const context = useOutletContext();
  if (!user) return null;
  if (!isParishAdminRole(user.role)) {
    return <Navigate to={fallback} replace />;
  }
  return children ? <>{children}</> : <Outlet context={context} />;
}
