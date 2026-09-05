export type RecordRegister = "baptismal" | "confirmation" | "marriage" | "death";

export function recordDetailPath(
  parishSlug: string,
  register: RecordRegister,
  recordId: string
) {
  return `/${parishSlug}/admin/records/${register}/${encodeURIComponent(recordId)}`;
}
