import { useEffect, useState } from "react";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { AdminModalFrame } from "@/features/parish-admin/components/AdminModalFrame";
import { EVENT_TYPE_LABELS, type EventType } from "@/features/parish-admin/schedule/eventTypeStyles";
import { getHandover, leavePerson, type Handover, type ParishPerson } from "../api/personnelApi";

interface HandoverModalProps {
  personId: string;
  /** Shown while the details load. */
  personName: string;
  onClose: () => void;
  onDone: (person: ParishPerson) => void;
}

const UNASSIGNED = "";
const selectClass =
  "w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-body text-admin-ink disabled:opacity-60";

function formatWhen(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const day = new Date(y, m - 1, d).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });
  const hour = ((h + 11) % 12) + 1;
  return `${day}, ${hour}:${String(min).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function typeLabel(type: string) {
  return EVENT_TYPE_LABELS[type as EventType] ?? type;
}

function certificateLabel(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-admin-border pt-4 first:border-t-0 first:pt-0">
      <h4 className="mb-2 text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">{title}</h4>
      {children}
    </section>
  );
}

/**
 * E2: before someone is set inactive, pass on what they still hold (upcoming events, regular Masses, the Parish
 * Priest title, the certificate signatory). Their sign-in, if any, is suspended in the same step.
 */
export function HandoverModal({ personId, personName, onClose, onDone }: HandoverModalProps) {
  const [data, setData] = useState<Handover | null>(null);
  const [loadError, setLoadError] = useState("");
  const [allTo, setAllTo] = useState(UNASSIGNED);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [regularTo, setRegularTo] = useState<Record<string, string>>({});
  const [priestTo, setPriestTo] = useState(UNASSIGNED);
  const [signAs, setSignAs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    getHandover(personId)
      .then((loaded) => live && setData(loaded))
      .catch((err: unknown) => live && setLoadError(err instanceof Error ? err.message : "Couldn't load their details."));
    return () => {
      live = false;
    };
  }, [personId]);

  const name = data?.person.name ?? personName;
  const priests = data?.candidates.filter((c) => c.priest) ?? [];
  const targetFor = (eventId: string) => overrides[eventId] ?? allTo;
  const regular = data?.regular ?? [];
  const holdsNothing =
    data && data.events.length === 0 && regular.length === 0 && !data.parishPriest && !data.signatory;

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    setError("");
    try {
      const person = await leavePerson(personId, {
        events: data.events.map((e) => ({ id: e.id, to: targetFor(e.id) || null })),
        regular: regular.map((r) => ({ id: r.id, to: regularTo[r.id] || null })),
        parishPriestTo: data.parishPriest ? priestTo || null : null,
        signAs: Boolean(data.signatory && priestTo && signAs),
      });
      onDone(person);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the handover.");
      setSaving(false);
    }
  }

  function personOptions() {
    return (
      <>
        <option value={UNASSIGNED}>Leave unassigned</option>
        {data?.candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} · {c.role}
          </option>
        ))}
      </>
    );
  }

  return (
    <AdminModalFrame
      onClose={onClose}
      busy={saving}
      panelClassName="max-w-[600px] rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]"
    >
      <div className="border-b border-admin-border px-6 py-4">
        <h3 className="font-serif text-admin-section font-semibold text-admin-ink">Before {name} leaves</h3>
        <p className="mt-0.5 text-admin-support text-admin-ink-muted">
          Pass on what they still hold, then they're set inactive. Their past events and records keep their name.
        </p>
      </div>

      <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5">
        {loadError && <p className="text-admin-support font-semibold text-red-700">{loadError}</p>}
        {!data && !loadError && <p className="text-admin-support text-admin-ink-muted">Loading…</p>}

        {data?.isSelf && (
          <p className="text-admin-body text-admin-ink">
            This is you. Another admin has to set you inactive, so you can't lock yourself out.
          </p>
        )}

        {data && !data.isSelf && (
          <>
            {holdsNothing && (
              <p className="text-admin-body text-admin-ink">They have no upcoming events or titles to hand over.</p>
            )}

            {data.events.length > 0 && (
              <Section title={`Upcoming events (${data.events.length})`}>
                <label className="mb-2.5 block">
                  <span className="mb-1 block text-admin-support font-semibold text-admin-ink">Give all to</span>
                  <select
                    value={allTo}
                    onChange={(e) => {
                      setAllTo(e.target.value);
                      setOverrides({});
                    }}
                    className={selectClass}
                    aria-label="Give all events to"
                  >
                    {personOptions()}
                  </select>
                </label>
                <ul className="divide-y divide-admin-border rounded-lg border border-admin-border">
                  {data.events.map((e) => (
                    <li key={e.id} className="grid grid-cols-1 items-center gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_220px]">
                      <div className="min-w-0">
                        <p className="truncate text-admin-body font-medium text-admin-ink">{e.title}</p>
                        <p className="text-admin-support text-admin-ink-muted">
                          {typeLabel(e.eventType)} · {formatWhen(e.date, e.time)}
                        </p>
                      </div>
                      <select
                        value={targetFor(e.id)}
                        onChange={(ev) => setOverrides((prev) => ({ ...prev, [e.id]: ev.target.value }))}
                        className={selectClass}
                        aria-label={`Who takes ${e.title}`}
                      >
                        {personOptions()}
                      </select>
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-admin-support text-admin-ink-muted">
                  Unassigned events stay on the schedule with no one assigned.
                </p>
              </Section>
            )}

            {regular.length > 0 && (
              <Section title={`Regular Masses (${regular.length})`}>
                <ul className="divide-y divide-admin-border rounded-lg border border-admin-border">
                  {regular.map((r) => (
                    <li key={r.id} className="grid grid-cols-1 items-center gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_220px]">
                      <div className="min-w-0">
                        <p className="truncate text-admin-body font-medium text-admin-ink">{r.label}</p>
                        <p className="text-admin-support text-admin-ink-muted">
                          {r.days.join(", ")} · {r.times.join(", ")}
                        </p>
                      </div>
                      <select
                        value={regularTo[r.id] ?? UNASSIGNED}
                        onChange={(ev) => setRegularTo((prev) => ({ ...prev, [r.id]: ev.target.value }))}
                        className={selectClass}
                        aria-label={`Who usually says ${r.label}`}
                      >
                        {personOptions()}
                      </select>
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-admin-support text-admin-ink-muted">
                  Unassigned Masses stay on the schedule with no usual priest.
                </p>
              </Section>
            )}

            {data.parishPriest && (
              <Section title="Parish Priest">
                <label className="block">
                  <span className="mb-1 block text-admin-support font-semibold text-admin-ink">
                    Who takes over as Parish Priest?
                  </span>
                  <select
                    value={priestTo}
                    onChange={(e) => setPriestTo(e.target.value)}
                    className={selectClass}
                    aria-label="New Parish Priest"
                  >
                    <option value={UNASSIGNED}>No one yet</option>
                    {priests.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.role}
                      </option>
                    ))}
                  </select>
                </label>
                {priests.length === 0 && (
                  <p className="mt-1.5 text-admin-support text-admin-ink-muted">
                    No other priest is on the Personnel list. Add them first (with Fr. or Msgr.), or choose later.
                  </p>
                )}
              </Section>
            )}

            {data.signatory && (
              <Section title="Certificate signatory">
                <p className="text-admin-support text-admin-ink-muted">
                  {data.signatory.types.map(certificateLabel).join(", ")} certificates are signed{" "}
                  <span className="font-semibold text-admin-ink">{data.signatory.name}</span>.
                </p>
                {priestTo ? (
                  <label className="mt-2 flex items-start gap-2 text-admin-body text-admin-ink">
                    <input
                      type="checkbox"
                      checked={signAs}
                      onChange={(e) => setSignAs(e.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      Sign them as {priests.find((c) => c.id === priestTo)?.name} from now on. Certificates already issued
                      keep the old name.
                    </span>
                  </label>
                ) : (
                  <p className="mt-1.5 text-admin-support text-admin-ink-muted">
                    {data.parishPriest
                      ? "Choose the new Parish Priest above to change it here, or change it later in Settings → Certificates."
                      : "Change it in Settings → Certificates."}
                  </p>
                )}
              </Section>
            )}

            {data.person.hasAccount && (
              <Section title="Sign-in">
                <p className="text-admin-body text-admin-ink">
                  Their sign-in is suspended and they're signed out. You can reactivate it later in Settings → Staff
                  Accounts.
                </p>
              </Section>
            )}
          </>
        )}

        {error && <p className="text-admin-support font-semibold text-red-700">{error}</p>}
      </div>

      <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
        <AdminButton variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </AdminButton>
        <AdminButton variant="danger" onClick={handleSave} disabled={saving || !data || data.isSelf}>
          {saving ? "Saving…" : "Hand over and set inactive"}
        </AdminButton>
      </div>
    </AdminModalFrame>
  );
}
