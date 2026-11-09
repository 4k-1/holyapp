import { useState } from "react";
import { AdminButton, AdminField, AdminInput, AdminSelect } from "@/features/parish-admin/components/AdminForm";
import {
  addPerson,
  updatePerson,
  type ClergyRank,
  type ParishPerson,
  type PersonTitle,
} from "../api/personnelApi";
import { AdminModalFrame } from "@/features/parish-admin/components/AdminModalFrame";
import { CLERGY_RANK_OPTIONS, HONORIFIC_SUGGESTIONS, rankForTitle } from "../staffRoles";

interface StaffPersonModalProps {
  person?: ParishPerson;
  roles: string[];
  onClose: () => void;
  onSaved: (person: ParishPerson) => void;
}

const MAX_TITLES = 6;
const selectClass = "w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-body text-admin-ink";

/** Adds someone to the staff list, or edits their name parts, clergy status, titles and contact (item 4). */
export function StaffPersonModal({ person, roles, onClose, onSaved }: StaffPersonModalProps) {
  const firstRole = roles[0] ?? "Parish Priest";
  const [honorific, setHonorific] = useState(person?.honorific ?? "");
  const [name, setName] = useState(person?.plainName ?? person?.name ?? "");
  const [postNominals, setPostNominals] = useState(person?.postNominals ?? "");
  const [titles, setTitles] = useState<PersonTitle[]>(
    person?.titles?.length ? person.titles : [{ title: person?.role ?? firstRole, scope: null }]
  );
  const [clergyRank, setClergyRank] = useState<ClergyRank>(person?.clergyRank ?? rankForTitle(firstRole));
  // A new person's clergy status follows their first title until it is chosen by hand.
  const [rankTouched, setRankTouched] = useState(Boolean(person));
  const [contact, setContact] = useState(person?.contact ?? "");
  const [status, setStatus] = useState<"active" | "inactive">(person?.status ?? "active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const nameLocked = Boolean(person?.hasAccount);

  function setTitle(index: number, patch: Partial<PersonTitle>) {
    setTitles((list) => list.map((t, i) => (i === index ? { ...t, ...patch } : t)));
    if (index === 0 && patch.title && !rankTouched) setClergyRank(rankForTitle(patch.title));
  }

  function makePrimary(index: number) {
    setTitles((list) => [list[index], ...list.filter((_, i) => i !== index)]);
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Enter a name.");
      return;
    }
    if (titles.some((t) => !t.title)) {
      setError("Choose a title on every line, or remove the empty one.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const input = {
        honorific: honorific.trim(),
        postNominals: postNominals.trim(),
        clergyRank,
        titles: titles.map((t) => ({ title: t.title, scope: t.scope?.trim() || null })),
        contact: contact.trim(),
        ...(nameLocked ? {} : { name: name.trim() }),
        ...(person && !nameLocked ? { status } : {}),
      };
      onSaved(person ? await updatePerson(person.id, input) : await addPerson(input));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save this person.");
      setSaving(false);
    }
  }

  const preview = [honorific.trim(), name.trim()].filter(Boolean).join(" ") + (postNominals.trim() ? `, ${postNominals.trim()}` : "");

  return (
    <AdminModalFrame
      onClose={onClose}
      busy={saving}
      panelClassName="max-w-[560px] rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]"
    >
      <div className="border-b border-admin-border px-6 py-4">
        <h3 id="staff-person-title" className="font-serif text-admin-section font-semibold text-admin-ink">
          {person ? "Edit staff" : "Add staff"}
        </h3>
        <p className="mt-0.5 text-admin-support text-admin-ink-muted">
          {person?.hasAccount
            ? "Their name and status follow their staff account. Change those under Settings → Staff Accounts."
            : "This doesn't create a sign-in. If they need to use the system, choose Give sign-in on their row."}
        </p>
      </div>
      <div className="max-h-[70vh] space-y-3.5 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[120px_minmax(0,1fr)_110px]">
          <AdminField label="Honorific" className="mb-0">
            <AdminInput
              value={honorific}
              onChange={(e) => setHonorific(e.target.value)}
              placeholder="e.g. Fr."
              list="honorific-suggestions"
            />
            <datalist id="honorific-suggestions">
              {HONORIFIC_SUGGESTIONS.map((h) => (
                <option key={h} value={h} />
              ))}
            </datalist>
          </AdminField>
          <AdminField label="Name" className="mb-0">
            <AdminInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Juan Santos"
              disabled={nameLocked}
              autoFocus={!nameLocked}
            />
          </AdminField>
          <AdminField label="After name" className="mb-0">
            <AdminInput value={postNominals} onChange={(e) => setPostNominals(e.target.value)} placeholder="e.g. SVD" />
          </AdminField>
        </div>
        {preview && (
          <p className="-mt-1 text-admin-support text-admin-ink-muted">
            Shown as <span className="font-semibold text-admin-ink">{preview}</span>
          </p>
        )}

        <AdminField label="Clergy status" className="mb-0">
          <AdminSelect
            value={clergyRank}
            onChange={(e) => {
              setClergyRank(e.target.value as ClergyRank);
              setRankTouched(true);
            }}
          >
            {CLERGY_RANK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </AdminSelect>
        </AdminField>

        <div>
          <p className="mb-1.5 text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">Titles</p>
          <ul className="space-y-2">
            {titles.map((t, index) => (
              <li key={index} className="rounded-lg border border-admin-border px-3 py-2.5">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <select
                    value={t.title}
                    onChange={(e) => setTitle(index, { title: e.target.value })}
                    aria-label={`Title ${index + 1}`}
                    className={selectClass}
                  >
                    {!t.title && <option value="">Choose a title</option>}
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <AdminInput
                    value={t.scope ?? ""}
                    onChange={(e) => setTitle(index, { scope: e.target.value })}
                    placeholder="Where (optional), e.g. St. Jude School"
                    aria-label={`Where, title ${index + 1}`}
                  />
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-admin-support">
                  {index === 0 ? (
                    <span className="font-semibold text-admin-green-700">Primary title</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => makePrimary(index)}
                      className="font-semibold text-admin-green-700 hover:underline"
                    >
                      Make primary
                    </button>
                  )}
                  {titles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setTitles((list) => list.filter((_, i) => i !== index))}
                      className="text-admin-red-700 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {titles.length < MAX_TITLES && (
            <button
              type="button"
              onClick={() => setTitles((list) => [...list, { title: "", scope: null }])}
              className="mt-2 text-admin-support font-semibold text-admin-green-700 hover:underline"
            >
              + Add another title
            </button>
          )}
          <p className="mt-1 text-admin-support text-admin-ink-muted">
            The primary title shows in small spaces like the schedule. Only one person can be Parish Priest.
          </p>
        </div>

        <AdminField label="Contact (optional)" className="mb-0">
          <AdminInput value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Mobile number or email" />
        </AdminField>
        {person && !nameLocked && (
          <AdminField label="Status" className="mb-0">
            <select value={status} onChange={(e) => setStatus(e.target.value as "active" | "inactive")} className={selectClass}>
              <option value="active">Active: can be assigned to events</option>
              <option value="inactive">Inactive: kept on record, not assignable</option>
            </select>
          </AdminField>
        )}
        {error && <p className="text-admin-support font-semibold text-red-700">{error}</p>}
      </div>
      <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
        <AdminButton variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </AdminButton>
        <AdminButton onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : person ? "Save" : "Add staff"}
        </AdminButton>
      </div>
    </AdminModalFrame>
  );
}
