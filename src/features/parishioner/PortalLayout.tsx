import { Outlet, useOutletContext } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import type { Parish } from "@/types";

export function PortalLayout() {
  const { parish } = useOutletContext<{ parish: Parish }>();

  return (
    <div className="min-h-screen bg-surface-alt">
      <Navbar parish={parish} userInitials="MS" userName="Maria Clara Santos" />
      <Outlet context={{ parish }} />
    </div>
  );
}