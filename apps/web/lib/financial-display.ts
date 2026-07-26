export type MoneyTone = "positive" | "negative" | "neutral";

export type MoneyDisplayOptions = {
  currency?: "GBP";
  showPositiveSign?: boolean;
};

const gbpFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function moneyTone(value: number): MoneyTone {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

export function formatFinancialValue(value: number, options: MoneyDisplayOptions = {}): string {
  const currency = options.currency ?? "GBP";
  if (currency !== "GBP") {
    throw new Error(`Unsupported currency for financial display: ${currency}`);
  }
  const formatted = gbpFormatter.format(Math.abs(value));
  if (value < 0) return `-${formatted}`;
  if (value > 0 && options.showPositiveSign) return `+${formatted}`;
  return formatted;
}

