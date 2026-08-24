import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
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

export function AdminConfirmationRecordsPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const [draft, setDraft] = useState<ConfirmationSearchCriteria>(emptyConfirmationSearchCriteria);
  const [applied, setApplied] = useState<ConfirmationSearchCriteria>(emptyConfirmationSearchCriteria);

  const { data: parishRecords = [] } = useAsync(() => listConfirmationRecords(parish.id), [parish.id]);
  const filtered = filterConfirmationRecords(parishRecords, applied);

  const columns: AdminTableColumn<ConfirmationRecord>[] = [
    {
      key: "ref",
      header: "Bk:Page:Entry",
      render: (r) => <span className="font-medium text-admin-ink">{confirmationRecordRef(r)}</span>,
    },
    { key: "name", header: "Name", render: (r) => recordFullName(r) },
    { key: "dateOfConfirmation", header: "Conf. date", render: (r) => formatRecordDate(r.dateOfConfirmation) },
    { key: "dateOfBirth", header: "Birthdate", render: (r) => (r.dateOfBirth ? formatRecordDate(r.dateOfBirth) : "—") },
    { key: "place", header: "Place", render: (r) => r.placeOfConfirmation },
    { key: "mother", header: "Mother", render: (r) => recordMotherName(r) || "—" },
    { key: "father", header: "Father", render: (r) => recordFatherName(r) || "—" },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <Link
          to={encodeURIComponent(r.id)}
          className="font-semibold text-admin-green-700 hover:underline"
        >
          View details
        </Link>
      ),
    },
  ];

  function setField<K extends keyof ConfirmationSearchCriteria>(key: K, value: ConfirmationSearchCriteria[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-admin-page font-semibold text-admin-ink">Confirmation Records</h1>
          <p className="text-admin-body text-admin-ink-muted">
            Search and manage confirmation register entries for this parish.
          </p>
        </div>
        <Link to="new">
          <AdminButton>
            <PlusIcon />
            Add record
          </AdminButton>
        </Link>
      </div>

      <AdminCard className="mb-[18px] p-5 px-[22px]">
        <h2 className="mb-3.5 font-sans text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
          Search criteria
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AdminField label="Name of confirmed" className="mb-0">
            <AdminInput
              placeholder="Last, First"
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
              placeholder="City / barangay"
              value={draft.address}
              onChange={(e) => setField("address", e.target.value)}
            />
          </AdminField>
          <AdminField label="Mother's name" className="mb-0">
            <AdminInput
              placeholder="Last, First"
              value={draft.mother}
              onChange={(e) => setField("mother", e.target.value)}
            />
          </AdminField>
          <AdminField label="Father's name" className="mb-0">
            <AdminInput
              placeholder="Last, First"
              value={draft.father}
              onChange={(e) => setField("father", e.target.value)}
            />
          </AdminField>
          <AdminField label="Place of confirmation" className="mb-0">
            <AdminInput
              placeholder="Church / parish"
              value={draft.place}
              onChange={(e) => setField("place", e.target.value)}
            />
          </AdminField>
          <AdminField label="Minister" className="mb-0">
            <AdminInput
              placeholder="Officiating minister"
              value={draft.minister}
              onChange={(e) => setField("minister", e.target.value)}
            />
          </AdminField>
        </div>
        <div className="mt-3.5 flex justify-end">
          <AdminButton onClick={() => setApplied({ ...draft })}>
            <SearchIcon />
            Search
          </AdminButton>
        </div>
      </AdminCard>

      <AdminCard>
        <AdminTable
          columns={columns}
          rows={filtered}
          getRowKey={(r) => r.id}
          emptyMessage="No matching confirmation records. Try different search criteria."
        />
      </AdminCard>
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
