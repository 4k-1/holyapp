import { Link } from "react-router-dom";

export function LinkedRecordLink({
  to,
  name,
  registerRef,
  onNavigate,
}: {
  to: string;
  name: string;
  registerRef: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="text-right text-admin-body font-semibold text-admin-green-700 hover:underline"
    >
      {name} — Bk {registerRef}
    </Link>
  );
}
