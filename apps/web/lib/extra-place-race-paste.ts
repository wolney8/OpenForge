export type ExtraPlaceRacePaste = {
  race: string;
  runner: string;
};

const ignoredLines = new Set(["to win", "winner", "horse racing"]);

/** Extract the compact race and runner fields from common Smarkets/MBB copy blocks. */
export function parseExtraPlaceRacePaste(
  value: string,
): ExtraPlaceRacePaste | null {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const eventIndex = lines.findIndex((line) =>
    /\b(?:[01]\d|2[0-3]):[0-5]\d\s*(?:-\s*)?[A-Za-z]/.test(line),
  );
  if (eventIndex < 0) return null;

  const match = lines[eventIndex].match(
    /\b((?:[01]\d|2[0-3]):[0-5]\d)\s*(?:-\s*)?([A-Za-z][A-Za-z .'-]*?)\s*$/,
  );
  if (!match) return null;

  const [, time, venue] = match;
  const normalisedVenue = venue.trim().toLowerCase();
  const runner = lines
    .slice(eventIndex + 1)
    .find((line) => {
      const normalised = line.toLowerCase();
      return normalised !== normalisedVenue && !ignoredLines.has(normalised);
    });

  if (!runner) return null;
  return { race: `${venue.trim()} ${time}`, runner };
}
