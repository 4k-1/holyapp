import type { ScheduleConflict } from "../types";

/** Explains why a time can't be used: the same priest or the same place is already booked. */
export function ConflictNotice({ conflict }: { conflict: ScheduleConflict }) {
  return (
    <div role="alert" className="rounded-md border border-admin-red-700/25 bg-admin-red-100 px-3.5 py-3 text-admin-support text-admin-red-700">
      <p className="font-semibold">{conflict.message}</p>
      <p className="mt-0.5">
        Events can run at the same time only in different places with different priests. Change the time, place, or
        person.
      </p>
    </div>
  );
}
