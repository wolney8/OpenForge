# Profile Import/Export Readiness Audit

Last audited: 2026-08-29

## Result

**PARTIAL - founder snapshot dry run completed; do not perform the real cutover yet.**

The current staged importer supports synthetic/workbook-shaped imports for Accounts,
Sportsbook Bets, Free Bets, Casino Offers, Cash Adjustments, Settings, and Reports. It has
dry-run, staging/review, reconciliation, explicit approval, and local pre-import backup paths.
It also exports Accounts, Sportsbook Bets, Free Bets, Casino Offers, and Cash Adjustments.

## Current behaviour

- Workbook sheets are detected and classified before row creation.
- Import resolves providers through the current runtime authority: legacy `bookmaker_catalogue`
  for Bookie records and the Master Account Catalogue where supported. Profile account state
  remains profile-owned. These sources require stable-ID consolidation before founder cutover.
- Unsupported/incompatible rows are staged as review items rather than silently imported.
- Existing records are protected by review and explicit confirmation rather than blind replace.

## Gaps before founder workbook cutover

- Historical Extra Place rows can now be detected in Sportsbook Bets, but rows without place
  terms, paid-place boundaries, place-lay data or finishing position remain review-only. Missing
  values are never invented.
- The founder snapshot has a read-only schema map, provider-resolution report, deterministic
  source identities and financial reconciliation artifacts under the ignored private import
  directory. The real cutover remains blocked by the row/provider decisions recorded there.
- No full round-trip assertion covers every supported profile export/import module.
- Global catalogue bulk import now has validated preflight, explicit apply, archive-on-omission,
  conflict blocking, atomic replacement and a local recovery backup. Stable-id consolidation with
  legacy Profile provider rows remains a separate founder-cutover gate.
- Hosted persistent runtime and owner authentication are intentionally out of scope for this
  corrective pass; existing deployment guidance remains hosted preview only.

## Required next cutover gate

1. Resolve every provider conflict in the private provider-resolution report.
2. Approve or implement mappings for every partial legacy row, including advanced lay branches and
   over-length legacy text, without truncating source data silently.
3. Decide how incomplete historical EP rows will be retained in the new EP ledger.
4. Re-run the dry run against the final fresh cutover snapshot and obtain explicit approval.
