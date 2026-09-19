export type EventType =
  | "mass"
  | "novena"
  | "blessing"
  | "interview"
  | "manual"
  | "baptism"
  | "confirmation"
  | "wedding"
  | "funeral";

interface EventTypeStyle {
  tag: string;
  card: string;
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  mass: "Mass",
  novena: "Novena",
  blessing: "Blessing",
  interview: "Canonical Interview",
  manual: "Manual",
  baptism: "Baptism",
  confirmation: "Confirmation",
  wedding: "Wedding",
  funeral: "Funeral",
};

interface EventTypeStyle {
    tag: string;
    card: string;
    dot: string;
  }
  
  export const EVENT_TYPE_STYLES: Record<EventType, EventTypeStyle> = {
    mass: {
      tag: "bg-admin-green-100 text-admin-green-700",
      card: "bg-admin-green-050 border-l-[3px] border-l-admin-green-700",
      dot: "bg-admin-green-700",
    },
    novena: {
      tag: "bg-admin-gold-100 text-admin-gold-700",
      card: "bg-admin-gold-100 border-l-[3px] border-l-admin-gold-600",
      dot: "bg-admin-gold-600",
    },
    blessing: {
      tag: "bg-[#E3E9F5] text-[#3B6FB4]",
      card: "bg-[#E3E9F5] border-l-[3px] border-l-[#3B6FB4]",
      dot: "bg-[#3B6FB4]",
    },
    interview: {
      tag: "bg-[#EDE3F5] text-[#6A3B9E]",
      card: "bg-[#EDE3F5] border-l-[3px] border-l-[#6A3B9E]",
      dot: "bg-[#6A3B9E]",
    },
    manual: {
      tag: "bg-admin-surface-alt text-admin-ink-muted",
      card: "bg-admin-surface-alt border-l-[3px] border-l-admin-ink-muted",
      dot: "bg-admin-ink-muted",
    },
    baptism: {
      tag: "bg-[#E1F0EE] text-[#2E8B87]",
      card: "bg-[#E1F0EE] border-l-[3px] border-l-[#2E8B87]",
      dot: "bg-[#2E8B87]",
    },
    confirmation: {
      tag: "bg-[#E3E9F5] text-[#3B4E8A]",
      card: "bg-[#E3E9F5] border-l-[3px] border-l-[#3B4E8A]",
      dot: "bg-[#3B4E8A]",
    },
    wedding: {
      tag: "bg-[#F5E3EA] text-[#B4577A]",
      card: "bg-[#F5E3EA] border-l-[3px] border-l-[#B4577A]",
      dot: "bg-[#B4577A]",
    },
    funeral: {
      tag: "bg-admin-surface-alt text-[#5B5750]",
      card: "bg-admin-surface-alt border-l-[3px] border-l-[#5B5750]",
      dot: "bg-[#5B5750]",
    },
  };