import { DropletIcon, DoveIcon, HeartIcon, CandleIcon } from "@/components/ui/icons/SacramentIcons";
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
    <div>
      <label className="mb-2 block text-[11.5px] font-bold uppercase tracking-wide text-accent">
        Sacrament type
      </label>
      <div className="mb-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {sacramentOptions.map(({ type, label, Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => onSacramentChange(type)}
            className={`flex flex-col items-center gap-2 rounded-2xl border-[1.5px] p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-sm ${
              sacramentType === type ? "border-accent bg-accent/10 shadow-sm" : "border-border bg-surface"
            }`}
          >
            <Icon className="h-6 w-6 text-primary" />
            <span className="text-[13.5px] font-semibold text-ink">{label}</span>
          </button>
        ))}
      </div>

      <label className="mb-2 mt-6 block text-[11.5px] font-bold uppercase tracking-wide text-accent">
        Delivery method
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onDeliveryChange("digital")}
          className={`flex flex-col items-start gap-1 rounded-2xl border-[1.5px] p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm ${
            deliveryMethod === "digital" ? "border-accent bg-accent/10 shadow-sm" : "border-border bg-surface"
          }`}
        >
          <span className="text-lg">🗄</span>
          <span className="text-[14.5px] font-bold text-ink">Digital Copy</span>
          <span className="text-xs leading-snug text-ink-muted">
            Delivered straight to your Certificate Wallet once released
          </span>
        </button>
        <button
          type="button"
          onClick={() => onDeliveryChange("pickup")}
          className={`flex flex-col items-start gap-1 rounded-2xl border-[1.5px] p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm ${
            deliveryMethod === "pickup" ? "border-accent bg-accent/10 shadow-sm" : "border-border bg-surface"
          }`}
        >
          <span className="text-lg">⛪</span>
          <span className="text-[14.5px] font-bold text-ink">Self Pickup</span>
          <span className="text-xs leading-snug text-ink-muted">
            Printed and parish-sealed, ready for pickup at the office
          </span>
        </button>
      </div>

      {deliveryMethod === "pickup" && (
        <div className="mt-4 flex gap-2.5 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3.5 text-sm text-primary">
          <span>ℹ</span>
          <p>
            Bring a valid ID when you pick it up. We'll email you once your printed certificate is ready at the
            parish office.
          </p>
        </div>
      )}

      <div className="mt-5 max-w-sm">
        <label className="mb-2 block text-[11.5px] font-bold uppercase tracking-wide text-accent">
          Purpose of request
        </label>
        <select
          value={purpose}
          onChange={(e) => onPurposeChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
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