import { SuperAdminLoginForm } from "@/features/super-admin/components/SuperAdminLoginForm";

export function SuperAdminLoginPage() {
  return (
    <div data-portal="admin" className="flex min-h-dvh flex-col bg-admin-bg">
      <div className="h-[3px] bg-admin-green-900" aria-hidden="true" />

      <div className="flex flex-1 flex-col items-center px-6 pt-16 pb-10 sm:pt-24">
        <div className="w-full max-w-[22.5rem]">
          <p className="font-serif text-[1.375rem] font-semibold leading-none text-admin-green-900">
            HolyApp
          </p>
          <div className="mt-3 h-px w-10 bg-admin-green-700" aria-hidden="true" />

          <SuperAdminLoginForm />
        </div>
      </div>

      <p className="px-6 pb-6 text-center text-admin-label tracking-admin-label text-admin-ink-faint">
        Platform sign-in is recorded.
      </p>
    </div>
  );
}
