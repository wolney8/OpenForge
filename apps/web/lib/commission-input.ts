// Exact presentation-unit shift only; canonical financial state remains a ratio.
const draftPrefix = "percentage-draft:";
function shift(value: string, places: number): string {
  const [whole, fraction = ""] = value.split(".");
  const digits = (whole || "0") + fraction;
  const position = (whole || "0").length + places;
  const padded = position < 0 ? "0".repeat(-position) + digits : digits.padEnd(position, "0");
  const at = Math.max(0, position);
  const integer = (padded.slice(0, at) || "0").replace(/^0+(?=\d)/, "");
  const decimal = padded.slice(at).replace(/0+$/, "");
  return integer + (decimal ? "." + decimal : "");
}
export function percentageToCommissionRatio(value: string): string {
  if (value === "") return "";
  return /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value) ? shift(value, -2) : draftPrefix + value;
}
export function commissionRatioToPercentage(value: string): string {
  if (value.startsWith(draftPrefix)) return value.slice(draftPrefix.length);
  return /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value) ? shift(value, 2) : value;
}
