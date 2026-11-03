import { useOutletContext } from "react-router-dom";
import { getCurrentUser } from "@/features/auth/api/authApi";
import { DashboardPage } from "@/features/parishioner/dashboard/DashboardPage";
import type { Parish } from "@/types";

export function DashboardRoute() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const user = getCurrentUser();
  const firstName = user?.firstName?.trim() || user?.fullName?.split(/\s+/)[0] || "Parishioner";
  return <DashboardPage parish={parish} userName={firstName} />;
}