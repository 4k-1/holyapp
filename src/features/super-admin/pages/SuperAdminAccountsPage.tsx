import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminInput, AdminSelect } from "@/features/parish-admin/components/AdminForm";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import { useAsync } from "@/hooks/useAsync";
import { listPlatformAccounts, type PlatformAccount } from "@/features/super-admin/api/superAdminApi";
import type { Role, UserStatus } from "@/types";

const ROLE_LABEL: Record<Exclude<Role, "super_admin">, string> = {
  parish_admin: "Parish Admin",
  parish_staff: "Parish Staff",
  parishioner: "Parishioner",
};

const ROLE_AVATAR: Record<Exclude<Role, "super_admin">, string> = {
  parish_admin: "bg-admin-gold-100 text-admin-gold-700",
  parish_staff: "bg-admin-green-100 text-admin-green-700",
  parishioner: "bg-[#D6EAF8] text-[#2F6FA8]",
};

const HONORIFICS = new Set(["fr.", "fr", "rev.", "rec.", "staff", "dr.", "dr", "sr.", "sr", "mr.", "ms.", "mrs."]);

function initials(name: string) {
  const all = name.split(/\s+/).filter(Boolean);
  const words = all.filter((w) => !HONORIFICS.has(w.toLowerCase()));
  const clean = words.length ? words : all;
  if (clean.length === 0) return "?";
  if (clean.length === 1) return clean[0][0].toUpperCase();
  return (clean[0][0] + clean[clean.length - 1][0]).toUpperCase();
}

function formatJoined(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function SuperAdminAccountsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const parishFilter = searchParams.get("parish") ?? "all";
  const roleFromUrl = searchParams.get("role");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Exclude<Role, "super_admin">>(
    roleFromUrl === "parish_admin" || roleFromUrl === "parish_staff" || roleFromUrl === "parishioner"
      ? roleFromUrl
      : "all"
  );
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");

  const { data: accounts = [], loading } = useAsync(() => listPlatformAccounts(), []);

  const parishes = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of accounts) map.set(row.parish.id, row.parish.name);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [accounts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((row) => {
      if (parishFilter !== "all" && row.parish.id !== parishFilter) return false;
      if (roleFilter !== "all" && row.user.role !== roleFilter) return false;
      if (statusFilter !== "all" && row.user.status !== statusFilter) return false;
      if (!q) return true;
      return (
        row.user.fullName.toLowerCase().includes(q) ||
        row.user.email.toLowerCase().includes(q) ||
        row.parish.name.toLowerCase().includes(q)
      );
    });
  }, [accounts, parishFilter, query, roleFilter, statusFilter]);

  function setParishFilter(next: string) {
    const nextParams = new URLSearchParams(searchParams);
    if (next === "all") nextParams.delete("parish");
    else nextParams.set("parish", next);
    setSearchParams(nextParams, { replace: true });
  }

  const columns: AdminTableColumn<PlatformAccount>[] = [
    {
      key: "person",
      header: "Account",
      render: (row) => {
        const role = row.user.role as Exclude<Role, "super_admin">;
        return (
          <div className="flex items-center gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-serif text-admin-support font-bold ${ROLE_AVATAR[role]}`}
            >
              {initials(row.user.fullName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-admin-body font-semibold text-admin-ink">{row.user.fullName}</p>
              <p className="truncate text-admin-support text-admin-ink-faint">{row.user.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "role",
      header: "Role",
      render: (row) => ROLE_LABEL[row.user.role as Exclude<Role, "super_admin">],
    },
    {
      key: "parish",
      header: "Parish",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-admin-body text-admin-ink">{row.parish.name}</p>
          <p className="truncate text-admin-support text-admin-ink-faint">{row.parish.address}</p>
        </div>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      render: (row) => formatJoined(row.user.createdAt),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <AdminBadge tone={row.user.status === "active" ? "green" : "red"}>
          {row.user.status === "active" ? "Active" : "Suspended"}
        </AdminBadge>
      ),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl">

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:min-w-[16rem] sm:flex-1">
          <AdminInput
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, or parish"
            aria-label="Search accounts"
          />
        </div>
        <AdminSelect
          value={parishFilter}
          onChange={(e) => setParishFilter(e.target.value)}
          aria-label="Filter by parish"
          className="sm:w-56"
        >
          <option value="all">All parishes</option>
          {parishes.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </AdminSelect>
        <AdminSelect
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
          aria-label="Filter by role"
          className="sm:w-44"
        >
          <option value="all">All roles</option>
          <option value="parish_admin">Parish Admin</option>
          <option value="parish_staff">Parish Staff</option>
          <option value="parishioner">Parishioner</option>
        </AdminSelect>
        <AdminSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          aria-label="Filter by status"
          className="sm:w-36"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </AdminSelect>
      </div>

      <AdminCard className="mt-5 overflow-hidden p-0">
        {loading ? (
          <p className="px-5 py-8 text-admin-body text-admin-ink-muted">Loading accounts…</p>
        ) : (
          <div className="overflow-x-auto">
            <AdminTable
              columns={columns}
              rows={filtered}
              getRowKey={(row) => row.user.id}
              emptyMessage="No accounts match these filters."
            />
          </div>
        )}
      </AdminCard>
    </div>
  );
}
