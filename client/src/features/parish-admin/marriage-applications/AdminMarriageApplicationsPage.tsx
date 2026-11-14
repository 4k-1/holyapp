import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { useOpenFromLink } from "@/features/parish-admin/components/useOpenFromLink";
import { AdminFilterBar, QuickSelect } from "@/components/ui/AdminFilterBar";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { AdminStatCard } from "@/features/parish-admin/components/AdminStatCard";
import { CreateWalkInApplicationModal } from "@/features/parish-admin/marriage-applications/CreateWalkInApplicationModal";
import { listMarriageApplications } from "@/features/parish-admin/marriage-applications/api/marriageApplicationsApi";
import {
  STAGE_LABEL,
  applicationStage,
  flagFor,
  formatWeddingDate,
  statusLabel,
  weddingDateOf,
  type ApplicationStage,
} from "@/features/parish-admin/marriage-applications/applicationProgress";
import type { MarriageApplication } from "@/features/parish-admin/marriage-applications/types";
import { useAsync } from "@/hooks/useAsync";
import "@/features/parish-admin/styles/adminDesk.css";
import { SkeletonList } from "@/components/ui/Skeleton";
import { AdminPage, AdminPageHeader } from "@/features/parish-admin/components/AdminPageHeader";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { userCan } from "@/features/parish-admin/access";

const PREPARATION: ApplicationStage[] = ["documents", "interview", "precana", "banns"];

/** Stat-card groups plus every individual stage, so the cards and the dropdown filter the same table. */
type Filter = "all" | "preparation" | "attention" | ApplicationStage;

const FILTER_LABEL: Record<Filter, string> = {
  all: "All statuses",
  preparation: "In preparation",
  attention: "Needs attention",
  ...STAGE_LABEL,
};

const STAT_CARDS: { key: Filter; label: string }[] = [
  { key: "all", label: "Total applications" },
  { key: "preparation", label: "In preparation" },
  { key: "attention", label: "Needs attention" },
  { key: "date", label: "Ready for wedding date" },
  { key: "cleared", label: "Cleared for ceremony" },
  { key: "closed", label: "Closed" },
];

const DROPDOWN: Filter[] = [
  "all",
  "attention",
  "preparation",
  "documents",
  "interview",
  "precana",
  "banns",
  "date",
  "cleared",
  "closed",
];

function matches(app: MarriageApplication, filter: Filter) {
  const stage = applicationStage(app);
  if (filter === "all") return true;
  if (filter === "preparation") return PREPARATION.includes(stage);
  if (filter === "attention") return flagFor(app) !== null;
  return stage === filter;
}

/** Soonest wedding first; applications without a date go last. */
function byWeddingDate(a: MarriageApplication, b: MarriageApplication) {
  const da = weddingDateOf(a);
  const db = weddingDateOf(b);
  if (da && db) return da.localeCompare(db);
  if (da) return -1;
  if (db) return 1;
  return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1 h-3.5 w-3.5" aria-hidden="true">
      <path d="M12 4 2.5 20h19L12 4Z" strokeLinejoin="round" />
      <line x1="12" y1="10" x2="12" y2="14" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function AdminMarriageApplicationsPage() {
  const canCreate = userCan(useCurrentUser(), "marriage", "manage");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  // The dashboard's "New marriage application" opens the walk-in form straight away.
  const [createOpen, setCreateOpen] = useState(useOpenFromLink("application"));
  const { data: applications = [], loading, refetch } = useAsync(() => listMarriageApplications(), []);

  const counts = useMemo(() => {
    const next = Object.fromEntries(DROPDOWN.map((key) => [key, 0])) as Record<Filter, number>;
    for (const app of applications) {
      for (const key of DROPDOWN) if (matches(app, key)) next[key] += 1;
    }
    return next;
  }, [applications]);

  const q = search.trim().toLowerCase();
  const rows = applications
    .filter((app) => matches(app, filter))
    .filter((app) => !q || `${app.referenceNo} ${app.brideName} ${app.groomName}`.toLowerCase().includes(q))
    .sort(byWeddingDate);

  const columns: AdminTableColumn<MarriageApplication>[] = [
    {
      key: "couple",
      header: "Couple",
      sortValue: (row) => `${row.groomName} ${row.brideName}`,
      render: (row) => (
        <Link
          to={encodeURIComponent(row.id)}
          className="font-medium text-admin-ink hover:text-admin-green-700 hover:underline"
        >
          {row.groomName} & {row.brideName}
        </Link>
      ),
    },
    {
      key: "wedding",
      header: "Wedding date",
      sortValue: (row) => weddingDateOf(row) ?? null,
      render: (row) => {
        const date = weddingDateOf(row);
        return date ? (
          <span className="whitespace-nowrap">{formatWeddingDate(date, "short")}</span>
        ) : (
          <span className="text-admin-ink-muted">—</span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row) => statusLabel(row),
      render: (row) => {
        const stage = applicationStage(row);
        const tone = stage === "cleared" ? "green" : row.status === "rejected" ? "red" : "muted";
        return <AdminBadge tone={tone}>{statusLabel(row)}</AdminBadge>;
      },
    },
    {
      key: "flag",
      header: "Flag",
      sortValue: (row) => flagFor(row)?.text ?? null,
      render: (row) => {
        const flag = flagFor(row);
        return flag ? (
          <AdminBadge tone={flag.tone}>
            <WarningIcon />
            {flag.text}
          </AdminBadge>
        ) : (
          <span className="text-admin-ink-muted">—</span>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <Link to={encodeURIComponent(row.id)} className="admin-table__action">
          View
        </Link>
      ),
    },
  ];

  return (
    <AdminPage>
      <AdminPageHeader
        title="Marriage Applications"
        description="Couples in marriage preparation. Documents are checked in person; this only tracks status."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="banns"
              className="inline-flex items-center rounded-lg border border-admin-border px-4 py-2.5 text-admin-body font-semibold text-admin-ink hover:bg-admin-surface-alt"
            >
              Banns
            </Link>
            {canCreate && (
              <AdminButton type="button" onClick={() => setCreateOpen(true)}>
                + New application
              </AdminButton>
            )}
          </div>
        }
      />

      <div className="mb-[22px] grid grid-cols-[repeat(auto-fit,minmax(148px,1fr))] gap-3.5">
        {STAT_CARDS.map((card) => (
          <AdminStatCard
            key={card.key}
            label={card.label}
            value={counts[card.key]}
            active={filter === card.key}
            onClick={() => setFilter(card.key)}
          />
        ))}
      </div>

      <AdminCard>
        <AdminFilterBar
          search={{ value: search, onChange: setSearch, placeholder: "Search by reference or name", label: "Search applications" }}
          chips={filter === "all" ? [] : [{ key: "status", label: FILTER_LABEL[filter], onRemove: () => setFilter("all") }]}
          summary={`${rows.length} shown`}
        >
          <QuickSelect
            label="Status"
            value={filter}
            onChange={setFilter}
            options={DROPDOWN.map((key) => [key, FILTER_LABEL[key]] as const)}
          />
        </AdminFilterBar>
        {loading && applications.length === 0 ? (
          <SkeletonList rows={5} />
        ) : (
          <AdminTable
            columns={columns}
            rows={rows}
            getRowKey={(row) => row.id}
            pageKey="marriage-applications"
            emptyMessage={
              applications.length === 0
                ? "No marriage applications yet. Use “New application” when a couple applies at the office."
                : "No matching applications. Try a different status or search term."
            }
          />
        )}
      </AdminCard>

      {createOpen && (
        <CreateWalkInApplicationModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            refetch();
          }}
        />
      )}
    </AdminPage>
  );
}
