import type { RouteObject } from "react-router-dom";
import { PortalLayout } from "@/features/parishioner/PortalLayout";
import { DashboardRoute } from "@/features/parishioner/dashboard/DashboardRoute";
import { NewRequestWizard } from "@/features/parishioner/requests/pages/NewRequestWizard";
import { RequestsListPage } from "@/features/parishioner/requests/pages/RequestsListPage";
import { RequestReceiptPage } from "@/features/parishioner/requests/pages/RequestReceiptPage";
import { CertificatesWalletPage } from "@/features/parishioner/certificates/CertificatesWalletPage";
import { AccountPage } from "@/features/parishioner/account/AccountPage";
import { SacramentalTimelinePage } from "@/features/parishioner/timeline/SacramentalTimelinePage";
import { DonationsPage } from "@/features/parishioner/donations/DonationsPage";
import { MyIntentionsPage } from "./intentions/MyIntentionsPage";
import { MassIntentionPage } from "./intentions/MassIntentionPage";
import { MyMarriageApplicationPage } from "./marriage/MyMarriageApplicationPage";
export const parishionerRoutes: RouteObject[] = [
  {
    element: <PortalLayout />,
    children: [
      { index: true, element: <DashboardRoute /> },
      { path: "requests", element: <RequestsListPage /> },
      { path: "requests/new", element: <NewRequestWizard /> },
      { path: "requests/:requestId/receipt", element: <RequestReceiptPage /> },
      { path: "wallet", element: <CertificatesWalletPage /> },
      { path: "account", element: <AccountPage /> },
      { path: "timeline", element: <SacramentalTimelinePage /> },
      { path: "donate", element: <DonationsPage /> },
      { path: "intention", element: <MassIntentionPage /> },
      { path: "intentions", element: <MyIntentionsPage /> },
      { path: "marriage", element: <MyMarriageApplicationPage /> },
    ],
  },
];