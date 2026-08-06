import { Outlet, useOutletContext } from "react-router-dom";
import { AdminSidebar } from "@/features/parish-admin/components/AdminSidebar";
import { AdminTopbar } from "@/features/parish-admin/components/AdminTopbar";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import type { Parish } from "@/types";

export function AdminLayout() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const user = useCurrentUser();

  if (!user) return null;

  return (
    <div data-portal="admin" className="flex h-screen bg-admin-bg">
      <AdminSidebar parish={parish} role={user.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopbar user={user} />
        <main className="flex-1 overflow-y-auto">
          <Outlet context={{ parish }} />
        </main>
      </div>
    </div>
  );
}