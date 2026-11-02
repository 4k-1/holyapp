import { useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/features/auth/api/authApi";
import { submitRequest } from "@/features/parishioner/requests/api/requestsApi";
import { ConfirmationStep } from "@/features/parishioner/requests/components/ConfirmationStep";
import {
  CertificateStep,
  PurposeStep,
  RecordStep,
  ReviewStep,
  WhoStep,
} from "@/features/parishioner/requests/components/RequestSteps";
import { WizardStepTrack } from "@/features/parishioner/requests/components/WizardStepTrack";
import {
  EMPTY_DRAFT,
  prefillFromAccount,
  SACRAMENT_DATE_KEY,
  STEPS,
  stepErrors,
  toRequestForm,
  type RequestDraft,
  type StepId,
} from "@/features/parishioner/requests/requestFormConfig";
import type { Parish, SacramentType } from "@/types";

const FORM_STEPS: StepId[] = [1, 2, 3, 4];

/** Fill only the fields the parishioner hasn't typed in yet. */
function fillEmpty(fields: Record<string, string>, extra: Record<string, string>) {
  const next = { ...fields };
  for (const [key, value] of Object.entries(extra)) if (value && !next[key]?.trim()) next[key] = value;
  return next;
}

/**
 * Request a certificate in five short steps: which certificate, whose record, the record's details, purpose and
 * delivery, then a check of every answer before anything is sent.
 */
export function NewRequestWizard() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const navigate = useNavigate();
  const [user] = useState(() => getCurrentUser());
  const [step, setStep] = useState<StepId>(1);
  const [draft, setDraft] = useState<RequestDraft>(EMPTY_DRAFT);
  const [attempted, setAttempted] = useState<Set<StepId>>(() => new Set());
  const [touched, setTouched] = useState<Set<string>>(() => new Set());
  const [returnToReview, setReturnToReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const meta = STEPS[step - 1];
  const errors = step === 5 ? {} : stepErrors(step, draft);
  const shown = Object.fromEntries(
    Object.entries(errors).filter(([key]) => attempted.has(step) || touched.has(key))
  );

  function goTo(next: StepId) {
    setStep(next);
    setError(null);
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  }

  /** Mark a step as tried, so its errors show, and put the cursor on the first problem. */
  function flag(target: StepId, targetErrors: Record<string, string>) {
    setAttempted((prev) => new Set(prev).add(target));
    const first = Object.keys(targetErrors)[0];
    requestAnimationFrame(() => {
      const el = document.getElementById(`req-${first}`);
      const focusable = el?.matches("input, select, button") ? el : el?.querySelector<HTMLElement>("button, input, select");
      focusable?.focus();
    });
  }

  function firstUnfinished() {
    return FORM_STEPS.find((id) => Object.keys(stepErrors(id, draft)).length > 0);
  }

  function handleContinue() {
    if (Object.keys(errors).length) {
      flag(step, errors);
      return;
    }
    if (returnToReview) {
      const pending = firstUnfinished();
      if (!pending) setReturnToReview(false);
      goTo(pending ?? 5);
      return;
    }
    goTo((step + 1) as StepId);
  }

  async function handleSubmit() {
    const pending = firstUnfinished();
    if (pending) {
      goTo(pending);
      flag(pending, stepErrors(pending, draft));
      return;
    }
    const requesterId = user?.id;
    if (!requesterId) {
      setError("Your session has ended. Sign in again to send this request.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitRequest(toRequestForm(draft), parish.id, requesterId);
      setSubmitted(true);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send this request. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function chooseSacrament(type: SacramentType) {
    setDraft((d) => {
      if (d.sacramentType === type) return d;
      const forWhom = type === "death" && d.forWhom === "me" ? null : d.forWhom;
      return {
        ...d,
        sacramentType: type,
        forWhom,
        relationship: forWhom === "me" ? "" : d.relationship,
        // The record's fields differ by sacrament, so a new choice starts them over.
        fields: forWhom === "me" ? prefillFromAccount(type, user) : {},
        sacramentDate: "",
      };
    });
  }

  function chooseWho(who: "me" | "other") {
    setDraft((d) => ({
      ...d,
      forWhom: who,
      relationship: who === "me" ? "" : d.relationship,
      fields: who === "me" && d.sacramentType ? fillEmpty(d.fields, prefillFromAccount(d.sacramentType, user)) : d.fields,
    }));
  }

  function setField(key: string, value: string) {
    setDraft((d) => (key === SACRAMENT_DATE_KEY ? { ...d, sacramentDate: value } : { ...d, fields: { ...d.fields, [key]: value } }));
  }

  function touch(key: string) {
    setTouched((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }

  const errorCount = attempted.has(step) ? Object.keys(errors).length : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-serif text-[1.75rem] leading-tight text-ink sm:text-[2rem]">Request a Certificate</h1>
      <p className="mb-6 mt-1.5 text-[0.9375rem] text-ink-muted">
        From {parish.name}. It takes about three minutes, and there's nothing to pay until staff find your record.
      </p>

      {!submitted && <WizardStepTrack current={step} onJump={(target) => { setReturnToReview(false); goTo(target); }} />}

      <div className="rounded-[20px] border border-border bg-surface shadow-[var(--shadow-card)]">
        {submitted ? (
          <div className="px-5 py-8 sm:px-8">
            <ConfirmationStep />
            <div className="mt-8 flex flex-col-reverse justify-center gap-3 sm:flex-row">
              <Button variant="ghost" size="lg" onClick={() => navigate(`/${parish.slug}/portal`)}>
                Back to dashboard
              </Button>
              <Button size="lg" onClick={() => navigate(`/${parish.slug}/portal/requests`)}>
                View my requests
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-5 pt-6 sm:px-8 sm:pt-8">
              <h2 ref={headingRef} tabIndex={-1} className="font-serif text-[1.5rem] leading-tight text-ink outline-none sm:text-[1.75rem]">
                {meta.title}
              </h2>
              <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-muted">{meta.hint}</p>

              {errorCount > 0 && (
                <div role="alert" className="mt-5 rounded-xl border border-danger/30 bg-danger/[0.06] px-4 py-3 text-[0.875rem] text-danger">
                  {errorCount === 1 ? "One answer needs your attention." : `${errorCount} answers need your attention.`} They're
                  marked below.
                </div>
              )}

              <div className="mt-6">
                {step === 1 && <CertificateStep draft={draft} errors={shown} onChoose={chooseSacrament} />}
                {step === 2 && (
                  <WhoStep
                    draft={draft}
                    errors={shown}
                    onChooseWho={chooseWho}
                    onRelationship={(relationship) => setDraft((d) => ({ ...d, relationship }))}
                    onTouch={touch}
                  />
                )}
                {step === 3 && (
                  <RecordStep
                    draft={draft}
                    errors={shown}
                    onField={setField}
                    onTouch={touch}
                    onDocuments={(documents) => setDraft((d) => ({ ...d, documents }))}
                  />
                )}
                {step === 4 && (
                  <PurposeStep
                    draft={draft}
                    errors={shown}
                    onPurpose={(purposeChoice) => setDraft((d) => ({ ...d, purposeChoice }))}
                    onPurposeOther={(purposeOther) => setDraft((d) => ({ ...d, purposeOther }))}
                    onDelivery={(deliveryMethod) => setDraft((d) => ({ ...d, deliveryMethod }))}
                    onTouch={touch}
                  />
                )}
                {step === 5 && (
                  <ReviewStep
                    draft={draft}
                    onChange={(target) => {
                      setReturnToReview(true);
                      goTo(target);
                    }}
                  />
                )}
              </div>

              {error && (
                <p role="alert" className="mt-5 rounded-xl border border-danger/30 bg-danger/[0.06] px-4 py-3 text-[0.875rem] text-danger">
                  {error}
                </p>
              )}
            </div>

            <div className="sticky bottom-0 mt-8 flex items-center justify-between gap-3 rounded-b-[20px] border-t border-border bg-surface px-5 py-4 sm:static sm:px-8">
              {step > 1 ? (
                <Button variant="ghost" size="lg" onClick={() => goTo((step - 1) as StepId)}>
                  ← Back
                </Button>
              ) : (
                <Button variant="ghost" size="lg" onClick={() => navigate(`/${parish.slug}/portal/requests`)}>
                  Cancel
                </Button>
              )}
              {step === 5 ? (
                <Button size="lg" className="min-w-[160px]" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Sending…" : "Submit request"}
                </Button>
              ) : (
                <Button size="lg" className="min-w-[140px]" onClick={handleContinue}>
                  {returnToReview ? "Save and review" : "Continue"}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
