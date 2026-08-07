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
      // marriage, death, ledgers, schedule, donations, reports, settings go here next
    ],
  },
];
