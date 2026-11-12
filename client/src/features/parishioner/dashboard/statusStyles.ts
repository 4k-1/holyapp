import type { CertificateRequest } from "@/types";
import { deriveStatusLabel } from "@/features/parishioner/dashboard/deriveStatusLabel";

export function getStatusPillClasses(request: CertificateRequest): string {
  const label = deriveStatusLabel(request);

  switch (label) {
    case "Pending":
      return "bg-[#f2e6c8] text-[#6a5010]";
    case "Awaiting Payment":
      return "bg-[#f6d9b8] text-[#7f4210]";
    case "Processing":
      return "bg-[#dbe6ee] text-[#33607e]";
    case "Ready for Pickup":
      return "bg-[#dde7e6] text-[#2f6b63]";
    case "Released":
      return "bg-[#dbeadb] text-[#2f6b3d]";
    case "Rejected":
      return "bg-[#f3e3e0] text-[#7c3030]";
    default:
      return "bg-surface-alt text-ink-muted";
  }
}

// export function getSacramentIconStyle(sacrament: string): string {
//   switch (sacrament) {
//     case "baptism":
//       return "bg-[#dfe9f2] text-[#3c6f9e]";
//     case "confirmation":
//       return "bg-[#f8ecc9] text-[#a9822f]";
//     case "marriage":
//       return "bg-[#f5e0e0] text-[#a04b4b]";
//     case "death":
//       return "bg-[#e6e2da] text-[#5c5648]";
//     default:
//       return "bg-surface-alt text-ink-muted";
//   }
// }

export function getSacramentIconStyle(sacrament: string): string {
  switch (sacrament) {
    case "baptism":
      return "bg-primary/10 text-primary";
    case "confirmation":
      return "bg-primary/10 text-primary";
    case "marriage":
      return "bg-primary/10 text-primary";
    case "death":
      return "bg-primary/10 text-primary";
    default:
      return "bg-surface-alt text-ink-muted";
  }
}