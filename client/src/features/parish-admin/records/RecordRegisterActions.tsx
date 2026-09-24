import { Link } from "react-router-dom";

export function RecordRegisterActions({
  showArchived,
  onToggleArchived,
}: {
  showArchived: boolean;
  onToggleArchived: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <button type="button" className="admin-dash__cta-ghost" onClick={onToggleArchived}>
        {showArchived ? "Active records" : "Archived"}
      </button>
      {!showArchived && (
        <Link to="new" className="admin-dash__cta-primary">
          <PlusIcon />
          Add record
        </Link>
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
      <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
      <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
    </svg>
  );
}
