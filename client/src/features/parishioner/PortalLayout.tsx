import { Outlet, useOutletContext } from "react-router-dom";
import { PageEnter } from "@/components/ui/PageEnter";
import { Navbar } from "@/components/layout/Navbar";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import type { Parish } from "@/types";

function getInitials(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function PortalLayout() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const user = useCurrentUser();

  const userName = user?.fullName ?? "Parishioner";
  const userInitials = user ? getInitials(user.fullName) : "P";

  return (
    <div className="min-h-screen bg-surface-alt">
      <Navbar parish={parish} userInitials={userInitials} userName={userName} />
      <main>
        <PageEnter>
          <Outlet context={{ parish }} />
        </PageEnter>
      </main>
    </div>
  );
}