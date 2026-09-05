# Workbook template export v1 preflight register

Last updated: 2026-09-05

Scope: close the bounded template-growth defects before implementing the local,
package-preserving `workbook-template-export-v1` slice. Google runtime, stale-workbook merge,
Notifications, workbook-lessons work, and unrelated UX remain parked.

| ID | Area | Required behaviour | Evidence gate | Status |
|---|---|---|---|---|
| WTE-PREFLIGHT-001 | Formula translation | Translate relative A1 references without changing quoted strings, quoted sheet names, absolute references, or unsupported formula constructs | Focused token-aware regression tests and authoritative private growth probe | COMPLETE |
| WTE-PREFLIGHT-002 | Range growth | Capture immutable source extents and resize only manifest-authorized tables, filters, validations, conditional formatting, and defined names | Synthetic multi-table/name assertions and authoritative private package comparison | COMPLETE |
| WTE-PREFLIGHT-003 | ID allocation | Derive iteration from validated Profile/template state, scan complete ID ranges, preserve compatible IDs, and allocate collision-free IDs | Iteration, sparse, empty, malformed, duplicate, platform-native, and linkage tests | COMPLETE |
| WTE-PREFLIGHT-004 | Private gate | Execute the September workbook/helper structural test with zero skips and verify the generated helper fingerprint | Explicit pytest pass/skip count and SHA-256 checks | COMPLETE |
| WTE-EXPORT-001 | Export contract | Define field coverage, write zones, value encodings, fingerprints, range rules, and fail-closed boundaries | Contract and machine-readable coverage validation | COMPLETE |
| WTE-EXPORT-002 | Package writer | Populate a fresh approved template copy from current Profile state without retaining stale operational data | Fewer-row, empty, stale-data, hidden-data, cache/comment/shared-string and package-diff tests | COMPLETE |
| WTE-EXPORT-003 | Delivery | Provide an authenticated, Profile-isolated, read-only export action with exact structural classification | API, UI, accessibility, duplicate-submit, and no-mutation tests | COMPLETE |

Evidence labels in this register describe the current tranche state only. `COMPLETE` requires the
requested implementation plus its applicable automated and private-source gates.

Preflight evidence: `apps/api/tests/test_workbook_template_structure_tools.py` executed 17 tests
against the authoritative private files with no skip reported. The source fingerprints matched the
contract, the generated candidate fingerprint is
`c9b17ac0be73a771912cfcc31df544575a32f89176ddec9ed339143d2237c14d`, and the disposable helper and
workbook outputs were removed after validation.

Export evidence: the current-Profile projection, package writer, and private structural suite
executed 28 focused tests with no skipped test reported. The representative output retained all 74
package parts: 21 approved parts changed (all 14 worksheets for cache removal/data or control
writes, five declared ledger table definitions, the workbook calculation/name part, and shared
strings); 53 parts remained byte-identical. Drawing, relationship, style, theme, and empty person
parts remained byte-identical. Two Playwright cases proved keyboard activation, one request,
action-owned busy state, stable panel geometry, success/error feedback, reduced-motion context,
light/dark themes, and narrow-viewport containment.
