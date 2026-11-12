import { Outlet, useOutletContext } from "react-router-dom";
import { PageEnter } from "@/components/ui/PageEnter";
import { Navbar } from "@/components/layout/Navbar";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import type { Parish } from "@/types";
import "./portal.css";
import { userInitials } from "@/lib/userInitials";

export function PortalLayout() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const user = useCurrentUser();

  const userName = user?.fullName ?? "Parishioner";
  const initials = user ? userInitials(user) : "P";

  return (
    <div className="parishioner-portal min-h-screen bg-surface-alt">
      <Navbar parish={parish} userInitials={initials} userName={userName} userEmail={user?.email ?? ""} />
      <main>
        <PageEnter>
          <Outlet context={{ parish }} />
        </PageEnter>
      </main>
    </div>
  );
}