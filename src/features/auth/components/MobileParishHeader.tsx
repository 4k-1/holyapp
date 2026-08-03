import type { Parish } from "@/types";

interface MobileParishHeaderProps {
  parish: Parish | null;
}

export function MobileParishHeader({ parish }: MobileParishHeaderProps) {
  if (!parish) return null;

  return (
    <div className="flex items-center gap-3 border-b max-h-fit border-border bg-surface-alt px-5 py-4 md:hidden">
      {parish.sealUrl ? (
        <img src={parish.sealUrl} alt={`${parish.name} seal`} className="h-10 w-10 rounded object-contain" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10 font-serif text-base font-semibold text-primary">
          {parish.name.charAt(0)}
        </div>
      )}
      <p className="font-serif text-sm font-semibold leading-tight text-ink">{parish.name}</p>
    </div>
  );
}