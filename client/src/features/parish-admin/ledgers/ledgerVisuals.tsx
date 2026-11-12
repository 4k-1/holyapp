import type { ReactNode } from "react";
import { CandleIcon, DoveIcon, DropletIcon, HeartIcon } from "@/components/ui/icons/SacramentIcons";
import type { SacramentType } from "@/types";

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
