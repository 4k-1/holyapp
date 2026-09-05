import { useOutletContext } from "react-router-dom";
import { DashboardPage } from "@/features/parishioner/dashboard/DashboardPage";
import type { Parish } from "@/types";

export function DashboardRoute() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  return <DashboardPage parishId={parish.id} parishSlug={parish.slug} userName="Maria Clara" />;
}