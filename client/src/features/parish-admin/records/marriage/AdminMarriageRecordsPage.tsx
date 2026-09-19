import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { SearchCriteriaCard } from "@/features/parish-admin/records/SearchCriteriaCard";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import { listMarriageRecords } from "@/features/parish-admin/records/api/marriageRecordsApi";
import { useAsync } from "@/hooks/useAsync";
import {
  brideFullName,
  emptyMarriageSearchCriteria,
  filterMarriageRecords,
  formatRecordDate,
  groomFullName,
  marriageRecordRef,
} from "@/features/parish-admin/records/marriageHelpers";
import type { MarriageRecord, MarriageSearchCriteria } from "@/features/parish-admin/records/types";
import type { Parish } from "@/types";
import "@/features/parish-admin/styles/adminDesk.css";

export function AdminMarriageRecordsPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const [draft, setDraft] = useState<MarriageSearchCriteria>(emptyMarriageSearchCriteria);
  const [applied, setApplied] = useState<MarriageSearchCriteria>(emptyMarriageSearchCriteria);

  const { data: parishRecords = [] } = useAsync(() => listMarriageRecords(parish.id), [parish.id]);
  const filtered = filterMarriageRecords(parishRecords, applied);

  const columns: AdminTableColumn<MarriageRecord>[] = [
    {
      key: "ref",
      header: "Bk:Page:Entry",
      render: (r) => <span className="admin-table__primary">{marriageRecordRef(r)}</span>,
    },
    { key: "groom", header: "Groom", render: (r) => groomFullName(r) },
    { key: "bride", header: "Bride", render: (r) => brideFullName(r) },
    {
      key: "dateOfMarriage",
      header: "Marriage date",
      render: (r) => formatRecordDate(r.dateOfMarriage),
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <Link to={encodeURIComponent(r.id)} className="admin-table__action">
          View
        </Link>
      ),
    },
  ];

  function setField<K extends keyof MarriageSearchCriteria>(key: K, value: MarriageSearchCriteria[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="admin-dash mx-auto max-w-[1180px]">
      <header className="mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-[1.35rem] font-bold tracking-[-0.01em] text-[var(--dash-ink)] sm:text-[1.5rem]">
            Marriage Records
          </h1>
          <p className="admin-dash__muted mt-1.5 text-admin-body">
            Search and manage marriage register entries for this parish.
          </p>
        </div>
        <Link to="new" className="admin-dash__cta-primary shrink-0">
          <PlusIcon />
          Add record
        </Link>
      </header>

      <SearchCriteriaCard>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AdminField label="Groom's name" className="mb-0">
            <AdminInput
              placeholder="Jose Reyes"
              value={draft.groom}
              onChange={(e) => setField("groom", e.target.value)}
            />
          </AdminField>
          <AdminField label="Bride's name" className="mb-0">
            <AdminInput
              placeholder="Maria Santos"
              value={draft.bride}
              onChange={(e) => setField("bride", e.target.value)}
            />
          </AdminField>
          <AdminField label="Date of marriage" className="mb-0">
            <AdminInput
              type="date"
              value={draft.marriageDate}
              onChange={(e) => setField("marriageDate", e.target.value)}
            />
          </AdminField>
          <AdminField label="Minister" className="mb-0">
            <AdminInput
              placeholder="Fr. Juan Santos"
              value={draft.minister}
              onChange={(e) => setField("minister", e.target.value)}
            />
          </AdminField>
          <AdminField label="Witness" className="mb-0">
            <AdminInput
              placeholder="Ramon Lim"
              value={draft.witness}
              onChange={(e) => setField("witness", e.target.value)}
            />
          </AdminField>
        </div>
        <div className="mt-3.5 flex justify-end">
          <AdminButton onClick={() => setApplied({ ...draft })} className="!rounded-full">
            <SearchIcon />
            Search
          </AdminButton>
        </div>
      </SearchCriteriaCard>

      <AdminTable
        title="Records"
        subtitle={`${filtered.length} matching ${filtered.length === 1 ? "entry" : "entries"}`}
        columns={columns}
        rows={filtered}
        getRowKey={(r) => r.id}
        emptyMessage="No matching marriage records. Try different search criteria."
      />
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

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
    </svg>
  );
}
