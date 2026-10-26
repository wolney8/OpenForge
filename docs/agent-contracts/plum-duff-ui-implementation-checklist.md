# Plum Duff UI Implementation Checklist

Complete this for every feature, bug fix, component, fixture-backed UI, route or page change.

## Before implementation

- [ ] Read `plum-duff-ui-accessibility-contract.md`.
- [ ] Read `plum-duff-ledger-modal-parity-contract.md` for any ledger/editor/modal change.
- [ ] Read and apply `.skills/plum-duff-ui-consistency-enforcer/SKILL.md`.
- [ ] Identify the workbook/workflow/financial contract, if relevant.
- [ ] Search for an existing Plum Duff component or CSS primitive.
- [ ] Search the current and related routes for equivalent controls.
- [ ] Record the canonical Plum Duff equivalent for each changed surface/control.
- [ ] Assign/preserve an issue ID for every supplied item and record any supplied selector/reference.
- [ ] Confirm all public-facing naming uses Plum Duff.

## Components and tokens

- [ ] Material 3-aligned platform primitive used, or exception documented.
- [ ] Existing semantic theme tokens used.
- [ ] No new hard-coded colour, spacing, shape, opacity or elevation where a token exists.
- [ ] Equivalent controls match size, border, surface, typography, focus and state styling.
- [ ] Platform Material Symbols convention used for established icon actions.
- [ ] Positive/create, secondary, tertiary and destructive actions use the shared action token set.
- [ ] Settings create/manage actions use the canonical primary action and authority-toolbar slot.
- [ ] Delete actions use the shared red Material `delete` icon and close actions use the shared red
      Material `close` icon.
- [ ] Icons inside buttons/pills are centre-aligned and match neighbouring action icon dimensions.
- [ ] Icon-only controls use the canonical centred icon-button primitive; substituting a success
      or state icon does not change the target geometry.
- [ ] Button, pill, input and focus-ring padding/margins match the nearest canonical Plum Duff
      control and are not clipped.

## Accessibility

- [ ] WCAG 2.2 AA is the baseline.
- [ ] Light mode checked.
- [ ] Dark mode checked.
- [ ] Text and meaningful non-text contrast checked.
- [ ] Keyboard navigation and visible focus checked.
- [ ] Every control has a context-specific accessible name.
- [ ] Time-critical selectors expose authoritative choices directly; decorative variants are hidden
      from assistive technology and never alter emitted domain values.
- [ ] Selectable-card hover/focus motion holds one direction without jitter, click selection fires
      once, and reduced motion retains immediate selection plus visible focus without tilt/flip.
- [ ] Visible labels exist for form controls; placeholders are not labels.
- [ ] Dialog focus containment, Escape close and trigger-focus return checked.
- [ ] Important regions and controls have stable `data-pd-id` identifiers.
- [ ] Boolean DOM attributes receive booleans or are omitted, and the rendered path emits no
      framework console warnings.
- [ ] Compact undo affordances reuse the shared centred target/glyph geometry without shifting
      labels or overlapping the controlled content.
- [ ] Clearing an earlier value preserves every mandatory empty input/card slot needed to resume
      the workflow, while safely invalidating only dependent state.
- [ ] Searchable selectors prove initial closed, focus-stays-closed, typed search, no-results,
      explicit show-all, selection-close, token removal and nested-first Escape states.
- [ ] Ordinary selects open only from explicit activation, close after selection and leave their
      parent panel/dialog open.
- [ ] Selector tests cover keyboard navigation, focus restoration, responsive containment and no
      unintended data/API request or form submission.

## Layout and process state

- [ ] Responsive layout checked at desktop and reduced viewport widths.
- [ ] Field children remain within their containers; adjacent visible sibling controls do not
      intersect, preserve canonical row gaps, and keep focus indicators unobscured through reflow.
- [ ] Peer-row labels and control top edges align, and secondary/action-row wrapping cannot shift
      only one peer field out of alignment.
- [ ] Conditional session/hand fields use semantic rows outside the primary table/card composition,
      so appearing fields cannot displace or misalign the primary content.
- [ ] Non-calculating delivery provenance is de-emphasised in the shared disclosure pattern and is
      never used to infer an independent activity/funding source.
- [ ] Recaps and secondary detail use the shared full-width disclosure; collapsed controls do not
      reserve ghost grid tracks or alter primary sibling geometry.
- [ ] Automatic and user-triggered disclosure changes use the shared controlled transition;
      reduced-motion changes state immediately and repeated toggles remain usable.
- [ ] No unintended page-level horizontal scroll.
- [ ] Tables/wide content use a contained `table-scroll`/scroll viewport.
- [ ] Expanded row details wrap/stack within their owning table or card and never create page-level
      horizontal overflow or rely on clipping useful content.
- [ ] Flex/grid ancestors around wide content use `min-width: 0` where required.
- [ ] Dense calculator columns are sized by semantic need: provider/text controls receive room while
      odds/rate fields stay compact, and every control plus focus ring remains inside its cell at
      supported viewport and text-scale states.
- [ ] Financial input widths fit their numeric role; currency adornments remain fully visible,
      vertically centred and clear of input text in every supported responsive/text-scale state.
- [ ] Leading-decimal money shorthand normalises on commit; malformed/ambiguous money remains
      visible with associated validation and is never partially parsed.
- [ ] Dialog header/close action remain visible.
- [ ] Dialog footer actions remain visible and keyboard reachable.
- [ ] Enabled, disabled, loading, success and error action conditions are defined.
- [ ] Disabled state is logically correct and its reason is available to the user.
- [ ] Empty, loading and error states are handled without losing user input.

## Consistency and tests

- [ ] Similar controls elsewhere were searched and updated or intentionally excluded with reason.
- [ ] Ledger/editor changes were checked against Sportsbook, Free Bets, Casino Offers and Cash
      Adjustments, or a documented reason explains why a ledger is intentionally excluded.
- [ ] A standalone calculator was compared with and reuses the nearest same-family ledger
      calculator/workflow presentation; generic calculator geometry alone is not parity evidence.
- [ ] Side-by-side calculator segments use explicit peer rows: canonical eyebrows, labels, controls
      and validation/help slots align across the composed segments at supported widths; trailing
      empty tracks do not make a shorter segment unnecessarily tall.
- [ ] Existing calculator presentation schemes occupy the shared panel-header action slot and retain
      calculator mode/input state when changed, and restore the existing UI preference on revisit.
- [ ] Calculator-family Previous/Next selects the adjacent ordered family without wrapping; first
      and last boundaries are visibly and semantically disabled, and selected/focus halos remain
      fully inside the animated viewport.
- [ ] Repeated selection surfaces round every exposed outer corner while preserving intentional
      joined internal edges.
- [ ] Contracted calculator scenarios use the shared Outcomes shell and row primitive rather than
      family-specific generic result tables.
- [ ] Advanced calculator allocation controls state their financial unit, keep the canonical
      Standard anchor at the visual centre where the contract requires it, update valid previews
      during drag without unmounting the last result, and reject stale responses.
- [ ] Copyable calculated stakes use the shared financial-value plus adjacent copy/check action;
      a copy-only operation does not create a separate Actions column.
- [ ] Switches represent genuine binary on/off state; named mutually exclusive modes use the
      canonical segmented control.
- [ ] Shared controls use product-neutral component/class names; reusing a domain-named control in
      another workflow requires extracting the existing implementation rather than leaking semantics.
- [ ] High-frequency calculator fields use the shared field-label typography and move optional
      routine guidance to anchored hover/focus/touch help without hiding validation or safety copy.
- [ ] Picker and displayed instances of the same visual object share one responsive size/aspect token,
      and theme-aware illustrated surfaces preserve contrast without light-theme glare in dark mode.
- [ ] Help icons use the canonical primitive and their help surface remains immediately anchored to
      the trigger in both themes, at narrow widths and while scrolling.
- [ ] Local field/card clear actions use the shared centred icon control and the workflow's existing
      undo/reducer path, including deterministic invalidation of dependent state.
- [ ] Minimal calculator pop-outs use their authenticated shell and contain no hidden/full application
      navigation, Profile or notification chrome.
- [ ] Partial lay, where applicable, is represented as a placement state/control rather than a
      standalone calculator mode, with legacy `Partial Lay` rows kept readable.
- [ ] Unit/Playwright/accessibility tests added or updated.
- [ ] Geometry and computed-style parity asserted where the task fixes layout/style divergence.
- [ ] Dialog/page top, bottom, left and right visibility asserted where geometry changed.
- [ ] Paged quick-select rails show at most three choices, hide redundant controls and retain all
  choices through working keyboard-accessible boundaries and the authoritative select.
- [ ] Calculator family paging uses bounded, reduced-motion-aware horizontal movement, visible
      disabled boundary arrows and an anchored ellipsis menu rather than numeric overflow chrome.
- [ ] Animated financial values match equivalent static typography, baseline and geometry; digit
      slots do not compress currency spacing or punctuation.
- [ ] Compact table cells preserve `FinancialValue` natural width and do not leak generic descendant
      typography into its canonical, punctuation or odometer layers.
- [ ] Primary entity name and secondary code use a deliberate stacked/separated hierarchy, and the
      selectable control's accessible name includes both.
- [ ] Repeated rendered entities use stable runtime/Account/catalogue identity as React keys; valid
      duplicate display labels remain independently rendered and selectable without console warnings.
- [ ] Action/icon dimensions, alignment and semantic destructive styling asserted where actions changed.
- [ ] Light/dark contrast regression updated where colours changed.
- [ ] Known-mistakes register updated if this fixes a repeated issue.
- [ ] Every original issue ID reconciled; no item omitted or marked complete without verification.
- [ ] Lint, typecheck and relevant tests recorded in the completion report.

## CP-055 scoped completion — 2026-09-26 23:29:27 BST

- [x] Contracts, UI skills and existing equivalents read; Profile onboarding/financial fields, current Reports projection/tables/chart/FinancialValue, and per-ledger review modal reused. Stable register IDs309–312 and #111/#109 link the repairs.
- [x] Existing tokens/actions/names/heading and help retained; no new UI framework, financial animation or motion listener. Native select/input/label/table semantics and focus targets preserved.
- [x] Personal/Managed validation, failure/Cancel/reload; Reports unknown/zero/failed/rapid scope/drilldown; Accounts actual dry-run/backup/confirm/failure/retry/reopen plus shared ledger regressions pass.
- [x] Both themes, desktop/390px/760px with200% text, keyboard/reduced motion and actual internal table/checkbox/heading reachability checked. PD312 fixes discovered flex collapse and Select clipping; original screenshot evidence retained. Financial motion contract unchanged and accepted evidence reused.
- [x] Profile11 paths, Reports4 and final Accounts/shared11 browsers pass; API129/unit55/PG/types/build/lint recorded. Known-pitfalls/enforcer updated; unrelated ledger Save/Discard/accepted calculator flows retained.
- [ ] Fresh normal-owner browser and VoiceOver spoken-output acceptance: not executed; no restricted-session bypass.
- [ ] CP-055 hosted UI/hygiene: blocked on fresh dedicated DB recovery and authorised synthetic session resources; old Preview remains live.

## CP-056 invited subscribers

- Existing Profile form/page primitives, action groups, FinancialValue and ledger
  scroll wrapper reused; subscriber shell intentionally omits all operator chrome.
- Synthetic manager/applicant browser sequence covers Save failure/retry, Discard,
  response, approval/link/grant separation, read-only statement and revocation.
- Compact/enlarged, themes, keyboard/Copy, reduced motion, actual populated-table
  containment and private-note denial PASS, including delayed allowed response after
  revocation. Source-bound invite entry, audit transitions and strict session roles
  passed focused review. No owner-data test.
- Fresh normal-owner Google interaction, VoiceOver and hosted Preview remain distinct
  unexecuted acceptance/resource checks; no replacement manual correctness campaign.

## Local owner authentication restart repair — 2026-10-14

- [x] Reused the existing Login alert, protected-route proxy and localhost callback contract; no
      new visual component, auth architecture, credential or permission behaviour.
- [x] Present-but-invalid sessions retain the requested route and render the existing accessible
      `role="alert"` session-ended message; missing cookies retain the ordinary Login path.
- [x] API callback/session tests, frontend proxy tests, canonical launcher parity/fail-closed tests,
      full web tests, typecheck, production build and focused ESLint/Ruff pass.
- [ ] Genuine owner Google return through 3010 remains the final provider/browser verification;
      no desktop or browser automation was used.

## Universal Selected Range and workbook correction — 2026-10-14

- [x] Existing range presets, Material route cards, chart primitives, financial readiness values
      and working-workbook export action are reused; no new UI framework or financial formula.
- [x] Selected Range uses one server-persisted Fund Manager authority; legacy Profile fields remain
      stored but are not dual-written by the active workflow.
- [x] Chart hover is layout-neutral; click/keyboard inspection is bounded to three initial rows,
      dismissible and scroll-contained; reduced-motion needs no chart reveal animation.
- [x] Workbook verification is headless: stable Profile identity, internal formulas, absence of
      external-workbook parts and six-row ALPHA Last Month scope are asserted programmatically.
- [x] Canonical localhost:3010/8010 serves the installed revision with the preserved database
      identity and authenticated boundary.
- [ ] Owner interaction at canonical localhost:3010 remains pending; no Excel
      or desktop application was opened or controlled.

## Core Profile/range stabilisation — 2026-10-14

- [x] PD-FIX-332 deterministic request identity, cancellation and terminal-state evidence.
- [x] PD-FIX-333 contained header progress geometry and reduced-motion evidence.
- [x] PD-FIX-334 compact empty/unavailable state and unchanged valid-chart evidence.
- [x] PD-FIX-335 partial-known cash, affected-Account link and unknown-not-zero evidence.
- [x] Twenty-transition authenticated synthetic browser stability gate (26 transitions passed).
- [ ] Canonical owner smoke remains pending after installation; workbook acceptance stays paused.

## Profile Operations composition refinement — 2026-10-14

- [x] PD-FIX-336 uses a semantic, responsive label/value list; known and incomplete money remain
      distinct and the existing affected-Accounts action remains available.
- [x] PD-FIX-337 aligns the performance card with the first two operational rows on desktop, removes
      the forced span on narrow layouts and preserves `ReportPointChart` hover/click behaviour.
- [x] PD-FIX-338 re-runs the delayed Profile/range sequence and asserts stable card geometry,
      contained cash rows, overflow, reduced motion and headless desktop/narrow rendering.
- [x] Focused tests, typecheck, production build and lint pass before the canonical 3010/8010 install.
- [ ] Owner visual verification remains pending; workbook acceptance stays paused.

## CP-083 visual architecture and Oddsmatcher parity correction — 2026-10-25

- [x] Reused global-search API/debounce, Account catalogue colours, reporting projection,
      `FinancialValue`, filter drawer, shared pagination and Bet Summary authorities.
- [x] Wide/intermediate/narrow header geometry checks cover 1440/1200/1100/1000/900/760/600/430;
      no duplicate visible search action, control overlap or page overflow remains.
- [x] Valid/no-activity/unavailable chart states are distinct; empty/error states contain no SVG;
      hover geometry is fixed and the keyboard point popover is portal-contained with focus return.
- [x] Oddsmatcher desktop uses the retained seven-column information model; 760/600/390 widths use
      contained stacked opportunities and a counted filter drawer before quote columns crush.
- [x] Dark/light, quote/action geometry, Profile/global context and Account theme fallbacks are
      covered by private captures and focused automated checks.
- [ ] Raw CP-081A MBB screenshots are absent from current private storage, so a fresh pixel-level
      side-by-side comparison is not claimed; the committed derived observations remain the source.
- [ ] Canonical owner visual acceptance remains pending and must not be inferred from automation.

## CP-088 Oddsmatcher refresh and Bet Summary presentation — 2026-10-26

- [x] Reused `ModalBoundary`, Material switch/icon actions, compact financial inputs,
      `FinancialValue`, calculator preview outcomes and Prospecting mutation authority.
- [x] Refresh preserves last-good rows, exposes a contained spinner and blocks duplicate activation;
      no provider request is caused by presentation state.
- [x] Rating focus, compact disclosures, two-pane desktop geometry, 430px stack order, focus return,
      keyboard tooltip access and page overflow are covered headlessly.
- [x] Normal and Advanced retain the same required inputs/results; strategy changes use the existing
      preview authority and no Place Bet/direct-placement action exists.
- [x] Dark-theme private captures and responsive computed geometry pass. Existing semantic tokens
      and contrast-tested primitives are unchanged; owner light-theme visual acceptance is pending.
- [ ] Canonical owner Bet Summary visual acceptance remains pending.

## CP-089 Bet Summary placement stub, biased outcomes and odds formats — 2026-10-26

- [x] Reused the matched-betting preview, `FinancialValue`, `FinancialTextInput`,
      `SingleLayCustomSlider`, segmented controls and nested `ModalBoundary`; no placement endpoint,
      ledger engine or formula was added.
- [x] Disabled Place Lay semantics, calculated Stake/Liability, focus description and the unchanged
      Prospecting-only mutation boundary are covered by the focused browser receipt.
- [x] Standard-only Total Profit uses numeric calculator state within `0.005`; Underlay, Overlay and
      Custom retain both outcome tables with the headline absent, and restoring Standard restores it.
- [x] Decimal/Fractional/Moneyline formatting uses the approved M14 conversion contract; strict
      field errors stop preview calls and repeated display switching retains canonical decimal odds.
- [x] Independent format controls, nested Escape/focus return, body scroll lock, desktop two-column
      geometry and 430px narrow ordering are covered by private headless captures.
- [ ] Owner visual and interaction acceptance remains pending; no acceptance status is inferred.
