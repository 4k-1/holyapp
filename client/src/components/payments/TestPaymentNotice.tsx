import { usePaymentTestMode } from "@/lib/paymentMode";

interface TestPaymentNoticeProps {
  /** "pay" before paying; "receipt" on a receipt or thank-you for a GCash payment. */
  kind?: "pay" | "receipt";
  className?: string;
}

/**
 * Says plainly, wherever someone is about to pay or sees a receipt, that GCash is only in test mode.
 * Shows nothing on a site taking real payments.
 */
export function TestPaymentNotice({ kind = "pay", className = "" }: TestPaymentNoticeProps) {
  const testMode = usePaymentTestMode();
  if (!testMode) return null;
  return (
    <div
      role="note"
      className={`rounded-xl border-2 border-dashed border-[#C98200] bg-[#FFF5D6] px-4 py-3 text-left text-[0.875rem] leading-snug text-[#4F3300] ${className}`}
    >
      <p className="text-[0.9375rem] font-extrabold">
        {kind === "pay" ? "Test payment only. No real money." : "Test receipt. No real money was paid."}
      </p>
      <p className="mt-1">
        {kind === "pay"
          ? "HolyApp is being tested. GCash here is in test mode, so nothing is taken from any GCash account. On the GCash page, approve the test payment."
          : "This payment was made in GCash test mode while HolyApp is being tested. Nothing was taken from any GCash account."}
      </p>
    </div>
  );
}
