// 5b: the banns for one couple — where each lives, the three Sundays, certificates from other parishes.
import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { Parish } from "@/types";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { EMPTY_PARENTS, longDate, parentsPhrase, partiesHere, shortDate, todayISO, type BannsParty } from "./bannsPapers";
import type { BannsParents, BannsPlan, MarriageApplication } from "./types";

interface BannsPanelProps {
  application: MarriageApplication;
  disabled?: boolean;
  /** False where the Sundays are ticked somewhere else on the page (the Sunday banns list). */
  sundayTicks?: boolean;
  onSave: (banns: BannsPlan) => Promise<void>;
}

/** Ticks Sundays and certificates straight away; "Edit" changes where they live, the Sundays, or a waiver. */
export function BannsPanel({ application, disabled = false, sundayTicks = true, onSave }: BannsPanelProps) {
  const banns = application.banns;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<BannsPlan>(banns);
  const today = todayISO();
  const suggested = application.bannsSuggestedSundays;
  const readHere = application.bannsAnnouncedHere && !banns.dispensed;
  const parents = banns.parents ?? EMPTY_PARENTS;
  const hasDetails =
    Object.values(parents).some((v) => v.trim()) || Boolean(banns.groomAddress) || Boolean(banns.brideAddress);
  const { parish } = useOutletContext<{ parish: Parish }>();

  function startEditing() {
    setDraft({ ...banns, sundays: banns.sundays.length > 0 ? banns.sundays : suggested });
    setEditing(true);
  }

  async function save(next: BannsPlan) {
    await onSave(next);
    setEditing(false);
  }

  function toggleAnnounced(date: string, on: boolean) {
    const announced = on ? [...banns.announced, date] : banns.announced.filter((d) => d !== date);
    return save({ ...banns, announced });
  }

  if (editing) {
    const sundays = [0, 1, 2].map((i) => draft.sundays[i] ?? "");
    return (
      <div className="space-y-3">
        <PartyPlace
          label={application.weddingElsewhere ? "Groom" : `Groom (${application.groomFirstName})`}
          value={draft.groomParish}
          onChange={(groomParish) => setDraft({ ...draft, groomParish })}
        />
        <PartyPlace
          label={application.weddingElsewhere ? "Bride" : `Bride (${application.brideFirstName})`}
          value={draft.brideParish}
          onChange={(brideParish) => setDraft({ ...draft, brideParish })}
        />
        <label className="flex items-center gap-2 text-admin-body text-admin-ink">
          <input
            type="checkbox"
            checked={draft.dispensed}
            onChange={(e) => setDraft({ ...draft, dispensed: e.target.checked })}
          />
          The bishop waived the banns
        </label>
        {!draft.dispensed && (!draft.groomParish || !draft.brideParish) && (
          <AdminField label="Sundays announced here" className="mb-0">
            <div className="grid grid-cols-1 gap-2">
              {sundays.map((date, i) => (
                <AdminInput
                  key={i}
                  type="date"
                  value={date}
                  aria-label={`Sunday ${i + 1}`}
                  onChange={(e) => {
                    const next = [...sundays];
                    next[i] = e.target.value;
                    setDraft({ ...draft, sundays: next.filter(Boolean) });
                  }}
                />
              ))}
            </div>
          </AdminField>
        )}
        {partiesHere(draft).length > 0 && (
          <fieldset className="space-y-2 border-t border-admin-border pt-3">
            <legend className="text-admin-support font-semibold text-admin-ink">
              For the poster and certificate <span className="font-normal text-admin-ink-muted">(optional)</span>
            </legend>
            <BannsDetailsFields
              people={partiesHere(draft)}
              value={{
                groomAddress: draft.groomAddress ?? "",
                brideAddress: draft.brideAddress ?? "",
                parents: draft.parents ?? EMPTY_PARENTS,
              }}
              onChange={(details) => setDraft({ ...draft, ...details })}
            />
          </fieldset>
        )}
        <label className="flex items-start gap-2 text-admin-body text-admin-ink">
          <input
            type="checkbox"
            className="mt-1"
            checked={draft.onlineConsent ?? false}
            onChange={(e) => setDraft({ ...draft, onlineConsent: e.target.checked })}
          />
          The couple agreed to have their banns posted online (e.g. the parish Facebook page)
        </label>
        <div className="flex justify-end gap-2">
          <AdminButton type="button" variant="secondary" onClick={() => setEditing(false)} disabled={disabled}>
            Cancel
          </AdminButton>
          <AdminButton
            type="button"
            disabled={disabled}
            onClick={() =>
              save({
                ...draft,
                // Announcements stay only on Sundays still in the plan.
                announced: draft.announced.filter((d) => draft.sundays.includes(d)),
              })
            }
          >
            Save
          </AdminButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!banns.groomParish && !banns.brideParish && !hasDetails ? (
        <p className="text-admin-body text-admin-ink">Both live in this parish.</p>
      ) : (
        <ul className="space-y-1.5 text-admin-body text-admin-ink">
          <PartyLine
            name={application.groomName}
            address={banns.groomAddress ?? ""}
            parents={parentsPhrase("son", parents.groomFather, parents.groomMother)}
            parish={banns.groomParish}
            received={banns.received.groom}
            // For a wedding elsewhere, the other parish's certificate goes to the wedding parish, not here.
            showReceived={!application.weddingElsewhere}
            disabled={disabled || banns.dispensed}
            onReceived={(on) => save({ ...banns, received: { ...banns.received, groom: on } })}
          />
          <PartyLine
            name={application.brideName}
            address={banns.brideAddress ?? ""}
            parents={parentsPhrase("daughter", parents.brideFather, parents.brideMother)}
            parish={banns.brideParish}
            received={banns.received.bride}
            showReceived={!application.weddingElsewhere}
            disabled={disabled || banns.dispensed}
            onReceived={(on) => save({ ...banns, received: { ...banns.received, bride: on } })}
          />
        </ul>
      )}

      {banns.dispensed && <p className="text-admin-body text-admin-ink">The bishop waived the banns.</p>}

      {readHere &&
        (banns.sundays.length === 0 ? (
          <div className="rounded-lg bg-admin-surface-alt px-3 py-2.5 text-admin-support text-admin-ink-muted">
            {suggested.length === 3 ? (
              <>
                <p>No Sundays planned yet. Next three: {suggested.map(shortDate).join(", ")}.</p>
                <AdminButton
                  type="button"
                  size="sm"
                  className="mt-2"
                  disabled={disabled}
                  onClick={() => save({ ...banns, sundays: suggested })}
                >
                  Plan these Sundays
                </AdminButton>
              </>
            ) : (
              <p>
                Only {suggested.length} {suggested.length === 1 ? "Sunday is" : "Sundays are"} left before the
                wedding. Ask the parish priest whether to request a waiver from the bishop.
              </p>
            )}
          </div>
        ) : (
          <ul className="space-y-1.5">
            {banns.sundays.map((date, i) =>
              sundayTicks ? (
                <li key={date}>
                  <label className="flex items-center gap-2 text-admin-body text-admin-ink">
                    <input
                      type="checkbox"
                      checked={banns.announced.includes(date)}
                      disabled={disabled || date > today}
                      onChange={(e) => toggleAnnounced(date, e.target.checked)}
                    />
                    <span>
                      {["1st", "2nd", "3rd"][i]} Sunday · {longDate(date)}
                    </span>
                    {date > today && (
                      <span className="text-admin-support text-admin-ink-faint">tick after Mass that day</span>
                    )}
                  </label>
                </li>
              ) : (
                <SundayLine key={date} date={date} index={i} announced={banns.announced.includes(date)} today={today} />
              )
            )}
            {!sundayTicks && banns.sundays.some((d) => !banns.announced.includes(d)) && (
              <li className="text-admin-support text-admin-ink-faint">Tick each Sunday on the Sunday banns list.</li>
            )}
          </ul>
        ))}

      {application.bannsComplete && (
        <p className="rounded-lg bg-admin-green-050 px-3 py-2 text-admin-support font-semibold text-admin-green-800">
          {banns.dispensed ? "No banns needed." : "Banns complete."}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <AdminButton type="button" variant="secondary" size="sm" onClick={startEditing} disabled={disabled}>
          Edit banns
        </AdminButton>
        {readHere && banns.sundays.length > 0 && (
          <Link
            to={`/${parish.slug}/admin/marriage-applications/${encodeURIComponent(application.id)}/banns-poster`}
            className="inline-flex items-center rounded-[10px] border border-admin-border bg-admin-surface px-3 py-1.5 text-admin-support font-medium text-admin-ink hover:bg-admin-surface-alt"
          >
            Banns poster
          </Link>
        )}
      </div>
    </div>
  );
}

function SundayLine({ date, index, announced, today }: { date: string; index: number; announced: boolean; today: string }) {
  const status = announced ? "Announced" : date > today ? "To come" : "Not ticked";
  const tone = announced ? "text-admin-green-700" : date > today ? "text-admin-ink-faint" : "text-admin-amber-700";
  return (
    <li className="flex items-center justify-between gap-2 text-admin-body text-admin-ink">
      <span>
        {["1st", "2nd", "3rd"][index]} Sunday · {longDate(date)}
      </span>
      <span className={`text-admin-support font-semibold ${tone}`}>
        {announced && "✓ "}
        {status}
      </span>
    </li>
  );
}

function PartyPlace({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [elsewhere, setElsewhere] = useState(Boolean(value));
  return (
    <AdminField label={`${label} lives in`} className="mb-0">
      <select
        value={elsewhere ? "other" : "here"}
        onChange={(e) => {
          const other = e.target.value === "other";
          setElsewhere(other);
          if (!other) onChange("");
        }}
        className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-body text-admin-ink"
      >
        <option value="here">This parish</option>
        <option value="other">Another parish</option>
      </select>
      {elsewhere && (
        <AdminInput
          className="mt-2"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Name of that parish"
          aria-label={`${label}'s parish`}
        />
      )}
    </AdminField>
  );
}

function PartyLine({
  name,
  address,
  parents,
  parish,
  received,
  showReceived,
  disabled,
  onReceived,
}: {
  name: string;
  address: string;
  parents: string;
  parish: string;
  received: boolean;
  showReceived: boolean;
  disabled: boolean;
  onReceived: (on: boolean) => void;
}) {
  return (
    <li>
      <span className="font-semibold">{name}</span>
      <span className="text-admin-ink-muted"> · {parish || "this parish"}</span>
      {address && <span className="block text-admin-support text-admin-ink-muted">{address}</span>}
      {parents && <span className="block text-admin-support text-admin-ink-muted">{parents}</span>}
      {parish && showReceived && (
        <label className="mt-1 flex items-center gap-2 text-admin-support text-admin-ink">
          <input type="checkbox" checked={received} disabled={disabled} onChange={(e) => onReceived(e.target.checked)} />
          Banns returned from {parish} (signed and stamped)
        </label>
      )}
    </li>
  );
}

export interface BannsDetails {
  groomAddress: string;
  brideAddress: string;
  parents: BannsParents;
}

/** Address (barangay and city) and parents, only for the people who live here. */
export function BannsDetailsFields({
  people,
  value,
  onChange,
}: {
  people: BannsParty[];
  value: BannsDetails;
  onChange: (value: BannsDetails) => void;
}) {
  return (
    <div className="space-y-3">
      {people.map((who) => {
        const label = who === "groom" ? "Groom" : "Bride";
        const addressKey = who === "groom" ? "groomAddress" : "brideAddress";
        const fatherKey = who === "groom" ? "groomFather" : "brideFather";
        const motherKey = who === "groom" ? "groomMother" : "brideMother";
        const setParent = (key: keyof BannsParents, name: string) =>
          onChange({ ...value, parents: { ...value.parents, [key]: name } });
        return (
          <fieldset key={who} className="space-y-2">
            {people.length > 1 && <legend className="text-admin-support font-semibold text-admin-ink">{label}</legend>}
            <AdminInput
              value={value[addressKey]}
              onChange={(e) => onChange({ ...value, [addressKey]: e.target.value })}
              placeholder="Barangay and city, e.g. Brgy. Mabolo, Cebu City"
              aria-label={`${label}'s barangay and city`}
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <AdminInput
                value={value.parents[fatherKey]}
                onChange={(e) => setParent(fatherKey, e.target.value)}
                placeholder="Father's full name"
                aria-label={`${label}'s father`}
              />
              <AdminInput
                value={value.parents[motherKey]}
                onChange={(e) => setParent(motherKey, e.target.value)}
                placeholder="Mother's full name"
                aria-label={`${label}'s mother`}
              />
            </div>
          </fieldset>
        );
      })}
      <p className="text-admin-support text-admin-ink-faint">No house number or street: the poster may be posted publicly.</p>
    </div>
  );
}
