// 5b: the printed banns papers — each Sunday's list to read at Mass, and the Certificate of Banns for a
// couple marrying in another parish.
import { escapeHtml, printDocument } from "@/lib/printDocument";
import type { BannsListCouple, BannsParents, BannsParishHeading, MarriageApplication } from "./types";

const ASKING = ["", "first", "second", "third"];

export const EMPTY_PARENTS: BannsParents = { groomFather: "", groomMother: "", brideFather: "", brideMother: "" };

/** "son of Pedro Cruz and Rosa Cruz", "daughter of Elena Tan", or "" when neither parent is given. */
export function parentsPhrase(child: "son" | "daughter", father: string, mother: string) {
  const names = [father, mother].map((n) => n.trim()).filter(Boolean);
  return names.length ? `${child} of ${names.join(" and ")}` : "";
}

export function longDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isoOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayISO() {
  return isoOf(new Date());
}

/** Today if it is a Sunday, else the coming Sunday. */
export function comingSunday(from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  return isoOf(d);
}

/** The same weekday `weeks` weeks later (or earlier, when negative). */
export function addWeeks(iso: string, weeks: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + 7 * weeks);
  return isoOf(d);
}

export type BannsTone = "done" | "waiting" | "attention";

/** One short line on how far the banns have got: "1 of 3 Sundays · next Nov 22". */
export function bannsProgress(application: MarriageApplication, today = todayISO()): { label: string; tone: BannsTone } {
  const { banns } = application;
  if (banns.dispensed) return { label: "Waived by the bishop", tone: "done" };
  if (application.bannsComplete) return { label: "Banns complete", tone: "done" };
  if (!application.bannsAnnouncedHere) return { label: "Waiting for the other parishes", tone: "waiting" };
  if (banns.sundays.length === 0) return { label: "No Sundays planned", tone: "attention" };
  const done = banns.sundays.filter((d) => banns.announced.includes(d)).length;
  const missed = banns.sundays.some((d) => d < today && !banns.announced.includes(d));
  const next = banns.sundays.find((d) => d >= today && !banns.announced.includes(d));
  const label = `${done} of ${banns.sundays.length} Sundays${next ? ` · next ${shortDate(next)}` : ""}`;
  return { label, tone: missed ? "attention" : "waiting" };
}

export function askingLabel(asking: number) {
  return `${ASKING[asking] ?? ""} time of asking`.trim();
}

/** "of this parish" or "of San Roque Parish". */
function ofParish(parish: string) {
  return parish ? `of ${escapeHtml(parish)}` : "of this parish";
}

function heading(parish: BannsParishHeading) {
  return `<header>
    <div class="parish">${escapeHtml(parish.name)}</div>
    ${parish.address ? `<div class="small">${escapeHtml(parish.address)}</div>` : ""}
    ${parish.diocese ? `<div class="small">${escapeHtml(parish.diocese)}</div>` : ""}
  </header>`;
}

export function printBannsList(date: string, parish: BannsParishHeading, couples: BannsListCouple[]) {
  const items = couples
    .map(
      (c) => `<p class="couple">
        <span class="names">${escapeHtml(c.groomName)}</span>, ${ofParish(c.banns.groomParish)}, and
        <span class="names">${escapeHtml(c.brideName)}</span>, ${ofParish(c.banns.brideParish)}.
        This is the ${ASKING[c.asking] ?? ""} time of asking.
      </p>`
    )
    .join("");
  printDocument(
    `Banns — ${longDate(date)}`,
    `${heading(parish)}
    <h1>Banns of Marriage</h1>
    <p class="sub">Sunday, ${escapeHtml(longDate(date))}</p>
    <p>We announce the intended marriage of:</p>
    ${items || "<p>No banns this Sunday.</p>"}
    <p class="notice">Anyone who knows of a reason why any of these couples may not marry is asked to tell the
    parish priest.</p>`
  );
}

export function printBannsCertificate(application: MarriageApplication, parish: BannsParishHeading) {
  const parents = application.banns.parents ?? EMPTY_PARENTS;
  const groomParents = parentsPhrase("son", parents.groomFather, parents.groomMother);
  const brideParents = parentsPhrase("daughter", parents.brideFather, parents.brideMother);
  const sundays = application.banns.sundays.map(longDate);
  const listed = sundays.length > 1 ? `${sundays.slice(0, -1).join(", ")} and ${sundays[sundays.length - 1]}` : sundays[0];
  const wedding = application.preferredWeddingDate
    ? ` on ${escapeHtml(longDate(application.preferredWeddingDate))}`
    : "";
  const today = longDate(todayISO());
  printDocument(
    `Certificate of Banns — ${application.groomName} and ${application.brideName}`,
    `${heading(parish)}
    <h1>Certificate of Banns</h1>
    <p class="sub">${escapeHtml(application.referenceNo)}</p>
    <p>This is to certify that the banns of marriage between
      <span class="names">${escapeHtml(application.groomName)}</span>,${groomParents ? ` ${escapeHtml(groomParents)},` : ""}
      ${ofParish(application.banns.groomParish)}, and
      <span class="names">${escapeHtml(application.brideName)}</span>,${brideParents ? ` ${escapeHtml(brideParents)},` : ""}
      ${ofParish(application.banns.brideParish)},
      who intend to marry at ${escapeHtml(application.weddingParish)}${wedding},
      were announced at the Sunday Masses of this parish on ${escapeHtml(listed)},
      and no impediment was made known.</p>
    <p>Issued on ${escapeHtml(today)}.</p>
    <div class="signoff">
      <div class="seal">Parish seal</div>
      <div class="sign">
        <div>${escapeHtml(parish.signatoryName || "")}</div>
        <div class="title">${escapeHtml(parish.signatoryTitle)}</div>
      </div>
    </div>`
  );
}

export type BannsParty = "groom" | "bride";

/** Who lives in this parish: only they get an address and parents on the poster and certificate. */
export function partiesHere(banns: { groomParish: string; brideParish: string }): BannsParty[] {
  return (["groom", "bride"] as const).filter((who) => !banns[who === "groom" ? "groomParish" : "brideParish"]);
}
