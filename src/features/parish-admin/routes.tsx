import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { AdminLayout } from "@/features/parish-admin/AdminLayout";
import { AdminDashboardPage } from "@/features/parish-admin/dashboard/AdminDashboardPage";
import { AdminRequestsPage } from "@/features/parish-admin/requests/AdminRequestsPage";
import { AdminFindRecordPage } from "@/features/parish-admin/requests/AdminFindRecordPage";
import { AdminBaptismalRecordsPage } from "@/features/parish-admin/records/baptismal/AdminBaptismalRecordsPage";
import { AdminBaptismalRecordDetailPage } from "@/features/parish-admin/records/baptismal/AdminBaptismalRecordDetailPage";
import { AdminBaptismalRecordFormPage } from "@/features/parish-admin/records/baptismal/AdminBaptismalRecordFormPage";
import { AdminConfirmationRecordsPage } from "@/features/parish-admin/records/confirmation/AdminConfirmationRecordsPage";
import { AdminConfirmationRecordDetailPage } from "@/features/parish-admin/records/confirmation/AdminConfirmationRecordDetailPage";
import { AdminConfirmationRecordFormPage } from "@/features/parish-admin/records/confirmation/AdminConfirmationRecordFormPage";
import { AdminMarriageRecordsPage } from "@/features/parish-admin/records/marriage/AdminMarriageRecordsPage";
import { AdminMarriageRecordDetailPage } from "@/features/parish-admin/records/marriage/AdminMarriageRecordDetailPage";
import { AdminMarriageRecordFormPage } from "@/features/parish-admin/records/marriage/AdminMarriageRecordFormPage";
import { AdminDeathRecordsPage } from "@/features/parish-admin/records/death/AdminDeathRecordsPage";
import { AdminDeathRecordDetailPage } from "@/features/parish-admin/records/death/AdminDeathRecordDetailPage";
import { AdminDeathRecordFormPage } from "@/features/parish-admin/records/death/AdminDeathRecordFormPage";
import { AdminSchedulePage } from "@/features/parish-admin/schedule/AdminSchedulePage";
import { AdminDonationsPage } from "@/features/parish-admin/donations/AdminDonationsPage";
import { AdminLedgersPage } from "@/features/parish-admin/ledgers/AdminLedgersPage";
import { AdminLedgerBookPage } from "@/features/parish-admin/ledgers/AdminLedgerBookPage";
import { AdminLedgerPageViewer } from "@/features/parish-admin/ledgers/AdminLedgerPageViewer";
import { AdminMassIntentionsPage } from "@/features/parish-admin/intentions/AdminMassIntentionsPage";
import { AdminSettingsLayout } from "@/features/parish-admin/settings/AdminSettingsLayout";
import { ParishProfileSection } from "@/features/parish-admin/settings/components/ParishProfileSection";
import { ServiceFeesSection } from "@/features/parish-admin/settings/components/ServiceFeesSection";
import { CertificateConfigSection } from "@/features/parish-admin/settings/components/CertificateConfigSection";
import { AccountSecuritySection } from "@/features/parish-admin/settings/components/AccountSecuritySection";

export const parishAdminRoutes: RouteObject[] = [
  {
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: "requests", element: <AdminRequestsPage /> },
      { path: "requests/:requestId/find-record", element: <AdminFindRecordPage /> },
      { path: "records/baptismal", element: <AdminBaptismalRecordsPage /> },
      { path: "records/baptismal/new", element: <AdminBaptismalRecordFormPage mode="create" /> },
      { path: "records/baptismal/:recordId", element: <AdminBaptismalRecordDetailPage /> },
      {
        path: "records/baptismal/:recordId/edit",
        element: <AdminBaptismalRecordFormPage mode="edit" />,
      },
      { path: "records/confirmation", element: <AdminConfirmationRecordsPage /> },
      { path: "records/confirmation/new", element: <AdminConfirmationRecordFormPage mode="create" /> },
      { path: "records/confirmation/:recordId", element: <AdminConfirmationRecordDetailPage /> },
      {
        path: "records/confirmation/:recordId/edit",
        element: <AdminConfirmationRecordFormPage mode="edit" />,
      },
      { path: "records/marriage", element: <AdminMarriageRecordsPage /> },
      { path: "records/marriage/new", element: <AdminMarriageRecordFormPage mode="create" /> },
      { path: "records/marriage/:recordId", element: <AdminMarriageRecordDetailPage /> },
      {
        path: "records/marriage/:recordId/edit",
        element: <AdminMarriageRecordFormPage mode="edit" />,
      },
      { path: "records/death", element: <AdminDeathRecordsPage /> },
      { path: "records/death/new", element: <AdminDeathRecordFormPage mode="create" /> },
      { path: "records/death/:recordId", element: <AdminDeathRecordDetailPage /> },
      {
        path: "records/death/:recordId/edit",
        element: <AdminDeathRecordFormPage mode="edit" />,
      },
      { path: "records/ledgers", element: <AdminLedgersPage /> },
      { path: "records/ledgers/:bookId", element: <AdminLedgerBookPage /> },
      { path: "records/ledgers/:bookId/pages/:pageNumber", element: <AdminLedgerPageViewer /> },
      { path: "mass-intentions", element: <AdminMassIntentionsPage /> },
      {
        path: "schedule",
        element: <AdminSchedulePage />,
      },
      { path: "donations", element: <AdminDonationsPage /> },
      {
        path: "settings",
        element: <AdminSettingsLayout />,
        children: [
          { index: true, element: <Navigate to="parish-profile" replace /> },
          { path: "parish-profile", element: <ParishProfileSection /> },
          { path: "fees", element: <ServiceFeesSection /> },
          { path: "certificates", element: <CertificateConfigSection /> },
          { path: "security", element: <AccountSecuritySection /> },
        ],
      },
    ],
  },
];
