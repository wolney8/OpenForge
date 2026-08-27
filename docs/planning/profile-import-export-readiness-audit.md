# Profile Import/Export Readiness Audit

Last audited: 2026-08-27

## Result

**PARTIAL - do not use for founder cutover yet.**

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

- Extra Place / EP Catcher has no supported profile import/export mapping yet.
- No verified source map or reconciliation fixture exists for the founder's live workbook.
- No full round-trip assertion covers every supported profile export/import module.
- Global catalogue bulk import requires a confirmation/apply workflow after preflight.
- Hosted persistent runtime and owner authentication are intentionally out of scope for this
  corrective pass; existing deployment guidance remains hosted preview only.

## Required next cutover gate

1. Freeze and map the supplied founder workbook without committing raw data.
2. Add synthetic representative fixtures, including EP Catcher mapping.
3. Run a local dry run, record row/financial reconciliation, and obtain explicit approval.
4. Complete persistent runtime and owner authentication gates before importing real data.
