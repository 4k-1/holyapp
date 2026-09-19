import { GearIcon } from "@/components/ui/icons/AdminIcons";

export function SuperAdminSettingsPage() {
  return (
    <div className="rounded-xl border border-admin-border bg-admin-surface px-[30px] py-[60px] text-center">
      <div className="mx-auto mb-3.5 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-admin-green-100 text-admin-green-900">
        <GearIcon className="h-6 w-6" />
      </div>
      <h3 className="mb-1.5 font-sans text-[15px] font-bold text-admin-ink">Settings</h3>
      <p className="m-0 text-[12.5px] text-admin-ink-muted">Super Admin account preferences.</p>
    </div>
  );
}
