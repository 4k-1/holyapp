import { redirect, type LoaderFunctionArgs } from "react-router-dom";
import { getCurrentUser } from "@/features/auth/api/authApi";
import type { Role } from "@/types";

function parishLoginPath(request: Request) {
  const url = new URL(request.url);
  const slug = url.pathname.split("/").filter(Boolean)[0];
  if (slug && slug !== "login" && slug !== "register" && slug !== "super-admin") {
    return `/${slug}/login`;
  }
  return "/login";
}

/** The no-access page, told which page was refused so it can say who that page is for. */
function unauthorizedRedirect(request: Request) {
  const url = new URL(request.url);
  return redirect(`/unauthorized?from=${encodeURIComponent(url.pathname)}`);
}

function loginRedirect(path: string, request: Request) {
  const url = new URL(request.url);
  const from = encodeURIComponent(url.pathname + url.search);
  return redirect(`${path}?from=${from}`);
}

export function requireRole(allowedRoles: Role[]) {
  return function loader({ request }: LoaderFunctionArgs) {
    const user = getCurrentUser();

    if (!user) {
      throw loginRedirect(parishLoginPath(request), request);
    }

    if (!allowedRoles.includes(user.role)) {
      throw unauthorizedRedirect(request);
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
    throw unauthorizedRedirect(request);
  }

  return { user };
}