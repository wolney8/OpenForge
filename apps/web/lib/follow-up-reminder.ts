function formatDateTimeLocalValue(value: Date): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(
    value.getHours()
  )}:${pad(value.getMinutes())}`;
}

export function getFollowUpReminderDefaultDueAt(
  cutoffValue: string,
  now = new Date()
): string {
  const normalized = cutoffValue.trim().replace(" ", "T");
  if (!normalized) return "";

  const cutoff = new Date(normalized);
  if (Number.isNaN(cutoff.getTime()) || cutoff.getTime() <= now.getTime()) return "";

  const twoHoursBefore = new Date(cutoff.getTime() - 2 * 60 * 60 * 1000);
  if (twoHoursBefore.getTime() > now.getTime()) {
    return formatDateTimeLocalValue(twoHoursBefore);
  }

  const oneHourBefore = new Date(cutoff.getTime() - 60 * 60 * 1000);
  if (oneHourBefore.getTime() > now.getTime()) {
    return formatDateTimeLocalValue(oneHourBefore);
  }

  const latestSafeTime = new Date(cutoff.getTime() - 60 * 1000);
  const nearTermFallback = new Date(now.getTime() + 5 * 60 * 1000);
  return formatDateTimeLocalValue(
    nearTermFallback.getTime() < latestSafeTime.getTime()
      ? nearTermFallback
      : latestSafeTime
  );
}
