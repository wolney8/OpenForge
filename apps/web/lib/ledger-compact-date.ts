const ordinal = (day: number) => day % 100 >= 11 && day % 100 <= 13 ? "th" : day % 10 === 1 ? "st" : day % 10 === 2 ? "nd" : day % 10 === 3 ? "rd" : "th";

function parseRecordedLedgerDate(value: string | null | undefined): { parsed: Date; isDateOnly: boolean; hasOffset: boolean } | null {
  const source = value?.trim();
  if (!source) return null;
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(source);
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(source);
  const parsed = new Date(isDateOnly ? `${source}T00:00:00Z` : hasOffset ? source : `${source.replace(" ", "T")}Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  // Date normalisation must not turn an invalid recorded day into a different, apparently valid day.
  const sourceDay = /^(\d{4})-(\d{2})-(\d{2})/.exec(source);
  if (sourceDay) {
    const [, year, month, day] = sourceDay;
    const calendarDay = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (calendarDay.getUTCFullYear() !== Number(year) || calendarDay.getUTCMonth() + 1 !== Number(month) || calendarDay.getUTCDate() !== Number(day)) return null;
  }
  return { parsed, isDateOnly, hasOffset };
}

/** A shared chronological key keeps combined sorting independent from the shortened display text. */
export function ledgerDateSortValue(value: string | null | undefined): number | null {
  return parseRecordedLedgerDate(value)?.parsed.getTime() ?? null;
}

/** Explicit-offset timestamps are shown in Europe/London; local source timestamps retain their wall time. */
export function formatCompactLedgerDate(value: string | null | undefined): { compact: string; full: string } | null {
  const recorded = parseRecordedLedgerDate(value);
  if (!recorded) return null;
  const { parsed, isDateOnly, hasOffset } = recorded;
  const timeZone = hasOffset ? "Europe/London" : "UTC";
  const parts = new Intl.DateTimeFormat("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    ...(isDateOnly ? {} : { hour: "2-digit", minute: "2-digit", hour12: false }),
    timeZone,
  }).formatToParts(parsed);
  const part = (type: string) => parts.find(entry => entry.type === type)?.value ?? "";
  const weekday = part("weekday");
  const day = Number(part("day"));
  const month = part("month");
  const year = part("year");
  const time = isDateOnly ? "" : ` - ${part("hour")}:${part("minute")}`;
  if (!weekday || !day || !month || !year) return null;
  return {
    compact: `${weekday.slice(0, 3)} ${day}${ordinal(day)} ${month.slice(0, 3)}${time}`,
    full: `${weekday} ${day}${ordinal(day)} ${month} ${year}${time}`,
  };
}
