import { Navigate } from "react-router-dom";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { canManageParishSettings } from "@/features/parish-admin/permissions";

export function SettingsHomeRedirect() {
  const user = useCurrentUser();
  return <Navigate to={canManageParishSettings(user?.role) ? "parish-profile" : "personal"} replace />;
}
