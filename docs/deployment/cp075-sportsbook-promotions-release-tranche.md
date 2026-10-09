# CP-075 Sportsbook Promotions Release Tranche

Last checked: 9 October 2026 at 12:29:49 BST (Europe/London)

## Release boundary

- Integration baseline: `ec82df0043f86355c4fb29875cc0a10b29fd405c` (accepted CP-078 Normal).
- Branch: `release/cp075-local-integration`.
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

The exact pre-CP-075 Normal application is not schema-forward-compatible: its Sportsbook row
mapper passes every `SELECT *` column to a strict dataclass and rejects the four additional
fields. Compatibility commit `9679458` is therefore the verified fallback. It reads legacy and
post-migration rows, preserves promotion metadata during ordinary edits, and rejects promotion
edits that it cannot govern. The additive columns remain in place; routine rollback never drops
them and never restores an older database over newer owner activity.

Disposable SQLite compatibility tests passed before CP-075 integration. Disposable PostgreSQL
18.6 verified the `20260927_008_invited_subscribers` to
`20261007_009_sportsbook_promotions` upgrade and retry path. A pre-migration backup remains
mandatory for recovery from migration failure itself.
