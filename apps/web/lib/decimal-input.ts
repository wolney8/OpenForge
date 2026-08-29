export type DecimalInputOptions = {
  allowNegative?: boolean;
  maximumFractionDigits?: number;
};

export function sanitizeDecimalInput(
  value: string,
  options: DecimalInputOptions = {},
): string {
  const allowNegative = options.allowNegative ?? true;
  const maximumFractionDigits = options.maximumFractionDigits ?? 2;
  const normalized = value.replaceAll(",", ".").replace(/[^0-9.-]/g, "");
  const negative = allowNegative && normalized.startsWith("-");
  const unsigned = normalized.replaceAll("-", "");
  const [integerPart = "", ...fractionParts] = unsigned.split(".");
  const hasDecimalPoint = unsigned.includes(".");
  const integerDigits = integerPart.replace(/\D/g, "");
  const fractionDigits = fractionParts.join("").replace(/\D/g, "")
    .slice(0, maximumFractionDigits);
  const prefix = negative ? "-" : "";

  if (!hasDecimalPoint) return `${prefix}${integerDigits}`;
  return `${prefix}${integerDigits || "0"}.${fractionDigits}`;
}

export function formatDecimalInput(
  value: string,
  options: { emptyValue?: string; fractionDigits?: number } = {},
): string {
  const trimmed = value.trim();
  if (!trimmed) return options.emptyValue ?? "";
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return options.emptyValue ?? "";
  return parsed.toFixed(options.fractionDigits ?? 2);
}

export function isExplicitZero(value: string): boolean {
  const trimmed = value.trim();
  return trimmed !== "" && Number(trimmed) === 0;
}

export function decimalRateToPercentageInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return "";
  return (parsed * 100).toFixed(2);
}

export function percentageInputToDecimalRate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return "";
  if (parsed === 0) return "0.00";
  return (parsed / 100)
    .toFixed(6)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
}
