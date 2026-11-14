import { Navigate } from "react-router-dom";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { userCan } from "@/features/parish-admin/access";

/** Opens Sacraments as before, or the Day Summary for staff who can't see the registers. */
export function ReportsHomeRedirect() {
  const user = useCurrentUser();
  return <Navigate to={userCan(user, "registers") ? "sacraments" : "day"} replace />;
}
