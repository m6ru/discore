type ErrorLike = { message?: string | null; code?: string | null } | null | undefined;

/**
 * "What failed" + a plain reason, instead of raw database text. The original
 * error goes to the console for debugging.
 */
export function friendlyError(action: string, error: ErrorLike): string {
  if (error) {
    console.error(action, error);
  }
  return `${action}. ${errorReason(error)}`;
}

export function errorReason(error: ErrorLike): string {
  const code = error?.code ?? "";
  const message = (error?.message ?? "").toLowerCase();

  // Fetch failures carry no Postgres code; Safari says "Load failed".
  if (!code && /fetch|network|load failed|timed? ?out|abort/.test(message)) {
    return "No connection — check your signal and try again.";
  }
  if (code === "PGRST301" || code === "PGRST303" || /jwt/.test(message)) {
    return "Your session expired — sign in again.";
  }
  if (code === "42501") {
    return "You don't have permission to do that.";
  }
  if (code === "23505") {
    return "That already exists.";
  }
  return "Please try again.";
}
