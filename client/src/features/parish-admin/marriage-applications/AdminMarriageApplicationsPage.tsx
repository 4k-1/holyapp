import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import { AdminButton, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { AdminStatCard } from "@/features/parish-admin/components/AdminStatCard";
import { CreateWalkInApplicationModal } from "@/features/parish-admin/marriage-applications/CreateWalkInApplicationModal";
import { listMarriageApplications } from "@/features/parish-admin/marriage-applications/api/marriageApplicationsApi";
import type { MarriageApplication, MarriageApplicationStatus } from "@/features/parish-admin/marriage-applications/types";
import { useAsync } from "@/hooks/useAsync";
import "@/features/parish-admin/styles/adminDesk.css";

const STATUS_LABEL: Record<MarriageApplicationStatus, string> = {
  pending: "Pending",
  checking_requirements: "Checking requirements",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
};

const STATUS_TONE: Record<MarriageApplicationStatus, "amber" | "gold" | "green" | "red" | "muted"> = {
  pending: "amber",
  checking_requirements: "gold",
  approved: "green",
  rejected: "red",
  completed: "muted",
};

type StatusFilter = "All statuses" | MarriageApplicationStatus;

export function AdminMarriageApplicationsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All statuses");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const { data: applications = [], loading, refetch } = useAsync(() => listMarriageApplications(), []);

  const counts = useMemo(() => {
    const next: Record<StatusFilter, number> = {
      "All statuses": applications.length,
      pending: 0,
      checking_requirements: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
    };
    for (const app of applications) next[app.status] += 1;
    return next;
  }, [applications]);

  const filtered = applications.filter((app) => {
    if (statusFilter !== "All statuses" && app.status !== statusFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${app.groomName} ${app.brideName}`.toLowerCase().includes(q);
  });

  const columns: AdminTableColumn<MarriageApplication>[] = [
    {
      key: "couple",
      header: "Couple",
      render: (row) => (
        <span className="admin-table__primary">
          {row.groomName} & {row.brideName}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <AdminBadge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</AdminBadge>,
    },
    {
      key: "dispensation",
      header: "Dispensation",
      render: (row) =>
        row.dispensationNeeded ? (
          <AdminBadge tone={row.dispensationStatus === "granted" ? "green" : row.dispensationStatus === "denied" ? "red" : "amber"}>
            {row.dispensationStatus}
          </AdminBadge>
        ) : (
          <span className="text-admin-ink-muted">Not required</span>
        ),
    },
    {
      key: "wedding",
      header: "Wedding date",
      render: (row) =>
        row.preferredWeddingDate ? (
          <span>
            {row.preferredWeddingDate}
            {row.weddingDateStatus !== "none" ? ` · ${row.weddingDateStatus}` : ""}
          </span>
        ) : (
          <span className="text-admin-ink-muted">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <Link to={encodeURIComponent(row.id)} className="admin-table__action">
          Open
        </Link>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-admin-page font-semibold text-admin-ink">Marriage Applications</h1>
          <p className="text-admin-body text-admin-ink-muted">
            Walk-in applications, requirement checks, dispensation, and wedding date reservation.
          </p>
        </div>
        <AdminButton type="button" onClick={() => setCreateOpen(true)}>
          New walk-in application
        </AdminButton>
      </div>

      <div className="mb-[22px] grid grid-cols-[repeat(auto-fit,minmax(148px,1fr))] gap-3.5">
        {(Object.keys(counts) as StatusFilter[]).map((key) => (
          <AdminStatCard
            key={key}
            label={key === "All statuses" ? "Total" : STATUS_LABEL[key as MarriageApplicationStatus]}
            value={counts[key]}
            active={statusFilter === key}
            onClick={() => setStatusFilter(key)}
          />
        ))}
      </div>

      <div className="mb-3.5 max-w-[320px]">
        <AdminInput
          placeholder="Search by couple name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && applications.length === 0 ? (
        <p className="px-6 py-10 text-center text-admin-body text-admin-ink-muted">Loading applications…</p>
      ) : (
        <AdminTable
          columns={columns}
          rows={filtered}
          getRowKey={(row) => row.id}
          emptyMessage="No marriage applications yet."
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
