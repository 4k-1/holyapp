import type { RouteObject } from "react-router-dom";
import { PortalLayout } from "@/features/parishioner/PortalLayout";
import { DashboardRoute } from "@/features/parishioner/dashboard/DashboardRoute";
import { NewRequestWizard } from "@/features/parishioner/requests/pages/NewRequestWizard";

export const parishionerRoutes: RouteObject[] = [
  {
    element: <PortalLayout />,
    children: [{ index: true, element: <DashboardRoute /> },
    { path: "requests/new", element: <NewRequestWizard /> },
    ],
  },
];