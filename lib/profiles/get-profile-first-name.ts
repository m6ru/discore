export function getProfileFirstName(input: {
  firstName: string | null | undefined;
  displayName: string | null | undefined;
}): string {
  const trimmedFirst = input.firstName?.trim();
  if (trimmedFirst) {
    return trimmedFirst;
  }
  const display = input.displayName?.trim();
  if (display) {
    return display.split(/\s+/)[0] ?? display;
  }
  return "there";
}
