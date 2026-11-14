import type { ReactNode } from "react";
import { Link, Outlet, useOutletContext, useParams } from "react-router-dom";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { ACCESS_AREAS, userCan, type AccessArea } from "@/features/parish-admin/access";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";

/**
 * E1: shows the page only if the signed-in staff member has at least View on its area. The server checks too;
 * this just gives a clear message instead of a page full of errors.
 */
export function RequireArea({
  area,
  level = "view",
  children,
}: {
  area: AccessArea;
  level?: "view" | "manage";
  children?: ReactNode;
}) {
  const user = useCurrentUser();
  const context = useOutletContext();
  const { parishSlug } = useParams();
  if (!user) return null;
  if (!userCan(user, area, level)) {
    const label = ACCESS_AREAS.find((a) => a.key === area)?.label ?? "this area";
    const viewOnly = level === "manage" && userCan(user, area, "view");
    return (
      <AdminCard className="mx-auto mt-10 max-w-[480px] px-6 py-8 text-center">
        <h1 className="font-serif text-admin-section font-semibold text-admin-ink">
          {viewOnly ? `You can view ${label} but not change it` : `You don't have access to ${label}`}
        </h1>
        <p className="mt-2 text-admin-body text-admin-ink-muted">
          Your parish admin decides which areas each staff account can open. Ask them if you need this one.
        </p>
        <Link to={`/${parishSlug}/admin`} className="mt-5 inline-block text-admin-body font-semibold text-admin-green-700 hover:underline">
          Back to the dashboard
        </Link>
      </AdminCard>
    );
  }
  return children ? <>{children}</> : <Outlet context={context} />;
}
