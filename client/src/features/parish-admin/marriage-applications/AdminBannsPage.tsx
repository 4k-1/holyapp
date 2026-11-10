// 5b: the banns — each Sunday's list to read at Mass, and couples marrying in another parish who have their
// banns announced here. Sundays are ticked on the Sunday list only; everywhere else shows progress.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { AdminModalFrame } from "@/features/parish-admin/components/AdminModalFrame";
import { AdminPage, AdminPageHeader } from "@/features/parish-admin/components/AdminPageHeader";
import { askConfirm, notifyError } from "@/lib/notify";
import {
  createBannsElsewhere,
  getBannsCertificate,
  getBannsList,
  listBannsElsewhere,
  removeBannsElsewhere,
  updateBanns,
} from "./api/marriageApplicationsApi";
import { BannsPanel } from "./BannsPanel";
import {
  addWeeks,
  askingLabel,
  bannsProgress,
  comingSunday,
  longDate,
  printBannsCertificate,
  printBannsList,
  shortDate,
  todayISO,
  type BannsTone,
} from "./bannsPapers";
import type { BannsListResponse, BannsPlan, MarriageApplication } from "./types";

const TONE_CLASS: Record<BannsTone, string> = {
  done: "bg-admin-green-100 text-admin-green-700",
  waiting: "bg-admin-surface-alt text-admin-ink-muted",
  attention: "bg-admin-amber-100 text-admin-amber-700",
};

export function AdminBannsPage() {
  const thisSunday = comingSunday();
  const [sunday, setSunday] = useState(thisSunday);
  const [list, setList] = useState<BannsListResponse | null>(null);
  const [listError, setListError] = useState("");
  const [elsewhere, setElsewhere] = useState<MarriageApplication[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const today = todayISO();

  const loadList = useCallback(
    () =>
      getBannsList(sunday)
        .then((data) => {
          setList(data);
          setListError("");
        })
        .catch((err: unknown) => setListError(err instanceof Error ? err.message : "Couldn't load the banns.")),
    [sunday]
  );

  const loadElsewhere = useCallback(
    () =>
      listBannsElsewhere()
        .then(setElsewhere)
        .catch((err: unknown) => notifyError(err, "Couldn't load couples marrying elsewhere.")),
    []
  );

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadElsewhere();
  }, [loadElsewhere]);

  async function saveBanns(id: string, banns: BannsPlan) {
    setSavingId(id);
    try {
      await updateBanns(id, banns);
      await Promise.all([loadList(), loadElsewhere()]);
    } catch (err) {
      notifyError(err, "Couldn't save the banns.");
    } finally {
      setSavingId(null);
    }
  }

  function toggleAnnounced(id: string, banns: BannsPlan, on: boolean) {
    const announced = on ? [...banns.announced, sunday] : banns.announced.filter((d) => d !== sunday);
    return saveBanns(id, { ...banns, announced });
  }

  async function printCertificate(id: string) {
    try {
      const { application, parish } = await getBannsCertificate(id);
      printBannsCertificate(application, parish);
    } catch (err) {
      notifyError(err, "Couldn't print the certificate.");
    }
  }

  async function remove(entry: MarriageApplication) {
    const ok = await askConfirm({
      title: "Remove this couple?",
      message: `${entry.groomName} and ${entry.brideName} will be taken off the banns.`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    try {
      await removeBannsElsewhere(entry.id);
      setOpen(null);
      await Promise.all([loadList(), loadElsewhere()]);
    } catch (err) {
      notifyError(err, "Couldn't remove this couple.");
    }
  }

  const unplanned = list?.unplanned ?? [];

  return (
    <AdminPage>
      <AdminPageHeader
        title="Banns"
        description="Couples announced at Sunday Mass before their wedding: those marrying here, and those marrying in another parish who live here."
        actions={
          <Link to=".." relative="path" className="admin-table__action">
            ← Marriage Applications
          </Link>
        }
      />

      {unplanned.length > 0 && (
        <div className="mb-4 rounded-[var(--radius)] border border-admin-amber-700/25 bg-admin-amber-100 p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-serif text-admin-section font-semibold text-admin-ink">
            {unplanned.length === 1 ? "1 wedding here has" : `${unplanned.length} weddings here have`} no Sundays
            planned
          </h2>
          <ul className="mt-2 divide-y divide-admin-amber-700/15">
            {unplanned.map((a) => {
              const suggested = a.bannsSuggestedSundays;
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-admin-body font-semibold text-admin-ink">
                      {a.groomName} and {a.brideName}
                    </p>
                    <p className="text-admin-support text-admin-ink-muted">
                      {a.preferredWeddingDate ? `Wedding ${longDate(a.preferredWeddingDate)} · ` : "No wedding date yet · "}
                      <Link
                        to={`../${encodeURIComponent(a.id)}`}
                        relative="path"
                        className="font-semibold text-admin-green-700 hover:underline"
                      >
                        {a.referenceNo}
                      </Link>
                    </p>
                  </div>
                  {suggested.length === 3 ? (
                    <AdminButton
                      type="button"
                      size="sm"
                      disabled={savingId === a.id}
                      onClick={() => saveBanns(a.id, { ...a.banns, sundays: suggested })}
                    >
                      Plan {suggested.map(shortDate).join(", ")}
                    </AdminButton>
                  ) : (
                    <p className="max-w-xs text-admin-support text-admin-amber-700">
                      Fewer than three Sundays left before the wedding. Ask the parish priest about a waiver.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <AdminCard className="mb-4 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-admin-section font-semibold text-admin-ink">Sunday banns list</h2>
            <p className="text-admin-support text-admin-ink-muted">Read at Mass. Tick each couple once announced.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-[10px] border border-admin-border bg-admin-surface">
              <button
                type="button"
                onClick={() => setSunday(addWeeks(sunday, -1))}
                className="px-3 py-2 text-admin-ink-muted hover:text-admin-ink"
                aria-label="Previous Sunday"
              >
                ‹
              </button>
              <span className="min-w-[9.5rem] text-center text-admin-body font-semibold text-admin-ink">
                {longDate(sunday)}
              </span>
              <button
                type="button"
                onClick={() => setSunday(addWeeks(sunday, 1))}
                className="px-3 py-2 text-admin-ink-muted hover:text-admin-ink"
                aria-label="Next Sunday"
              >
                ›
              </button>
            </div>
            {sunday !== thisSunday && (
              <AdminButton type="button" variant="ghost" size="sm" onClick={() => setSunday(thisSunday)}>
                This Sunday
              </AdminButton>
            )}
            <AdminButton
              type="button"
              variant="secondary"
              disabled={!list || list.date !== sunday}
              onClick={() => list && printBannsList(sunday, list.parish, list.couples)}
            >
              Print list
            </AdminButton>
          </div>
        </div>
        {listError ? (
          <p className="text-admin-support text-red-700">{listError}</p>
        ) : !list ? (
          <p className="text-admin-support text-admin-ink-faint">Loading…</p>
        ) : list.couples.length === 0 ? (
          <p className="text-admin-body text-admin-ink-muted">No banns on {longDate(sunday)}.</p>
        ) : (
          <ul className="divide-y divide-admin-border">
            {list.couples.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-admin-body font-semibold text-admin-ink">
                    {c.groomName} and {c.brideName}
                  </p>
                  <p className="text-admin-support text-admin-ink-muted">
                    {askingLabel(c.asking)}
                    {c.weddingElsewhere ? ` · marrying at ${c.weddingParish}` : ""}
                    {!c.weddingElsewhere && (
                      <>
                        {" · "}
                        <Link
                          to={`../${encodeURIComponent(c.id)}`}
                          relative="path"
                          className="font-semibold text-admin-green-700 hover:underline"
                        >
                          {c.referenceNo}
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                {sunday > today ? (
                  <span className="text-admin-support text-admin-ink-faint">Tick after Mass that day</span>
                ) : (
                  <label className="flex items-center gap-2 text-admin-body text-admin-ink">
                    <input
                      type="checkbox"
                      checked={c.announced}
                      disabled={savingId === c.id}
                      onChange={(e) => toggleAnnounced(c.id, c.banns, e.target.checked)}
                    />
                    Announced
                  </label>
                )}
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <AdminCard className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-admin-section font-semibold text-admin-ink">Weddings in other parishes</h2>
            <p className="text-admin-support text-admin-ink-muted">
              Couples who live here but marry elsewhere. After the third Sunday, sign and stamp the banns form they
              brought, or print a Certificate of Banns, and give it to the couple.
            </p>
          </div>
          <AdminButton type="button" onClick={() => setAdding(true)}>
            + Add couple
          </AdminButton>
        </div>
        {!elsewhere ? (
          <p className="text-admin-support text-admin-ink-faint">Loading…</p>
        ) : elsewhere.length === 0 ? (
          <p className="text-admin-body text-admin-ink-muted">
            When a couple who live here bring a banns form from the parish where they will marry, add them here. Their
            names then go on the Sunday list.
          </p>
        ) : (
          <ul className="divide-y divide-admin-border">
            {elsewhere.map((entry) => {
              const progress = bannsProgress(entry, today);
              const expanded = open === entry.id;
              const lastSunday = entry.banns.sundays[entry.banns.sundays.length - 1];
              return (
                <li key={entry.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setOpen(expanded ? null : entry.id)}
                      aria-expanded={expanded}
                      className="min-w-0 text-left"
                    >
                      <p className="text-admin-body font-semibold text-admin-ink">
                        <span className="mr-1.5 inline-block w-3 text-admin-ink-faint">{expanded ? "▾" : "▸"}</span>
                        {entry.groomName} and {entry.brideName}
                      </p>
                      <p className="pl-[18px] text-admin-support text-admin-ink-muted">
                        Marrying at {entry.weddingParish}
                        {entry.preferredWeddingDate ? ` on ${longDate(entry.preferredWeddingDate)}` : ""} ·{" "}
                        {entry.referenceNo}
                      </p>
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-admin-label font-semibold ${TONE_CLASS[progress.tone]}`}
                      >
                        {progress.label}
                      </span>
                      {entry.bannsComplete && !entry.banns.dispensed && (
                        <AdminButton type="button" size="sm" onClick={() => printCertificate(entry.id)}>
                          Print Certificate of Banns
                        </AdminButton>
                      )}
                    </div>
                  </div>
                  {expanded && (
                    <div className="mt-3 rounded-lg border border-admin-border p-4">
                      <BannsPanel
                        application={entry}
                        disabled={savingId === entry.id}
                        sundayTicks={false}
                        onSave={(banns) => saveBanns(entry.id, banns)}
                      />
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-admin-border pt-3">
                        <p className="text-admin-support text-admin-ink-faint">
                          {entry.banns.dispensed
                            ? "The banns were waived, so there is no Certificate of Banns."
                            : entry.bannsComplete
                              ? "Ready to give to the couple."
                              : lastSunday
                                ? `Certificate of Banns ready after the 3rd Sunday (${shortDate(lastSunday)}).`
                                : "Plan the Sundays first."}
                        </p>
                        <button
                          type="button"
                          onClick={() => remove(entry)}
                          className="text-admin-support font-semibold text-admin-red-700 hover:underline"
                        >
                          Remove couple
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </AdminCard>

      {adding && (
        <AddCoupleModal
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            loadElsewhere();
            loadList();
          }}
        />
      )}
    </AdminPage>
  );
}

type LivesHere = "both" | "groom" | "bride";

const LIVES_HERE: { value: LivesHere; label: string }[] = [
  { value: "both", label: "Both" },
  { value: "groom", label: "Only the groom" },
  { value: "bride", label: "Only the bride" },
];

function AddCoupleModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({
    groomFirstName: "",
    groomLastName: "",
    brideFirstName: "",
    brideLastName: "",
    weddingParish: "",
    weddingDate: "",
    otherParish: "",
  });
  const [livesHere, setLivesHere] = useState<LivesHere>("both");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const otherParish = form.otherParish.trim();
  const canSave = Boolean(
    form.groomFirstName.trim() &&
      form.groomLastName.trim() &&
      form.brideFirstName.trim() &&
      form.brideLastName.trim() &&
      form.weddingParish.trim() &&
      (livesHere === "both" || otherParish)
  );

  function chooseLivesHere(value: LivesHere) {
    setLivesHere(value);
    // The other one usually lives in the parish of the wedding: fill it in as text staff can see and change.
    if (value !== "both" && !form.otherParish.trim()) {
      setForm((prev) => ({ ...prev, otherParish: prev.weddingParish }));
    }
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      await createBannsElsewhere({
        groomFirstName: form.groomFirstName.trim(),
        groomLastName: form.groomLastName.trim(),
        brideFirstName: form.brideFirstName.trim(),
        brideLastName: form.brideLastName.trim(),
        weddingParish: form.weddingParish.trim(),
        weddingDate: form.weddingDate || undefined,
        groomParish: livesHere === "bride" ? otherParish : "",
        brideParish: livesHere === "groom" ? otherParish : "",
      });
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add this couple.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminModalFrame
      onClose={onClose}
      busy={saving}
      panelClassName="max-w-[560px] rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]"
    >
      <div className="flex items-center justify-between border-b border-admin-border px-6 py-4">
        <h3 className="font-serif text-admin-section font-semibold text-admin-ink">Banns for a wedding elsewhere</h3>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-admin-ink-muted hover:bg-admin-surface-alt"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="space-y-3 px-6 py-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AdminField label="Groom's first name" className="mb-0">
            <AdminInput value={form.groomFirstName} onChange={set("groomFirstName")} />
          </AdminField>
          <AdminField label="Groom's last name" className="mb-0">
            <AdminInput value={form.groomLastName} onChange={set("groomLastName")} />
          </AdminField>
          <AdminField label="Bride's first name" className="mb-0">
            <AdminInput value={form.brideFirstName} onChange={set("brideFirstName")} />
          </AdminField>
          <AdminField label="Bride's last name" className="mb-0">
            <AdminInput value={form.brideLastName} onChange={set("brideLastName")} />
          </AdminField>
          <AdminField label="Parish of the wedding" className="mb-0">
            <AdminInput value={form.weddingParish} onChange={set("weddingParish")} placeholder="e.g. San Roque Parish, Mandaue" />
          </AdminField>
          <AdminField label="Wedding date (if known)" className="mb-0">
            <AdminInput type="date" value={form.weddingDate} onChange={set("weddingDate")} />
          </AdminField>
        </div>
        <AdminField label="Who lives in this parish?" className="mb-0">
          <div role="radiogroup" aria-label="Who lives in this parish?" className="grid grid-cols-3 gap-1.5">
            {LIVES_HERE.map((option) => {
              const selected = livesHere === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => chooseLivesHere(option.value)}
                  className={`rounded-[10px] border px-2 py-2 text-admin-body font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-green-600/25 ${
                    selected
                      ? "border-admin-green-700 bg-admin-green-050 text-admin-green-800"
                      : "border-admin-border bg-admin-surface text-admin-ink-muted hover:bg-admin-surface-alt"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </AdminField>
        {livesHere !== "both" && (
          <AdminField label={`The ${livesHere === "groom" ? "bride" : "groom"}'s parish`} className="mb-0">
            <AdminInput value={form.otherParish} onChange={set("otherParish")} placeholder="Name of that parish" />
          </AdminField>
        )}
        <p className="text-admin-support text-admin-ink-muted">
          The next three Sundays{form.weddingDate ? " before the wedding" : ""} are planned; you can change them after.
        </p>
        {error && <p className="text-admin-support font-semibold text-red-700">{error}</p>}
      </div>
      <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
        <AdminButton variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </AdminButton>
        <AdminButton onClick={handleSave} disabled={!canSave || saving}>
          {saving ? "Adding…" : "Add couple"}
        </AdminButton>
      </div>
    </AdminModalFrame>
  );
}
