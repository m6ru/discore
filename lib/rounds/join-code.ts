const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const DEFAULT_JOIN_CODE_LENGTH = 6;

export function generateJoinCode(length = DEFAULT_JOIN_CODE_LENGTH): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);

  return Array.from(values, (value) => CHARSET[value % CHARSET.length]).join("");
}
