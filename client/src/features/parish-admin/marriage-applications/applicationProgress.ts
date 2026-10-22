import type { MarriageApplication, MarriageRequirement } from "@/features/parish-admin/marriage-applications/types";

/** The parish's marriage preparation, in order. Each step after "documents" is one checklist item. */
export type PrepStep = "documents" | "interview" | "precana" | "banns";
const PREP_ORDER: PrepStep[] = ["documents", "interview", "precana", "banns"];

/** Where an application stands, judged by what the office has to do next. */
export type ApplicationStage = PrepStep | "date" | "cleared" | "closed";

export const STAGE_LABEL: Record<ApplicationStage, string> = {
  documents: "Collecting documents",
  interview: "Canonical interview",
  precana: "Pre-Cana",
  banns: "Banns",
  date: "Ready for wedding date",
  cleared: "Cleared for ceremony",
  closed: "Closed",
};

export const STAGE_ORDER: ApplicationStage[] = ["documents", "interview", "precana", "banns", "date", "cleared", "closed"];

export function requirementStep(item: MarriageRequirement): PrepStep {
  if (/interview/i.test(item.name)) return "interview";
  if (/pre-?cana|marriage preparation/i.test(item.name)) return "precana";
  if (/banns/i.test(item.name)) return "banns";
  return "documents";
}

export type RequirementGroup = "Groom" | "Bride" | "Couple" | "Preparation";

/** Document names carry their party, e.g. "Baptismal certificate (groom)"; other documents belong to the couple. */
export function requirementGroup(item: MarriageRequirement): { group: RequirementGroup; label: string } {
  if (requirementStep(item) !== "documents") return { group: "Preparation", label: item.name };
  const match = item.name.match(/^(.*?)\s*\((groom|bride)\)\s*$/i);
  if (!match) return { group: "Couple", label: item.name };
  return { group: match[2].toLowerCase() === "groom" ? "Groom" : "Bride", label: match[1] };
}

function missingFor(app: MarriageApplication, step: PrepStep) {
  return app.requirements.filter((item) => item.required && !item.submitted && requirementStep(item) === step);
}

export function requirementProgress(app: MarriageApplication) {
  const required = app.requirements.filter((item) => item.required);
  const missing = required.filter((item) => !item.submitted);
  return { done: required.length - missing.length, total: required.length, missing };
}

export function documentProgress(app: MarriageApplication) {
  const docs = app.requirements.filter((item) => item.required && requirementStep(item) === "documents");
  const done = docs.filter((item) => item.submitted).length;
  return { done, total: docs.length };
}

export function applicationStage(app: MarriageApplication): ApplicationStage {
  if (app.status === "rejected" || app.status === "completed") return "closed";
  if (app.status === "approved" || app.weddingDateStatus === "confirmed") return "cleared";
  for (const step of PREP_ORDER) {
    if (missingFor(app, step).length > 0) return step;
  }
  return "date";
}

export interface StepView {
  key: "submitted" | PrepStep | "cleared";
  label: string;
  state: "done" | "now" | "todo";
}

/** The six steps of the stepper. Steps are nouns, so the current one never reads as already finished. */
export function stepsFor(app: MarriageApplication): StepView[] {
  const stage = applicationStage(app);
  const docs = documentProgress(app);
  const finished = stage === "cleared" || app.status === "completed";
  const nowIndex = stage === "date" ? 5 : stage === "closed" || finished ? -1 : PREP_ORDER.indexOf(stage as PrepStep) + 1;
  const rows: Omit<StepView, "state">[] = [
    { key: "submitted", label: "Application" },
    { key: "documents", label: `Documents ${docs.done}/${docs.total}` },
    { key: "interview", label: "Interview" },
    { key: "precana", label: "Pre-Cana" },
    { key: "banns", label: "Banns" },
    { key: "cleared", label: "Cleared for ceremony" },
  ];
  return rows.map((row, i) => {
    let state: StepView["state"];
    if (i === 0) state = "done";
    else if (row.key === "cleared") state = finished ? "done" : nowIndex === 5 ? "now" : "todo";
    else if (stage === "closed") state = missingFor(app, row.key as PrepStep).length === 0 ? "done" : "todo";
    else state = missingFor(app, row.key as PrepStep).length === 0 ? "done" : i === nowIndex ? "now" : "todo";
    return { ...row, state };
  });
}

export function weddingDateOf(app: MarriageApplication) {
  return app.weddingEvent?.date || app.preferredWeddingDate || "";
}

export function formatWeddingDate(iso: string, style: "short" | "long" = "long") {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    ...(style === "long" ? { weekday: "short" } : {}),
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(iso: string, today = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((new Date(`${iso}T00:00:00`).getTime() - start.getTime()) / 86_400_000);
}

/** Weddings this close that aren't cleared yet get flagged red. */
const URGENT_DAYS = 30;

/** Why an application needs a look, or null. Colour means urgency, not stage. */
export function flagFor(app: MarriageApplication): { text: string; tone: "red" | "amber" } | null {
  const stage = applicationStage(app);
  if (stage === "closed" || stage === "cleared") return null;
  if (app.dispensationNeeded && app.dispensationStatus === "denied") return { text: "Dispensation denied", tone: "red" };
  const date = weddingDateOf(app);
  if (date && app.weddingDateStatus !== "none") {
    const days = daysUntil(date);
    if (days < 0) return { text: "Wedding date has passed", tone: "red" };
    if (days <= URGENT_DAYS) return { text: `Wedding in ${days} day${days === 1 ? "" : "s"}, not cleared`, tone: "red" };
  }
  if (app.dispensationNeeded && app.dispensationStatus !== "granted") return { text: "Dispensation pending", tone: "amber" };
  if (stage === "date" && app.weddingDateStatus === "none") return { text: "No wedding date reserved", tone: "amber" };
  return null;
}

/** One plain sentence telling staff what to do next. `detailed` names the missing documents and adds the dispensation. */
export function nextStep(app: MarriageApplication, detailed = false) {
  const stage = applicationStage(app);
  let text: string;
  switch (stage) {
    case "closed":
      return app.status === "rejected" ? "Application was rejected." : "Married and recorded.";
    case "cleared":
      return "After the wedding, record it in the marriage register.";
    case "documents": {
      const missing = missingFor(app, "documents");
      const count = `${missing.length} document${missing.length === 1 ? "" : "s"}`;
      if (!detailed) return `Collect ${count}`;
      if (missing.length > 3) {
        text = `Collect ${count}. The missing ones are listed below.`;
      } else {
        const names = missing.map((item) => {
          const { group, label } = requirementGroup(item);
          return group === "Couple" ? label : `${label} (${group.toLowerCase()})`;
        });
        text = `Collect ${count}: ${names.join(", ")}.`;
      }
      break;
    }
    case "interview":
      text = "Hold the canonical interview with the couple.";
      break;
    case "precana":
      text = "The couple attends the Pre-Cana seminar.";
      break;
    case "banns":
      text = "Publish the banns on three Sundays.";
      break;
    case "date": {
      const date = weddingDateOf(app);
      text =
        app.weddingDateStatus === "reserved" && date
          ? `Confirm the wedding on ${formatWeddingDate(date)}${app.weddingEvent?.start ? ` at ${app.weddingEvent.start}` : ""}.`
          : "Reserve a wedding date.";
      break;
    }
  }
  if (!detailed) return text;
  if (app.dispensationNeeded && app.dispensationStatus === "pending") text += " The dispensation is still pending.";
  if (app.dispensationNeeded && app.dispensationStatus === "denied") text += " The dispensation was denied.";
  return text;
}

/** The status shown to staff: the current stage, or how a closed application ended. */
export function statusLabel(app: MarriageApplication) {
  if (app.status === "rejected") return "Rejected";
  if (app.status === "completed") return "Married";
  return STAGE_LABEL[applicationStage(app)];
}
