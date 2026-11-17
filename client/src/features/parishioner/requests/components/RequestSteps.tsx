import { useRef, useState, type ReactNode } from "react";
import {
  ChoiceCard,
  ChoiceGroup,
  DateField,
  FieldError,
  GroupHeading,
  PillChoice,
  SelectField,
  TextField,
} from "@/features/parishioner/requests/components/RequestFormUI";
import {
  DOCUMENT_ACCEPT,
  documentProblem,
  formatFileSize,
  MAX_DOCUMENTS,
} from "@/features/parishioner/requests/documents/requestDocumentsApi";
import {
  DELIVERY_OPTIONS,
  formatDay,
  purposesFor,
  RECORD_GROUPS,
  recordValues,
  RELATIONSHIPS,
  SACRAMENT_OPTIONS,
  sacramentLabel,
  type FieldGroup,
  type RequestDraft,
  type StepId,
} from "@/features/parishioner/requests/requestFormConfig";
import type { SacramentType } from "@/types";

interface StepProps {
  draft: RequestDraft;
  /** Errors to show now: after a Continue attempt, or once the field has been left. */
  errors: Record<string, string>;
}

/* ---------- 1 · Certificate ---------- */

export function CertificateStep({ draft, errors, onChoose }: StepProps & { onChoose: (type: SacramentType) => void }) {
  return (
    <ChoiceGroup
      id="req-sacramentType"
      legend="Certificate"
      error={errors.sacramentType}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {SACRAMENT_OPTIONS.map(({ type, label, description, Icon }) => (
        <ChoiceCard
          key={type}
          selected={draft.sacramentType === type}
          onSelect={() => onChoose(type)}
          title={`${label} certificate`}
          description={description}
          icon={<Icon className="h-5 w-5" />}
          invalid={Boolean(errors.sacramentType)}
        />
      ))}
    </ChoiceGroup>
  );
}

/* ---------- 2 · Whose record ---------- */

export function WhoStep({
  draft,
  errors,
  onChooseWho,
  onRelationship,
  onTouch,
}: StepProps & {
  onChooseWho: (who: "me" | "other") => void;
  onRelationship: (value: string) => void;
  onTouch: (key: string) => void;
}) {
  const death = draft.sacramentType === "death";
  const relationship = (
    <SelectField
      id="req-relationship"
      label={death ? "Your relationship to the person who died" : "Your relationship to them"}
      placeholder="Choose one"
      options={RELATIONSHIPS}
      value={draft.relationship}
      onChange={(e) => onRelationship(e.target.value)}
      onBlur={() => onTouch("relationship")}
      error={errors.relationship}
      className="max-w-sm"
    />
  );

  if (death) return relationship;

  return (
    <div className="space-y-6">
      <ChoiceGroup id="req-forWhom" legend="Who is this certificate for?" error={errors.forWhom} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ChoiceCard
          selected={draft.forWhom === "me"}
          onSelect={() => onChooseWho("me")}
          title="Me"
          description="The record is in my name. We'll fill in what we know from your account."
          invalid={Boolean(errors.forWhom)}
        />
        <ChoiceCard
          selected={draft.forWhom === "other"}
          onSelect={() => onChooseWho("other")}
          title="Someone else"
          description="A family member or someone I'm requesting for."
          invalid={Boolean(errors.forWhom)}
        />
      </ChoiceGroup>
      {draft.forWhom === "other" && relationship}
    </div>
  );
}

/* ---------- 3 · Record details ---------- */

export function RecordStep({
  draft,
  errors,
  onField,
  onTouch,
  onDocuments,
}: StepProps & {
  onField: (key: string, value: string) => void;
  onTouch: (key: string) => void;
  onDocuments: (documents: File[]) => void;
}) {
  if (!draft.sacramentType) return null;
  const values = recordValues(draft);

  return (
    <div className="space-y-8">
      {RECORD_GROUPS[draft.sacramentType].map((group) =>
        group.optional ? (
          <OptionalGroup key={group.title} group={group} startOpen={groupHasValues(group, values)}>
            <GroupFields group={group} values={values} errors={errors} onField={onField} onTouch={onTouch} />
          </OptionalGroup>
        ) : (
          <section key={group.title}>
            <GroupHeading title={group.title} hint={group.hint} />
            <GroupFields group={group} values={values} errors={errors} onField={onField} onTouch={onTouch} />
          </section>
        )
      )}
      <Documents documents={draft.documents} onChange={onDocuments} />
    </div>
  );
}

function groupHasValues(group: FieldGroup, values: Record<string, string>) {
  return group.rows.flat().some((field) => (values[field.key] ?? "").trim());
}

function GroupFields({
  group,
  values,
  errors,
  onField,
  onTouch,
}: {
  group: FieldGroup;
  values: Record<string, string>;
  errors: Record<string, string>;
  onField: (key: string, value: string) => void;
  onTouch: (key: string) => void;
}) {
  return (
    <div className="space-y-4">
      {group.rows.map((row, i) => (
        <div key={i} className={`grid grid-cols-1 gap-4 ${row.length === 3 ? "sm:grid-cols-3" : row.length === 2 ? "sm:grid-cols-2" : "sm:max-w-sm"}`}>
          {row.map((field) =>
            field.type === "date" ? (
              <DateField
                key={field.key}
                id={`req-${field.key}`}
                label={field.label}
                optional={field.optional}
                hint={field.hint}
                value={values[field.key] ?? ""}
                onChange={(value) => onField(field.key, value)}
                onBlur={() => onTouch(field.key)}
                error={errors[field.key]}
              />
            ) : (
            <TextField
              key={field.key}
              id={`req-${field.key}`}
              label={field.label}
              optional={field.optional}
              hint={field.hint}
              autoComplete={field.autoComplete ?? "off"}
              value={values[field.key] ?? ""}
              onChange={(e) => onField(field.key, e.target.value)}
              onBlur={() => onTouch(field.key)}
              error={errors[field.key]}
            />
            )
          )}
        </div>
      ))}
    </div>
  );
}

/** Optional details that only help staff find the record start folded away. */
function OptionalGroup({ group, startOpen, children }: { group: FieldGroup; startOpen: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <section className="rounded-2xl border border-border bg-surface-alt/50">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25 sm:px-5"
      >
        <span>
          <span className="block text-[0.9375rem] font-semibold text-ink">
            {open ? group.title : `Add ${group.title.toLowerCase()}`}
            <span className="ml-1.5 font-normal text-ink-muted">(optional)</span>
          </span>
          {group.hint && <span className="mt-0.5 block text-[0.8125rem] text-ink-muted">{group.hint}</span>}
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-4 w-4 shrink-0 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="border-t border-border px-4 pb-5 pt-4 sm:px-5">{children}</div>}
    </section>
  );
}

function Documents({ documents, onChange }: { documents: File[]; onChange: (documents: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const full = documents.length >= MAX_DOCUMENTS;

  function add(chosen: File[]) {
    const problems: string[] = [];
    const next = [...documents];
    for (const file of chosen) {
      const issue = documentProblem(file);
      if (issue) problems.push(issue);
      else if (next.length >= MAX_DOCUMENTS) problems.push(`You can attach up to ${MAX_DOCUMENTS} photos.`);
      else if (!next.some((doc) => doc.name === file.name && doc.size === file.size)) next.push(file);
    }
    setProblem(problems.length ? [...new Set(problems)].join(" ") : null);
    onChange(next);
  }

  return (
    <section>
      <GroupHeading
        title="Supporting documents"
        optional
        hint="A photo of an old certificate or a family record can help staff match the entry faster. JPG or PNG, up to 5 photos."
      />
      {documents.length > 0 && (
        <ul className="mb-3 space-y-2">
          {documents.map((file) => (
            <li
              key={`${file.name}-${file.size}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[0.875rem] text-ink"
            >
              <PaperclipIcon />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="shrink-0 text-[0.8125rem] text-ink-muted">{formatFileSize(file.size)}</span>
              <button
                type="button"
                onClick={() => {
                  setProblem(null);
                  onChange(documents.filter((doc) => doc !== file));
                }}
                className="rounded-md px-2 py-1 text-[0.8125rem] font-semibold text-danger hover:bg-danger/[0.08]"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {!full && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-dashed border-primary/50 bg-primary/[0.04] px-4 text-[0.875rem] font-semibold text-primary hover:bg-primary/[0.08]"
        >
          <span aria-hidden="true">+</span> Add a photo
        </button>
      )}
      <FieldError id="req-documents-error" message={problem ?? undefined} />
      <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-muted">
        Only you and the parish office can see these photos. They are deleted 7 days after your request is finished.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={DOCUMENT_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          add(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </section>
  );
}

/* ---------- 4 · Purpose and delivery ---------- */

export function PurposeStep({
  draft,
  errors,
  onPurpose,
  onPurposeOther,
  onDelivery,
  onTouch,
}: StepProps & {
  onPurpose: (value: string) => void;
  onPurposeOther: (value: string) => void;
  onDelivery: (value: RequestDraft["deliveryMethod"]) => void;
  onTouch: (key: string) => void;
}) {
  return (
    <div className="space-y-8">
      <section>
        <GroupHeading title="What is it for?" />
        <div id="req-purpose" role="radiogroup" aria-label="What is it for?" className="flex flex-wrap gap-2">
          {purposesFor(draft.sacramentType).map((purpose) => (
            <PillChoice key={purpose} selected={draft.purposeChoice === purpose} onSelect={() => onPurpose(purpose)}>
              {purpose}
            </PillChoice>
          ))}
        </div>
        <FieldError id="req-purpose-error" message={errors.purpose} />
        {draft.purposeChoice === "Other" && (
          <TextField
            id="req-purposeOther"
            className="mt-4 max-w-md"
            label="Tell us what it's for"
            maxLength={200}
            value={draft.purposeOther}
            onChange={(e) => onPurposeOther(e.target.value)}
            onBlur={() => onTouch("purposeOther")}
            error={errors.purposeOther}
          />
        )}
      </section>

      <section>
        <GroupHeading title="How would you like to receive it?" />
        <ChoiceGroup
          id="req-deliveryMethod"
          legend="How would you like to receive it?"
          error={errors.deliveryMethod}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {DELIVERY_OPTIONS.map((option) => (
            <ChoiceCard
              key={option.key}
              selected={draft.deliveryMethod === option.key}
              onSelect={() => onDelivery(option.key)}
              title={option.label}
              description={option.description}
              invalid={Boolean(errors.deliveryMethod)}
            />
          ))}
        </ChoiceGroup>
      </section>
    </div>
  );
}

/* ---------- 5 · Review ---------- */

export function ReviewStep({ draft, onChange }: { draft: RequestDraft; onChange: (step: StepId) => void }) {
  if (!draft.sacramentType) return null;
  const values = recordValues(draft);

  const recordRows: [string, string][] = RECORD_GROUPS[draft.sacramentType].flatMap((group) =>
    group.rows
      .flat()
      .filter((field) => (values[field.key] ?? "").trim())
      .map((field): [string, string] => [
        group.reviewAs ? `${field.label} (${group.reviewAs})` : field.label,
        field.type === "date" ? formatDay(values[field.key]) : values[field.key].trim(),
      ])
  );
  if (draft.documents.length) recordRows.push(["Supporting documents", draft.documents.map((file) => file.name).join(", ")]);

  return (
    <div className="space-y-4">
      <SummaryCard title="Certificate" step={1} onChange={onChange} rows={[["Certificate", `${sacramentLabel(draft.sacramentType)} certificate`]]} />
      <SummaryCard
        title="Whose record"
        step={2}
        onChange={onChange}
        rows={[
          draft.forWhom === "me"
            ? ["For", "Me"]
            : ["For", `Someone else${draft.relationship ? ` (${draft.relationship.toLowerCase()})` : ""}`],
        ]}
      />
      <SummaryCard title="Record details" step={3} onChange={onChange} rows={recordRows} />
      <SummaryCard
        title="Purpose & delivery"
        step={4}
        onChange={onChange}
        rows={[
          ["Purpose", draft.purposeChoice === "Other" ? draft.purposeOther.trim() : draft.purposeChoice],
          ["Delivery", DELIVERY_OPTIONS.find((option) => option.key === draft.deliveryMethod)?.label ?? ""],
        ]}
      />
      <div className="flex gap-3 rounded-2xl bg-primary/[0.06] px-4 py-3.5 text-[0.875rem] leading-relaxed text-ink">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-0.5 h-[18px] w-[18px] shrink-0 text-primary" aria-hidden="true">
          <circle cx="10" cy="10" r="7.5" />
          <path d="M10 9v4.5M10 6.5h.01" strokeLinecap="round" />
        </svg>
        <p>
          <span className="font-semibold">What happens next:</span> staff look for the entry in the parish register.
          Once they find it, we'll email you to pay the certificate fee through GCash. There's nothing to pay yet.
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  step,
  rows,
  onChange,
}: {
  title: string;
  step: StepId;
  rows: [string, string][];
  onChange: (step: StepId) => void;
}) {
  return (
    <section className="rounded-2xl border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <h3 className="font-sans text-[0.9375rem] font-semibold text-ink">{title}</h3>
        <button
          type="button"
          onClick={() => onChange(step)}
          className="rounded-md px-2 py-1 text-[0.875rem] font-semibold text-primary hover:bg-primary/[0.08] hover:underline"
        >
          Change<span className="sr-only"> {title.toLowerCase()}</span>
        </button>
      </div>
      <dl className="divide-y divide-border">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-1 gap-0.5 px-4 py-2.5 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)] sm:gap-4 sm:px-5">
            <dt className="text-[0.8125rem] text-ink-muted sm:text-[0.875rem]">{label}</dt>
            <dd className="break-words text-[0.9375rem] text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4 shrink-0 text-primary" aria-hidden="true">
      <path d="m15.5 9.5-5.8 5.8a3.5 3.5 0 0 1-5-5l6.2-6.1a2.3 2.3 0 0 1 3.3 3.3l-6.2 6.1a1.2 1.2 0 0 1-1.6-1.6l5.6-5.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
