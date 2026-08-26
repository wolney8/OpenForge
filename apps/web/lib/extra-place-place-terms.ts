export type ExtraPlaceMode = "Each Way" | "Extra Place";

export type ExtraPlaceResult =
  | "Win"
  | "Standard Place"
  | "Extra Place"
  | "Unplaced"
  | "Void/NR"
  | "Pending";

export function resolvePaidPlaces(
  mode: ExtraPlaceMode,
  bookmakerPlaces: string,
  exchangePlaces: string,
) {
  const bookmaker = Math.max(1, Number(bookmakerPlaces || "5"));
  const exchangeCandidate = Math.max(1, Number(exchangePlaces || "4"));
  return {
    bookmaker,
    exchange:
      mode === "Each Way"
        ? bookmaker
        : Math.min(bookmaker, exchangeCandidate),
  };
}

export function resultForExtraPlacePosition(
  mode: ExtraPlaceMode,
  bookmakerPlaces: string,
  exchangePlaces: string,
  position: string,
): ExtraPlaceResult {
  const numericPosition = Number(position.replace(/\D/g, ""));
  const places = resolvePaidPlaces(mode, bookmakerPlaces, exchangePlaces);
  if (!Number.isFinite(numericPosition) || numericPosition < 1) return "Pending";
  if (numericPosition === 1) return "Win";
  if (numericPosition <= places.exchange) return "Standard Place";
  if (
    mode === "Extra Place" &&
    places.bookmaker > places.exchange &&
    numericPosition <= places.bookmaker
  ) {
    return "Extra Place";
  }
  return "Unplaced";
}

export function extraPlaceResultChoices(
  mode: ExtraPlaceMode,
  bookmakerPlaces = "5",
  exchangePlaces = "4",
) {
  const { bookmaker, exchange } = resolvePaidPlaces(
    mode,
    bookmakerPlaces,
    exchangePlaces,
  );
  return mode === "Extra Place" && bookmaker > exchange
    ? ["Win", "Standard Place", "Extra Place", "Unplaced", "Void/NR"]
    : ["Win", "Standard Place", "Unplaced", "Void/NR"];
}

export function extraPlacePositionChoices(
  mode: ExtraPlaceMode,
  bookmakerPlaces: string,
  exchangePlaces: string,
) {
  const { bookmaker } = resolvePaidPlaces(mode, bookmakerPlaces, exchangePlaces);
  return [
    ...Array.from({ length: bookmaker }, (_, index) => String(index + 1)),
    `${bookmaker + 1}+`,
  ];
}

export function ordinalPosition(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /^unplaced$/i.test(trimmed) || /^void\/?nr$/i.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/^(\d+)(?:st|nd|rd|th)?(\+)?$/i);
  if (!match) return trimmed;
  const number = Number(match[1]);
  if (match[2]) return `${number}+`;
  const suffix =
    number % 100 >= 11 && number % 100 <= 13
      ? "th"
      : number % 10 === 1
        ? "st"
        : number % 10 === 2
          ? "nd"
          : number % 10 === 3
            ? "rd"
            : "th";
  return `${number}${suffix}`;
}

export function extraPlacePositionForResult(
  result: string,
  mode: ExtraPlaceMode,
  bookmakerPlaces: string,
  exchangePlaces: string,
) {
  const places = resolvePaidPlaces(mode, bookmakerPlaces, exchangePlaces);
  if (result === "Win") return "1st";
  if (result === "Standard Place") return "2nd";
  if (result === "Extra Place") return ordinalPosition(String(places.exchange + 1));
  if (result === "Unplaced") return `${places.bookmaker + 1}+`;
  return "";
}
