import { redirect, type LoaderFunctionArgs } from "react-router-dom";
import { getCurrentUser } from "@/features/auth/api/authApi";
import type { Role } from "@/types";

function loginRedirect(path: string, request: Request) {
  const url = new URL(request.url);
  const from = encodeURIComponent(url.pathname + url.search);
  return redirect(`${path}?from=${from}`);
}

export function requireRole(allowedRoles: Role[]) {
  return function loader({ request }: LoaderFunctionArgs) {
    const user = getCurrentUser();

    if (!user) {
      throw loginRedirect("/login", request);
    }

    if (!allowedRoles.includes(user.role)) {
      throw redirect("/unauthorized");
    }

    return { user };
  };
}

export function requireSuperAdmin({ request }: LoaderFunctionArgs) {
  const user = getCurrentUser();

  if (!user) {
    throw loginRedirect("/super-admin/login", request);
  }

  if (user.role !== "super_admin") {
    throw redirect("/unauthorized");
  }

  return { user };
}