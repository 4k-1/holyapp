import type { ScheduleLinkPrefill } from "./scheduleLink";

/** Above a register form opened from the schedule: which event, and for a batch, who is saved so far. */
export function ScheduleLinkNotice({
  prefill,
  saved,
  person,
}: {
  prefill: ScheduleLinkPrefill;
  saved: string[];
  /** "child" or "person", for the batch hint. */
  person?: string;
}) {
  return (
    <div className="mb-4 space-y-1 rounded-[8px] border border-admin-gold-600/30 bg-admin-gold-100/40 px-3 py-2 text-admin-support text-admin-gold-700">
      <p>
        From the schedule: <span className="font-semibold">{prefill.title}</span>
        {prefill.date ? ` · ${prefill.date}` : ""}
      </p>
      {prefill.batch && (
        <p>
          Enter each {person ?? "person"} from this session and use "Save and add the next". When the last one is in,
          press "All recorded" on the schedule.
        </p>
      )}
      {saved.length > 0 && (
        <p role="status" className="font-semibold text-admin-green-800">
          Saved: {saved.join(", ")}
        </p>
      )}
    </div>
  );
}
