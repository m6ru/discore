export function statusBadgeVariant(
  status: string
): "default" | "secondary" | "outline" {
  if (status === "active") {
    return "default";
  }
  if (status === "abandoned") {
    return "outline";
  }
  return "secondary";
}

export function formatStatusLabel(status: string): string {
  if (status === "active") {
    return "Active";
  }
  if (status === "completed") {
    return "Completed";
  }
  if (status === "abandoned") {
    return "Abandoned";
  }
  if (status === "draft") {
    return "Draft";
  }
  return status;
}
