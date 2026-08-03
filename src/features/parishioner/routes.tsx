import type { RouteObject } from "react-router-dom";
import { DashboardRoute } from "@/features/parishioner/dashboard/DashboardRoute";

export const parishionerRoutes: RouteObject[] = [
  { index: true, element: <DashboardRoute /> },
  // requests/certificates/donations routes go here later
];