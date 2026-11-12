import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { HOLYAPP_CONTACT_EMAIL } from "./contact";

const BEST_TIMES = ["Weekday mornings", "Weekday afternoons", "Saturdays"] as const;
const MESSAGE_MAX = 2000;

interface DemoRequest {
  name: string;
  parish: string;
  contact: string;
  bestTime: string;
  message: string;
}

const looksLikeContact = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || (/^[\d\s()+-]+$/.test(v) && v.replace(/\D/g, "").length >= 10);

/**
 * A few short questions to book a demo, sent straight to HolyApp's inbox by the server. Mounted only while
 * open, so it always starts empty; closing it (Esc, the close button or a click outside) calls onClose.
 */
export function BookDemoDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [form, setForm] = useState<DemoRequest>({ name: "", parish: "", contact: "", bestTime: "", message: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof DemoRequest, string>>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState("");
  /** The hidden field bots fill in; people never see it. */
  const [website, setWebsite] = useState("");

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const set = (key: keyof DemoRequest) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (sending) return;
    const trimmed = {
      ...form,
      name: form.name.trim(),
      parish: form.parish.trim(),
      contact: form.contact.trim(),
      message: form.message.trim(),
    };
    const problems: typeof errors = {};
    if (!trimmed.name) problems.name = "Enter your name.";
    if (!trimmed.parish) problems.parish = "Enter your parish and town.";
    if (!trimmed.contact) problems.contact = "Enter an email or mobile number.";
    else if (!looksLikeContact(trimmed.contact)) problems.contact = "Enter a valid email or a mobile number.";
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;

    setSending(true);
    setFailed("");
    try {
      await apiFetch("/contact", { method: "POST", auth: false, body: { ...trimmed, website } });
      setSent(true);
    } catch (err) {
      setFailed(err instanceof Error && err.message ? err.message : "We couldn't send your request just now.");
    } finally {
      setSending(false);
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="m-auto w-[calc(100%-32px)] max-w-[460px] rounded-[24px] bg-white p-0 text-[var(--l-ink)] shadow-[0_30px_60px_-20px_rgb(14_59_70/0.5)] backdrop:bg-[rgb(14_59_70/0.45)]"
    >
      <div className="relative p-6 sm:p-8">
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full text-[var(--l-muted)] hover:bg-[var(--l-mist)] hover:text-[var(--l-teal-deep)]"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        {sent ? (
          <div className="pr-8">
            <h2 id={titleId} className="landing-display text-[1.5rem] leading-tight">
              Thank you
            </h2>
            <p className="mt-3 text-[1rem] leading-relaxed text-[var(--l-muted)]">
              Your request was sent. We'll get in touch within one working day to set a time.
            </p>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="landing-btn mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full bg-[var(--l-teal-deep)] px-6 text-[1rem] font-semibold text-white hover:bg-[var(--l-teal)]"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <h2 id={titleId} className="landing-display pr-8 text-[1.5rem] leading-tight">
              Book a demo
            </h2>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--l-muted)]">
              Free, about 30 minutes, online or at your parish office.
            </p>

            <div className="mt-5 space-y-4">
              <Field label="Your name" value={form.name} onChange={set("name")} error={errors.name} autoComplete="name" />
              <Field
                label="Parish and town"
                value={form.parish}
                onChange={set("parish")}
                error={errors.parish}
                placeholder="e.g. St. Joseph Parish, Lipa City"
              />
              <Field
                label="Email or mobile number"
                value={form.contact}
                onChange={set("contact")}
                error={errors.contact}
                autoComplete="email"
              />
              <div>
                <label htmlFor={`${titleId}-message`} className="text-[0.9375rem] font-semibold">
                  Message <span className="font-normal text-[var(--l-muted)]">(optional)</span>
                </label>
                <textarea
                  id={`${titleId}-message`}
                  value={form.message}
                  onChange={(e) => set("message")(e.target.value)}
                  maxLength={MESSAGE_MAX}
                  rows={3}
                  placeholder="Questions, or anything we should know about your parish"
                  className="mt-1.5 block w-full resize-y rounded-xl border border-[#cfe0e3] bg-white px-3.5 py-3 text-[1rem] text-[var(--l-ink)] outline-none placeholder:text-[#8aa0a7] focus:border-[var(--l-teal)] focus:ring-2 focus:ring-[var(--l-teal)]/25"
                />
              </div>
              <fieldset>
                <legend className="text-[0.9375rem] font-semibold">
                  Best time to reach you <span className="font-normal text-[var(--l-muted)]">(optional)</span>
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {BEST_TIMES.map((time) => {
                    const on = form.bestTime === time;
                    return (
                      <button
                        key={time}
                        type="button"
                        aria-pressed={on}
                        onClick={() => set("bestTime")(on ? "" : time)}
                        className={`min-h-[44px] rounded-full px-4 text-[0.9375rem] font-semibold ring-1 transition-colors ${
                          on
                            ? "bg-[var(--l-teal-deep)] text-white ring-[var(--l-teal-deep)]"
                            : "bg-white text-[var(--l-teal-deep)] ring-[#cfe6e6] hover:bg-[var(--l-mist)]"
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>

            {/* Hidden from people and screen readers; bots fill it in and their request is dropped. */}
            <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
              <label>
                Website
                <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </label>
            </div>

            {failed && (
              <p role="alert" className="mt-5 rounded-xl bg-red-50 px-3.5 py-3 text-[0.9375rem] leading-relaxed text-red-800">
                {failed} You can also write to{" "}
                <a href={`mailto:${HOLYAPP_CONTACT_EMAIL}`} className="break-all font-semibold underline">
                  {HOLYAPP_CONTACT_EMAIL}
                </a>
                .
              </p>
            )}

            <button
              type="submit"
              disabled={sending}
              className="landing-btn mt-6 inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-[var(--l-teal-deep)] px-7 text-[1rem] font-semibold text-white shadow-[0_10px_24px_-10px_rgb(14_59_70/0.7)] hover:bg-[var(--l-teal)] disabled:opacity-70"
            >
              {sending ? "Sending…" : "Send request"}
            </button>
          </form>
        )}
      </div>
    </dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-[0.9375rem] font-semibold">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`mt-1.5 block min-h-[48px] w-full rounded-xl border bg-white px-3.5 text-[1rem] text-[var(--l-ink)] outline-none placeholder:text-[#8aa0a7] focus:border-[var(--l-teal)] focus:ring-2 focus:ring-[var(--l-teal)]/25 ${
          error ? "border-red-600" : "border-[#cfe0e3]"
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-[0.875rem] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
