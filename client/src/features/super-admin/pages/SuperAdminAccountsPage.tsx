import { Navigate, useSearchParams } from "react-router-dom";

/**
 * The old Parish Admins list. Parishes now shows each parish's admins and status, and a parish's own page adds
 * admin accounts, so this only sends old links on: to the parish asked for, or to Parishes.
 */
export function SuperAdminAccountsPage() {
  const [searchParams] = useSearchParams();
  const parishId = searchParams.get("parish");
  return <Navigate to={parishId ? `/super-admin/accounts/${parishId}` : "/super-admin/parishes"} replace />;
}
