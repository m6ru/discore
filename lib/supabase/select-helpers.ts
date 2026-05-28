// Supabase returns one-to-many embeds as arrays and one-to-one embeds as objects,
// but the typed client sometimes widens both to "object | array". `pickOne`
// normalises that shape down to a single nullable record.

export function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}
