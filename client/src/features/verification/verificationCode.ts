/** The 32-character code from a verification link, or from the code on its own. */
export function verificationCode(input: string) {
  return /[a-f0-9]{32}/.exec(input.trim().toLowerCase())?.[0] ?? null;
}
