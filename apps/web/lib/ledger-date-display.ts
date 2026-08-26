function ordinal(value: number) {
  const remainder = value % 100;
  if (remainder >= 11 && remainder <= 13) return "th";
  if (value % 10 === 1) return "st";
  if (value % 10 === 2) return "nd";
  if (value % 10 === 3) return "rd";
  return "th";
}

function sameCalendarDate(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

/** Compact local ledger date labels keep dense tables readable without changing stored dates. */
export function formatLedgerDateTime(value: string | null | undefined, now = new Date()) {
  if (!value?.trim()) return "Unscheduled";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
  if (sameCalendarDate(parsed, now)) return `Today at ${time}`;

  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(parsed);
  return `${weekday} ${parsed.getDate()}${ordinal(parsed.getDate())} ${time}`;
}
