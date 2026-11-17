import type { AuditLogEntry } from "@/types";

export function auditActorName(entry: AuditLogEntry) {
  return entry.actorName?.trim() || "Someone";
}

// What each action did, said after the person's name.
const DID: Record<string, string> = {
  "auth.login": "signed in",

  "app_user.created": "created an account",
  "app_user.updated": "updated an account",
  "app_user.removed": "removed an account",
  "app_user.suspended": "suspended an account",
  "app_user.reactivated": "reactivated an account",
  "app_user.granted_edit": "allowed an account to edit records",
  "app_user.revoked_edit": "stopped an account from editing records",
  "app_user.password_reset": "reset an account's password",
  "profile.updated": "updated their profile",

  "parish.created": "added a parish",
  "parish.updated": "updated the parish details",
  "parish.fee_updated": "changed a service fee",
  "parish.cert_theme_updated": "set a parish's certificate style",

  "baptism.created": "added a baptismal record",
  "baptism.updated": "updated a baptismal record",
  "baptism.archived": "archived a baptismal record",
  "baptism.restored": "restored a baptismal record",
  "confirmation.created": "added a confirmation record",
  "confirmation.updated": "updated a confirmation record",
  "confirmation.archived": "archived a confirmation record",
  "confirmation.restored": "restored a confirmation record",
  "marriage.created": "added a marriage record",
  "marriage.updated": "updated a marriage record",
  "marriage.archived": "archived a marriage record",
  "marriage.restored": "restored a marriage record",
  "death.created": "added a death record",
  "death.updated": "updated a death record",
  "death.archived": "archived a death record",
  "death.restored": "restored a death record",
  "annotation.recorded": "added a note to a record",

  "ledger_book.created": "added a register book",
  "ledger_page.uploaded": "uploaded a register page",
  "ledger_page.read": "ran text recognition on a register page",
  "ledger_scan.read": "ran text recognition on a scanned register page",

  "certificate_request.created": "requested a certificate",
  "certificate_request.linked": "matched a certificate request to its record",
  "certificate_request.payment_recorded": "recorded a payment for a certificate request",
  "certificate_request.rejected": "turned down a certificate request",
  "certificate.issued": "issued a certificate",
  "certificate.ready": "marked a certificate ready to pick up",
  "certificate.released": "released a certificate",
  "certificate.print_confirmed": "confirmed a certificate printed",
  "certificate.reprinted": "reprinted a certificate",
  "certificate.spoiled": "marked a printed certificate as spoiled",
  "certificate.revoked": "withdrew a certificate",

  "marriage_application.created": "started a marriage application",
  "marriage_application.circumstances_updated": "updated a couple's details on a marriage application",
  "marriage_application.requirement_verified": "checked off a marriage requirement",
  "marriage_application.requirement_cleared": "unchecked a marriage requirement",
  "marriage_application.banns_updated": "updated the banns for a marriage application",
  "marriage_application.banns_elsewhere_created": "added banns read at another parish",
  "marriage_application.banns_elsewhere_removed": "removed banns read at another parish",
  "marriage_application.dispensation_updated": "updated a dispensation on a marriage application",
  "marriage_requirement.updated": "changed the list of marriage requirements",

  "mass_intention.requested": "asked for a Mass intention",
  "mass_intention.booked": "booked a Mass intention",
  "mass_intention.confirmed": "confirmed a Mass intention",
  "mass_intention.rejected": "rejected a Mass intention",
  "mass_intention.said": "marked a Mass intention as offered",
  "mass_intention.donation_received": "gave an offering for a Mass intention",

  "donation.recorded": "recorded a donation",
  "donation.received": "gave a donation through GCash",
  "donation.cleared": "marked a donation as cleared",
  "donation.corrected": "corrected a donation",
  "donation.voided": "voided a donation",

  "schedule.event_created": "added an event to the schedule",
  "schedule.event_updated": "changed an event on the schedule",
  "schedule.assigned": "assigned someone to an event",

  "personnel.updated": "updated the list of priests and staff",
  "personnel.handover": "handed over a priest's or staff member's duties",
};

// For actions added later: "marriage_application.banns_updated" reads "updated a marriage application".
const THING: Record<string, string> = {
  app_user: "an account",
  certificate_request: "a certificate request",
  marriage_application: "a marriage application",
  mass_intention: "a Mass intention",
  ledger_book: "a register book",
  ledger_page: "a register page",
  baptism: "a baptismal record",
  confirmation: "a confirmation record",
  marriage: "a marriage record",
  death: "a death record",
};

function guessed(action: string) {
  const [entity = "", verb = ""] = action.split(".");
  const thing = THING[entity] ?? `a ${entity.replace(/_/g, " ")}`;
  const lastWord = verb.split("_").at(-1) || "changed";
  const past = /ed$/.test(lastWord) ? lastWord : "changed";
  return `${past} ${thing}`;
}

export function auditCopy(entry: AuditLogEntry) {
  if (entry.action === "auth.login_failed") {
    const email = entry.metadata.email;
    return typeof email === "string" && email ? `Someone failed to sign in as ${email}` : "A sign-in failed";
  }
  return `${auditActorName(entry)} ${DID[entry.action] ?? guessed(entry.action)}`;
}

// The server filters on the same lists, in server/src/controllers/auditController.js.
const RED_WORDS = ["failed"];
const YELLOW_WORDS = ["suspended", "removed", "revoked", "voided", "archived", "rejected", "spoiled"];

export function auditTone(action: string): "green" | "yellow" | "red" {
  if (RED_WORDS.some((w) => action.includes(w))) return "red";
  if (YELLOW_WORDS.some((w) => action.includes(w))) return "yellow";
  return "green";
}

export function formatAuditWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
