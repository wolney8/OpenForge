# Fixture Rules

All fixtures in this repository must be synthetic or anonymised.

Required expectations:

- no real personal data
- no real bookmaker or exchange credentials
- no full card or bank details
- no session cookies or tokens
- deterministic values for repeatable tests
- profile-isolation coverage where relevant

Prefer concise fixture notes explaining what each fixture is proving.

## Runtime and retention boundary

- Browser and integration tests use a disposable database or an isolated clone by default.
- The normal-owner database is an exceptional evidence target, never a convenient fixture store.
- When normal-schema evidence is genuinely required, use an unmistakably synthetic Profile and
  record its provenance. Physically remove it only when it is empty and non-financial under the
  governed Profile lifecycle.
- Archive and retain synthetic Profiles containing protected financial/history evidence. Exclude
  archived/test data from ordinary owner navigation, reporting, search and health summaries unless
  it is deliberately selected.
- A test must initialise its own database explicitly; read-only queries do not create or migrate
  storage as a side effect.

## Authorised private-source acceptance boundary

The ordinary API regression suite is hermetic. Twelve workbook/template acceptance cases remain
deliberately opt-in because their authority is an uncommitted founder workbook, dry-run evidence,
template workbook or helper source. Pytest reports the missing private source in every skip.

When authorised files are available locally, run the relevant test module directly or use
`scripts/verify_workbook_template_export_acceptance.py` with the established
`OPENFORGE_WORKBOOK_TEMPLATE_SOURCE`, `OPENFORGE_WORKBOOK_TEMPLATE_HELPER_SOURCE`,
`OPENFORGE_WORKBOOK_TEMPLATE_STRUCTURE_MANIFEST` and
`OPENFORGE_WORKBOOK_TEMPLATE_FIELD_COVERAGE` settings. Never copy private inputs into committed
fixtures merely to remove a skip.
