import { Outlet, useOutletContext } from "react-router-dom";
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
    <div className="min-h-screen bg-[#f8f6f1]">
      <Navbar parish={parish} userInitials={userInitials} userName={userName} />
      <main>
        <Outlet context={{ parish }} />
      </main>
    </div>
  );
}