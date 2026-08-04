import type { RouteObject } from "react-router-dom";
import { PortalLayout } from "@/features/parishioner/PortalLayout";
import { DashboardRoute } from "@/features/parishioner/dashboard/DashboardRoute";
import { NewRequestWizard } from "@/features/parishioner/requests/pages/NewRequestWizard";
import { RequestsListPage } from "@/features/parishioner/requests/pages/RequestsListPage";
import { CertificatesWalletPage } from "@/features/parishioner/certificates/CertificatesWalletPage";
import { AccountPage } from "@/features/parishioner/account/AccountPage";
import { DonationsPage } from "@/features/parishioner/donations/DonationsPage";
import { MyIntentionsPage } from "./intentions/MyIntentionsPage";
import { MassIntentionPage } from "./intentions/MassIntentionPage";
export const parishionerRoutes: RouteObject[] = [
  {
    element: <PortalLayout />,
    children: [
      { index: true, element: <DashboardRoute /> },
      { path: "requests", element: <RequestsListPage /> },
      { path: "requests/new", element: <NewRequestWizard /> },
      { path: "wallet", element: <CertificatesWalletPage /> },
      { path: "account", element: <AccountPage /> },
      { path: "donate", element: <DonationsPage /> },
      {path: "intention", element: <MassIntentionPage /> },
    ],
  },
];