export type OddsFormat = "Decimal" | "Fractional" | "Moneyline";

export const ODDS_FORMATS: OddsFormat[] = ["Decimal", "Fractional", "Moneyline"];

export type ParsedOdds = {
  canonicalDecimal: string | null;
  error: string | null;
};

const DECIMAL_ERROR = "Enter decimal odds greater than 1.";
const FRACTIONAL_ERROR = "Enter fractional odds as numerator/denominator with a positive denominator.";
const MONEYLINE_ERROR = "Enter Moneyline odds of +100 or above, or -100 or below.";

function greatestCommonDivisor(left: bigint, right: bigint) {
  let a = left < BigInt(0) ? -left : left;
  let b = right < BigInt(0) ? -right : right;
  while (b !== BigInt(0)) [a, b] = [b, a % b];
  return a;
}

function finiteDecimalRatio(value: string) {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const [whole, decimals = ""] = normalized.split(".");
  const denominator = BigInt(10) ** BigInt(decimals.length);
  const numerator = BigInt(`${whole}${decimals}`) - denominator;
  if (numerator < BigInt(0)) return null;
  const divisor = greatestCommonDivisor(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

function canonicalDecimal(value: number) {
  return value.toFixed(12).replace(/\.?0+$/, "");
}

export function formatOdds(canonical: string, format: OddsFormat): string {
  const decimal = Number(canonical);
  if (!Number.isFinite(decimal) || decimal <= 1) return "";
  if (format === "Decimal") return decimal.toFixed(2);
  if (format === "Moneyline") {
    const value = decimal >= 2 ? (decimal - 1) * 100 : -100 / (decimal - 1);
    const display = Number(value.toFixed(2));
    return display >= 0 ? `+${display}` : String(display);
  }
  const ratio = finiteDecimalRatio(canonical) ?? finiteDecimalRatio(canonicalDecimal(decimal));
  return ratio ? `${ratio.numerator}/${ratio.denominator}` : "";
}

export function parseOdds(value: string, format: OddsFormat): ParsedOdds {
  const input = value.trim();
  if (!input) return { canonicalDecimal: null, error: format === "Fractional" ? FRACTIONAL_ERROR : format === "Moneyline" ? MONEYLINE_ERROR : DECIMAL_ERROR };
  if (format === "Fractional") {
    const match = /^(\d+)\s*\/\s*(\d+)$/.exec(input);
    if (!match || Number(match[2]) <= 0) return { canonicalDecimal: null, error: FRACTIONAL_ERROR };
    const decimal = 1 + Number(match[1]) / Number(match[2]);
    if (!Number.isFinite(decimal) || decimal <= 1) return { canonicalDecimal: null, error: DECIMAL_ERROR };
    return { canonicalDecimal: canonicalDecimal(decimal), error: null };
  }
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return { canonicalDecimal: null, error: format === "Moneyline" ? MONEYLINE_ERROR : DECIMAL_ERROR };
  if (format === "Moneyline") {
    if (parsed > -100 && parsed < 100) return { canonicalDecimal: null, error: MONEYLINE_ERROR };
    const decimal = parsed >= 100 ? 1 + parsed / 100 : 1 + 100 / Math.abs(parsed);
    return { canonicalDecimal: canonicalDecimal(decimal), error: null };
  }
  if (parsed <= 1) return { canonicalDecimal: null, error: DECIMAL_ERROR };
  return { canonicalDecimal: canonicalDecimal(parsed), error: null };
}
