// Settings → Marriage Requirements (item 5a): the papers and steps this parish asks couples for.
import { useState } from "react";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminButton, AdminField, AdminInput, AdminSelect } from "@/features/parish-admin/components/AdminForm";
import { useAsync } from "@/hooks/useAsync";
import { notifyError } from "@/lib/notify";
import {
  addMarriageRequirement,
  listMarriageRequirements,
  updateMarriageRequirement,
  type MarriageRequirementInput,
  type MarriageRequirementSetting,
} from "../api/marriageRequirementsApi";
import { SettingsPanel } from "./SettingsUI";

type Question = { key: string; question: string };

function validityText(days: number | null) {
  if (!days) return "No time limit";
  if (days % 30 === 0 && days >= 60) return `Good for ${days / 30} months`;
  return `Good for ${days} days`;
}

export function MarriageRequirementsSection() {
  const { data, loading, error, refetch } = useAsync(() => listMarriageRequirements(), []);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [notice, setNotice] = useState("");
  const items = data?.requirements ?? [];
  const questions = data?.circumstances ?? [];
  const questionFor = (key: string | null) => questions.find((q) => q.key === key)?.question ?? key ?? "";

  async function toggle(item: MarriageRequirementSetting) {
    try {
      await updateMarriageRequirement(item.id, { active: !item.active });
      setNotice(item.active ? `${item.name} turned off.` : `${item.name} turned on.`);
      refetch();
    } catch (err) {
      notifyError(err, "Couldn't change this requirement.");
    }
  }

  function saved(name: string) {
    setEditingId(null);
    setNotice(`${name} saved.`);
    refetch();
  }

  const always = items.filter((i) => i.condition === "always");
  const conditional = items.filter((i) => i.condition !== "always");

  function row(item: MarriageRequirementSetting) {
    if (editingId === item.id) {
      return (
        <RequirementForm
          key={item.id}
          initial={item}
          questions={questions}
          onCancel={() => setEditingId(null)}
          onSaved={saved}
        />
      );
    }
    const meta = [
      validityText(item.validForDays),
      item.required ? null : "Optional",
      item.skipWhen ? `Not needed when: ${questionFor(item.skipWhen)}` : null,
    ].filter(Boolean);
    return (
      <li
        key={item.id}
        className={`flex flex-wrap items-center justify-between gap-3 border-t border-admin-border px-5 py-3 first:border-t-0 ${
          item.active ? "" : "bg-admin-surface-alt"
        }`}
      >
        <div className="min-w-0">
          <p className={`text-admin-body font-medium ${item.active ? "text-admin-ink" : "text-admin-ink-faint line-through"}`}>
            {item.name}{" "}
            {!item.builtIn && <AdminBadge tone="muted">Added by the parish</AdminBadge>}
            {!item.active && <AdminBadge tone="muted">Off</AdminBadge>}
          </p>
          <p className="text-admin-support text-admin-ink-muted">{meta.join(" · ")}</p>
          {item.note && <p className="text-admin-support text-admin-ink-muted">Note: {item.note}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-3 text-admin-support font-semibold">
          <button type="button" onClick={() => setEditingId(item.id)} className="text-admin-green-700 hover:underline">
            Edit
          </button>
          <button type="button" onClick={() => toggle(item)} className="text-admin-ink-muted hover:underline">
            {item.active ? "Turn off" : "Turn on"}
          </button>
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-4">
      {notice && (
        <p className="rounded-lg bg-admin-green-100 px-3.5 py-2.5 text-admin-body font-semibold text-admin-green-900" role="status">
          {notice}
        </p>
      )}
      <SettingsPanel
        title="Asked of every couple"
        description="Turning one off stops asking for it on open applications. Papers already received stay on record."
        action={
          editingId !== "new" &&
          !loading &&
          !error && (
            <AdminButton size="sm" className="rounded-full" onClick={() => setEditingId("new")}>
              + Add requirement
            </AdminButton>
          )
        }
        flush
      >
        {editingId === "new" && (
          <div className="border-b border-admin-border">
            <RequirementForm questions={questions} onCancel={() => setEditingId(null)} onSaved={saved} />
          </div>
        )}
        {loading && items.length === 0 ? (
          <p className="px-5 py-4 text-admin-body text-admin-ink-muted">Loading requirements…</p>
        ) : error ? (
          <p className="px-5 py-4 text-admin-body font-semibold text-admin-red-700" role="alert">
            {error.message}
          </p>
        ) : (
          <ul>{always.map(row)}</ul>
        )}
      </SettingsPanel>

      {conditional.length > 0 && (
        <SettingsPanel
          title="Only in some cases"
          description="Asked for only when the office answers yes to the question on the couple's application."
          flush
        >
          {questions.map((q) => {
            const forQuestion = conditional.filter((i) => i.condition === q.key);
            if (forQuestion.length === 0) return null;
            return (
              <div key={q.key} className="border-t border-admin-border first:border-t-0">
                <p className="bg-admin-surface-alt px-5 py-2 text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
                  {q.question}
                </p>
                <ul>{forQuestion.map(row)}</ul>
              </div>
            );
          })}
        </SettingsPanel>
      )}
    </div>
  );
}

function RequirementForm({
  initial,
  questions,
  onCancel,
  onSaved,
}: {
  initial?: MarriageRequirementSetting;
  questions: Question[];
  onCancel: () => void;
  onSaved: (name: string) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [days, setDays] = useState(initial?.validForDays ? String(initial.validForDays) : "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [required, setRequired] = useState(initial?.required ?? true);
  const [condition, setCondition] = useState(initial?.condition ?? "always");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // A built-in item keeps the question it depends on.
  const fixedCondition = Boolean(initial?.builtIn);

  async function save() {
    if (!name.trim()) {
      setError("Enter a name.");
      return;
    }
    const input: MarriageRequirementInput = {
      name: name.trim(),
      validForDays: days.trim() ? Number(days) : null,
      note: note.trim(),
      required,
      ...(fixedCondition ? {} : { condition }),
    };
    setSaving(true);
    setError("");
    try {
      const saved = initial ? await updateMarriageRequirement(initial.id, input) : await addMarriageRequirement(input);
      onSaved(saved.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save this requirement.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 bg-admin-surface-alt/60 px-5 py-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
        <AdminField label="Name" className="mb-0">
          <AdminInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Seminar certificate" autoFocus />
        </AdminField>
        <AdminField label="Good for (days)" className="mb-0">
          <AdminInput
            type="number"
            min={1}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            placeholder="No limit"
          />
        </AdminField>
      </div>
      <AdminField label="Note for the couple (optional)" className="mb-0">
        <AdminInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. PSA copy" maxLength={255} />
      </AdminField>
      {!fixedCondition && (
        <AdminField label="Asked for" className="mb-0">
          <AdminSelect value={condition} onChange={(e) => setCondition(e.target.value)}>
            <option value="always">From every couple</option>
            {questions.map((q) => (
              <option key={q.key} value={q.key}>
                Only when: {q.question}
              </option>
            ))}
          </AdminSelect>
        </AdminField>
      )}
      <label className="flex items-center gap-2 text-admin-body text-admin-ink">
        <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
        Required before the wedding date is confirmed
      </label>
      <p className="text-admin-support text-admin-ink-muted">
        With a number of days, staff enter the date on the document and the app warns if it expires before the wedding.
      </p>
      {error && <p className="text-admin-support font-semibold text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <AdminButton variant="secondary" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </AdminButton>
        <AdminButton size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving…" : initial ? "Save" : "Add"}
        </AdminButton>
      </div>
    </div>
  );
}
