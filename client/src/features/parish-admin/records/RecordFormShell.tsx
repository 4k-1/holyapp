import { useId, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AdminButton, AdminNotchedLabels } from "@/features/parish-admin/components/AdminForm";

/**
 * Page frame for adding or editing a register entry: one white sheet read top to bottom, made of
 * RecordSections. The title and Cancel / Confirm share one bar that stays at the top, so the record
 * can be saved from anywhere on the form, and every field carries its label on its top border.
 */
export function RecordFormShell({
  title,
  subtitle,
  notice,
  submitting,
  submitLabel,
  onSubmit,
  children,
}: {
  title: string;
  subtitle: string;
  /** Shown between the header and the form, e.g. where the entry was linked from. */
  notice?: ReactNode;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (e: FormEvent) => void;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const formId = useId();

  return (
    <div className="@container mx-auto w-full max-w-[960px]">
      <div className="sticky -top-4 z-10 -mt-4 mb-3 flex flex-wrap items-center gap-x-4 gap-y-2.5 border-b border-admin-border bg-admin-bg/95 pb-2.5 pt-4 backdrop-blur sm:-top-6 sm:-mt-6 sm:pt-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-admin-border bg-admin-surface text-admin-ink-muted hover:text-admin-green-700"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="min-w-0 flex-1 basis-[15rem]">
          <h1 className="text-[1.25rem] font-semibold leading-tight text-admin-ink">{title}</h1>
          <p className="text-admin-support text-admin-ink-muted max-sm:hidden">{subtitle}</p>
        </div>
        <div className="flex shrink-0 gap-2.5 whitespace-nowrap max-sm:w-full max-sm:[&>*]:flex-1">
          <AdminButton variant="secondary" type="button" onClick={() => navigate(-1)}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" form={formId} disabled={submitting}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3.5 w-3.5">
              <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {submitting ? "Saving…" : submitLabel}
          </AdminButton>
        </div>
      </div>

      {notice}

      <AdminNotchedLabels>
        <form
          id={formId}
          onSubmit={onSubmit}
          className="rounded-2xl border border-admin-border bg-admin-surface px-5 shadow-[0_1px_2px_rgb(14_59_70/0.04)] sm:px-8"
        >
          {children}
        </form>
      </AdminNotchedLabels>
    </div>
  );
}

/**
 * One section of a "sheet" record form: title and a short note on the left, fields on the right.
 * The fields sit on a six-column grid shared by every section, so their edges line up all the way
 * down; give each AdminField a column span that suits what goes in it. Narrow screens stack the
 * title above the fields.
 */
export function RecordSection({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="grid gap-x-10 gap-y-4 border-t border-admin-border py-7 first:border-t-0 @min-[44rem]:grid-cols-[11rem_1fr]">
      <div>
        <h2 className="font-sans text-[0.9375rem] font-semibold leading-snug text-admin-ink">{title}</h2>
        {note && <p className="mt-1 text-admin-support leading-snug text-admin-ink-muted">{note}</p>}
      </div>
      <div className="grid grid-cols-6 content-start gap-x-3 gap-y-5 pt-1.5">{children}</div>
    </section>
  );
}
