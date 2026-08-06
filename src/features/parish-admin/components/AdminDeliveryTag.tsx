import type { DeliveryMethod } from "@/types";

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
      <path d="M20 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1z" />
      <path d="M17 12.5h.01" />
      <path d="M5 7V5a2 2 0 0 1 2-2h9" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
      <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function AdminDeliveryTag({ method }: { method: DeliveryMethod }) {
  if (method === "digital") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-admin-green-700">
        <WalletIcon /> Digital Wallet
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-admin-gold-700">
      <PinIcon /> Self Pickup
    </span>
  );
}