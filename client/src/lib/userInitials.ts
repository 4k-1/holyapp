import type { CurrentUser } from "@/types";

/**
 * The letters on a person's profile icon: the first letter of their first name and of their last name, never
 * the middle name ("Althea Degamo Genegobis" → "AG"; "Juan Dela Cruz" → "JD"). Falls back to the first and last
 * words of the full name for accounts without separate name fields.
 */
export function userInitials(user: Pick<CurrentUser, "fullName" | "firstName" | "lastName"> | null | undefined) {
  if (!user) return "?";
  const words = user.fullName.split(/\s+/).filter(Boolean);
  const first = user.firstName?.trim() || words[0] || "";
  const last = user.lastName?.trim() || (words.length > 1 ? words[words.length - 1] : "");
  return (first.charAt(0) + last.charAt(0)).toUpperCase() || "?";
}
