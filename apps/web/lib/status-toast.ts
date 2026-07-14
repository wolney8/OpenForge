export type StatusToastTone = "error" | "info" | "success" | "warning";

export function inferStatusToastTone(message: string): StatusToastTone {
  const normalised = message.toLowerCase();

  if (
    normalised.includes("could not") ||
    normalised.includes("not be found") ||
    normalised.startsWith("complete ") ||
    normalised.startsWith("save this row") ||
    normalised.startsWith("autosave is waiting") ||
    normalised.includes("do not match")
  ) {
    return "error";
  }

  if (
    normalised.startsWith("removed ") ||
    normalised.startsWith("reverted ") ||
    normalised.startsWith("cleared ") ||
    normalised.includes("already exists") ||
    normalised.includes("kept the sportsbook row unchanged")
  ) {
    return "warning";
  }

  if (
    normalised.startsWith("created ") ||
    normalised.startsWith("updated ") ||
    normalised.startsWith("deleted ") ||
    normalised.startsWith("applied ") ||
    normalised.startsWith("copied ") ||
    normalised.includes(" autosaved") ||
    normalised.startsWith("undo complete")
  ) {
    return "success";
  }

  return "info";
}
