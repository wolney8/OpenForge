# Workflow Contract: Offer Decision Support

_Last updated: 2026-07-14_

## Status and scope

- Status: Deferred draft, human approval required before implementation
- Milestone: M12 Fund Manager Target Engine and Offer Decision Support
- Executes bets or casino play: Never

## User goal

Use target progress, time remaining, eligible account/offer availability, scenario P&L and an explicit risk posture to present explainable options such as standard, underlay, overlay or no recommendation.

## Required inputs

- approved target-progress output
- selected profile and date period
- validated offer/strategy combination
- contract-backed scenario outcomes and current value
- open exposure and bankroll controls
- account eligibility and known future reload availability
- explicit Fund Manager risk posture and maximum acceptable downside

## Decision boundary

- Recommendations are advisory and must show inputs, assumptions, downside and confidence/evidence limits.
- No recommendation may bypass a calculation contract or fixture.
- No auto-confirmation, bookmaker action, exchange action or casino spin action.
- The Fund Manager remains responsible for reviewing odds, eligibility and placement.
- A missing/stale/contradictory input returns `human_review_required`, not a guessed recommendation.

## Optional AI evidence

An AI API may later summarise approved public evidence such as fixture context or published market information. AI output:

- is supplementary evidence, never the calculation engine
- must include source links, retrieval time and uncertainty
- must not use bookmaker credentials, sessions or private profile data
- must not scrape prohibited sites or make an autonomous wagering decision
- must be ignored when unavailable without breaking deterministic target progress

## Recommendation states

- `standard_candidate`
- `underlay_candidate`
- `overlay_candidate`
- `no_lay_candidate`
- `avoid_or_defer`
- `human_review_required`

The scoring/threshold model that selects among these states is `To confirm` and requires a separate approved calculation contract before implementation.

## Audit and tests

Record target version, reporting basis, scenario values, risk limits, account eligibility, recommendation state, evidence timestamp and Fund Manager decision. Tests must cover ahead/on-track/behind periods, early/late period, low/high opportunity availability, missing evidence, stale evidence, exposure breach and profile isolation.

## UI rule

Present recommendation, reasons, possible upside, conservative downside and blocked assumptions together. Avoid celebratory or urgency-inducing gambling language.

## 2026-11-27 manual routine and offer review clarification (#68/#72)

This is a **planned workflow extension**, not an implemented offer catalogue, scheduler or financial command. It retains the original advisory decision rules above. Current manual Combo templates, signup definitions, Profile-owned opportunities and native Prospecting entry are useful foundations, not proof that a recurring offer is current.

- A reviewed manual routine/offer definition needs stable identity and version, provider, offer family, applicable Profile/capability evidence, source and last checked time, next verification, confidence, valid-from/until/expiry window, timezone and daily/weekly/monthly/yearly/seasonal/one-off/event-linked cadence. Terms or availability changes create a reviewable version; pause/archive does not erase prior occurrences or Account observations. A returning one-off promotion is distinct from a normal repeated routine.
- An occurrence review may record `available`, `unavailable_for_occurrence`, `no_opportunity_to_test`, `changed_terms` or `stale_evidence`. These are occurrence-scoped findings, not universal provider facts. Unknown availability remains unknown. A known event or catalogue pattern suggests checking a source; it does not prove live availability or Profile eligibility.
- A reviewer may explicitly create a reminder, eligible Prospecting draft or Common Bet Combo draft through the existing native workflow. Actual calculations, placement and settlement remain in the owning ledger. One accepted offer cannot globally restore promo access. Updating Account capability evidence requires an explicit Account review action under #70/#82, with source linkage and audit.
- Complete, Skip, Snooze and No/Low Value feedback belongs to the specific task occurrence unless the user explicitly changes the routine definition. Preserve the source and prior occurrence after any action. Full source-ingestion automation remains outside this contract.

The recurrence identity/window rules live in the [recurring activity workflow](fund-manager-recurring-activity-workflow-contract.md), and named-event provenance in the [event context contract](../contracts/event-context-contract.md). Storage, schedule generation, external-source freshness and any eligibility/ranking threshold remain **to decide before implementation**. Synthetic review-to-action cases are in the [cross-stage fixture spec](../fixture-specs/account-routine-event-advisory-fixture-spec.md).

