export type NotificationKind = "request" | "payment" | "schedule" | "intention" | "donation";

export interface ParishNotification {
  id: string;
  parishId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  read: boolean;
}
