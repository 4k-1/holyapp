import type { AuditLogEntry } from "@/types";

export function auditActorName(entry: AuditLogEntry) {
  return entry.actorName?.trim() || "Someone";
}

export function auditCopy(entry: AuditLogEntry) {
  const who = auditActorName(entry);
  switch (entry.action) {
    case "certificate.issued":
      return `${who} issued a certificate`;
    case "baptism.updated":
      return `${who} updated a baptismal record`;
    case "marriage.updated":
      return `${who} updated a marriage record`;
    case "app_user.suspended":
      return `${who} suspended an account`;
    case "app_user.reactivated":
      return `${who} reactivated an account`;
    case "app_user.created":
      return `${who} created an account`;
    case "app_user.removed":
      return `${who} removed an account`;
    case "app_user.granted_edit":
      return `${who} granted record-editing access`;
    case "app_user.revoked_edit":
      return `${who} revoked record-editing access`;
    case "app_user.password_reset":
      return `${who} sent a password reset`;
    case "auth.login_failed":
      return `Failed sign-in on ${String(entry.metadata.email || entry.entityId)}`;
    case "profile.updated":
      return `${who} updated their profile`;
    case "parish.created":
      return `${who} onboarded a parish`;
    case "parish.cert_theme_updated":
      return `${who} set a parish certificate style`;
    default:
      return `${who} · ${entry.action}`;
  }
}

export function auditTone(action: string): "green" | "yellow" | "red" {
  if (action.includes("failed")) return "red";
  if (action.includes("suspended") || action.includes("removed") || action.includes("revoked")) return "yellow";
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
