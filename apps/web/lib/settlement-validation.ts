export function getSettlementValidationMessage(
  status: string,
  result: string,
  settlesAt: string
) {
  if (status.trim().toLowerCase() !== "settled") return "";
  if (!result.trim() || result.trim().toLowerCase() === "pending") {
    return "Choose the final outcome before marking this row as Settled.";
  }
  if (!settlesAt.trim()) {
    return "Add the settlement date and time before marking this row as Settled.";
  }
  return "";
}
