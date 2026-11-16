import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminFilterBar } from "@/components/ui/AdminFilterBar";
import { AdminRowActions } from "@/components/ui/AdminRowActions";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { AdminStatCard } from "@/features/parish-admin/components/AdminStatCard";
import { isParishAdminRole } from "@/features/parish-admin/permissions";
import { listPersonnel, updatePerson, type ParishPerson } from "./api/personnelApi";
import { HandoverModal } from "./components/HandoverModal";
import { notifyError } from "@/lib/notify";
import { GiveSignInModal } from "./components/GiveSignInModal";
import { RemoveStaffModal } from "./components/RemoveStaffModal";
import { StaffPersonModal } from "./components/StaffPersonModal";
import { SkeletonList } from "@/components/ui/Skeleton";
import { AdminPage, AdminPageHeader } from "@/features/parish-admin/components/AdminPageHeader";
import { titleLabel } from "./staffRoles";

type Filter = "all" | "clergy" | "religious" | "lay" | "inactive";

const STAT_CARDS: { key: Filter; label: string }[] = [
  { key: "all", label: "All personnel" },
  { key: "clergy", label: "Clergy" },
  { key: "religious", label: "Religious" },
  { key: "lay", label: "Lay" },
  { key: "inactive", label: "Inactive" },
];

function matches(person: ParishPerson, filter: Filter) {
  if (filter === "inactive") return person.status === "inactive";
  if (person.status === "inactive") return false;
  if (filter === "clergy") return person.clergy;
  // Sisters and brothers: religious, not ordained. Lay is everyone else.
  if (filter === "religious") return person.clergyRank === "religious";
  if (filter === "lay") return !person.clergy && person.clergyRank !== "religious";
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
  const [givingSignIn, setGivingSignIn] = useState<ParishPerson | null>(null);
  const [leaving, setLeaving] = useState<ParishPerson | null>(null);

  function replacePerson(saved: ParishPerson) {
    setPeople((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
  }

  async function reactivate(person: ParishPerson) {
    try {
      replacePerson(await updatePerson(person.id, { status: "active" }));
    } catch (err) {
      notifyError(err, "Couldn't reactivate this person.");
    }
  }

  const load = useCallback(
    () =>
      listPersonnel()
        .then((data) => {
          setPeople(data.personnel);
          setRoles(data.roles);
          setLoadError("");
        })
        .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Couldn't load the personnel list."))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const next = { all: 0, clergy: 0, religious: 0, lay: 0, inactive: 0 } as Record<Filter, number>;
    for (const person of people) for (const card of STAT_CARDS) if (matches(person, card.key)) next[card.key] += 1;
    return next;
  }, [people]);

  const q = search.trim().toLowerCase();
  const rows = people
    .filter((p) => matches(p, filter))
    .filter((p) => !q || `${p.name} ${(p.titles ?? []).map(titleLabel).join(" ")} ${p.contact}`.toLowerCase().includes(q))
    .sort((a, b) => Number(b.clergy) - Number(a.clergy) || a.name.localeCompare(b.name));

  const columns: AdminTableColumn<ParishPerson>[] = [
    {
      key: "name",
      header: "Name",
      sortValue: (p) => p.name,
      render: (p) => (
        <div className="max-w-[260px] min-w-0">
          <p className="flex min-w-0 items-center gap-2">
            <span className={`truncate font-medium ${p.status === "active" ? "text-admin-ink" : "text-admin-ink-faint"}`}>{p.name}</span>
            {p.status !== "active" && <AdminBadge tone="muted">Inactive</AdminBadge>}
          </p>
          <p className="truncate text-admin-support text-admin-ink-faint">
            {[p.contact, p.hasAccount ? "Has staff account" : null].filter(Boolean).join(" · ") || "No sign-in"}
          </p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Title",
      sortValue: (p) => p.role,
      render: (p) => {
        const [primary, ...others] = p.titles?.length ? p.titles : [{ title: p.role, scope: null }];
        return (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <AdminBadge tone={p.clergy ? "gold" : "muted"}>{titleLabel(primary)}</AdminBadge>
            {others.length > 0 && (
              <span
                className="rounded-full bg-admin-surface-alt px-2 py-0.5 text-admin-label font-semibold text-admin-ink-muted"
                title={others.map(titleLabel).join("\n")}
              >
                +{others.length}
              </span>
            )}
          </span>
        );
      },
    },
  ];

  if (canManage) {
    columns.push({
      key: "actions",
      header: "Actions",
      className: "w-12 text-right",
      render: (p) => (
        <AdminRowActions
          label={`Actions for ${p.name}`}
          actions={[
            { label: "Edit", onSelect: () => setEditing(p) },
            { label: "Give sign-in", onSelect: () => setGivingSignIn(p), hidden: p.hasAccount || p.status !== "active" },
            { label: "Set inactive…", onSelect: () => setLeaving(p), hidden: p.status !== "active" },
            // Someone with a sign-in is reactivated with their account, under Settings → Staff Accounts.
            { label: "Reactivate", onSelect: () => reactivate(p), hidden: p.status === "active" || p.hasAccount },
            { label: "Remove", onSelect: () => setRemoving(p), danger: true, hidden: p.hasAccount },
          ]}
        />
      ),
    });
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title="Personnel"
        description="Priests and staff who serve the parish, with or without a sign-in. Events are assigned from this list."
        actions={
          canManage && (
            <AdminButton type="button" onClick={() => setEditing("new")}>
              + Add person
            </AdminButton>
          )
        }
      />

      <div className="mb-[22px] grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
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

      <AdminCard>
        <AdminFilterBar
          search={{ value: search, onChange: setSearch, placeholder: "Search by name, role, or contact", label: "Search personnel" }}
          chips={
            filter === "all"
              ? []
              : [{ key: "group", label: STAT_CARDS.find((c) => c.key === filter)!.label, onRemove: () => setFilter("all") }]
          }
          summary={loading ? undefined : `${rows.length} shown`}
        />
        {loading ? (
          <SkeletonList rows={5} />
        ) : loadError ? (
          <p className="px-6 py-10 text-center text-admin-body text-red-700" role="alert">
            {loadError}
          </p>
        ) : (
          <AdminTable
            columns={columns}
            rows={rows}
            getRowKey={(p) => p.id}
            pageKey="staff"
            emptyMessage={
              people.length === 0
                ? "No one listed yet. Add your parish priest first."
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

      {leaving && (
        <HandoverModal
          personId={leaving.id}
          personName={leaving.name}
          onClose={() => setLeaving(null)}
          onDone={() => {
            setLeaving(null);
            load();
          }}
        />
      )}

      {givingSignIn && (
        <GiveSignInModal
          person={givingSignIn}
          onClose={() => setGivingSignIn(null)}
          onDone={() => {
            setGivingSignIn(null);
            load();
          }}
        />
      )}
    </AdminPage>
  );
}
