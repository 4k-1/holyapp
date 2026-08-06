interface AdminStatCardProps {
    label: string;
    value: number;
    active?: boolean;
    onClick?: () => void;
  }
  
  export function AdminStatCard({ label, value, active, onClick }: AdminStatCardProps) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`rounded-[var(--radius)] border px-[18px] py-4 text-left shadow-[0_2px_8px_rgba(10,40,30,0.06)] transition-all hover:-translate-y-px ${
          active
            ? "border-admin-green-700 bg-admin-green-050 shadow-[inset_0_0_0_1px_var(--color-admin-green-700)]"
            : "border-admin-border bg-admin-surface hover:border-admin-green-600"
        }`}
      >
        <p className="mb-2 text-[12.5px] font-semibold uppercase tracking-wide text-admin-ink-muted">{label}</p>
        <p className="font-serif text-[28px] font-semibold text-admin-green-900">{value}</p>
      </button>
    );
  }