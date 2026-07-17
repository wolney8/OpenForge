# Plum Duff UI Audit Backlog

_Audit date: 2026-07-16_

This backlog records issues too broad or risky for the initial guardrail pass. Priority `P0` blocks
safe use, `P1` should be addressed before production-quality sign-off, and `P2` is planned debt.

| Priority | Route/component | Issue and user impact | Likely fix | Standards |
|---|---|---|---|---|
| P1 | Shared modal implementations across sportsbook, free bets, casino and cash adjustments | Dialogs are duplicated in large route shells; most scroll the complete shell and do not consistently trap/restore focus | Build one portal-based Plum Duff Dialog primitive with header/body/footer slots, focus containment and trigger restoration; migrate incrementally | M3, WCAG, layout |
| P1 | Outcome and bridge dialogs | Some modal sections lack complete `role=dialog` / `aria-modal` semantics and rely on backdrop click only | Add complete semantics now; migrate close/Escape/focus behaviour to shared Dialog | WCAG, semantics |
| P1 | Global CSS token layer | Spacing, radius, elevation, state-layer and control-size tokens are incomplete; historical literals are widespread | Add semantic M3-aligned tokens, then migrate by component family without mass visual rewrite | M3, theming |
| P1 | All major routes at tablet viewport | Mobile route and ledger-editor reflow are now covered; tablet width still lacks a complete route matrix | Extend `platform-responsive-reflow.spec.ts` with the agreed tablet breakpoint when shell density is finalised | Layout, WCAG reflow |
| P1 | Light/dark surfaces beyond ledger pills/toasts | Automated contrast checks cover selected chips/toasts, not every form, dialog, disabled state and meaningful icon | Extend shared contrast helper and test component families in both themes; use axe only after dependency approval | WCAG contrast |
| P1 | Keyboard behaviour across all dialogs/menus | Focus trap, Escape close and trigger-focus return are not uniformly automated | Add shared focus tests during Dialog/Menu primitive migration | WCAG keyboard/focus |
| P2 | Search fields across catalogue, accounts, ledgers, directory and generic module table | Most use shared classes, but markup differs and can drift | Introduce reusable `SearchField`/`FieldControl` components preserving context-specific accessible names | M3, consistency |
| P2 | Tables across ledger and settings routes | `table-scroll` use is not enforced structurally and column behaviour varies | Introduce `TableScroll` component and migrate immediate features as touched | Layout, consistency |
| P2 | Stable inspection identifiers | Existing tests use roles, labels, CSS classes and old `data-openforge-*` attributes inconsistently | Add `data-pd-id` to critical workflows as they are changed; migrate internal data attributes without breaking tests | Testing, naming |
| P2 | Navigation/menu iconography | Some controls still use text glyphs such as `≡` rather than Material Symbols | Replace during shared AppBar/Menu primitive pass with labelled Material icon buttons | M3, accessible names |
| P2 | Historical OpenForge documentation | Many workbook/planning files retain the former name for traceability; not public UI | Add historical headers when files are next revised rather than bulk rewriting evidence | Naming, traceability |
| P2 | Automated accessibility tooling | No axe dependency is installed | Evaluate `@axe-core/playwright` under dependency approval; do not add silently | WCAG testing |

## Completed during initial hardening pass

- Durable UI/accessibility contract, checklist and known-pitfall register.
- Mandatory agent-entry-point links.
- Import-review geometry, scroll containment, field parity, disabled-state and accessible-name tests.
- Low-risk modal semantics, undefined token and stable-ID fixes listed in the completion report.
- Profile Settings section navigation with keyboard operation and hash deep links.
- Shared ledger-editor sticky headers/actions, stable IDs and mobile reflow coverage.
