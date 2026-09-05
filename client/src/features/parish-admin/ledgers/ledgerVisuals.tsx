import type { ReactNode } from "react";
import { CandleIcon, DoveIcon, DropletIcon, HeartIcon } from "@/components/ui/icons/SacramentIcons";
import type { AdminSectionTone } from "@/features/parish-admin/components/AdminForm";
import type { SacramentType } from "@/types";

export function ledgerSacramentBadgeTone(type: SacramentType) {
  switch (type) {
    case "baptism":
      return "green" as const;
    case "confirmation":
      return "muted" as const;
    case "marriage":
      return "gold" as const;
    case "death":
      return "muted" as const;
  }
}

export function ledgerSacramentSectionTone(type: SacramentType): AdminSectionTone {
  switch (type) {
    case "baptism":
      return "green";
    case "confirmation":
      return "blue";
    case "marriage":
      return "gold";
    case "death":
      return "rose";
  }
}

const BOOK_COVER_GRADIENTS = [
  "from-[#5b3a29] to-[#2e1c14]",
  "from-[#1a3d2b] to-[#0c1f16]",
  "from-[#d4a017] to-[#8a6710]",
  "from-[#33475a] to-[#17232e]",
];

export function ledgerBookCoverClass(index: number) {
  return `bg-gradient-to-br ${BOOK_COVER_GRADIENTS[index % BOOK_COVER_GRADIENTS.length]}`;
}

export function LedgerSacramentIcon({
  type,
  className = "h-4 w-4",
}: {
  type: SacramentType;
  className?: string;
}): ReactNode {
  switch (type) {
    case "baptism":
      return <DropletIcon className={className} />;
    case "confirmation":
      return <DoveIcon className={className} />;
    case "marriage":
      return <HeartIcon className={className} />;
    case "death":
      return <CandleIcon className={className} />;
  }
}
