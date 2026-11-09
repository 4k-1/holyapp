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

/** The honorific decides clergy status on the server: Fr./Msgr. priest, Dcn. deacon, Sr./Bro. religious. */
export const HONORIFIC_SUGGESTIONS = ["Fr.", "Rev. Fr.", "Msgr.", "Most Rev.", "Dcn.", "Sr.", "Bro.", "Mr.", "Ms.", "Mrs."];

/** "Chaplain, St. Jude School" */
export function titleLabel(t: { title: string; scope?: string | null }) {
  return t.scope ? `${t.title}, ${t.scope}` : t.title;
}
