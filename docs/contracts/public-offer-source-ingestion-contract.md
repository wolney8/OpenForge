# Public Offer Source-Ingestion Contract

_Last updated: 2026-07-22_

## Status and scope

- Status: Approved planning contract; implementation deferred
- Recommended milestone: M16 Offer Intelligence and Account Restriction Risk
- Related contracts:
  - `docs/workflows/common-bet-combo-workflow-contract.md`
  - `docs/contracts/master-account-catalogue-source-contract.md`
  - `docs/contracts/bookmaker-brand-catalogue-contract.md`
- Financial calculation impact: none until a generated offer creates a normal contract-backed ledger row

This contract defines how Plum Duff may later ingest public offer information such as reload offers,
free-to-play offers, welcome offers, and public bookmaker promotion pages.

It does not approve live odds scraping, bookmaker account scraping, logged-in collection,
autonomous bet placement, auto-confirmation, or OddsForge opportunity matching.

## Purpose

Give the Fund Manager a safe, evidence-backed offer intelligence layer that can prefill draft
opportunities and common bet combos without pretending the source is current, complete, profitable,
or available to every profile.

The output of this ingestion is always draft intelligence. The Fund Manager remains responsible for
checking live terms before creating or placing profile ledger rows.

## Allowed source types

Allowed source candidates, after explicit source approval:

- public matched-betting reload offer pages
- public free-to-play and daily offer listings
- public bookmaker welcome-offer pages
- public affiliate-style welcome-offer directories, only if their terms permit collection
- official bookmaker terms and help pages used as supporting evidence

Candidate examples may include public pages such as:

- `https://matchedbettingblog.com/reload-offers/`
- `https://www.oddschecker.com/free-bets`

These examples are candidates only. Each source must pass the source-approval gate before automated
or semi-automated collection is implemented.

## Prohibited source handling

Plum Duff must not:

- log into bookmaker, exchange, affiliate, or matched-betting websites to collect offers
- collect with user account credentials, cookies, session tokens, MFA secrets, or browser profiles
- bypass paywalls, CAPTCHAs, rate limits, robots policy, or technical access controls
- scrape personalised account offers from bookmaker dashboards
- scrape live odds, markets, selections, or arbitrage opportunities under this contract
- auto-place or auto-confirm bets
- store raw page dumps containing personal data or session material
- represent third-party offer text as guaranteed current terms

If safe collection is not permitted or cannot be verified, the Fund Manager must maintain the offer
catalogue manually.

## Source approval gate

Before a source is added to any automated or semi-automated ingestion job, create a source record
with:

- source id
- canonical URL
- publisher
- source type
- terms/robots review result
- allowed collection mode: `manual`, `assisted`, or `automated`
- rate-limit policy
- evidence fields the source can support
- unsupported fields that must remain `To confirm`
- stale-after period
- last reviewed date
- reviewer
- confidence: `Verified`, `Likely`, or `Unverified`

`automated` collection requires explicit human approval after terms/robots review. Without that
approval, the source remains `manual` or `assisted`.

## Captured offer fields

Each ingested offer record may capture only evidence-backed fields:

- source offer id or source row locator, if available
- source URL and checked timestamp
- bookmaker or account catalogue reference candidate
- offer family, such as `Welcome`, `Weekly Reload`, `Daily Reload`, `Free To Play`, `Free Spins`,
  `Bet & Get`, `Bonus Lock-In`, `Cashback`, `Profit Boost`, `Price Boost`, `DDHH`,
  `2UP / Early Payout`, `BOG`, `Each Way`, or `Extra Places`
- free-text offer title
- public offer summary
- minimum stake
- minimum odds
- maximum bonus or free-bet value
- award timing, such as on placement, on settlement, or manually credited
- expiry or recheck date
- qualifying restrictions visible in the source
- eligible account channel where explicitly supported: `web`, `mobile`, or `retail`
- evidence list
- source confidence
- stale/reverify state

Unknown fields must stay blank or `To confirm`. They must not be inferred from generic matched
betting conventions.

## Evidence rules

Every captured field must be traceable to evidence:

- source URL must use HTTPS
- checked date must be recorded
- publisher must be recorded
- evidence must state which fields it supports
- copied text must be minimal and must not reproduce long source content
- expired or stale evidence must block automatic application until reverified

Preferred evidence order:

1. official bookmaker promotion or terms page
2. official help page
3. approved public offer directory
4. Fund Manager manual entry with explicit `Unverified` confidence

## Normalisation and taxonomy

Ingested offer records must normalise to Plum Duff's controlled taxonomy without rewriting the
source text:

- source title remains a free-text offer title
- normalised offer family uses the Fund Manager tracker authority list
- known bookmaker references resolve through the master account catalogue where possible
- unmatched bookmaker names remain source text until manually mapped
- campaign tags remain free text
- preferred strategy is optional and never restricts the ledger editor strategy list

If a source offer maps to an advanced calculation family without an approved calculation contract
and fixtures, it may create a descriptive draft only. It must not display specialist financial
outputs.

## Profile eligibility boundary

Public source ingestion is Fund Manager-global. Eligibility is profile-specific and must be resolved
at application time using:

- profile account status
- profile account capability, such as sportsbook-only or casino-only
- profile account restriction state
- universal operator group, platform, and risk-team links
- profile operating jurisdiction and channel settings

An ingested offer must not silently create rows for blocked profiles. It may show:

- available
- available with warning
- not signed up
- bonus restricted
- soft limited or stake restricted
- gubbed or promotions removed
- blocked by KYC
- blocked by risk team
- closed or inactive
- incompatible channel or jurisdiction

Warnings must be visible and not rely on colour alone.

## Application to workflows

Approved offer intelligence may feed:

- Common Bet Combos as draft templates
- Fund Manager multi-profile Opportunity quick add
- profile sportsbook, free-bet, or casino draft creation
- Fund Manager review queues for stale offers

It must not:

- save a placed row without explicit Fund Manager action
- mark a back bet or lay bet as placed
- confirm a result
- create financial values without the normal ledger calculation contract
- bypass profile account eligibility checks

## Staleness and re-verification

Every source and offer record must define a stale-after policy. Default planning values:

- daily/free-to-play offers: stale after 1 day
- reload offers: stale after 7 days
- welcome offers: stale after 30 days
- source terms/robots review: stale after 90 days

Stale offers remain visible for history but cannot be applied to new rows until reverified or
manually overridden by the Fund Manager.

## Storage and audit

Ingestion records must be stored separately from operational ledger rows.

Required audit fields:

- source id
- source URL
- checked at
- captured by: `manual`, `assisted`, or `automated`
- confidence
- source evidence
- normalisation version
- applied-to combo or ledger row ids, if used
- Fund Manager override notes

Do not store raw HTML, screenshots, workbook source data, credentials, cookies, or tokens unless a
future approved evidence-retention policy explicitly permits a safe redacted artifact.

## Acceptance evidence

- source approval blocks unapproved automated collection
- prohibited logged-in/session source is rejected
- stale offer requires re-verification before application
- unmatched bookmaker remains unmapped and cannot silently target profiles
- linked risk-team warning appears for related brands
- gubbed/bonus-restricted/soft-limited profile accounts produce the contracted availability result
- advanced offer without calculation contract creates descriptive draft only
- applied offer creates Prospecting draft rows only
- no source ingestion test uses real account credentials, cookies, session data, or raw workbook data

## Open decisions

- `To confirm`: exact Fund Manager UI for reviewing source approval records.
- `To confirm`: whether first implementation stores source intelligence in local JSON or the local
  database.
- `To confirm`: whether assisted collection means a human-pasted observation packet or a local
  browser capture reviewed before import.
