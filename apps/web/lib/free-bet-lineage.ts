export type FreeBetParentLink = {
  origin_qual_bet_id: string;
  origin_qual_bet_native_id?: string;
  origin_qual_bet_resolution_state?: string;
};

export function isFreeBetLinkedToSportsbook(
  freeBet: FreeBetParentLink,
  sportsbookBetId: string
): boolean {
  const nativeParentId = freeBet.origin_qual_bet_native_id?.trim() ?? "";
  if (nativeParentId) {
    return nativeParentId === sportsbookBetId;
  }

  // Pre-lineage native rows used origin_qual_bet_id as the direct native link. Imported
  // missing, ambiguous and legacy-unresolved identities must never be guessed from that field.
  return (
    freeBet.origin_qual_bet_resolution_state === "not_applicable" &&
    freeBet.origin_qual_bet_id === sportsbookBetId
  );
}
