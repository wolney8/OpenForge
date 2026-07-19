export type FeeReviewLedger = "sportsbook" | "free_bet" | "casino";

export type FeeReviewResolutionContext = {
  profileId: string;
  profileName: string;
  month: string;
  ledger: FeeReviewLedger;
  recordIds: string[];
  returnHref: string;
};

const ledgerRoutes: Record<FeeReviewLedger, string> = {
  sportsbook: "sportsbook-bets",
  free_bet: "free-bets",
  casino: "casino-offers",
};

export function buildFeeReviewReturnHref(profileId: string, month: string) {
  const params = new URLSearchParams({ profile: profileId, feeReview: month });
  return `/profiles?${params.toString()}`;
}

export function buildFeeReviewLedgerHref(context: FeeReviewResolutionContext) {
  const route = ledgerRoutes[context.ledger];
  const params = new URLSearchParams({
    view: "fee-review",
    records: context.recordIds.join(","),
    feeMonth: context.month,
    feeProfileName: context.profileName,
    return: context.returnHref,
  });
  return `/profiles/${context.profileId}/tracker/${route}?${params.toString()}`;
}

export function parseFeeReviewRecordIds(value: string | undefined) {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(",")
        .map((recordId) => recordId.trim())
        .filter(Boolean)
    )
  );
}

export function getFeeReviewMonthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 0));
  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
  };
}

export async function refreshFeeReviewResolutionSession(
  apiBaseUrl: string,
  context: FeeReviewResolutionContext
) {
  const bounds = getFeeReviewMonthBounds(context.month);
  const response = await fetch(`${apiBaseUrl}/profiles/${context.profileId}/fee-periods/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      period_start: bounds.periodStart,
      period_end: bounds.periodEnd,
      actor_id: "fund-manager-local",
    }),
  });
  if (!response.ok) return;
  const payload = (await response.json()) as {
    blockers?: { module: string; record_id: string }[];
  };
  const remainingRecordIds = (payload.blockers ?? [])
    .filter((blocker) => blocker.module === context.ledger)
    .map((blocker) => blocker.record_id);

  if (remainingRecordIds.length === 0) {
    window.location.assign(context.returnHref);
    return;
  }

  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.set("records", remainingRecordIds.join(","));
  window.location.replace(currentUrl.toString());
}
