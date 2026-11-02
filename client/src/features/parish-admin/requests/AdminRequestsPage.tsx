import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminFilterBar, QuickDate, QuickSelect } from "@/components/ui/AdminFilterBar";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminDeliveryTag } from "@/features/parish-admin/components/AdminDeliveryTag";
import { AdminStatCard } from "@/features/parish-admin/components/AdminStatCard";
import { AdminIssueCertificateModal } from "@/features/parish-admin/requests/AdminIssueCertificateModal";
import { AdminReleaseCertificateModal } from "@/features/parish-admin/requests/AdminReleaseCertificateModal";
import { AdminRequestDetailModal } from "@/features/parish-admin/requests/AdminRequestDetailModal";
import { listAdminRequests, rejectAdminRequest } from "@/features/parish-admin/requests/api/requestsAdminApi";
import { useAsync } from "@/hooks/useAsync";
import { deriveStatusLabel } from "@/features/parishioner/dashboard/deriveStatusLabel";
import { getAdminStatusTone, getAdminActionLabel } from "@/features/parish-admin/requests/adminRequestHelpers";
import type { CertificateRequest, Parish, SacramentType } from "@/types";
import { deriveStatusKey } from "@/features/parishioner/dashboard/deriveStatusLabel";
import { AdminPage, AdminPageHeader } from "@/features/parish-admin/components/AdminPageHeader";


const sacramentLabels: Record<SacramentType, string> = {
  baptism: "Baptism",
  confirmation: "Confirmation",
  marriage: "Marriage",
  death: "Death",
};

type StatusFilter =
  | "All statuses"
  | "Pending"
  | "Awaiting Payment"
  | "Processing"
  | "Ready"
  | "Released"
  | "Rejected"
  | "In Progress";

const filterToKey: Record<Exclude<StatusFilter, "All statuses" | "In Progress">, ReturnType<typeof deriveStatusKey>> = {
  Pending: "pending",
  "Awaiting Payment": "awaiting_payment",
  Processing: "processing",
  Ready: "ready",
  Released: "released",
  Rejected: "rejected",
};

const STATUS_OPTIONS: StatusFilter[] = [
  "All statuses",
  "Pending",
  "Awaiting Payment",
  "In Progress",
  "Processing",
  "Ready",
  "Released",
  "Rejected",
];

function formatDay(isoDate: string) {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function AdminRequestsPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All statuses");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [detailRequestId, setDetailRequestId] = useState<string | null>(null);
  const [issueRequestId, setIssueRequestId] = useState<string | null>(null);
  const [releaseRequestId, setReleaseRequestId] = useState<string | null>(null);

  const { data: parishRequests = [], refetch, loading } = useAsync(
    () => listAdminRequests(parish.id),
    [parish.id]
  );

  const detailRequest = detailRequestId
    ? parishRequests.find((r) => r.id === detailRequestId) ?? null
    : null;

  const issueRequest = issueRequestId
    ? parishRequests.find((r) => r.id === issueRequestId) ?? null
    : null;

  const releaseRequest = releaseRequestId
    ? parishRequests.find((r) => r.id === releaseRequestId) ?? null
    : null;

  const counts = useMemo(() => {
    const dateMatched = parishRequests.filter((r) => !dateFilter || r.createdAt.startsWith(dateFilter));
    return {
      "All statuses": dateMatched.length,
      Pending: dateMatched.filter((r) => deriveStatusKey(r) === "pending").length,
      "Awaiting Payment": dateMatched.filter((r) => deriveStatusKey(r) === "awaiting_payment").length,
      Processing: dateMatched.filter((r) => deriveStatusKey(r) === "processing").length,
      Ready: dateMatched.filter((r) => deriveStatusKey(r) === "ready").length,
      Released: dateMatched.filter((r) => deriveStatusKey(r) === "released").length,
      Rejected: dateMatched.filter((r) => deriveStatusKey(r) === "rejected").length,
    };
  }, [parishRequests, dateFilter]);

  const filtered = useMemo(() => {
    return parishRequests.filter((r) => {
      const key = deriveStatusKey(r);
      const matchesStatus =
        statusFilter === "All statuses" ||
        (statusFilter === "In Progress"
          ? key === "processing" || key === "ready"
          : key === filterToKey[statusFilter]);
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        r.id.toLowerCase().includes(q) ||
        (r.details?.subjectName ?? "").toLowerCase().includes(q);
      const matchesDate = !dateFilter || r.createdAt.startsWith(dateFilter);
      return matchesStatus && matchesSearch && matchesDate;
    });
  }, [parishRequests, statusFilter, search, dateFilter]);

  const columns: AdminTableColumn<CertificateRequest>[] = [
    { key: "id", header: "ID", sortValue: (r) => r.id, render: (r) => (
      <button
        type="button"
        onClick={() => setDetailRequestId(r.id)}
        className="text-left font-medium text-admin-ink hover:text-admin-green-700 hover:underline"
      >
        {r.id}
      </button>
    ) },
    {
      key: "requestedBy",
      header: "Request by",
      sortValue: (r) => r.details?.subjectName ?? r.requesterId,
      render: (r) => (
        <span>
          {r.details?.subjectName ?? r.requesterId}
          {r.origin === "walkin" && (
            <span className="ml-2 inline-flex items-center rounded-full bg-admin-surface-alt px-2 py-0.5 text-admin-label font-semibold text-admin-ink-muted">
              Walk-in
            </span>
          )}
        </span>
      ),
    },
    {
      key: "requestDate",
      header: "Request date",
      sortValue: (r) => r.createdAt,
      render: (r) =>
        new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    },
    {
      key: "type",
      header: "Type",
      sortValue: (r) => sacramentLabels[r.sacramentType],
      render: (r) => (
        <span className="inline-flex items-center rounded-full bg-admin-surface-alt px-2.5 py-1 text-admin-label font-semibold text-admin-ink-muted">
          {sacramentLabels[r.sacramentType]}
        </span>
      ),
    },
    { key: "delivery", header: "Delivery", render: (r) => <AdminDeliveryTag method={r.deliveryMethod} /> },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => deriveStatusLabel(r),
      render: (r) => <AdminBadge tone={getAdminStatusTone(r)}>{deriveStatusLabel(r)}</AdminBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => {
        const primary = getAdminActionLabel(r);
        return (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDetailRequestId(r.id)}
              className="admin-table__action"
            >
              View
            </button>
            {primary !== "View" &&
              (primary === "Find record" ? (
                <Link to={`${r.id}/find-record`} className="admin-table__action">
                  Find record
                </Link>
              ) : primary === "Release →" ? (
                <button
                  type="button"
                  onClick={() => setReleaseRequestId(r.id)}
                  className="admin-table__action"
                >
                  Release
                </button>
              ) : primary.endsWith("→") ? (
                <button
                  type="button"
                  onClick={() => setIssueRequestId(r.id)}
                  className="admin-table__action"
                >
                  {primary.replace(" →", "")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => console.info("[mock] action for", r.id)}
                  className="admin-table__action"
                >
                  {primary}
                </button>
              ))}
          </span>
        );
      },
    },
  ];

  return (
    <AdminPage>
      <AdminPageHeader title="Requests" description="Online certificate requests submitted by parishioners." />

      <div className="mb-[22px] grid grid-cols-[repeat(auto-fit,minmax(148px,1fr))] gap-3.5">
        {(Object.keys(counts) as (keyof typeof counts)[]).map((key) => (
            <AdminStatCard
            key={key}
            label={key === "All statuses" ? "Total requests" : key === "Awaiting Payment" ? "To be paid" : key}
            value={counts[key]}
            active={statusFilter === key}
            onClick={() => setStatusFilter(key)}
            />
        ))}
    </div>

      <AdminCard>
        <AdminFilterBar
          search={{ value: search, onChange: setSearch, placeholder: "Search by request ID or name", label: "Search requests" }}
          chips={[
            ...(statusFilter !== "All statuses"
              ? [{ key: "status", label: statusFilter, onRemove: () => setStatusFilter("All statuses") }]
              : []),
            ...(dateFilter
              ? [{ key: "date", label: `Requested ${formatDay(dateFilter)}`, onRemove: () => setDateFilter("") }]
              : []),
          ]}
          onClearAll={() => {
            setStatusFilter("All statuses");
            setDateFilter("");
          }}
          summary={`${filtered.length} shown`}
        >
          <QuickSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS.map((s) => [s, s] as const)}
          />
          <QuickDate label="Request date" value={dateFilter} onChange={setDateFilter} />
        </AdminFilterBar>
        <AdminTable
          loading={loading}
          columns={columns}
          rows={filtered}
          getRowKey={(r) => r.id}
          defaultSort={{ key: "requestDate", dir: "desc" }}
          pageKey="requests"
          emptyMessage="No matching requests. Try a different status or search term."
        />
      </AdminCard>

      {detailRequest && (
        <AdminRequestDetailModal
          request={detailRequest}
          parish={parish}
          onClose={() => setDetailRequestId(null)}
          onReject={async (r) => {
            await rejectAdminRequest(r.id);
            refetch();
          }}
          onPaymentRecorded={() => refetch()}
          onIssueComplete={refetch}
          onReleaseComplete={refetch}
        />
      )}

      {issueRequest && (
        <AdminIssueCertificateModal
          request={issueRequest}
          parish={parish}
          onClose={() => setIssueRequestId(null)}
          onComplete={() => {
            setIssueRequestId(null);
            refetch();
          }}
        />
      )}

      {releaseRequest && (
        <AdminReleaseCertificateModal
          request={releaseRequest}
          parish={parish}
          onClose={() => setReleaseRequestId(null)}
          onComplete={() => {
            setReleaseRequestId(null);
            refetch();
          }}
        />
      )}
    </AdminPage>
  );
}