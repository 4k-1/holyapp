import type { RouteObject } from "react-router-dom";
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
import { AdminBannsPage } from "@/features/parish-admin/marriage-applications/AdminBannsPage";
import { AdminBannsPosterPage } from "@/features/parish-admin/marriage-applications/AdminBannsPosterPage";
import { AdminNotificationsPage } from "@/features/parish-admin/notifications/AdminNotificationsPage";
import { AdminReportsLayout } from "@/features/parish-admin/reports/AdminReportsLayout";
import { AdminReportPage } from "@/features/parish-admin/reports/AdminReportPage";
import { AdminDaySummaryPage } from "@/features/parish-admin/reports/AdminDaySummaryPage";
import { AdminSettingsLayout } from "@/features/parish-admin/settings/AdminSettingsLayout";
import { SettingsHomeRedirect } from "@/features/parish-admin/settings/SettingsHomeRedirect";
import { ParishProfileSection } from "@/features/parish-admin/settings/components/ParishProfileSection";
import { ServiceFeesSection } from "@/features/parish-admin/settings/components/ServiceFeesSection";
import { StaffAccountsSection } from "@/features/parish-admin/settings/components/StaffAccountsSection";
import { AdminStaffPage } from "@/features/parish-admin/staff/AdminStaffPage";
import { CertificateConfigSection } from "@/features/parish-admin/settings/components/CertificateConfigSection";
import { MassScheduleSection } from "@/features/parish-admin/settings/components/MassScheduleSection";
import { MarriageRequirementsSection } from "@/features/parish-admin/settings/components/MarriageRequirementsSection";
import { AccountSecuritySection } from "@/features/parish-admin/settings/components/AccountSecuritySection";
import { AdminPersonalInfoSection } from "@/features/parish-admin/settings/components/AdminPersonalInfoSection";
import { RequireParishAdmin } from "@/features/parish-admin/RequireParishAdmin";
import { RequireArea } from "@/features/parish-admin/RequireArea";
import { ReportsHomeRedirect } from "@/features/parish-admin/reports/ReportsHomeRedirect";

export const parishAdminRoutes: RouteObject[] = [
  {
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: "notifications", element: <AdminNotificationsPage /> },
      {
        element: <RequireArea area="certificates" />,
        children: [
          { path: "requests", element: <AdminRequestsPage /> },
          { path: "requests/:requestId/find-record", element: <AdminFindRecordPage /> },
        ],
      },
      {
        element: <RequireArea area="registers" />,
        children: [
          { path: "records/baptismal", element: <AdminBaptismalRecordsPage /> },
          { path: "records/baptismal/new", element: <RequireArea area="registers" level="manage"><AdminBaptismalRecordFormPage mode="create" /></RequireArea> },
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
          { path: "records/confirmation/new", element: <RequireArea area="registers" level="manage"><AdminConfirmationRecordFormPage mode="create" /></RequireArea> },
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
          { path: "records/marriage/new", element: <RequireArea area="registers" level="manage"><AdminMarriageRecordFormPage mode="create" /></RequireArea> },
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
          { path: "records/death/new", element: <RequireArea area="registers" level="manage"><AdminDeathRecordFormPage mode="create" /></RequireArea> },
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
        ],
      },
      {
        element: <RequireArea area="intentions" />,
        children: [
          { path: "mass-intentions", element: <AdminMassIntentionsPage /> },
        ],
      },
      {
        element: <RequireArea area="marriage" />,
        children: [
          { path: "marriage-applications", element: <AdminMarriageApplicationsPage /> },
          { path: "marriage-applications/banns", element: <AdminBannsPage /> },
          { path: "marriage-applications/:applicationId", element: <AdminMarriageApplicationDetailPage /> },
          { path: "marriage-applications/:applicationId/banns-poster", element: <AdminBannsPosterPage /> },
        ],
      },
      {
        element: <RequireArea area="schedule" />,
        children: [
          {
            path: "schedule",
            element: <AdminSchedulePage />,
          },
        ],
      },
      {
        element: <RequireArea area="donations" />,
        children: [
          { path: "donations", element: <AdminDonationsPage /> },
        ],
      },
      { path: "staff", element: <AdminStaffPage /> },
      {
        path: "reports",
        element: <AdminReportsLayout />,
        children: [
          { index: true, element: <ReportsHomeRedirect /> },
          { path: "day", element: <AdminDaySummaryPage /> },
          { path: "sacraments", element: <RequireArea area="registers"><AdminReportPage key="sacraments" kind="sacraments" /></RequireArea> },
          { path: "certificates", element: <RequireArea area="certificates"><AdminReportPage key="certificates" kind="certificates" /></RequireArea> },
          { path: "donations", element: <RequireArea area="donations"><AdminReportPage key="donations" kind="donations" /></RequireArea> },
          { path: "intentions", element: <RequireArea area="intentions"><AdminReportPage key="intentions" kind="intentions" /></RequireArea> },
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
              { path: "marriage-requirements", element: <MarriageRequirementsSection /> },
            ],
          },
          { path: "security", element: <AccountSecuritySection /> },
          { path: "personal", element: <AdminPersonalInfoSection /> },
        ],
      },
    ],
  },
];
