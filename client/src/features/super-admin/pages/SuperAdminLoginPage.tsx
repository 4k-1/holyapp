import { SuperAdminLoginForm } from "@/features/super-admin/components/SuperAdminLoginForm";

export function SuperAdminLoginPage() {
  return (
    <div data-portal="admin" className="flex min-h-dvh flex-col bg-admin-bg">
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[24rem] rounded-lg border border-admin-border bg-admin-surface p-7 shadow-[0_1px_2px_rgba(23,45,49,0.04),0_12px_32px_rgba(23,45,49,0.06)] sm:p-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-admin-border bg-white shadow-sm">
              <img src="/holyapp-logo.webp" alt="" className="h-[30px] w-[30px] object-contain" />
            </span>
            <p className="font-serif text-[1.25rem] font-bold leading-none text-admin-ink">HolyApp</p>
          </div>
          <div className="mt-4 h-px w-10 bg-admin-green-700" aria-hidden="true" />
          <SuperAdminLoginForm />
        </div>
      </div>

      <p className="px-6 pb-6 text-center text-admin-support text-admin-ink-faint">
        Platform sign-in is recorded.
      </p>
    </div>
  );
}
