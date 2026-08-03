import { redirect, type LoaderFunctionArgs } from "react-router-dom";
import { getCurrentUser } from "@/features/auth/api/authApi";
import type { Role } from "@/types";

export function requireRole(allowedRoles: Role[]) {
  return function loader({ request }: LoaderFunctionArgs) {
    const user = getCurrentUser();
    const url = new URL(request.url);

    if (!user) {
      const from = encodeURIComponent(url.pathname + url.search);
      throw redirect(`/login?from=${from}`);
    }

    if (!allowedRoles.includes(user.role)) {
      throw redirect("/unauthorized");
    }

    return { user };
  };
}