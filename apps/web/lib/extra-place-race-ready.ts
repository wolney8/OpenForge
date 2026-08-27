export type ExtraPlaceRaceReadyState = {
  label: "Race finishing" | "Result due";
  tone: "finishing" | "due";
};

type RaceReadyInput = {
  now: number;
  placedAt?: string | null;
  status?: string | null;
};

/** Shows a quiet manual-settlement cue after the scheduled race time. */
export function getExtraPlaceRaceReadyState({
  now,
  placedAt,
  status,
}: RaceReadyInput): ExtraPlaceRaceReadyState | null {
  if (status !== "Placed" || !placedAt) return null;
  const scheduledAt = Date.parse(placedAt);
  if (!Number.isFinite(scheduledAt)) return null;

  const elapsed = now - scheduledAt;
  if (elapsed < 5 * 60_000) return null;
  if (elapsed < 10 * 60_000) return { label: "Race finishing", tone: "finishing" };
  return { label: "Result due", tone: "due" };
}
