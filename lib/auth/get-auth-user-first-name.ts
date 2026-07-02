/**
 * First name from auth signup metadata — safe for greeting copy only (not authorization).
 * Accepts either a full `User` or decoded JWT `claims`, both of which carry `user_metadata`.
 */
export function getAuthUserFirstName(
  source: { user_metadata?: { first_name?: unknown } | null } | null | undefined
): string {
  const raw = source?.user_metadata?.first_name;
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }
  return "there";
}
