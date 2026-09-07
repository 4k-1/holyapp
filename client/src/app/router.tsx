import { createBrowserRouter, Navigate } from "react-router-dom";
import { ParishLayout } from "@/features/parish/ParishLayout";
import { parishLayoutLoader } from "@/features/parish/parish-loader";
import { parishionerRoutes } from "@/features/parishioner/routes";
import { requireRole, requireSuperAdmin } from "@/features/auth/guards";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { UnauthorizedPage } from "@/features/auth/pages/UnauthorizedPage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";
import { GivePage } from "@/features/public/GivePage";
import { PublicDonatePage } from "@/features/public/PublicDonatePage";
import { PublicIntentionPage } from "@/features/public/PublicIntentionPage";
import { ParishLoginPage } from "@/features/auth/pages/ParishLoginPage";
import { ParishRegisterPage } from "@/features/auth/pages/ParishRegisterPage";
import { parishAdminRoutes } from "@/features/parish-admin/routes";
import { SuperAdminLoginPage } from "@/features/super-admin/pages/SuperAdminLoginPage";
import { SuperAdminLayout } from "@/features/super-admin/pages/SuperAdminLayout";
import { SuperAdminDashboardPage } from "@/features/super-admin/pages/SuperAdminDashboardPage";
import { SuperAdminAccountsPage } from "@/features/super-admin/pages/SuperAdminAccountsPage";
import { SuperAdminParishAccountsPage } from "@/features/super-admin/pages/SuperAdminParishAccountsPage";
import { SuperAdminParishesPage } from "@/features/super-admin/pages/SuperAdminParishesPage";
import { SuperAdminTemplatesPage } from "@/features/super-admin/pages/SuperAdminTemplatesPage";
import { SuperAdminAuditPage } from "@/features/super-admin/pages/SuperAdminAuditPage";
import { SuperAdminReportsPage } from "@/features/super-admin/pages/SuperAdminReportsPage";
import { SuperAdminSettingsPage } from "@/features/super-admin/pages/SuperAdminSettingsPage";
import { ResetPasswordPage } from "@/features/auth/pages/ResetPasswordPage";


// inside createBrowserRouter([...]) array:


export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "/give",
    element: <GivePage />,
  },
  {
    path: "/give/:parishSlug/donate",
    element: <PublicDonatePage />,
  },
  {
    path: "/give/:parishSlug/intention",
    element: <PublicIntentionPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/unauthorized",
    element: <UnauthorizedPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/reset-password",
    element: <ResetPasswordPage />,
  },
  {
    path: "/reset-password/:token",
    element: <ResetPasswordPage />,
  },
  {
    path: "/verify/:hash",
    // stub — build VerifyPage in features/verification later
    element: <div className="p-8">Verify page (placeholder)</div>,
  },
  {
    path: "/super-admin/login",
    element: <SuperAdminLoginPage />,
  },
  {
    path: "/super-admin",
    element: <SuperAdminLayout />,
    loader: requireSuperAdmin,
    children: [
      { index: true, element: <SuperAdminDashboardPage /> },
      { path: "parishes", element: <SuperAdminParishesPage /> },
      { path: "templates", element: <SuperAdminTemplatesPage /> },
      { path: "accounts", element: <SuperAdminAccountsPage /> },
      { path: "accounts/:parishId", element: <SuperAdminParishAccountsPage /> },
      { path: "audit", element: <SuperAdminAuditPage /> },
      { path: "reports", element: <SuperAdminReportsPage /> },
      { path: "settings", element: <SuperAdminSettingsPage /> },
    ],
  },
  {
    path: "/:parishSlug",
    element: <ParishLayout />,
    loader: parishLayoutLoader,
    children: [
      { path: "login", element: <ParishLoginPage /> },
      { path: "register", element: <ParishRegisterPage /> },
      {
        path: "portal",
        loader: requireRole(["parishioner"]),
        children: parishionerRoutes,
      },
      {
        path: "admin",
        loader: requireRole(["parish_admin", "parish_staff"]),
        children: parishAdminRoutes,
      },
    ],
  },
]);