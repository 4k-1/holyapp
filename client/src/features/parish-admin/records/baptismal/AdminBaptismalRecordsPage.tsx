import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { SearchCriteriaCard } from "@/features/parish-admin/records/SearchCriteriaCard";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import { RecordRegisterActions } from "@/features/parish-admin/records/RecordRegisterActions";
import { listBaptismalRecords } from "@/features/parish-admin/records/api/baptismalRecordsApi";
import { useAsync } from "@/hooks/useAsync";
import {
  baptismRecordRef,
  emptySearchCriteria,
  filterBaptismalRecords,
  formatRecordDate,
  recordFatherName,
  recordFullName,
  recordMotherName,
} from "@/features/parish-admin/records/baptismalHelpers";
import type { BaptismalRecord, BaptismalSearchCriteria } from "@/features/parish-admin/records/types";
import type { Parish } from "@/types";
import "@/features/parish-admin/styles/adminDesk.css";

export function AdminBaptismalRecordsPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const [draft, setDraft] = useState<BaptismalSearchCriteria>(emptySearchCriteria);
  const [applied, setApplied] = useState<BaptismalSearchCriteria>(emptySearchCriteria);

  const [showArchived, setShowArchived] = useState(false);

  const { data: parishRecords = [] } = useAsync(
    () => listBaptismalRecords(parish.id, { archived: showArchived }),
    [parish.id, showArchived]
  );
  const filtered = filterBaptismalRecords(parishRecords, applied);

  const columns: AdminTableColumn<BaptismalRecord>[] = [
    {
      key: "ref",
      header: "Bk:Page:Entry",
      render: (r) => <span className="admin-table__primary">{baptismRecordRef(r)}</span>,
    },
    { key: "name", header: "Name", render: (r) => recordFullName(r) },
    {
      key: "dateOfBaptism",
      header: "Bapt. date",
      render: (r) => formatRecordDate(r.dateOfBaptism),
    },
    {
      key: "dateOfBirth",
      header: "Birthdate",
      render: (r) => formatRecordDate(r.dateOfBirth),
    },
    { key: "mother", header: "Mother", render: (r) => recordMotherName(r) },
    { key: "father", header: "Father", render: (r) => recordFatherName(r) },
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

  function setField<K extends keyof BaptismalSearchCriteria>(key: K, value: BaptismalSearchCriteria[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="admin-dash mx-auto max-w-[1180px]">
      <header className="mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-[1.35rem] font-bold tracking-[-0.01em] text-[var(--dash-ink)] sm:text-[1.5rem]">
            Baptismal Records
          </h1>
          <p className="admin-dash__muted mt-1.5 text-admin-body">
            Search and manage sacramental records for this parish.
          </p>
        </div>
        <RecordRegisterActions
          showArchived={showArchived}
          onToggleArchived={() => setShowArchived((prev) => !prev)}
        />
      </header>

      <SearchCriteriaCard>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AdminField label="Name of baptized" className="mb-0">
            <AdminInput
              placeholder="Juan Dela Cruz"
              value={draft.name}
              onChange={(e) => setField("name", e.target.value)}
            />
          </AdminField>
          <AdminField label="Birthdate" className="mb-0">
            <AdminInput
              type="date"
              value={draft.birthdate}
              onChange={(e) => setField("birthdate", e.target.value)}
            />
          </AdminField>
          <AdminField label="Place of birth" className="mb-0">
            <AdminInput
              placeholder="Manila, Metro Manila"
              value={draft.placeOfBirth}
              onChange={(e) => setField("placeOfBirth", e.target.value)}
            />
          </AdminField>
          <AdminField label="Mother's name" className="mb-0">
            <AdminInput
              placeholder="Maria Santos"
              value={draft.mother}
              onChange={(e) => setField("mother", e.target.value)}
            />
          </AdminField>
          <AdminField label="Father's name" className="mb-0">
            <AdminInput
              placeholder="Jose Reyes"
              value={draft.father}
              onChange={(e) => setField("father", e.target.value)}
            />
          </AdminField>
          <AdminField label="Minister" className="mb-0">
            <AdminInput
              placeholder="Fr. Juan Santos"
              value={draft.minister}
              onChange={(e) => setField("minister", e.target.value)}
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
        title={showArchived ? "Archived records" : "Records"}
        subtitle={`${filtered.length} matching ${filtered.length === 1 ? "entry" : "entries"}`}
        columns={columns}
        rows={filtered}
        getRowKey={(r) => r.id}
        emptyMessage={
          showArchived
            ? "No archived baptismal records."
            : "No matching baptismal records. Try different search criteria."
        }
      />
    </div>
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
