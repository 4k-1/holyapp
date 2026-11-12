import { useEffect, useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { AdminDialog, AdminDialogFooter, AdminDialogHeader } from "@/features/parish-admin/components/AdminDialog";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminSelect,
  AdminTextarea,
} from "@/features/parish-admin/components/AdminForm";
import {
  createConfirmationRecord,
  listConfirmationRecords,
} from "@/features/parish-admin/records/api/confirmationRecordsApi";
import { createDeathRecord, listDeathRecords } from "@/features/parish-admin/records/api/deathRecordsApi";
import { createMarriageRecord, listMarriageRecords } from "@/features/parish-admin/records/api/marriageRecordsApi";
import {
  annotationTagClass,
  baptismCertificateNotationLine,
  formatRecordDate,
  todayIsoDate,
} from "@/features/parish-admin/records/baptismalHelpers";
import {
  confirmationRecordRef,
  emptyConfirmationSearchCriteria,
  filterConfirmationRecords,
  formatRecordDate as formatConfirmationDate,
  recordFullName as confirmationFullName,
} from "@/features/parish-admin/records/confirmationHelpers";
import {
  deathRecordRef,
  emptyDeathSearchCriteria,
  filterDeathRecords,
  formatRecordDate as formatDeathDate,
  recordFullName as deathFullName,
} from "@/features/parish-admin/records/deathHelpers";
import {
  brideFullName,
  groomFullName,
  marriageRecordRef,
} from "@/features/parish-admin/records/marriageHelpers";
import {
  ANNOTATION_CATEGORIES,
  LINKABLE_ANNOTATION_CATEGORIES,
  type AnnotationCategory,
  type BaptismalRecord,
  type LinkableAnnotationCategory,
  type MarriagePartyRole,
  type RecordAnnotation,
} from "@/features/parish-admin/records/types";
import type { Parish } from "@/types";

const notePlaceholders: Record<AnnotationCategory, string> = {
  Confirmation: "Confirmed at Sto. Niño de Cebu Parish. Sponsor: Paula Bracho.",
  Marriage: "Married to Ana Marie Lopez at Sto. Niño de Cebu Parish.",
  Death: "Deceased on March 12, 2024. Buried at Carreta Cemetery.",
  Other: "Name corrected per civil registry; see attached document.",
};

type LinkMode = "search" | "manual" | "create";

interface RegisterHit {
  id: string;
  title: string;
  subtitle: string;
  book: string;
  page: string;
  line: string;
}

export type AddAnnotationInput = Omit<RecordAnnotation, "id" | "by">;

export type BaptismalLinkContext = Pick<
  BaptismalRecord,
  | "id"
  | "firstName"
  | "middleName"
  | "lastName"
  | "sex"
  | "dateOfBirth"
  | "address"
  | "fatherFirstName"
  | "fatherLastName"
  | "motherFirstName"
  | "motherLastName"
  | "dateOfBaptism"
  | "placeOfBaptism"
>;

interface AdminAddAnnotationModalProps {
  subjectName: string;
  baptismal: BaptismalLinkContext;
  existingCategories?: AnnotationCategory[];
  onClose: () => void;
  onSubmit: (input: AddAnnotationInput) => Promise<void>;
  onRecorded?: () => void;
}

export function AdminAddAnnotationModal({
  subjectName,
  baptismal,
  existingCategories = [],
  onClose,
  onSubmit,
  onRecorded,
}: AdminAddAnnotationModalProps) {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const [category, setCategory] = useState<AnnotationCategory>("Confirmation");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [linkEntry, setLinkEntry] = useState(false);
  const [linkMode, setLinkMode] = useState<LinkMode>("search");
  const [linkedCategory, setLinkedCategory] = useState<LinkableAnnotationCategory>("Confirmation");
  const [linkedBook, setLinkedBook] = useState("");
  const [linkedPage, setLinkedPage] = useState("");
  const [linkedLine, setLinkedLine] = useState("");
  const [searchQuery, setSearchQuery] = useState(subjectName);
  const [hits, setHits] = useState<RegisterHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedHitId, setSelectedHitId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shared create fields
  const [createPlace, setCreatePlace] = useState(parish.name);
  const [createMinister, setCreateMinister] = useState("");
  const [createMiddle, setCreateMiddle] = useState(baptismal.middleName?.trim() ?? "");
  const [createBook, setCreateBook] = useState("");
  const [createPage, setCreatePage] = useState("");
  const [createEntry, setCreateEntry] = useState("");

  // Confirmation-only
  const [isAdult, setIsAdult] = useState(false);
  const [isPriorMarriage, setIsPriorMarriage] = useState(false);

  // Marriage-only
  const [subjectRole, setSubjectRole] = useState<MarriagePartyRole>(
    baptismal.sex === "Female" ? "Bride" : "Groom"
  );
  const [spouseFirst, setSpouseFirst] = useState("");
  const [spouseMiddle, setSpouseMiddle] = useState("");
  const [spouseLast, setSpouseLast] = useState("");
  const [spouseDob, setSpouseDob] = useState("");
  const [witnessOne, setWitnessOne] = useState("");
  const [witnessTwo, setWitnessTwo] = useState("");

  // Death-only
  const [burialDate, setBurialDate] = useState("");
  const [burialPlace, setBurialPlace] = useState("");

  const alreadyNoted = category !== "Other" && existingCategories.includes(category);
  const formattedDate = formatRecordDate(date, "");
  const certificateLine = baptismCertificateNotationLine({
    category,
    date: formattedDate || "—",
    note: note.trim(),
  });
  const effectiveLinkedCategory = category === "Other" ? linkedCategory : (category as LinkableAnnotationCategory);
  const creating = linkEntry && linkMode === "create";

  const createReady =
    !creating ||
    (Boolean(createMinister.trim() && createBook.trim() && createPage.trim() && createEntry.trim()) &&
      (effectiveLinkedCategory === "Confirmation"
        ? Boolean(createPlace.trim() && createMiddle.trim())
        : true) &&
      (effectiveLinkedCategory === "Marriage"
        ? Boolean(
            createPlace.trim() &&
              spouseFirst.trim() &&
              spouseLast.trim() &&
              spouseDob &&
              witnessOne.trim() &&
              witnessTwo.trim()
          )
        : true) &&
      (effectiveLinkedCategory === "Death" ? Boolean(burialDate && burialPlace.trim()) : true));

  const linkReady =
    !linkEntry ||
    creating ||
    Boolean(linkedBook.trim() && linkedPage.trim());

  const canSave = Boolean(note.trim() && date && linkReady && createReady && !submitting);

  function clearLinkFields() {
    setLinkedBook("");
    setLinkedPage("");
    setLinkedLine("");
    setSelectedHitId(null);
    setHits([]);
  }

  function resetCreateFields() {
    setCreatePlace(parish.name);
    setCreateMinister("");
    setCreateBook("");
    setCreatePage("");
    setCreateEntry("");
    setIsAdult(false);
    setIsPriorMarriage(false);
    setSpouseFirst("");
    setSpouseMiddle("");
    setSpouseLast("");
    setSpouseDob("");
    setWitnessOne("");
    setWitnessTwo("");
    setBurialDate("");
    setBurialPlace("");
  }

  function handleCategory(next: AnnotationCategory) {
    setCategory(next);
    if (next !== "Other") setLinkedCategory(next);
    clearLinkFields();
    if (next === "Other") {
      setLinkMode("search");
    }
  }

  function handleLinkedCategory(next: LinkableAnnotationCategory) {
    setLinkedCategory(next);
    clearLinkFields();
    resetCreateFields();
  }

  function applyHit(hit: RegisterHit) {
    setSelectedHitId(hit.id);
    setLinkedBook(hit.book);
    setLinkedPage(hit.page);
    setLinkedLine(hit.line);
  }

  function enterCreateMode() {
    setLinkMode("create");
    clearLinkFields();
    if (!note.trim()) {
      const place = parish.name;
      if (effectiveLinkedCategory === "Confirmation") setNote(`Confirmed at ${place}.`);
      if (effectiveLinkedCategory === "Marriage") setNote(`Married at ${place}.`);
      if (effectiveLinkedCategory === "Death") setNote(`Deceased. Funeral rites at ${place}.`);
    }
  }

  // Clear results or show "Searching…" as soon as the query changes; the effect only runs the debounced search.
  const registerQuery = searchQuery.trim();
  const searchKey = linkEntry && linkMode === "search" ? `${effectiveLinkedCategory}:${registerQuery}` : null;
  const [prevSearchKey, setPrevSearchKey] = useState<string | null>(null);
  if (searchKey !== prevSearchKey) {
    setPrevSearchKey(searchKey);
    if (searchKey !== null) {
      if (registerQuery.length < 2) {
        setHits([]);
        setSearching(false);
      } else {
        setSearching(true);
      }
    }
  }

  useEffect(() => {
    if (!linkEntry || linkMode !== "search") return;

    const q = searchQuery.trim();
    if (q.length < 2) return;

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      try {
        const results = await searchRegisterEntries(parish.id, effectiveLinkedCategory, q);
        if (!cancelled) setHits(results);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [linkEntry, linkMode, searchQuery, effectiveLinkedCategory, parish.id]);

  async function createLinkedRecord(): Promise<{ book: string; page: string; line: string }> {
    const cat = effectiveLinkedCategory;

    if (cat === "Confirmation") {
      const created = await createConfirmationRecord(parish.id, {
        firstName: baptismal.firstName,
        middleName: createMiddle.trim(),
        lastName: baptismal.lastName,
        sex: baptismal.sex,
        dateOfBirth: baptismal.dateOfBirth,
        address: baptismal.address,
        fatherFirstName: baptismal.fatherFirstName,
        fatherLastName: baptismal.fatherLastName,
        motherFirstName: baptismal.motherFirstName,
        motherLastName: baptismal.motherLastName,
        dateOfConfirmation: date,
        placeOfConfirmation: createPlace.trim(),
        annotationNote: note.trim(),
        minister: createMinister.trim(),
        baptismalRecordId: baptismal.id,
        baptismDate: baptismal.dateOfBaptism,
        baptismPlace: baptismal.placeOfBaptism,
        isPriorMarriage,
        isAdult,
        bookNumber: createBook.trim(),
        pageNumber: createPage.trim(),
        entryNumber: createEntry.trim(),
      });
      return { book: created.bookNumber, page: created.pageNumber, line: created.entryNumber };
    }

    if (cat === "Death") {
      const created = await createDeathRecord(parish.id, {
        firstName: baptismal.firstName,
        middleName: baptismal.middleName || undefined,
        lastName: baptismal.lastName,
        residence: baptismal.address,
        dateOfDeath: date,
        dateOfBurial: burialDate,
        placeOfBurial: burialPlace.trim(),
        minister: createMinister.trim(),
        bookNumber: createBook.trim(),
        pageNumber: createPage.trim(),
        entryNumber: createEntry.trim(),
        baptismalRecordId: baptismal.id,
        annotationNote: note.trim(),
        kin: [],
        sacramentsReceived: [],
      });
      return { book: created.bookNumber, page: created.pageNumber, line: created.entryNumber };
    }

    const otherRole: MarriagePartyRole = subjectRole === "Groom" ? "Bride" : "Groom";
    const subjectParty = {
      role: subjectRole,
      firstName: baptismal.firstName,
      middleName: baptismal.middleName || undefined,
      lastName: baptismal.lastName,
      dateOfBirth: baptismal.dateOfBirth,
      sex: baptismal.sex,
      address: baptismal.address,
      religion: "Roman Catholic",
      civilStatus: "Single" as const,
      baptismalRecordId: baptismal.id,
      fatherFirstName: baptismal.fatherFirstName,
      fatherLastName: baptismal.fatherLastName,
      motherFirstName: baptismal.motherFirstName,
      motherLastName: baptismal.motherLastName,
      consentPersons: [],
    };
    const spouseParty = {
      role: otherRole,
      firstName: spouseFirst.trim(),
      middleName: spouseMiddle.trim() || undefined,
      lastName: spouseLast.trim(),
      dateOfBirth: spouseDob,
      sex: otherRole === "Bride" ? "Female" : "Male",
      religion: "Roman Catholic",
      civilStatus: "Single" as const,
      consentPersons: [],
    };

    const created = await createMarriageRecord(parish.id, {
      placeOfMarriage: createPlace.trim(),
      dateOfMarriage: date,
      minister: createMinister.trim(),
      witnessOne: witnessOne.trim(),
      witnessTwo: witnessTwo.trim(),
      bookNumber: createBook.trim(),
      pageNumber: createPage.trim(),
      entryNumber: createEntry.trim(),
      annotationNote: note.trim(),
      parties: subjectRole === "Groom" ? [subjectParty, spouseParty] : [spouseParty, subjectParty],
    });
    return { book: created.bookNumber, page: created.pageNumber, line: created.entryNumber };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;

    setError(null);
    setSubmitting(true);
    try {
      if (creating) {
        await createLinkedRecord();
        onRecorded?.();
      } else {
        let linked: AddAnnotationInput["linked"];
        if (linkEntry) {
          const recordId = linkMode === "search" && selectedHitId && isRecordUuid(selectedHitId) ? selectedHitId : undefined;
          linked = {
            category: effectiveLinkedCategory,
            book: linkedBook.trim(),
            page: linkedPage.trim(),
            line: linkedLine.trim() || undefined,
            ...(recordId ? { recordId } : {}),
          };
        }
        await onSubmit({
          category,
          date,
          note: note.trim(),
          ...(linked ? { linked } : {}),
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this annotation.");
    } finally {
      setSubmitting(false);
    }
  }

  const createLabel =
    effectiveLinkedCategory === "Confirmation"
      ? "Add confirmation record"
      : effectiveLinkedCategory === "Marriage"
        ? "Add marriage record"
        : "Add death record";

  return (
    <AdminDialog onClose={onClose} busy={submitting} panelClassName="max-w-[600px]">
      <AdminDialogHeader
        title="Add annotation"
        subtitle={`Later sacraments noted here print on the next baptismal certificate for ${subjectName}.`}
        onClose={onClose}
        busy={submitting}
      />

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <AdminField label="Sacrament">
            <div role="radiogroup" aria-label="Sacrament" className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {ANNOTATION_CATEGORIES.map((c) => {
                const selected = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => handleCategory(c)}
                    className={`rounded-md border px-2 py-2 text-admin-label font-bold uppercase tracking-admin-label transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-green-600/25 ${
                      selected
                        ? `${annotationTagClass[c]} border-transparent`
                        : "border-admin-border-strong bg-admin-surface text-admin-ink-muted hover:bg-admin-surface-alt"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </AdminField>

          {alreadyNoted && (
            <p className="mb-4 rounded-md border border-admin-gold-700/25 bg-admin-gold-100 px-3.5 py-2.5 text-admin-support leading-relaxed text-admin-gold-700">
              {category} is already noted on this entry. Saving another will add a second line on the certificate.
            </p>
          )}

          <AdminField label="Date of sacrament">
            <AdminInput
              type="date"
              value={date}
              min={baptismal.dateOfBaptism}
              max={todayIsoDate()}
              onChange={(e) => setDate(e.target.value)}
              required
              autoFocus
            />
          </AdminField>

          <AdminField label="Annotation note">
            <AdminTextarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={notePlaceholders[category]}
              required
            />
            <p className="mt-1.5 text-admin-label text-admin-ink-faint">
              Kept on the baptismal record. Confirmation, marriage, and death print as a date line; other notes print in
              full.
            </p>
          </AdminField>

          <div className="mb-4 rounded-md border border-admin-border bg-admin-surface-alt px-3.5 py-3">
            <p className="text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
              On the certificate
            </p>
            <p className="mt-1.5 font-serif text-admin-body italic leading-relaxed text-admin-ink">
              {!date
                ? "Choose a date to see the line that will print."
                : category === "Other" && !note.trim()
                  ? "Write the note that will print."
                  : certificateLine}
            </p>
          </div>

          <div className="rounded-md border border-admin-border bg-admin-surface-alt p-3.5">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={linkEntry}
                onChange={(e) => {
                  setLinkEntry(e.target.checked);
                  if (!e.target.checked) {
                    clearLinkFields();
                    setLinkMode("search");
                  }
                }}
                className="mt-0.5 h-4 w-4 rounded border-admin-border-strong accent-admin-green-700"
              />
              <span>
                <span className="block text-admin-body font-semibold text-admin-ink">Link to register entry</span>
                <span className="mt-0.5 block text-admin-support leading-relaxed text-admin-ink-muted">
                  Search this parish, enter the book, page, and line from another parish, or encode a new record here.
                </span>
              </span>
            </label>

            {linkEntry && (
              <div className="mt-3.5 space-y-3 border-t border-admin-border pt-3.5">
                {category === "Other" ? (
                  <AdminField label="Register type" className="mb-0">
                    <AdminSelect
                      value={linkedCategory}
                      onChange={(e) => handleLinkedCategory(e.target.value as LinkableAnnotationCategory)}
                    >
                      {LINKABLE_ANNOTATION_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </AdminSelect>
                  </AdminField>
                ) : (
                  <p className="text-admin-support text-admin-ink-muted">{category} register</p>
                )}

                <div className="inline-flex flex-wrap rounded-md border border-admin-border bg-admin-surface p-1">
                  {(
                    [
                      ["search", "Search records"],
                      ["manual", "Enter manually"],
                      ["create", createLabel],
                    ] as const
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => (mode === "create" ? enterCreateMode() : setLinkMode(mode))}
                      className={`rounded-md px-3 py-1.5 text-admin-support font-semibold transition ${
                        linkMode === mode ? "bg-admin-surface-alt text-admin-ink shadow-sm" : "text-admin-ink-muted"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {linkMode === "search" && (
                  <SearchLinkPanel
                    searchQuery={searchQuery}
                    setSearchQuery={(v) => {
                      setSearchQuery(v);
                      setSelectedHitId(null);
                    }}
                    searching={searching}
                    hits={hits}
                    selectedHitId={selectedHitId}
                    onSelect={applyHit}
                    linkedBook={linkedBook}
                    linkedPage={linkedPage}
                    linkedLine={linkedLine}
                    onClear={clearLinkFields}
                    categoryLabel={effectiveLinkedCategory.toLowerCase()}
                  />
                )}

                {linkMode === "manual" && (
                  <div className="space-y-2.5">
                    <p className="text-admin-support leading-relaxed text-admin-ink-muted">
                      Use this when the sacrament was recorded in another parish.
                    </p>
                  <div className="grid grid-cols-3 gap-2.5">
                    <AdminField label="Book" className="mb-0">
                      <AdminInput
                        placeholder="2"
                        value={linkedBook}
                        onChange={(e) => setLinkedBook(e.target.value)}
                        required={linkEntry}
                      />
                    </AdminField>
                    <AdminField label="Page" className="mb-0">
                      <AdminInput
                        placeholder="08"
                        value={linkedPage}
                        onChange={(e) => setLinkedPage(e.target.value)}
                        required={linkEntry}
                      />
                    </AdminField>
                    <AdminField label="Line" className="mb-0">
                      <AdminInput
                        placeholder="14"
                        value={linkedLine}
                        onChange={(e) => setLinkedLine(e.target.value)}
                      />
                    </AdminField>
                  </div>
                  </div>
                )}

                {linkMode === "create" && (
                  <div className="space-y-3">
                    <p className="rounded-md border border-admin-green-700/20 bg-admin-green-050 px-3 py-2.5 text-admin-support leading-relaxed text-admin-green-800">
                      Encodes a new {effectiveLinkedCategory.toLowerCase()} register entry at{" "}
                      <span className="font-semibold">{parish.name}</span>, linked to this baptismal record (
                      {subjectName}).
                    </p>

                    {effectiveLinkedCategory === "Marriage" && (
                      <>
                        <AdminField label="This person is the" className="mb-0">
                          <AdminSelect
                            value={subjectRole}
                            onChange={(e) => setSubjectRole(e.target.value as MarriagePartyRole)}
                          >
                            <option value="Groom">Groom</option>
                            <option value="Bride">Bride</option>
                          </AdminSelect>
                        </AdminField>
                        <div className="grid grid-cols-3 gap-2.5">
                          <AdminField label="First" className="mb-0">
                            <AdminInput value={spouseFirst} onChange={(e) => setSpouseFirst(e.target.value)} required />
                          </AdminField>
                          <AdminField label="Middle" className="mb-0">
                            <AdminInput value={spouseMiddle} onChange={(e) => setSpouseMiddle(e.target.value)} />
                          </AdminField>
                          <AdminField label="Last" className="mb-0">
                            <AdminInput value={spouseLast} onChange={(e) => setSpouseLast(e.target.value)} required />
                          </AdminField>
                        </div>
                        <AdminField label="Spouse date of birth" className="mb-0">
                          <AdminInput type="date" value={spouseDob} onChange={(e) => setSpouseDob(e.target.value)} required />
                        </AdminField>
                        <div className="grid grid-cols-2 gap-2.5">
                          <AdminField label="Witness 1" className="mb-0">
                            <AdminInput value={witnessOne} onChange={(e) => setWitnessOne(e.target.value)} required />
                          </AdminField>
                          <AdminField label="Witness 2" className="mb-0">
                            <AdminInput value={witnessTwo} onChange={(e) => setWitnessTwo(e.target.value)} required />
                          </AdminField>
                        </div>
                      </>
                    )}

                    {effectiveLinkedCategory === "Death" && (
                      <div className="grid grid-cols-2 gap-2.5">
                        <AdminField label="Date of burial" className="mb-0">
                          <AdminInput
                            type="date"
                            value={burialDate}
                            min={date || baptismal.dateOfBaptism}
                            max={todayIsoDate()}
                            onChange={(e) => setBurialDate(e.target.value)}
                            required
                          />
                        </AdminField>
                        <AdminField label="Place of burial" className="mb-0">
                          <AdminInput
                            value={burialPlace}
                            onChange={(e) => setBurialPlace(e.target.value)}
                            placeholder="Cemetery / niche"
                            required
                          />
                        </AdminField>
                      </div>
                    )}

                    {effectiveLinkedCategory === "Confirmation" && !baptismal.middleName?.trim() && (
                      <AdminField label="Middle name" className="mb-0">
                        <AdminInput
                          value={createMiddle}
                          onChange={(e) => setCreateMiddle(e.target.value)}
                          required
                        />
                      </AdminField>
                    )}

                    {(effectiveLinkedCategory === "Confirmation" || effectiveLinkedCategory === "Marriage") && (
                      <AdminField
                        label={
                          effectiveLinkedCategory === "Confirmation" ? "Place of confirmation" : "Place of marriage"
                        }
                        className="mb-0"
                      >
                        <AdminInput value={createPlace} onChange={(e) => setCreatePlace(e.target.value)} required />
                      </AdminField>
                    )}

                    <AdminField label="Minister" className="mb-0">
                      <AdminInput
                        value={createMinister}
                        onChange={(e) => setCreateMinister(e.target.value)}
                        placeholder="Rev. Fr."
                        required
                      />
                    </AdminField>

                    <div className="grid grid-cols-3 gap-2.5">
                      <AdminField label="Book" className="mb-0">
                        <AdminInput value={createBook} onChange={(e) => setCreateBook(e.target.value)} required />
                      </AdminField>
                      <AdminField label="Page" className="mb-0">
                        <AdminInput value={createPage} onChange={(e) => setCreatePage(e.target.value)} required />
                      </AdminField>
                      <AdminField label="Entry / line" className="mb-0">
                        <AdminInput value={createEntry} onChange={(e) => setCreateEntry(e.target.value)} required />
                      </AdminField>
                    </div>

                    {effectiveLinkedCategory === "Confirmation" && (
                      <div className="flex flex-wrap gap-4">
                        <label className="flex cursor-pointer items-center gap-2 text-admin-support text-admin-ink">
                          <input
                            type="checkbox"
                            checked={isAdult}
                            onChange={(e) => setIsAdult(e.target.checked)}
                            className="h-4 w-4 rounded border-admin-border-strong accent-admin-green-700"
                          />
                          Adult confirmation
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 text-admin-support text-admin-ink">
                          <input
                            type="checkbox"
                            checked={isPriorMarriage}
                            onChange={(e) => setIsPriorMarriage(e.target.checked)}
                            className="h-4 w-4 rounded border-admin-border-strong accent-admin-green-700"
                          />
                          Prior marriage on record
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {error && (
          <p role="alert" className="px-5 pb-2 text-[0.875rem] text-admin-red-700">
            {error}
          </p>
        )}
        <AdminDialogFooter>
          <AdminButton variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" disabled={!canSave}>
            {submitting
              ? "Saving…"
              : creating
                ? "Save annotation & record"
                : "Save annotation"}
          </AdminButton>
        </AdminDialogFooter>
      </form>
    </AdminDialog>
  );
}

function SearchLinkPanel({
  searchQuery,
  setSearchQuery,
  searching,
  hits,
  selectedHitId,
  onSelect,
  linkedBook,
  linkedPage,
  linkedLine,
  onClear,
  categoryLabel,
}: {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  searching: boolean;
  hits: RegisterHit[];
  selectedHitId: string | null;
  onSelect: (hit: RegisterHit) => void;
  linkedBook: string;
  linkedPage: string;
  linkedLine: string;
  onClear: () => void;
  categoryLabel: string;
}) {
  return (
    <div className="space-y-2.5">
      <AdminField label="Search by name" className="mb-0">
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="pointer-events-none absolute left-[11px] top-1/2 z-10 h-[15px] w-[15px] -translate-y-1/2 text-admin-ink-faint"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <AdminInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${categoryLabel} records…`}
            className="pl-[34px]"
            aria-label="Search register records"
          />
        </div>
      </AdminField>

      {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
        <p className="text-admin-support text-admin-ink-muted">Type at least 2 characters to search.</p>
      )}
      {searching && <p className="text-admin-support text-admin-ink-muted">Searching…</p>}
      {!searching && searchQuery.trim().length >= 2 && hits.length === 0 && (
        <p className="text-admin-support text-admin-ink-muted">
          No matching records. Try another name, enter manually, or add a new record.
        </p>
      )}

      {hits.length > 0 && (
        <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border border-admin-border bg-admin-surface p-1.5">
          {hits.map((hit) => {
            const selected = selectedHitId === hit.id;
            return (
              <li key={hit.id}>
                <button
                  type="button"
                  onClick={() => onSelect(hit)}
                  className={`w-full rounded-md px-3 py-2.5 text-left transition ${
                    selected ? "bg-admin-green-050 ring-1 ring-admin-green-700/40" : "hover:bg-admin-surface-alt"
                  }`}
                >
                  <span className="block text-admin-body font-semibold text-admin-ink">{hit.title}</span>
                  <span className="mt-0.5 block text-admin-support text-admin-ink-muted">{hit.subtitle}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {(linkedBook || linkedPage || linkedLine) && (
        <div className="rounded-md border border-admin-green-700/25 bg-admin-green-050 px-3 py-2.5">
          <p className="text-admin-support font-semibold text-admin-green-800">
            Linked to Book {linkedBook}, Page {linkedPage}
            {linkedLine ? `, Line ${linkedLine}` : ""}
          </p>
          <button
            type="button"
            onClick={onClear}
            className="mt-1 text-admin-support font-semibold text-admin-green-700 hover:underline"
          >
            Clear link
          </button>
        </div>
      )}
    </div>
  );
}

function isRecordUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function searchRegisterEntries(
  parishId: string,
  category: LinkableAnnotationCategory,
  query: string
): Promise<RegisterHit[]> {
  const q = query.trim().toLowerCase();

  if (category === "Confirmation") {
    const records = await listConfirmationRecords(parishId);
    return filterConfirmationRecords(records, { ...emptyConfirmationSearchCriteria(), name: query })
      .slice(0, 8)
      .map((r) => ({
        id: r.id,
        title: confirmationFullName(r),
        subtitle: `${confirmationRecordRef(r)} · Confirmed ${formatConfirmationDate(r.dateOfConfirmation)}`,
        book: r.bookNumber,
        page: r.pageNumber,
        line: r.entryNumber,
      }));
  }

  if (category === "Death") {
    const records = await listDeathRecords(parishId);
    return filterDeathRecords(records, { ...emptyDeathSearchCriteria(), name: query })
      .slice(0, 8)
      .map((r) => ({
        id: r.id,
        title: deathFullName(r),
        subtitle: `${deathRecordRef(r)} · Died ${formatDeathDate(r.dateOfDeath)}`,
        book: r.bookNumber,
        page: r.pageNumber,
        line: r.entryNumber,
      }));
  }

  const records = await listMarriageRecords(parishId);
  return records
    .filter((r) => {
      if (!q) return true;
      return groomFullName(r).toLowerCase().includes(q) || brideFullName(r).toLowerCase().includes(q);
    })
    .slice(0, 8)
    .map((r) => ({
      id: r.id,
      title: `${groomFullName(r)} & ${brideFullName(r)}`,
      subtitle: `${marriageRecordRef(r)} · ${formatRecordDate(r.dateOfMarriage)}`,
      book: r.bookNumber,
      page: r.pageNumber,
      line: r.entryNumber,
    }));
}
