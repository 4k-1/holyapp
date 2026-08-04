import { DropletIcon, DoveIcon, HeartIcon, CandleIcon } from "@/components/ui/icons/SacramentIcons";
import { getSacramentIconStyle } from "@/features/parishioner/dashboard/statusStyles";
import type { SacramentType, DeliveryMethod } from "@/types";

const sacramentOptions: { type: SacramentType; label: string; Icon: typeof DropletIcon }[] = [
  { type: "baptism", label: "Baptismal", Icon: DropletIcon },
  { type: "confirmation", label: "Confirmation", Icon: DoveIcon },
  { type: "marriage", label: "Marriage", Icon: HeartIcon },
  { type: "death", label: "Death", Icon: CandleIcon },
];

interface SacramentStepProps {
  sacramentType: SacramentType;
  deliveryMethod: DeliveryMethod;
  purpose: string;
  onSacramentChange: (type: SacramentType) => void;
  onDeliveryChange: (method: DeliveryMethod) => void;
  onPurposeChange: (purpose: string) => void;
}

export function SacramentStep({
  sacramentType,
  deliveryMethod,
  purpose,
  onSacramentChange,
  onDeliveryChange,
  onPurposeChange,
}: SacramentStepProps) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <label className="mb-3 block text-[11.5px] font-bold uppercase tracking-widest text-ink-muted">
          Sacrament type
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 ">
          {sacramentOptions.map(({ type, label, Icon }) => {
            const selected = sacramentType === type;
            return (
             
              <button
                key={type}
                type="button"
                onClick={() => onSacramentChange(type)}
                className={`cursor-pointer group flex flex-col items-center gap-2.5 rounded-xl border-2 p-5 text-center transition-all hover:-translate-y-0.5 ${
                  selected
                    ? "border-transparent shadow-sm"
                    : "border-border bg-surface hover:border-accent/40 hover:bg-surface-alt/50 hover:shadow-sm"
                } ${selected ? getSacramentIconStyle(type) : ""}`}
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                    selected ? "bg-white/60" : "bg-surface-alt text-primary group-hover:bg-accent/10"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[13.5px] font-semibold">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-3 block text-[11.5px] font-bold uppercase tracking-widest text-ink-muted">
          Delivery method
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { key: "digital" as DeliveryMethod, label: "Digital Copy", sub: "Delivered straight to your Certificate Wallet once released" },
            { key: "pickup" as DeliveryMethod, label: "Self Pickup", sub: "Printed and parish-sealed, ready for pickup at the office" },
          ].map((option) => {
            const selected = deliveryMethod === option.key;
            return (
             
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onDeliveryChange(option.key)}
                  className={`cursor-pointer flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-all hover:-translate-y-0.5 ${
                    selected
                      ? "border-accent bg-accent/[0.07] shadow-sm"
                      : "border-border bg-surface hover:border-accent/40 hover:bg-surface-alt/50 hover:shadow-sm"
                  }`}
                >
                <p className="text-[14.5px] font-bold text-ink">{option.label}</p>
                <p className="text-xs leading-relaxed text-ink-muted">{option.sub}</p>
              </button>
            );
          })}
        </div>

        {deliveryMethod === "pickup" && (
          <div className="mt-3 flex gap-2.5 rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-3.5 text-sm text-primary">
            <span className="shrink-0">ℹ</span>
            <p>
              Bring a valid ID when you pick it up. We'll email you once your printed certificate is ready at the
              parish office.
            </p>
          </div>
        )}
      </div>

      <div className="max-w-sm">
        <label className="mb-3 block text-[11.5px] font-bold uppercase tracking-widest text-ink-muted">
          Purpose of request
        </label>
        <select
          value={purpose}
          onChange={(e) => onPurposeChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/25"
        >
          <option>School enrollment</option>
          <option>Employment</option>
          <option>Marriage application</option>
          <option>Personal records</option>
          <option>Other</option>
        </select>
      </div>
    </div>
  );
}