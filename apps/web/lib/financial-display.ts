export type MoneyTone = "positive" | "negative" | "neutral";
export type MoneyMotionDirection = "up" | "down" | "none";

export type MoneyDisplayOptions = {
  currency?: "GBP";
  showPositiveSign?: boolean;
  zeroTone?: "positive" | "neutral";
};

const gbpFormatter = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const accountingBracketSpace = " ";

export function moneyTone(value: number, options: Pick<MoneyDisplayOptions, "zeroTone"> = {}): MoneyTone {
  if (value === 0) return options.zeroTone === "positive" ? "positive" : "neutral";
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

export function financialMotionDirection(
  previousValue: number | null,
  nextValue: number,
  prefersReducedMotion = false
): MoneyMotionDirection {
  if (prefersReducedMotion || previousValue === null || previousValue === nextValue) {
    return "none";
  }
  return nextValue > previousValue ? "up" : "down";
}

export function formatFinancialValue(value: number, options: MoneyDisplayOptions = {}): string {
  const currency = options.currency ?? "GBP";
  if (currency !== "GBP") {
    throw new Error(`Unsupported currency for financial display: ${currency}`);
  }
  if (value === 0) return "£ -";
  const formattedAbsolute = gbpFormatter.format(Math.abs(value));
  if (value < 0) return `£${accountingBracketSpace}(${formattedAbsolute})`;
  const formatted = `£ ${formattedAbsolute}`;
  return formatted;
}
