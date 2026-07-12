export function normalizeBonusRetentionPercentForUi(
  value: string | null | undefined,
  fallback = "70"
): string {
  const normalized = value?.trim() ?? "";
  if (!normalized) {
    return fallback;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return normalized;
  }

  if (parsed > 0 && parsed <= 1) {
    return formatNormalizedNumber(parsed * 100);
  }

  return formatNormalizedNumber(parsed);
}

function formatNormalizedNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(3).replace(/\.?0+$/, "");
}
