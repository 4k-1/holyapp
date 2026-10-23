import { useCallback, useEffect, useState } from "react";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { addPerson, listPersonnel, updatePerson, type ParishPerson } from "../api/personnelApi";

/**
 * Everyone who serves the parish, including priests and staff who never sign in. Events on the schedule are
 * assigned from this list.
 */
export function StaffDirectorySection() {
  const [people, setPeople] = useState<ParishPerson[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState<ParishPerson | "new" | null>(null);

  const load = useCallback(
    () =>
      listPersonnel()
        .then((data) => {
          setPeople(data.personnel);
          setRoles(data.roles);
          setLoadError("");
        })
        .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Couldn't load the directory."))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  async function toggleStatus(person: ParishPerson) {
    try {
      const updated = await updatePerson(person.id, { status: person.status === "active" ? "inactive" : "active" });
      setPeople((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Couldn't update this person.");
    }
  }

  const clergyCount = people.filter((p) => p.clergy && p.status === "active").length;

  const columns: AdminTableColumn<ParishPerson>[] = [
    {
      key: "name",
      header: "Name",
      render: (p) => (
        <div className="min-w-0">
          <p className={`truncate text-admin-body font-semibold ${p.status === "active" ? "text-admin-ink" : "text-admin-ink-faint"}`}>
            {p.name}
          </p>
          {p.contact && <p className="truncate text-admin-support text-admin-ink-faint">{p.contact}</p>}
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (p) => <AdminBadge tone={p.clergy ? "gold" : "muted"}>{p.role}</AdminBadge>,
    },
    {
      key: "account",
      header: "Sign-in",
      render: (p) => (
        <span className="text-admin-support text-admin-ink-muted">{p.hasAccount ? "Has staff account" : "No account"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <AdminBadge tone={p.status === "active" ? "green" : "muted"}>{p.status === "active" ? "Active" : "Inactive"}</AdminBadge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (p) => (
        <div className="inline-flex gap-3">
          <button onClick={() => setEditing(p)} className="text-admin-support font-semibold text-admin-green-700 hover:underline">
            Edit
          </button>
          {!p.hasAccount && (
            <button
              onClick={() => toggleStatus(p)}
              className={`text-admin-support font-semibold hover:underline ${
                p.status === "active" ? "text-red-700" : "text-admin-green-700"
              }`}
            >
              {p.status === "active" ? "Set inactive" : "Reactivate"}
            </button>
          )}
        </div>
      ),
    },
  ];

  if (loading) return <p className="text-admin-body text-admin-ink-muted">Loading…</p>;

  return (
    <>
      <AdminCard className="overflow-hidden p-0">
        <div className="flex items-start justify-between gap-3 px-[22px] py-5">
          <div>
            <h2 className="font-serif text-admin-section font-semibold text-admin-ink">Staff Directory</h2>
            <p className="mt-1 text-admin-support text-admin-ink-muted">
              Priests and staff who serve the parish, with or without a sign-in. The schedule assigns events from this
              list.
            </p>
            <p className="mt-1.5 text-admin-label text-admin-ink-faint">
              {people.length} {people.length === 1 ? "person" : "people"} · {clergyCount} active clergy
            </p>
          </div>
          <AdminButton size="sm" onClick={() => setEditing("new")} className="shrink-0">
            + Add person
          </AdminButton>
        </div>
        {loadError ? (
          <p className="px-[22px] pb-5 text-admin-body text-red-700" role="alert">
            {loadError}
          </p>
        ) : (
          <AdminTable
            columns={columns}
            rows={people}
            getRowKey={(p) => p.id}
            emptyMessage="No one in the directory yet. Add your parish priest first."
          />
        )}
      </AdminCard>

      {editing && (
        <PersonModal
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
    </>
  );
}

function PersonModal({
  person,
  roles,
  onClose,
  onSaved,
}: {
  person?: ParishPerson;
  roles: string[];
  onClose: () => void;
  onSaved: (person: ParishPerson) => void;
}) {
  const [name, setName] = useState(person?.name ?? "");
  const [role, setRole] = useState(person?.role ?? roles[0] ?? "Parish Priest");
  const [contact, setContact] = useState(person?.contact ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const nameLocked = Boolean(person?.hasAccount);

  async function handleSave() {
    if (!name.trim()) {
      setError("Enter a name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const input = { role, contact: contact.trim(), ...(nameLocked ? {} : { name: name.trim() }) };
      onSaved(person ? await updatePerson(person.id, input) : await addPerson(input));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save this person.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 pt-8 sm:pt-12">
      <div className="absolute inset-0 bg-black/45" onClick={saving ? undefined : onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-[460px] rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]">
        <div className="border-b border-admin-border px-6 py-4">
          <h3 className="font-serif text-admin-section font-semibold text-admin-ink">{person ? "Edit person" : "Add person"}</h3>
          <p className="mt-0.5 text-admin-support text-admin-ink-muted">
            {person?.hasAccount
              ? "Name follows this person's staff account. Change it under Staff Accounts."
              : "No sign-in is created. Add a staff account separately if they need one."}
          </p>
        </div>
        <div className="space-y-3.5 px-6 py-5">
          <AdminField label="Full name" className="mb-0">
            <AdminInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Fr. Juan Santos"
              disabled={nameLocked}
            />
          </AdminField>
          <AdminField label="Role" className="mb-0">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-body text-admin-ink"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Contact (optional)" className="mb-0">
            <AdminInput value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Mobile number or email" />
          </AdminField>
          {error && <p className="text-admin-support font-semibold text-red-700">{error}</p>}
        </div>
        <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
          <AdminButton variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </AdminButton>
          <AdminButton onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : person ? "Save" : "Add person"}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
