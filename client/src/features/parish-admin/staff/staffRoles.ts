import type { ClergyRank } from "./api/personnelApi";

/** Staff list titles; mirrors server/src/constants/personnelRoles.js. A person can hold several (item 4). */
export const CLERGY_ROLES = ["Parish Priest", "Parochial Vicar", "Guest Priest", "Priest", "Chaplain", "Deacon"];

export const PERSONNEL_ROLES = [
  ...CLERGY_ROLES,
  "Parish Secretary",
  "Admin Staff",
  "Bookkeeper",
  "Sacristan",
  "Lay Minister",
  "Catechist",
  "Other",
];

/** Whether someone is clergy comes from this, not from a title. */
export const CLERGY_RANK_OPTIONS: { value: ClergyRank; label: string }[] = [
  { value: "priest", label: "Priest" },
  { value: "deacon", label: "Deacon" },
  { value: "religious", label: "Religious (sister or brother)" },
  { value: "lay", label: "Lay" },
];

export const HONORIFIC_SUGGESTIONS = ["Fr.", "Rev. Fr.", "Msgr.", "Most Rev.", "Dcn.", "Sr.", "Bro.", "Mr.", "Ms.", "Mrs."];

/** The rank a new person most likely has, from their first title. */
export function rankForTitle(title: string): ClergyRank {
  if (title === "Deacon") return "deacon";
  return CLERGY_ROLES.includes(title) ? "priest" : "lay";
}

/** "Chaplain, St. Jude School" */
export function titleLabel(t: { title: string; scope?: string | null }) {
  return t.scope ? `${t.title}, ${t.scope}` : t.title;
}
