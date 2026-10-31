import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { SearchCriteriaCard } from "@/features/parish-admin/records/SearchCriteriaCard";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import { RecordRegisterActions } from "@/features/parish-admin/records/RecordRegisterActions";
import { listConfirmationRecords } from "@/features/parish-admin/records/api/confirmationRecordsApi";
import { useAsync } from "@/hooks/useAsync";
import {
  confirmationRecordRef,
  emptyConfirmationSearchCriteria,
  filterConfirmationRecords,
  formatRecordDate,
  recordFatherName,
  recordFullName,
  recordMotherName,
} from "@/features/parish-admin/records/confirmationHelpers";
import type { ConfirmationRecord, ConfirmationSearchCriteria } from "@/features/parish-admin/records/types";
import type { Parish } from "@/types";
import "@/features/parish-admin/styles/adminDesk.css";

export function AdminConfirmationRecordsPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const [draft, setDraft] = useState<ConfirmationSearchCriteria>(emptyConfirmationSearchCriteria);
  const [applied, setApplied] = useState<ConfirmationSearchCriteria>(emptyConfirmationSearchCriteria);

  const [showArchived, setShowArchived] = useState(false);

  const { data: parishRecords = [], error, loading } = useAsync(
    () => listConfirmationRecords(parish.id, { archived: showArchived }),
    [parish.id, showArchived]
  );
  const filtered = filterConfirmationRecords(parishRecords, applied);

  const columns: AdminTableColumn<ConfirmationRecord>[] = [
    {
      key: "ref",
      header: "Bk:Page:Entry",
      sortValue: (r) => confirmationRecordRef(r),
      render: (r) => <span className="admin-table__primary">{confirmationRecordRef(r)}</span>,
    },
    { key: "name", header: "Name", sortValue: (r) => recordFullName(r), render: (r) => recordFullName(r) },
    {
      key: "dateOfConfirmation",
      header: "Conf. date",
      sortValue: (r) => r.dateOfConfirmation,
      render: (r) => formatRecordDate(r.dateOfConfirmation),
    },
    {
      key: "dateOfBirth",
      header: "Birthdate",
      sortValue: (r) => r.dateOfBirth,
      render: (r) => (r.dateOfBirth ? formatRecordDate(r.dateOfBirth) : "—"),
    },
    { key: "mother", header: "Mother", sortValue: (r) => recordMotherName(r), render: (r) => recordMotherName(r) || "—" },
    { key: "father", header: "Father", sortValue: (r) => recordFatherName(r), render: (r) => recordFatherName(r) || "—" },
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

  function setField<K extends keyof ConfirmationSearchCriteria>(key: K, value: ConfirmationSearchCriteria[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="admin-dash mx-auto max-w-[1180px]">
      <header className="mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-[1.35rem] font-bold tracking-[-0.01em] text-[var(--dash-ink)] sm:text-[1.5rem]">
            Confirmation Records
          </h1>
          <p className="admin-dash__muted mt-1.5 text-admin-body">
            Search and manage confirmation register entries for this parish.
          </p>
        </div>
        <RecordRegisterActions
          showArchived={showArchived}
          onToggleArchived={() => setShowArchived((prev) => !prev)}
        />
      </header>

      <SearchCriteriaCard>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AdminField label="Name of confirmed" className="mb-0">
            <AdminInput
              placeholder="Juan Dela Cruz"
              value={draft.name}
              onChange={(e) => setField("name", e.target.value)}
            />
          </AdminField>
          <AdminField label="Date of birth" className="mb-0">
            <AdminInput
              type="date"
              value={draft.birthdate}
              onChange={(e) => setField("birthdate", e.target.value)}
            />
          </AdminField>
          <AdminField label="Address" className="mb-0">
            <AdminInput
              placeholder="Brgy. San Isidro, Quezon City"
              value={draft.address}
              onChange={(e) => setField("address", e.target.value)}
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
              placeholder="Most Rev. Pedro Cruz"
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
        loading={loading}
        pageKey="records"
        title={showArchived ? "Archived records" : "Records"}
        subtitle={`${filtered.length} matching ${filtered.length === 1 ? "entry" : "entries"}`}
        columns={columns}
        rows={error ? [] : filtered}
        getRowKey={(r) => r.id}
        emptyMessage={
          error
            ? `Could not load confirmation records: ${error.message}`
            : showArchived
              ? "No archived confirmation records."
              : "No confirmation records in this parish yet. Add a record to save it to the database."
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
