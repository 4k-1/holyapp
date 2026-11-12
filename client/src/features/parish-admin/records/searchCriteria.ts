/** True when any search field has something in it. */
export function hasCriteria(criteria: object) {
  return Object.values(criteria).some((value) => typeof value === "string" && value.trim() !== "");
}
