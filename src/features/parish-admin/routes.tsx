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
import { AdminSchedulePage } from "@/features/parish-admin/schedule/AdminSchedulePage";

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
     {
      path: "schedule", element: <AdminSchedulePage />,
     }
      // death, ledgers, schedule, donations, reports, settings go here next
    ],
  },
];
