import { BellIcon, ChevronDownIcon } from "@/components/ui/icons/AdminIcons";
import type { CurrentUser } from "@/types";

interface AdminTopbarProps {
  user: CurrentUser;
}

export function AdminTopbar({ user }: AdminTopbarProps) {
  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const roleLabel = user.role === "parish_admin" ? "Parish Admin" : "Parish Staff";

  return (
    <div className="flex h-16 items-center justify-end gap-3 border-b border-admin-border bg-admin-surface px-6">
      <button
        type="button"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-admin-ink-muted hover:bg-admin-surface-alt"
      >
        <BellIcon className="h-[18px] w-[18px]" />
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-admin-red-700" />
      </button>

      <div className="flex cursor-pointer items-center gap-2.5 rounded-full py-1 pl-1 pr-2 hover:bg-admin-surface-alt">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-admin-green-100 text-xs font-bold text-admin-green-700">
          {initials}
        </div>
        <div className="leading-tight">
          <p className="text-admin-body font-semibold text-admin-ink">{user.fullName}</p>
          <p className="text-admin-label text-admin-ink-muted">{roleLabel}</p>
        </div>
        <ChevronDownIcon className="h-3.5 w-3.5 text-admin-ink-muted" />
      </div>
    </div>
  );
}