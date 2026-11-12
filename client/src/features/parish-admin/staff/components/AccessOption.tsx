/** One choice of access level (staff or admin) for a sign-in. */
export function AccessOption({
  selected,
  disabled = false,
  title,
  description,
  onSelect,
}: {
  selected: boolean;
  disabled?: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`rounded-md border px-3.5 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? "border-admin-green-600 bg-admin-green-050 ring-1 ring-inset ring-admin-green-600/30"
          : "border-admin-border-strong bg-white hover:bg-admin-surface-alt"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
            selected ? "border-admin-green-700 bg-admin-green-700" : "border-admin-border-strong"
          }`}
        >
          {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
        </span>
        <span className="text-admin-body font-semibold text-admin-ink">{title}</span>
      </div>
      <p className="mt-1 pl-6 text-admin-label leading-snug text-admin-ink-muted">{description}</p>
    </button>
  );
}
