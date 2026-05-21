/** Canonical profile label used in rounds, invites, and search (Option A). */
export function buildDisplayName(
  firstName: string,
  lastName: string,
  fallbackEmail: string
): string {
  const full = `${firstName.trim()} ${lastName.trim()}`.trim();
  return full || fallbackEmail;
}
