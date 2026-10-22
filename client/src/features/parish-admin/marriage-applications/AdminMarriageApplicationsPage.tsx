import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import { AdminButton, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { CreateWalkInApplicationModal } from "@/features/parish-admin/marriage-applications/CreateWalkInApplicationModal";
import { listMarriageApplications } from "@/features/parish-admin/marriage-applications/api/marriageApplicationsApi";
import {
  STAGE_LABEL,
  STAGE_ORDER,
  applicationStage,
  flagFor,
  formatWeddingDate,
  weddingDateOf,
  type ApplicationStage,
} from "@/features/parish-admin/marriage-applications/applicationProgress";
import type { MarriageApplication } from "@/features/parish-admin/marriage-applications/types";
import { useAsync } from "@/hooks/useAsync";
import "@/features/parish-admin/styles/adminDesk.css";

type StageFilter = "open" | "all" | ApplicationStage;

/** Soonest wedding first; applications without a date go last. */
function byWeddingDate(a: MarriageApplication, b: MarriageApplication) {
  const da = weddingDateOf(a);
  const db = weddingDateOf(b);
  if (da && db) return da.localeCompare(db);
  if (da) return -1;
  if (db) return 1;
  return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
}

export function AdminMarriageApplicationsPage() {
  const [filter, setFilter] = useState<StageFilter>("open");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const { data: applications = [], loading, refetch } = useAsync(() => listMarriageApplications(), []);

  const counts = useMemo(() => {
    const next = Object.fromEntries(STAGE_ORDER.map((key) => [key, 0])) as Record<ApplicationStage, number>;
    for (const app of applications) next[applicationStage(app)] += 1;
    return next;
  }, [applications]);

  const q = search.trim().toLowerCase();
  const rows = applications
    .filter((app) => {
      if (q && !`${app.groomName} ${app.brideName}`.toLowerCase().includes(q)) return false;
      const stage = applicationStage(app);
      if (filter === "all") return true;
      if (filter === "open") return stage !== "closed";
      return stage === filter;
    })
    .sort(byWeddingDate);

  const columns: AdminTableColumn<MarriageApplication>[] = [
    {
      key: "couple",
      header: "Couple",
      render: (row) => (
        <Link to={encodeURIComponent(row.id)} className="admin-table__primary hover:underline">
          {row.brideName} & {row.groomName}
        </Link>
      ),
    },
    {
      key: "wedding",
      header: "Wedding date",
      render: (row) => {
        const date = weddingDateOf(row);
        return date ? (
          <span className="whitespace-nowrap">{formatWeddingDate(date, "short")}</span>
        ) : (
          <span className="text-admin-ink-muted">Not set</span>
        );
      },
    },
    {
      key: "stage",
      header: "Stage",
      render: (row) => <span className="text-admin-ink">{STAGE_LABEL[applicationStage(row)]}</span>,
    },
    {
      key: "flag",
      header: "Flag",
      render: (row) => {
        const flag = flagFor(row);
        return flag ? (
          <AdminBadge tone={flag.tone}>⚠ {flag.text}</AdminBadge>
        ) : (
          <span className="text-admin-ink-muted" aria-label="No flag">
            —
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <Link to={encodeURIComponent(row.id)} className="admin-table__action">
          View
        </Link>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 font-serif text-admin-page font-semibold text-admin-ink">Marriage Applications</h1>
          <p className="text-admin-body text-admin-ink-muted">
            Track couples through marriage preparation. Documents are checked in person; this only tracks status.
          </p>
        </div>
        <AdminButton type="button" onClick={() => setCreateOpen(true)}>
          + New application
        </AdminButton>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-full max-w-[360px]">
          <AdminInput
            placeholder="Search by bride or groom name"
            aria-label="Search by bride or groom name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as StageFilter)}
          aria-label="Show applications by stage"
          className="min-h-[42px] rounded-lg border border-admin-border bg-admin-surface px-3 text-admin-body text-admin-ink"
        >
          <option value="open">All open ({applications.length - counts.closed})</option>
          {STAGE_ORDER.map((key) => (
            <option key={key} value={key}>
              {STAGE_LABEL[key]} ({counts[key]})
            </option>
          ))}
          <option value="all">Everything ({applications.length})</option>
        </select>
      </div>

      {loading && applications.length === 0 ? (
        <p className="px-6 py-10 text-center text-admin-body text-admin-ink-muted">Loading applications…</p>
      ) : (
        <AdminTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          emptyMessage={q ? "No couples match that name." : "No applications here."}
        />
      )}

      {createOpen && (
        <CreateWalkInApplicationModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
