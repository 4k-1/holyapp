import type { Parish } from "@/types";

interface MobileParishHeaderProps {
  parish: Parish | null;
}

export function MobileParishHeader({ parish }: MobileParishHeaderProps) {
  if (!parish) return null;

  return (
    <div className="flex items-center gap-3 border-b border-[var(--auth-border,#e6ebec)] bg-white px-5 py-4 md:hidden">
      {parish.sealUrl ? (
        <img
          src={parish.sealUrl}
          alt={`${parish.name} seal`}
          className="h-10 w-10 rounded-full object-contain ring-1 ring-[var(--auth-border,#e6ebec)]"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--auth-green-soft,#e6f4e6)] font-serif text-base font-bold text-[var(--auth-green,#3f8f38)]">
          {parish.name.charAt(0)}
        </div>
      )}
      <p className="font-serif text-sm font-bold leading-tight text-[var(--auth-ink,#172d31)]">
        {parish.name}
      </p>
    </div>
  );
}
