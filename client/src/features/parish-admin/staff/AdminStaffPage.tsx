import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { AdminStatCard } from "@/features/parish-admin/components/AdminStatCard";
import { isParishAdminRole } from "@/features/parish-admin/permissions";
import { listPersonnel, type ParishPerson } from "./api/personnelApi";
import { RemoveStaffModal } from "./components/RemoveStaffModal";
import { StaffPersonModal } from "./components/StaffPersonModal";

type Filter = "all" | "clergy" | "staff" | "inactive";

const STAT_CARDS: { key: Filter; label: string }[] = [
  { key: "all", label: "All staff" },
  { key: "clergy", label: "Clergy" },
  { key: "staff", label: "Other staff" },
  { key: "inactive", label: "Inactive" },
];

function matches(person: ParishPerson, filter: Filter) {
  if (filter === "inactive") return person.status === "inactive";
  if (person.status === "inactive") return false;
  if (filter === "clergy") return person.clergy;
  if (filter === "staff") return !person.clergy;
  return true;
}

/**
 * Everyone who serves the parish, with or without a sign-in. Events on the schedule are assigned from this
 * list. Everyone in the office can view it; only the parish admin can change it.
 */
export function AdminStaffPage() {
  const user = useCurrentUser();
  const canManage = isParishAdminRole(user?.role);
  const [people, setPeople] = useState<ParishPerson[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ParishPerson | "new" | null>(null);
  const [removing, setRemoving] = useState<ParishPerson | null>(null);

  const load = useCallback(
    () =>
      listPersonnel()
        .then((data) => {
          setPeople(data.personnel);
          setRoles(data.roles);
          setLoadError("");
        })
        .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Couldn't load the staff list."))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const next = { all: 0, clergy: 0, staff: 0, inactive: 0 } as Record<Filter, number>;
    for (const person of people) for (const card of STAT_CARDS) if (matches(person, card.key)) next[card.key] += 1;
    return next;
  }, [people]);

  const q = search.trim().toLowerCase();
  const rows = people
    .filter((p) => matches(p, filter))
    .filter((p) => !q || `${p.name} ${p.role} ${p.contact}`.toLowerCase().includes(q))
    .sort((a, b) => Number(b.clergy) - Number(a.clergy) || a.name.localeCompare(b.name));

  const columns: AdminTableColumn<ParishPerson>[] = [
    {
      key: "name",
      header: "Name",
      render: (p) => (
        <div className="max-w-[260px] min-w-0">
          <p className={`truncate font-medium ${p.status === "active" ? "text-admin-ink" : "text-admin-ink-faint"}`}>{p.name}</p>
          <p className="truncate text-admin-support text-admin-ink-faint">
            {[p.contact, p.hasAccount ? "Has staff account" : null].filter(Boolean).join(" · ") || "No sign-in"}
          </p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (p) => (
        <span className="whitespace-nowrap">
          <AdminBadge tone={p.clergy ? "gold" : "muted"}>{p.role}</AdminBadge>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <AdminBadge tone={p.status === "active" ? "green" : "muted"}>{p.status === "active" ? "Active" : "Inactive"}</AdminBadge>
      ),
    },
  ];

  if (canManage) {
    columns.push({
      key: "actions",
      header: "Actions",
      render: (p) => (
        <div className="inline-flex items-center gap-3 whitespace-nowrap">
          <button type="button" onClick={() => setEditing(p)} className="admin-table__action">
            Edit
          </button>
          {!p.hasAccount && (
            <button
              type="button"
              onClick={() => setRemoving(p)}
              className="text-admin-support font-semibold text-red-700 hover:underline"
            >
              Remove
            </button>
          )}
        </div>
      ),
    });
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap">
        <div>
          <h1 className="mb-1 text-admin-page font-semibold text-admin-ink">Staff</h1>
          <p className="text-admin-body text-admin-ink-muted">
            Priests and staff who serve the parish, with or without a sign-in. Events are assigned from this list.
          </p>
        </div>
        {canManage && (
          <AdminButton type="button" onClick={() => setEditing("new")} className="shrink-0">
            + Add staff
          </AdminButton>
        )}
      </div>

      <div className="mb-[22px] grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <AdminStatCard
            key={card.key}
            label={card.label}
            value={loading ? "—" : counts[card.key]}
            active={filter === card.key}
            onClick={() => setFilter(card.key)}
          />
        ))}
      </div>

      <div className="mb-3.5 sm:max-w-[320px]">
        <AdminInput
          placeholder="Search by name, role, or contact"
          aria-label="Search staff"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <AdminCard>
        {loading ? (
          <p className="px-6 py-10 text-center text-admin-body text-admin-ink-muted">Loading staff…</p>
        ) : loadError ? (
          <p className="px-6 py-10 text-center text-admin-body text-red-700" role="alert">
            {loadError}
          </p>
        ) : (
          <AdminTable
            columns={columns}
            rows={rows}
            getRowKey={(p) => p.id}
            emptyMessage={
              people.length === 0
                ? "No staff yet. Add your parish priest first."
                : "No one matches. Try another filter or search."
            }
          />
        )}
      </AdminCard>

      {editing && (
        <StaffPersonModal
          person={editing === "new" ? undefined : editing}
          roles={roles}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setPeople((prev) =>
              prev.some((p) => p.id === saved.id) ? prev.map((p) => (p.id === saved.id ? saved : p)) : [...prev, saved]
            );
            setEditing(null);
          }}
        />
      )}

      {removing && (
        <RemoveStaffModal
          person={removing}
          onClose={() => setRemoving(null)}
          onRemoved={() => {
            setPeople((prev) => prev.filter((p) => p.id !== removing.id));
            setRemoving(null);
          }}
        />
      )}
    </div>
  );
}
