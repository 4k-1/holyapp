import type { RouteObject } from "react-router-dom";
import { PortalLayout } from "@/features/parishioner/PortalLayout";
import { DashboardRoute } from "@/features/parishioner/dashboard/DashboardRoute";
import { NewRequestWizard } from "@/features/parishioner/requests/pages/NewRequestWizard";
import { RequestsListPage } from "@/features/parishioner/requests/pages/RequestsListPage";
import { RequestReceiptPage } from "@/features/parishioner/requests/pages/RequestReceiptPage";
import { RequestDetailsPage } from "@/features/parishioner/requests/pages/RequestDetailsPage";
import { CertificatesWalletPage } from "@/features/parishioner/certificates/CertificatesWalletPage";
import { AccountPage } from "@/features/parishioner/account/AccountPage";
import { SettingsPage } from "@/features/parishioner/account/SettingsPage";
import { VerifyPage } from "@/features/parishioner/verify/VerifyPage";
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
      { path: "requests/:requestId", element: <RequestDetailsPage /> },
      { path: "requests/:requestId/receipt", element: <RequestReceiptPage /> },
      { path: "wallet", element: <CertificatesWalletPage /> },
      { path: "account", element: <AccountPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "verify", element: <VerifyPage /> },
      { path: "timeline", element: <SacramentalTimelinePage /> },
      { path: "donate", element: <DonationsPage /> },
      { path: "intention", element: <MassIntentionPage /> },
      { path: "intentions", element: <MyIntentionsPage /> },
      { path: "marriage", element: <MyMarriageApplicationPage /> },
    ],
  },
];