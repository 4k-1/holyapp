import type { CurrentUser } from "@/types";
import { SuperAdminModal, saBtnSecondary } from "./SuperAdminModal";

function roleLabel(role: CurrentUser["role"]) {
  if (role === "parish_admin") return "Parish Admin";
  if (role === "parish_staff") return "Parish Staff";
  if (role === "parishioner") return "Parishioner";
  return role;
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Detail({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <p className="mb-[3px] text-[11px] font-bold text-admin-ink-muted">{label}</p>
      <p className="text-[13px] text-admin-ink">{value || "—"}</p>
    </div>
  );
}

export function AccountDetailsModal({
  user,
  parishName,
  onClose,
}: {
  user: CurrentUser & { canEditRecords?: boolean };
  parishName: string;
  onClose: () => void;
}) {
  const office = user.role === "parish_admin" || user.role === "parish_staff";
  const active = user.status === "active";

  return (
    <SuperAdminModal
      title="Account details"
      onClose={onClose}
      widthClass="max-w-[480px]"
      footer={
        <button type="button" className={saBtnSecondary} onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="rounded-[10px] border border-admin-border bg-admin-surface-alt px-3.5 py-3">
        <p className="text-[15px] font-bold text-admin-ink">{user.fullName}</p>
        <p className="mt-0.5 text-[12.5px] text-admin-ink-muted">{user.email}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="inline-block rounded-full bg-admin-green-100 px-2.5 py-[3px] text-[11px] font-bold text-admin-green-900">
            {roleLabel(user.role)}
          </span>
          <span
            className={`inline-block rounded-full px-2.5 py-[3px] text-[11px] font-bold ${
              active ? "bg-admin-green-100 text-admin-green-900" : "bg-admin-red-100 text-admin-red-700"
            }`}
          >
            {active ? "Active" : "Suspended"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Detail label="Parish" value={parishName} />
        <Detail label="Contact" value={user.contactNumber ?? "—"} />
        {office ? (
          <Detail
            label="Can edit records"
            value={
              user.role === "parish_admin"
                ? user.canEditRecords !== false
                  ? "Can edit"
                  : "View only"
                : "—"
            }
          />
        ) : null}
        <Detail label="Joined" value={formatDate(user.createdAt)} />
        {user.gender ? <Detail label="Gender" value={user.gender} /> : null}
        {user.birthday ? <Detail label="Birthday" value={formatDate(user.birthday)} /> : null}
        {user.address ? <Detail label="Address" value={user.address} wide /> : null}
        <Detail
          label="Email verified"
          value={user.emailVerifiedAt ? formatDate(user.emailVerifiedAt) : "Not verified"}
        />
      </div>
    </SuperAdminModal>
  );
}
