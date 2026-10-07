# CP-075 Sportsbook Promotions Release Tranche

Last checked: 7 October 2026 at 10:16:22 BST (Europe/London)

## Release boundary

- Baseline: `034304339304756319196459ae28d0269f82deb9`.
- Branch: `release/cp075-sportsbook-promotions`.
- Includes the accepted Sportsbook-first refund/cashback and wagering lifecycle, its
  additive PostgreSQL migration, canonical ledger import/export fields, focused tests
  and this release record.
- Excludes CP-070/OddsMatcher, general workbook portability, subscriber V2, Daily Tasks
  AI, Reports redesign, media infrastructure and the known subscriber/Profile FK defect.

## Migration

Migration `20261007_009_sportsbook_promotions` adds nullable/defaulted columns to
`sportsbook_bets`: `offer_group_id` (empty), `bet_role` (`Standalone`),
`wagering_contribution` (empty) and `promotion_json` (NULL). Existing rows retain their
ordinary Sportsbook meaning. No speculative data backfill is performed.

The upgrade and repeated application passed on disposable PostgreSQL 18.4. The old-head
fixture retained an existing Sportsbook row and verified the new default values after
upgrade.

## Workbook boundary

Legacy ledgers without promotion columns remain valid. Canonical Sportsbook ledger
exports preserve `OfferGroupID`, `BetRole`, `WageringContribution (£)` and promotion
evidence; Free Bet exports preserve `OfferGroupID`. The detailed `Offer Groups` sheet is
optional enrichment. Missing detail produces `Promotion Details Required`; contradictory
metadata remains review-required. The September working-template layout has no dedicated
`BetRole` or contribution columns, so that older physical template cannot represent those
two fields and is not silently rewritten.

## Rollback

Take and verify the normal database backup before migration. Start the new API first; its
standard startup gate applies the migration before the API reports ready, then the frontend
may start.

The exact previous Normal application is not schema-forward-compatible: its Sportsbook row
mapper passes every `SELECT *` column to a strict dataclass and therefore rejects the four
additional fields. An immediate failed-release rollback, before owner writes, must restore
the verified pre-release database before restarting `0343043`. Once promotion records exist,
prefer a forward fix or a separately verified schema-compatible rollback build. Do not use
routine destructive column removal; restoring the old backup after owner writes would also
discard those later writes.
