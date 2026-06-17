import type { User } from "@supabase/supabase-js";

/** First name from auth signup metadata — safe for greeting copy only (not authorization). */
export function getAuthUserFirstName(user: User): string {
  const raw = user.user_metadata?.first_name;
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }
  return "there";
}
