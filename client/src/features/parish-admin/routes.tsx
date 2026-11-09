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
import { AdminLedgerPageRecordsPage } from "@/features/parish-admin/ledgers/AdminLedgerPageRecordsPage";
import { AdminMassIntentionsPage } from "@/features/parish-admin/intentions/AdminMassIntentionsPage";
import { AdminMarriageApplicationsPage } from "@/features/parish-admin/marriage-applications/AdminMarriageApplicationsPage";
import { AdminMarriageApplicationDetailPage } from "@/features/parish-admin/marriage-applications/AdminMarriageApplicationDetailPage";
import { AdminNotificationsPage } from "@/features/parish-admin/notifications/AdminNotificationsPage";
import { AdminReportsLayout } from "@/features/parish-admin/reports/AdminReportsLayout";
import { AdminReportPage } from "@/features/parish-admin/reports/AdminReportPage";
import { AdminSettingsLayout } from "@/features/parish-admin/settings/AdminSettingsLayout";
import { SettingsHomeRedirect } from "@/features/parish-admin/settings/SettingsHomeRedirect";
import { ParishProfileSection } from "@/features/parish-admin/settings/components/ParishProfileSection";
import { ServiceFeesSection } from "@/features/parish-admin/settings/components/ServiceFeesSection";
import { StaffAccountsSection } from "@/features/parish-admin/settings/components/StaffAccountsSection";
import { AdminStaffPage } from "@/features/parish-admin/staff/AdminStaffPage";
import { CertificateConfigSection } from "@/features/parish-admin/settings/components/CertificateConfigSection";
import { MassScheduleSection } from "@/features/parish-admin/settings/components/MassScheduleSection";
import { AccountSecuritySection } from "@/features/parish-admin/settings/components/AccountSecuritySection";
import { AdminPersonalInfoSection } from "@/features/parish-admin/settings/components/AdminPersonalInfoSection";
import { RequireParishAdmin } from "@/features/parish-admin/RequireParishAdmin";

export const parishAdminRoutes: RouteObject[] = [
  {
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: "notifications", element: <AdminNotificationsPage /> },
      { path: "requests", element: <AdminRequestsPage /> },
      { path: "requests/:requestId/find-record", element: <AdminFindRecordPage /> },
      { path: "records/baptismal", element: <AdminBaptismalRecordsPage /> },
      { path: "records/baptismal/new", element: <AdminBaptismalRecordFormPage mode="create" /> },
      { path: "records/baptismal/:recordId", element: <AdminBaptismalRecordDetailPage /> },
      {
        path: "records/baptismal/:recordId/edit",
        element: (
          <RequireParishAdmin>
            <AdminBaptismalRecordFormPage mode="edit" />
          </RequireParishAdmin>
        ),
      },
      { path: "records/confirmation", element: <AdminConfirmationRecordsPage /> },
      { path: "records/confirmation/new", element: <AdminConfirmationRecordFormPage mode="create" /> },
      { path: "records/confirmation/:recordId", element: <AdminConfirmationRecordDetailPage /> },
      {
        path: "records/confirmation/:recordId/edit",
        element: (
          <RequireParishAdmin>
            <AdminConfirmationRecordFormPage mode="edit" />
          </RequireParishAdmin>
        ),
      },
      { path: "records/marriage", element: <AdminMarriageRecordsPage /> },
      { path: "records/marriage/new", element: <AdminMarriageRecordFormPage mode="create" /> },
      { path: "records/marriage/:recordId", element: <AdminMarriageRecordDetailPage /> },
      {
        path: "records/marriage/:recordId/edit",
        element: (
          <RequireParishAdmin>
            <AdminMarriageRecordFormPage mode="edit" />
          </RequireParishAdmin>
        ),
      },
      { path: "records/death", element: <AdminDeathRecordsPage /> },
      { path: "records/death/new", element: <AdminDeathRecordFormPage mode="create" /> },
      { path: "records/death/:recordId", element: <AdminDeathRecordDetailPage /> },
      {
        path: "records/death/:recordId/edit",
        element: (
          <RequireParishAdmin>
            <AdminDeathRecordFormPage mode="edit" />
          </RequireParishAdmin>
        ),
      },
      { path: "records/ledgers", element: <AdminLedgersPage /> },
      { path: "records/ledgers/:bookId", element: <AdminLedgerBookPage /> },
      { path: "records/ledgers/:bookId/pages/:pageNumber", element: <AdminLedgerPageViewer /> },
      { path: "records/ledgers/:bookId/pages/:pageNumber/records", element: <AdminLedgerPageRecordsPage /> },
      { path: "mass-intentions", element: <AdminMassIntentionsPage /> },
      { path: "marriage-applications", element: <AdminMarriageApplicationsPage /> },
      { path: "marriage-applications/:applicationId", element: <AdminMarriageApplicationDetailPage /> },
      {
        path: "schedule",
        element: <AdminSchedulePage />,
      },
      { path: "donations", element: <AdminDonationsPage /> },
      { path: "staff", element: <AdminStaffPage /> },
      {
        path: "reports",
        element: <AdminReportsLayout />,
        children: [
          { index: true, element: <Navigate to="sacraments" replace /> },
          { path: "sacraments", element: <AdminReportPage key="sacraments" kind="sacraments" /> },
          { path: "certificates", element: <AdminReportPage key="certificates" kind="certificates" /> },
          { path: "donations", element: <AdminReportPage key="donations" kind="donations" /> },
          { path: "intentions", element: <AdminReportPage key="intentions" kind="intentions" /> },
        ],
      },
      {
        path: "settings",
        element: <AdminSettingsLayout />,
        children: [
          { index: true, element: <SettingsHomeRedirect /> },
          {
            element: <RequireParishAdmin fallback="personal" />,
            children: [
              { path: "parish-profile", element: <ParishProfileSection /> },
              { path: "fees", element: <ServiceFeesSection /> },
              { path: "staff", element: <StaffAccountsSection /> },
              { path: "certificates", element: <CertificateConfigSection /> },
              { path: "mass-schedule", element: <MassScheduleSection /> },
            ],
          },
          { path: "security", element: <AccountSecuritySection /> },
          { path: "personal", element: <AdminPersonalInfoSection /> },
        ],
      },
    ],
  },
];
