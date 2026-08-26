import { useState } from "react";
import { Outlet, useOutletContext } from "react-router-dom";
import { AdminSidebar } from "@/features/parish-admin/components/AdminSidebar";
import { AdminTopbar } from "@/features/parish-admin/components/AdminTopbar";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import type { Parish } from "@/types";

export function AdminLayout() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const user = useCurrentUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!user) return null;

  return (
    <div data-portal="admin" className="flex h-screen flex-col bg-admin-bg">
      <AdminTopbar
        user={user}
        parish={parish}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
      />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar role={user.role} collapsed={sidebarCollapsed} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet context={{ parish }} />
        </main>
      </div>
    </div>
  );
}