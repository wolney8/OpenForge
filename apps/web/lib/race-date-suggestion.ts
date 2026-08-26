export type RaceDateSuggestions = {
  time: string;
  today: string;
  tomorrow: string;
};

const trailingRaceTime = /(?:^|\s)([01]\d|2[0-3]):([0-5]\d)\s*$/;

function asLocalDateTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T${pad(next.getHours())}:${pad(next.getMinutes())}`;
}

/** Returns local-date suggestions only when the race ends with a valid 24-hour time. */
export function getRaceDateSuggestions(
  race: string,
  now = new Date(),
): RaceDateSuggestions | null {
  const match = race.match(trailingRaceTime);
  if (!match) return null;
  const time = `${match[1]}:${match[2]}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    time,
    today: asLocalDateTime(now, time),
    tomorrow: asLocalDateTime(tomorrow, time),
  };
}
