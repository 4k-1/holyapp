import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import { listConfirmationRecords } from "@/features/parish-admin/records/api/confirmationRecordsApi";
import { useAsync } from "@/hooks/useAsync";
import {
  emptyConfirmationSearchCriteria,
  filterConfirmationRecords,
  recordFatherName,
  recordFullName,
  recordMotherName,
  recordRef,
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
      header: "Bk:Page:Line",
      render: (r) => <span className="font-medium text-admin-ink">{recordRef(r)}</span>,
    },
    { key: "name", header: "Name", render: (r) => recordFullName(r) },
    { key: "confirmationDate", header: "Conf. date", render: (r) => r.confirmationDate },
    { key: "dob", header: "Birthdate", render: (r) => r.dob },
    { key: "sponsor", header: "Sponsor", render: (r) => r.sponsor },
    { key: "mother", header: "Mother", render: (r) => recordMotherName(r) },
    { key: "father", header: "Father", render: (r) => recordFatherName(r) },
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
          <h1 className="mb-1 text-[26px] font-semibold text-admin-ink">Confirmation Records</h1>
          <p className="text-[13.5px] text-admin-ink-muted">
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
        <h2 className="mb-3.5 font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
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
          <AdminField label="Birthdate" className="mb-0">
            <AdminInput
              type="date"
              value={draft.birthdate}
              onChange={(e) => setField("birthdate", e.target.value)}
            />
          </AdminField>
          <AdminField label="Birthplace" className="mb-0">
            <AdminInput
              placeholder="City / Province"
              value={draft.birthplace}
              onChange={(e) => setField("birthplace", e.target.value)}
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
          <AdminField label="Sponsor" className="mb-0">
            <AdminInput
              placeholder="Confirmation sponsor"
              value={draft.sponsor}
              onChange={(e) => setField("sponsor", e.target.value)}
            />
          </AdminField>
          <AdminField label="Minister" className="mb-0">
            <AdminInput
              placeholder="Officiating bishop or priest"
              value={draft.priest}
              onChange={(e) => setField("priest", e.target.value)}
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
