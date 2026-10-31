import { useEffect, useState } from "react";
import { NOTICE_EVENT, type NoticeTone } from "@/lib/notify";

interface Notice {
  id: number;
  text: string;
  tone: NoticeTone;
}

/** Shows notify() messages in the corner for a few seconds. Screen readers read them out. */
export function Notices() {
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    let next = 0;
    function onNotice(event: Event) {
      const { text, tone } = (event as CustomEvent<{ text: string; tone: NoticeTone }>).detail;
      const id = ++next;
      setNotices((current) => [...current, { id, text, tone }]);
      setTimeout(() => setNotices((current) => current.filter((n) => n.id !== id)), tone === "error" ? 6000 : 3500);
    }
    window.addEventListener(NOTICE_EVENT, onNotice);
    return () => window.removeEventListener(NOTICE_EVENT, onNotice);
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 print:hidden"
    >
      {notices.map((n) => (
        <div
          key={n.id}
          role={n.tone === "error" ? "alert" : "status"}
          className={`notice-in pointer-events-auto flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-[0_10px_30px_-6px_rgb(14_59_70/0.45)] ${
            n.tone === "error" ? "bg-red-700" : "bg-admin-green-900"
          }`}
        >
          {n.tone === "error" ? (
            <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-[#8ed8d2]" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
            </svg>
          )}
          <span className="flex-1">{n.text}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setNotices((current) => current.filter((x) => x.id !== n.id))}
            className="-mr-1 rounded p-0.5 opacity-70 hover:opacity-100"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
