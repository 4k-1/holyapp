import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router } from "@/app/router";
import { getCurrentUser } from "@/features/auth/api/authApi";
import { ApiError } from "@/lib/api";
import type { CurrentUser } from "@/types";
import { buildSteps, signInStep, STEP_ORDER, type GuideStep } from "./guideSteps";
import {
  getGuideStatus,
  getMyGuide,
  getTesterSignIn,
  LOCAL_EVENT,
  readLocalTester,
  saveStep,
  writeLocalTester,
  type GuideState,
  type LocalTester,
  type StepKey,
  type StepRating,
  type StepStatus,
  type TesterSignIn,
} from "./testGuideApi";

/**
 * UAT only: the test guide panel. It gives the tester one task at a time as a short scenario (a goal, not
 * where to click), with a hint for when they get stuck. When HolyApp sees a task done it shows "Task
 * complete" with the time it took and asks how easy it was, then moves to the next task. It ends with a
 * link to the feedback form.
 * It shows nothing unless the server runs with UAT_MODE=on and the person is one of the ready-made testers.
 * It sits outside the router (beside the notices), so it follows the tester across every page.
 */

const POLL_MS = 8000;
// From this width the open guide sits beside the page instead of over it (Tailwind's xl).
const DOCK_MIN_WIDTH = 1280;
const DOCK_WIDTH = 360;
// Below Tailwind's sm the open guide is a sheet over the bottom half of the screen.
const PHONE_MAX_WIDTH = 639;
const PHONE_SHEET_HEIGHT = "50vh";
const OPEN_KEY = "holyapp-test-guide-open";

function currentPath() {
  const { pathname, search } = router.state.location;
  return pathname + search;
}

function readOpen() {
  try {
    return localStorage.getItem(OPEN_KEY) !== "0";
  } catch {
    return true;
  }
}

type Row = { key: StepKey; status: StepStatus; waiting: boolean };

export function TestGuide() {
  const [enabled, setEnabled] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(() => getCurrentUser());
  const [path, setPath] = useState(currentPath);
  const [state, setState] = useState<GuideState | null>(null);
  const [local, setLocal] = useState<LocalTester | null>(() => readLocalTester());
  const [signIn, setSignIn] = useState<TesterSignIn | null>(null);
  const [open, setOpenState] = useState(readOpen);
  const [focus, setFocus] = useState<StepKey | null>(null);
  // Tasks HolyApp just saw done, waiting for their "Task complete" screen, oldest first.
  const [completed, setCompleted] = useState<StepKey[]>([]);
  const [hintShown, setHintShown] = useState<StepKey | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [finished, setFinished] = useState(false);
  const lastStep = useRef<StepKey | null>(null);
  const startedSent = useRef<Set<StepKey>>(new Set());

  const remember = useCallback((next: LocalTester | null) => {
    writeLocalTester(next);
  }, []);

  function setOpen(value: boolean) {
    setOpenState(value);
    try {
      localStorage.setItem(OPEN_KEY, value ? "1" : "0");
    } catch {
      // Not remembered in private windows; the panel just opens again next time.
    }
  }

  // Is UAT mode on at all?
  useEffect(() => {
    getGuideStatus()
      .then((s) => setEnabled(s.enabled))
      .catch(() => setEnabled(false));
  }, []);

  // Follow the page and the signed-in person.
  useEffect(() => router.subscribe(() => setPath(currentPath())), []);
  useEffect(() => {
    const onUser = () => {
      const next = getCurrentUser();
      // Logging out at the last step leads to the final check.
      if (!next && lastStep.current === "logout") {
        const saved = readLocalTester();
        if (saved) {
          writeLocalTester({ ...saved, loggedOut: true });
        }
      }
      setUser(next);
    };
    const onLocal = () => setLocal(readLocalTester());
    window.addEventListener(LOCAL_EVENT, onLocal);
    window.addEventListener("holyapp-user-updated", onUser);
    window.addEventListener("storage", onUser);
    return () => {
      window.removeEventListener(LOCAL_EVENT, onLocal);
      window.removeEventListener("holyapp-user-updated", onUser);
      window.removeEventListener("storage", onUser);
    };
  }, []);

  const isParishioner = user?.role === "parishioner";

  // Load the tester's progress while signed in, and keep it fresh so office actions show up.
  const apply = useCallback(
    (next: GuideState) => {
      // Each task HolyApp sees done gets one "Task complete" screen, even after a reload (e.g. back from GCash).
      const seen = readLocalTester();
      const acknowledged = seen && seen.n === next.tester.n ? (seen.acknowledged ?? []) : [];
      const newlyDone = next.steps.filter((s) => s.status === "done" && !s.rating && !acknowledged.includes(s.key));
      if (newlyDone.length) {
        setCompleted((queue) => [...queue, ...newlyDone.map((s) => s.key).filter((k) => !queue.includes(k))]);
        setOpenState(true);
      }
      setState(next);
      remember({
        ...(seen && seen.n === next.tester.n ? seen : {}),
        n: next.tester.n,
        parishSlug: next.tester.parishSlug,
        surveyUrl: next.surveyUrl,
        loggedOut: false,
      });
    },
    [remember]
  );

  const load = useCallback(
    () =>
      getMyGuide().then(apply, (err) => {
        // Signed in, but not as one of the ready-made testers.
        if (err instanceof ApiError && err.status === 404) setState(null);
      }),
    [apply]
  );

  useEffect(() => {
    if (!enabled || !isParishioner) return;
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [enabled, isParishioner, user?.id, load]);

  useEffect(() => {
    if (enabled && isParishioner) void load();
  }, [path, enabled, isParishioner, load]);

  // Before sign-in: the tester's email and password for step 1.
  useEffect(() => {
    if (!enabled || user || !local || local.loggedOut) return;
    getTesterSignIn(local.n)
      .then(setSignIn)
      .catch(() => setSignIn(null));
  }, [enabled, user, local]);

  const mark = useCallback(
    async (key: StepKey, body: { status?: StepStatus; rating?: StepRating; hint?: true; started?: true }) => {
      try {
        await saveStep(key, body);
      } finally {
        void load();
      }
    },
    [load]
  );

  // Steps only the app can see: pages visited.
  useEffect(() => {
    if (!state || !local) return;
    const status = (key: StepKey) => state.steps.find((s) => s.key === key)?.status;
    const pathname = path.split("?")[0];
    const portal = `/${state.tester.parishSlug}/portal/`;

    if (status("records") !== "done") {
      const page = pathname === `${portal}timeline` ? "timeline" : pathname === `${portal}marriage` ? "marriage" : null;
      const saved = readLocalTester();
      if (page && saved && !(saved.visited ?? []).includes(page)) {
        const visited = [...(saved.visited ?? []), page];
        writeLocalTester({ ...saved, visited });
        if (visited.includes("timeline") && visited.includes("marriage")) void mark("records", { status: "done" });
      }
    }
    const hash = state.request?.certificateHash;
    if (status("certificate") !== "done" && hash && pathname === `/verify/${hash}`) {
      void mark("certificate", { status: "done" });
    }
    if (status("office") !== "done" && pathname === "/unauthorized" && /\/admin/.test(decodeURIComponent(path))) {
      void mark("office", { status: "done" });
    }
  }, [path, state, local, mark]);

  // Only a signed-in parishioner's progress counts; anything older is ignored.
  const guide = enabled && isParishioner && state && state.tester.email === user?.email ? state : null;
  const steps = useMemo(() => (guide ? buildSteps(guide) : null), [guide]);

  const rows: Row[] = useMemo(() => {
    if (!guide || !steps) return [];
    const byKey = Object.fromEntries(guide.steps.map((s) => [s.key, s.status]));
    // A request the office turned down doesn't count: the tester sends a new one.
    if (guide.request?.status === "rejected") byKey.request = null;
    // Paying and checking the certificate need the request (and paying): if the tester skipped those, they
    // can't be done either.
    if (!guide.request && byKey.request === "skipped") byKey.pay ??= "skipped";
    if (!guide.request?.paid && byKey.pay === "skipped") byKey.certificate ??= "skipped";
    const others = STEP_ORDER.filter((k) => k !== "logout");
    const othersResolved = others.every((k) => byKey[k] === "done" || byKey[k] === "skipped");
    return STEP_ORDER.map((key) => ({
      key,
      status: (byKey[key] ?? null) as StepStatus,
      waiting: key === "logout" ? !othersResolved : Boolean(steps[key].waiting),
    }));
  }, [guide, steps]);

  const current: Row | null = useMemo(() => {
    if (!rows.length) return null;
    const focused = focus ? rows.find((r) => r.key === focus && r.status !== "done") : undefined;
    return (
      focused ??
      rows.find((r) => !r.status && !r.waiting) ??
      rows.find((r) => !r.status && r.key !== "logout") ??
      rows.find((r) => !r.status) ??
      null
    );
  }, [rows, focus]);

  useEffect(() => {
    lastStep.current = current?.key ?? null;
  }, [current]);

  // Note when the guide first shows a task, for the task's time.
  const showing = guide && current && !current.waiting && completed.length === 0 ? current.key : null;
  const alreadyStarted = showing ? guide?.steps.find((s) => s.key === showing)?.started : true;
  useEffect(() => {
    if (!showing || alreadyStarted || showing === "signin" || startedSent.current.has(showing)) return;
    startedSent.current.add(showing);
    void saveStep(showing, { started: true }).catch(() => startedSent.current.delete(showing));
  }, [showing, alreadyStarted]);

  if (!enabled) return null;
  const pathname = path.split("?")[0];
  if (pathname === "/test") return null;
  // Office and platform accounts never see the guide.
  if (user && !isParishioner) return null;

  // ---------- signed out ----------
  if (!user) {
    if (!local) return null;
    if (local.loggedOut) {
      return (
        <Shell open={open} setOpen={setOpen} label="Last check" n={local.n}>
          {finished ? (
            <div className="space-y-3">
              <h2 className="font-serif text-xl font-bold text-ink">Thank you for testing HolyApp</h2>
              <p className="text-sm text-ink-muted">You may now close this page.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-primary">Task complete</p>
              <h2 className="font-serif text-xl font-bold text-ink">One last check</h2>
              <p className="text-sm text-ink">
                Press your browser&apos;s Back button once. You should stay logged out: your account pages shouldn&apos;t open
                again.
              </p>
              <p className="text-sm text-ink">That was the last task. Please tell us how it went.</p>
              {local.surveyUrl ? (
                <a
                  href={local.surveyUrl}
                  onClick={() => setFinished(true)}
                  className="flex w-full items-center justify-center rounded-[10px] bg-primary px-5 py-3 text-base font-medium text-white hover:opacity-90"
                >
                  Give feedback
                </a>
              ) : (
                <p className="rounded-xl bg-surface-alt px-4 py-3 text-sm text-ink">Go back to the testing form to answer the survey.</p>
              )}
            </div>
          )}
        </Shell>
      );
    }
    if (!signIn || signIn.n !== local.n) return null;
    return (
      <Shell open={open} setOpen={setOpen} label={`Task 1 of ${STEP_ORDER.length}`} n={local.n}>
        <TaskCard
          step={signInStep(signIn.email, signIn.password)}
          index={0}
          hintOpen={hintShown === "signin"}
          onHint={() => setHintShown("signin")}
          onLink={(to) => router.navigate(`/${signIn.parishSlug}/${to}`)}
        />
      </Shell>
    );
  }

  // ---------- signed in ----------
  if (!guide || !steps || !current) return null;
  const index = STEP_ORDER.indexOf(current.key);
  const done = rows.filter((r) => r.status === "done" || r.status === "skipped").length;
  const go = (to: string) => router.navigate(`/${guide.tester.parishSlug}/${to}`);
  const nextUnblocked = rows.find((r) => !r.status && !r.waiting && r.key !== current.key);
  const progressInfo = guide.steps.find((s) => s.key === current.key);

  // "Task complete", then on to the next task.
  const finishedKey = completed[0];
  if (finishedKey) {
    const info = guide.steps.find((s) => s.key === finishedKey);
    const next = () => {
      const saved = readLocalTester();
      if (saved) writeLocalTester({ ...saved, acknowledged: [...(saved.acknowledged ?? []), finishedKey] });
      setCompleted((queue) => queue.slice(1));
    };
    return (
      <Shell open={open} setOpen={setOpen} label="Task complete" n={guide.tester.n} progress={done / STEP_ORDER.length}>
        <Completion
          index={STEP_ORDER.indexOf(finishedKey)}
          title={steps[finishedKey].title}
          seconds={info?.seconds ?? null}
          onRate={(rating) => {
            void mark(finishedKey, { rating });
            next();
          }}
          onNext={next}
        />
      </Shell>
    );
  }

  return (
    <Shell open={open} setOpen={setOpen} label={`Task ${index + 1} of ${STEP_ORDER.length}`} n={guide.tester.n} progress={done / STEP_ORDER.length}>
      {current.waiting ? (
        <div className="space-y-3">
          <TaskHeading index={index} title={steps[current.key].title} />
          <div className="flex items-start gap-3 rounded-xl bg-surface-alt px-4 py-3">
            <span className="mt-1 h-3 w-3 shrink-0 animate-pulse rounded-full bg-primary" aria-hidden="true" />
            <p className="text-sm text-ink">
              {current.key === "logout" ? "Finish the other tasks first." : steps[current.key].waiting}
            </p>
          </div>
          {nextUnblocked && (
            <PrimaryButton onClick={() => setFocus(nextUnblocked.key)}>
              Start task {STEP_ORDER.indexOf(nextUnblocked.key) + 1}
            </PrimaryButton>
          )}
        </div>
      ) : (
        <TaskCard
          step={steps[current.key]}
          index={index}
          hintOpen={hintShown === current.key || Boolean(progressInfo?.hintUsed)}
          onHint={() => {
            setHintShown(current.key);
            void mark(current.key, { hint: true });
          }}
          onLink={go}
        />
      )}

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <button type="button" className="text-sm text-ink-muted hover:text-ink" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Hide all tasks" : "All tasks"}
        </button>
        {!current.waiting && current.key !== "logout" && (
          <button
            type="button"
            className="text-sm text-ink-muted hover:text-ink"
            onClick={() => {
              void mark(current.key, { status: "skipped" });
              setFocus(null);
            }}
          >
            I can&apos;t do this task, skip it
          </button>
        )}
      </div>

      {showAll && (
        <ol className="mt-3 space-y-1">
          {rows.map((r, i) => (
            <li key={r.key}>
              <button
                type="button"
                disabled={r.status === "done" || (r.status === "skipped" && r.waiting)}
                onClick={() => {
                  setFocus(r.key);
                  setShowAll(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                  r.key === current.key ? "bg-surface-alt font-medium text-ink" : "text-ink hover:bg-surface-alt"
                } disabled:cursor-default disabled:hover:bg-transparent`}
              >
                <span>
                  {i + 1}. {steps[r.key].title}
                </span>
                <span className={`shrink-0 text-xs ${r.status === "done" ? "text-primary" : "text-ink-muted"}`}>
                  {r.status === "done" ? "Done" : r.status === "skipped" ? "Skipped" : r.waiting ? "Waiting" : ""}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </Shell>
  );
}

// ---------- pieces ----------

function Shell({
  open,
  setOpen,
  label,
  n,
  progress,
  children,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  label: string;
  n: number;
  progress?: number;
  children: React.ReactNode;
}) {
  // Keep the page usable beside the open guide. On wide screens the guide is a sidebar, so the page moves
  // over. On phones it takes the bottom half, so the page gets room to scroll up above it.
  useEffect(() => {
    if (!open) return;
    const wide = window.matchMedia(`(min-width: ${DOCK_MIN_WIDTH}px)`);
    const phone = window.matchMedia(`(max-width: ${PHONE_MAX_WIDTH}px)`);
    const apply = () => {
      document.body.style.paddingLeft = wide.matches ? `${DOCK_WIDTH}px` : "";
      document.body.style.paddingBottom = phone.matches ? PHONE_SHEET_HEIGHT : "";
    };
    apply();
    wide.addEventListener("change", apply);
    phone.addEventListener("change", apply);
    return () => {
      wide.removeEventListener("change", apply);
      phone.removeEventListener("change", apply);
      document.body.style.paddingLeft = "";
      document.body.style.paddingBottom = "";
    };
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 left-1/2 z-[55] -translate-x-1/2 rounded-full bg-admin-green-900 px-5 py-2.5 text-sm font-medium text-white shadow-[0_10px_30px_-6px_rgb(14_59_70/0.45)] hover:opacity-95 sm:bottom-4 sm:left-4 sm:translate-x-0 print:hidden"
      >
        Test guide: {label}
      </button>
    );
  }
  return (
    <section
      aria-label="Test guide"
      className="fixed inset-x-0 bottom-0 z-[55] flex max-h-[50vh] flex-col rounded-t-2xl border border-border bg-surface shadow-[0_-12px_40px_-12px_rgb(14_59_70/0.35)] sm:inset-x-auto sm:bottom-4 sm:left-4 sm:max-h-[calc(100vh-6rem)] sm:w-[400px] sm:rounded-2xl xl:inset-y-0 xl:left-0 xl:max-h-none xl:w-[360px] xl:rounded-none xl:border-y-0 xl:border-l-0 xl:shadow-none print:hidden"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">HolyApp test guide</p>
          <p className="text-xs text-ink-muted">
            Tester {n} · {label}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-ink hover:bg-surface-alt"
        >
          Hide
        </button>
      </header>
      {progress !== undefined && (
        <div className="h-1 w-full bg-surface-alt" aria-hidden="true">
          <div className="h-1 bg-primary transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
      <div className="overflow-y-auto px-5 py-4">{children}</div>
    </section>
  );
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center rounded-[10px] bg-primary px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
    >
      {children}
    </button>
  );
}

function TaskHeading({ index, title }: { index: number; title: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-muted">
        Task {index + 1} of {STEP_ORDER.length}
      </p>
      <h2 className="font-serif text-xl font-bold leading-tight text-ink">{title}</h2>
    </div>
  );
}

function TaskCard({
  step,
  index,
  hintOpen,
  onHint,
  onLink,
}: {
  step: GuideStep;
  index: number;
  hintOpen: boolean;
  onHint: () => void;
  onLink: (to: string) => void;
}) {
  return (
    <div className="space-y-3">
      <TaskHeading index={index} title={step.title} />
      {step.problem && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/[0.06] px-4 py-3 text-sm text-danger">
          {step.problem}
        </p>
      )}
      {step.story.map((line) => (
        <p key={line} className="text-[0.9375rem] leading-relaxed text-ink">
          {line}
        </p>
      ))}
      {step.facts && (
        <dl className="space-y-1.5 rounded-xl bg-surface-alt px-4 py-3">
          {step.facts.map((f) => (
            <div key={f.label} className="flex gap-3 text-sm">
              <dt className="w-20 shrink-0 text-ink-muted">{f.label}</dt>
              <dd className="font-medium text-ink">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {step.details && (
        <dl className="divide-y divide-border rounded-xl border border-border">
          {step.details.map((d) => (
            <div key={d.label} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <dt className="text-xs text-ink-muted">{d.label}</dt>
                <dd className="break-words text-sm font-semibold text-ink">{d.value}</dd>
              </div>
              {d.copy && <CopyButton text={d.copy} label={d.label} />}
            </div>
          ))}
        </dl>
      )}
      {step.links && (
        <div className="flex flex-wrap gap-2">
          {step.links.map((l) => (
            <button
              key={l.to}
              type="button"
              onClick={() => onLink(l.to)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-ink hover:border-primary hover:text-primary"
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
      {step.note && <p className="text-xs leading-relaxed text-ink-muted">{step.note}</p>}
      {hintOpen ? (
        <div className="rounded-xl border border-border px-4 py-3">
          <p className="text-xs font-semibold text-ink-muted">Hint</p>
          <p className="text-sm text-ink">{step.hint}</p>
        </div>
      ) : (
        <button type="button" onClick={onHint} className="text-sm font-medium text-primary hover:underline">
          I need a hint
        </button>
      )}
    </div>
  );
}

function duration(seconds: number) {
  if (seconds < 60) return `${seconds} seconds`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m} min${s ? ` ${s} s` : ""}`;
}

function Completion({
  index,
  title,
  seconds,
  onRate,
  onNext,
}: {
  index: number;
  title: string;
  seconds: number | null;
  onRate: (rating: StepRating) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-primary">Task {index + 1} complete</p>
        <h2 className="font-serif text-xl font-bold leading-tight text-ink">{title}</h2>
        {seconds !== null && <p className="mt-1 text-sm text-ink-muted">Done in {duration(seconds)}.</p>}
      </div>
      <div>
        <p className="text-sm font-medium text-ink">How easy was it?</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(["easy", "okay", "hard"] as StepRating[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRate(r)}
              className="rounded-lg border border-border bg-surface px-2 py-2 text-sm text-ink hover:border-primary hover:text-primary"
            >
              {r === "easy" ? "Easy" : r === "okay" ? "Okay" : "Hard"}
            </button>
          ))}
        </div>
      </div>
      <button type="button" onClick={onNext} className="text-sm text-ink-muted hover:text-ink">
        Skip the question and go to the next task
      </button>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-ink hover:border-primary hover:text-primary"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
