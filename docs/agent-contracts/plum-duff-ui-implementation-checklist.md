# Plum Duff UI Implementation Checklist

Complete this for every feature, bug fix, component, fixture-backed UI, route or page change.

## CP-137 Profile scope, page heads and tracked banner — 2026-11-05 / #118

- [x] Read the required UI, accessibility, known-pitfalls and modal contracts and both local UI skills. Reused the connected Lab select, page head, ledger screen, toolbar, mobile detail and tracked-tray presentation with authenticated real-data adapters.
- [x] Preserved server-owned Profile permissions and native record commands. Combined rows use Profile plus record identity, authorised per-Profile reads in bounded batches, explicit partial failures and one combined filter/sort/count/page. New records require an owner choice; existing rows retain a combined-list return path.
- [x] Kept global Profile scope in routes, the local ledger filter subordinate, unsaved drafts guarded and stale read responses ignored. Position range, Today task semantics, eight-row default and flag-OFF legacy paths remain intact.
- [x] Used existing task-annotation reads/writes for expanded, compact and hidden banner states; visibility is a presentation preference, not a tracking mutation. Active and source-history counts remain separate, and the header can restore the banner.
- [x] Final-source synthetic desktop/split/mobile, light/dark, actual 200% zoom, keyboard/focus and native Add/Edit handoff checks: V2 integration 36 passed/5 phase skips, full visual 140/140, flag-OFF 9/9, web unit 706/706, typecheck and lint zero errors (12 inherited warnings).
- [ ] Owner visual Design Acceptance, spoken screen-reader review and owner new-sign-in tracking persistence remain unverified. Complete native specialist editor interiors after this scoped review.

## CP-136 Today source history and native financial cards — 2026-11-04 / #118

- [x] Read the UI/accessibility, known-pitfalls and ledger modal contracts plus both local UI review skills; matched the changed sections to the connected Lab financial card and the changed-source history to the existing Lab tracked-history pattern.
- [x] Kept native Sportsbook, Free Bet and Casino fields, modal focus/overflow, Save, cancellation and correction authorities. The Lab card now retains its own shared surface, border and spacing instead of being flattened by the broad legacy selector.
- [x] Kept tracked source history in the existing authenticated annotation collection. When no active matching task remains, the saved count and source-history section stay visible; tracking does not resolve the financial source.
- [x] Final-source desktop/split/mobile light/dark, actual 200% zoom, keyboard/focus and native editor containment: 129/129 visual paths. Independent V2 Save/retry/navigation/tracking integration: 25 passed with five legacy-only phase skips; flag-OFF rollback: 9/9. Web unit 706/706, TypeScript clean, lint zero errors with 12 inherited warnings. The private synthetic evidence index names the paired captures and recordings.
- [ ] Complete whole-editor Design Acceptance and spoken screen-reader review remain open; the Lab workbench and native governed modal still differ materially.

## CP-134 eight-task Today and isolated tracking — 2026-11-04 / #118

- [x] V2 Today defaults to eight rows, retains 8/16/32 and compact range navigation. The legacy 16-row default and global ledger pagination are unchanged.
- [x] Reused the connected Lab work-state chip, Today collection/detail/Board, Track All styling and five-item header preview. Individual and detail Track actions, visible-page bulk scope, history states and source actions are kept distinct.
- [x] The synthetic candidate alone installs `task_annotations` and mounts GET/PATCH. Viewer email, active owning Profile and current source occurrence are rechecked; batch writes are atomic and versioned. Read/clear, financial source records and source completion are untouched. The normal API/schema activation request is recorded in `docs/planning/cp134-task-annotations-normal-activation.md`.
- [x] Synthetic API checks cover persistence, idempotency, conflict, source resolved/changed/unavailable, foreign Profile rejection and viewer separation. Final focused integrated V2 checks pass 2/2 for Track/Untrack, work state, refresh/new session, header, page-two and bulk scope; CP-133 desktop/mobile/theme and Chromium 200% visual paths pass 8/8 with CP-134. The broader V2 run passed 23 paths, skipped five legacy-only paths and had one test-only mobile assertion failure; the corrected focused path passed. Legacy flag-OFF passed 9/9. Web unit 706/706, typecheck and build pass; web lint has zero errors and 12 inherited warnings. Changed API files pass Ruff; the separate repository baseline remains 270 findings.
- [ ] Normal-owner API 8010 and database migration approval, owner visual acceptance and spoken screen-reader verification remain open. The normal V2 page states that personal tracking awaits activation.

## CP-133 Today queue, notification triage and Profile choice — 2026-11-04 / #118

- [x] Reused the Lab Today row, collection, detail, filter and notification surface; added V2-only row separation and compact pagination. The real task source, notification persistence and old-shell task ranking remain separate.
- [x] Read existing authorised Sportsbook and Free Bet ledger APIs for typed lay status, calculated liability, recorded expiry and resolved same-Profile reward links. Unknown amount or failed read never becomes zero or a fabricated link. Historical work remains visible; source changes are labelled for refresh.
- [x] Notification dropdown shows five ranked entries first, five more per action and at most 20. Unread, actionable and informational counts have separate labels; the two full-page destinations remain distinct. Narrow footer/header containment and keyboard focus were checked.
- [x] Profile-dependent sidebar items offer an explicit modal chooser populated from the shell's authorised active Profile list; Opportunities retains the Accounts anchor. Escape restores focus, mobile/200% containment passes, and no Profile is selected silently.
- [x] Final source: paired Lab/V2 full visual suite 126/126; CP-133 populated light/dark desktop/mobile, bounded dropdown, Profile choice/filtered options and actual Chromium 200% zoom pass. Independent integration 22/22 V2 and 9/9 flag-OFF; web unit 706/706, typecheck, build and lint (zero errors, 12 inherited warnings) pass.
- [ ] Owner operational queue review and spoken screen-reader verification remain open. Confirmed unhedged exposure and bonus lock-in ranking remain unsupported without an authoritative source measure; the UI does not infer them from text.

## CP-132 header, sidebar and launcher — 2026-11-04 / #118

- [x] Compared connected Lab and real V2 with independent synthetic authentication at 1440, 1024, 800 and 390 px in light/dark; captured matched launcher, sidebar and account-menu states privately.
- [x] Reused Lab icon, nested navigation, menu body/row, identity/switch and anchored overlay presentation. Kept real notification commands, Tasks, Help links, launcher destinations, account identity, independent Back/Lay preference and source-default-OFF legacy header.
- [x] Focused CP-132 browser paths passed 9/9, including menu geometry, Escape focus, sidebar state, notification opening, real Tasks/calculator navigation and both theme preferences. Web unit passed 701/701 and typecheck passed.
- [x] Full clean-fixture visual suite passed 120/120 on the final application source. A separate fresh two-Profile run regenerated the paired CP-132 captures and passed 9/9. Lint passed with zero errors and 12 inherited warnings.
- [x] Independent synthetic V2 integration passed 22/22. Flag-OFF first ran 8/9: the existing six-ledger readiness wait timed out on Casino before an editor assertion. A fresh targeted rollback run passed 9/9, including that path and the new legacy palette check. Web production build passed.
- [ ] Local 3010 source pin and owner Design Acceptance remain pending at this source edit. Manual spoken screen-reader behavior remains unverified.

## CP-131 shell and Position parity — 2026-11-04 / #118

- [x] Compared actual connected Lab and independently authenticated real V2 at 1024, 1440 and 390 px in light/dark with paired full-page screenshots; the CP-131 browser test asserts whole-screen geometry, ordering, containment, semantic controls and mobile navigation.
- [x] Reused the Lab frame, sidebar, brand, navigation group, header, breadcrumb, page head and Position components. Removed the legacy V2 header/sidebar offset and the separate Position control panel. The flag-OFF shell remains conditional and unchanged in source.
- [x] Retained real Profile/reporting controls, search, notifications, identity, range, financial source reads, unknown values and links. Completeness counts remain in KPI support and Next actions; full native issue records remain in a disclosure after the Profile table. No financial calculation, API or authentication code changed.
- [x] Broader visual suite passed 111/111; the final header grid correction passed a fresh-fixture 6/6 whole-screen rerun. Synthetic integration passed 22/22 V2 and 8/8 flag-OFF. Web unit passed 701/701, typecheck and lint passed (12 inherited warnings).
- [x] Production web build passed on the final source.
- [ ] Local 3010 source pin and owner Design Acceptance are pending. The clean synthetic fixture did not contain the owner's populated Account/Sportsbook warning state; its native linked issue detail is code-verified and awaits direct visual review.

## CP-130 real login presentation and OAuth blocker — 2026-11-04 / #118

- [x] Reused the exact Lab auth card, brand and action CSS through one shared presentation component. The real Google endpoint, safe return path, registration link and public auth error semantics remain; no simulated sign-in behaviour was transferred.
- [x] Compared the public login at 1280/390 px in light/dark, including error, expiry, keyboard focus, action containment and page overflow. Five focused login paths and one existing public error path pass; real button text contrast is 7.44:1 light and 10.96:1 dark. Scoped typecheck, lint and auth unit/API tests pass.
- [x] Searched equivalent public auth and Lab components; the shared card now drives both, and the signed-in shell remains absent on the login route. No financial data, authentication secret or normal API configuration was changed.
- [ ] Actual owner Google callback, authenticated `/` and `/design-lab` navigation, paired authenticated Lab screenshot, production build and flag-OFF rollback remain unverified. The owner reported `invalid_oauth_state`; a fresh synthetic state validates, but the failing owner-browser cause has not been established. This tranche is incomplete until that live gate passes.

## CP-129 specialist and management continuation — 2026-11-04 / #118

- [x] Compared Lab financial workbench cards and real Sportsbook, Free Bet and Casino native Add editors; shared the actual Lab stage-card component with all three while keeping their required fields, tab contract, Save/correction, modal scroll ownership and legacy flag-OFF tree. Desktop light and mobile dark Add editor geometry/footer paths passed in synthetic Playwright.
- [x] Profile management, Settings and onboarding now reuse connected Lab page-head/surface, onboarding field-row/panel/footer presentation. The real controls, permissions, fees, catalogue selection, import/restore and lifecycle actions remain in their existing authorities. Paired onboarding at 1440/390 px in both themes and management navigation passed focused Playwright; no page overflow observed.
- [x] Full V2 Profile onboarding now uses the Lab's actual standalone page, top bar, intro, progress, stage frame and navigation buttons. The existing real guided banner, extra date/iteration fields, Profile validation, import/restore path and creation API remain. Four paired 1440/390 light/dark checks pass; one independently authenticated synthetic validation-to-Profile-creation journey passed. Legacy flag-OFF keeps its original shell, rail and actions.
- [x] Final-source full visual comparison passed 105/105. Paired onboarding captures use the same Personal draft and tracking date; paired Reports captures use the same This Year range with populated governed chart/source rows. Actual Chromium 200% zoom, specialist editor handoffs, calculator/Oddsmatcher access and the real synthetic Profile creation path passed. This is automated presentation and interaction evidence, not owner Design Acceptance.
- [x] Final-source web unit tests passed 701/701, typecheck passed, lint passed with 12 inherited warnings, and production web build passed. The independent runner passed 22 V2 financial/navigation paths and eight flag-OFF paths, including the original onboarding shell. One initial Extra Place Escape timing failure was resolved by checking that its rejected Save had left the busy state before sending Escape; focused retry and the complete rerun passed. No financial authority or assertion was weakened.
- [x] Profit Tracker route semantics inspected: its longstanding `/profit-tracker` redirect goes to the Profile dashboard. The visual test now checks the redirect, dashboard performance readiness, range control and module mix instead of assuming an unrendered Profit Tracker heading. A separate specialist route is not claimed.
- [x] Web typecheck and lint passed. Lint retains 12 inherited warnings. Incorrect loading-state Settings screenshot was replaced with a populated capture after `aria-busy=false`.
- [x] First CP-129 checkpoint visual suite passed 104/104 after replacing the incorrect Profit Tracker heading assertion with route, readiness, visible content and interaction checks. Web unit suite passed 701/701; typecheck and lint passed with 12 inherited warnings. The standalone onboarding continuation is verified in the 105-path final-source run above.
- [ ] Full Design Acceptance for native specialist interiors, Profit Tracker alias and management remains open. Onboarding now shares the Lab page hierarchy; its real guided assistance, import/restore, catalogue, date and fee fields are explicit additional capabilities. Owner visual judgement and spoken screen-reader review remain unverified.

## CP-128 Reports and Profiles whole-screen composition — 2026-11-04 / #118

- [x] Compared the connected Lab Reports and Profiles screens with independently authenticated, populated V2 at 1440/390 px in both themes. Reused the actual Lab report chart, report surfaces, source-row treatment, Profile surface and Profile task rows. The real adapters retain authoritative values, Profile links, filters, formal reports, directory actions and incomplete states.
- [x] Main Reports order now reads metrics, chart, ledger breakdown and source drilldown; additional explorer/formal-report controls remain accessible in disclosures. V2 Profiles opens with the Lab list and keeps the full operational table, financial overview, workload and balance history. Legacy flag-OFF rendering remains conditional.
- [x] Focused browser paths checked chart source disclosure, real source links, Profile directory detail table, desktop/mobile light/dark overflow and actual Chromium 200% zoom. Web typecheck, lint and 701 unit tests passed; lint retains 12 inherited warnings.
- [x] Consolidated visual suite ran 90 paths: 86 passed; four Profit Tracker failures came from an incorrect new heading assertion, which was removed, and all four affected cases passed on rerun (11/11 focused paths). The independent synthetic runner passed 22 V2 paths and seven flag-OFF paths, including Profile directory rollback. Final build and local source-pin verification are recorded in the delivery receipt.
- [ ] Full native editor, Profit Tracker, onboarding, settings and remaining management Design Acceptance remain open. Additional real financial controls are documented in the CP-128 route matrix; owner visual judgement and spoken screen-reader review remain unverified.

## CP-127 Today whole-screen integration — 2026-11-04 / #118

- [x] Used the connected Lab toolbar, filter, select, list/board, row and detail presentation components for the real Today route; retained the unchanged legacy flag-OFF table and the established task/notification source authority.
- [x] Real-only lifecycle, search, Profile, bookmaker, task type, source and refresh controls remain available in the Lab filter area. No synthetic recurring tasks, settlement or browser-only tracking authority was added.
- [x] Compared loaded desktop/mobile light/dark Lab and V2 screens, checked toolbar geometry and page overflow, and exercised search, clear, lifecycle, detail and source controls in independently authenticated synthetic Playwright. Source-backed notifications, ledgers, Reports and specialist routes remain separately covered by the broader visual suite.
- [x] Notifications full page now shares the Lab type filter, action row and footer as well as its existing surface/tabs/rows. Real search and status remain in an accessible disclosure; bulk mark-read/clear and source actions retain their established authority. Four theme/viewport pairs, source-backed dropdown, actual Chromium 200% zoom, and four legacy flag-OFF geometry/reflow paths passed with disposable authentication.
- [ ] Complete visual parity for Notifications, Reports, management routes and specialist editor interiors. Today's Lab-only recurring/suggestion workflow and durable tracking remain outside the authorised real-data scope; owner visual judgement and spoken screen-reader testing remain unverified.

## CP-126 ledger presentation handoff — 2026-11-03 / #118

- [x] Reused the connected Lab ledger detail, toggle, table surface and stepper presentation; retained existing row adapters, financial field controls, Save/correction workflows, Profile scoping and default-OFF rollback. Requests `PD-PR-117A-42–45` and `PD-FIX-510` remain individually reconciled in the UI change register.
- [x] Six ledger desktop grid computed geometry, 390 px labelled details in both themes, full table return, full-record handoff, actual 200% Chromium zoom, light/dark editor captures and pinned Actions checked with disposable authentication and records. Important controls have contextual names and stable `data-pd-id` selectors; no normal-owner financial writes.
- [x] Focused lint clears the inherited Free Bet render-ref error; new-draft SNR and existing-row retention modes pass. Synthetic six-ledger integration 21/21, flag-OFF 2/2 and web unit 701/701 passed; production web build and typecheck passed. Existing unrelated warnings and broader financial-fixture baseline are not claimed resolved.
- [ ] Whole specialist modal/field/review composition and remaining route-group Design Acceptance stay open; owner visual judgement and spoken screen-reader output are unverified. These are recorded as partial in the CP-126 route matrix.

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

## CP-090 Oddsmatcher layout and Advanced range state — 2026-10-26

- [x] Back, Lay and Rating panels fit their anchored content width; the shared narrow sheet also
      contains controls while long option results retain vertical scrolling.
- [x] Desktop and card Back/Lay quote blocks share a baseline, core height and reserved status slot.
- [x] Normal and Advanced fit at 1440×1000 without internal scrolling; 1024×650 uses safe contained
      body scrolling and retains the native dialog scroll lock.
- [x] Range Min/Current/Max use the governed Underlay/Standard/Overlay preview references; automatic
      updates, manual-bound retention and invalid-bound blocking have focused browser coverage.
- [x] Dark-theme desktop/narrow screenshots, responsive geometry, focus containment and no-overflow
      checks are recorded privately.
- [ ] Owner visual and interaction acceptance remains pending; no acceptance status is inferred.

## CP-091 Oddsmatcher liquidity, rating and popover containment — 2026-10-26

- [x] Known and unavailable liquidity centre within the reserved quote status geometry on desktop and cards.
- [x] Effective-rating supporting text requires non-zero commission and a different two-decimal result.
- [x] Oddsmatcher anchored overlays clamp to a 16px safe inset and My Filters uses end alignment.
- [x] Resize, horizontal overflow, Escape/focus restoration and 1440/1100/900/760/430 widths are covered.
- [x] Profile/navigation and ledger overlays were inspected; they do not consume the local Oddsmatcher primitive.
- [ ] Owner visual acceptance remains pending.

## CP-096 Bet Summary background preview — 2026-10-27

- [x] Routine calculation edits retain the last usable authoritative preview and never render the
      modal-blocking ledger overlay.
- [x] Preview requests debounce, abort superseded work and accept only the latest response.
- [x] Named strategies and the lay slider update their local stake presentation immediately while
      outcome money remains API-authoritative.
- [x] Back/Lay Odds and Commission fields share paired geometry, typography, focus treatment and
      concise accessible labels; the percent adornment stays inside one field surface.
- [x] Desktop, 430px, focus, reduced-motion and private headless evidence are covered.
- [ ] Owner interaction and visual acceptance remain pending.

## CP-097 Bet Summary micro alignment polish — 2026-10-28

- [x] Lay Stake uses the shared money-input primitive's centered-content variant; the currency
      prefix and editable value centre as one composition without changing outer field geometry.
- [x] Both outcome headings remain left aligned and use the result table's first-cell inset.
- [x] Editing, copy-action placement, calculation regression, desktop/430px containment and
      computed geometry are covered by the existing Bet Summary browser path.
- [ ] Owner visual verification remains pending.

## CP-098 Bet Summary relational alignment and shared Outcomes — 2026-10-28

- [x] Lay Stake label, money value and liability share one measured centre axis; Copy occupies a
      balanced secondary action slot and does not affect that axis.
- [x] Oddsmatcher uses `CalculatorOutcomes` with Bookmaker, Exchange and Total for the two
      qualifying scenarios; no promotion column or duplicate matched-result summary is rendered.
- [x] The fixture summary retains its pre-CP-097 alignment and standalone scenario headings are
      removed.
- [x] Standard retains the separate Total Profit card; Underlay, Overlay and Custom do not.
- [x] Existing Calculator Outcomes, promotion columns and legitimate summaries remain unchanged.
- [x] Desktop/430px geometry, focus, light/dark, reduced motion and private evidence are verified.
- [ ] Owner visual verification remains pending.

## CP-099 Oddsmatcher consistency and session-state audit — 2026-10-28

- [x] Fund Manager Oddsmatcher defaults reuse the Bet Summary switch geometry without grid-item
      stretching; desktop and 430px geometry match.
- [x] Lay Stake uses a compact field while its label, value and liability retain one measured
      centre axis and Copy remains an independent adjacent action.
- [x] Missing frontend validation configuration is fail closed and is not described as expiry;
      a true invalid/expired session still uses the session-ended state.
- [x] The canonical `/oddsmatcher` page route uses the shared protected-route proxy; missing or
      invalid application sessions cannot mount its authenticated shell or reach protected APIs.
- [x] Valid, missing, expired, transient-unavailable, OAuth renewal, logout and safe internal return
      paths have focused automated evidence without exposing credentials or cookies.
- [x] Canonical 3010/8010 restart uses the same role-bound owner auth environment; owner Google SSO
      behaviour remains pending direct owner verification.

## CP-104 Dashboard partial financial readiness — 2026-10-29

- [x] Loading, complete, partial, unavailable and source-failure states remain distinct.
- [x] Known operational P&L is retained with an explicit unknown-record count; missing money is
      never converted to zero, and formal-report strictness is unchanged.
- [x] Current-request ownership prevents cached or superseded range/Profile responses from being
      displayed as current.
- [x] Selected-range metric blocks use structural spacing and remain contained at 430px.
- [ ] Owner verification of first-login and partial-known presentation remains pending.

## CP-117 continuous adoption — 2026-11-03

- [x] Existing Lab direction is provisionally accepted; `PD-PR-117A-11–16` records the bounded adoption increment before implementation.
- [x] Reused real six-ledger tables, tabs, native ModalBoundary, shared fields, status/financial tokens and existing APIs. No financial logic or required-column template was replaced.
- [x] Root server flag scopes neutral surfaces, including portalled editors; OFF keeps existing styling. Header/sidebar reuse the persistent navigation component, with desktop collapse and mobile focus behaviour retained.
- [x] Populated real tables/editors, sticky header/body Actions, pointer panning, keyboard scroll, sidebar width release, failed-save draft/retry, source ownership and mobile themes have real-route browser paths.
- [x] Financial/auth safeguard failures were compared with the preserved baseline; unchanged failures are reported rather than hidden or weakened.
- [ ] Complete financial lifecycle UI parity, persistent tracking/Board and manual spoken screen-reader verification remain outside this bounded presentation receipt. Consolidated owner review is still outstanding.


## CP-117 real cell navigation — 2026-11-03 12:08 GMT

Scope: `PD-PR-117A-17–20`, open #118. Sportsbook and Accounts only; full six-ledger adoption remains partial.

- [x] Mandatory UI, modal-parity, consistency and workflow authorities read; real `LedgerTableScroll`, native editors and Lab selection are the canonical equivalents.
- [x] One shared opt-in interaction primitive; semantic tables, contextual instructions, roving Tab stop and stable cell identifiers. No new modal, field, action or money renderer.
- [x] Pointer selection, arrows/Home/End, Enter/F2/double-click, Escape, outside clearing and editor focus return asserted.
- [x] Native controls, panning, row actions and sticky header/body alignment retained. Fixed columns can intentionally exceed narrow space; visible cell fragments are maximised and pointer hit-tested.
- [x] Light/dark, 390/1440px, reduced motion respected through immediate navigation; actual Chromium 200% zoom and editor containment pass. Focus contrast 3.28:1 / 7.70:1; text contrast 13.16:1 / 12.58:1.
- [x] Real Sportsbook failed draft/retry, actual saves, reload/reopen, unchanged financial fields and foreign-Profile rejection; canonical Account notes save/reopen retains identity/balances. No selection persistence writes; existing calculation-preview POST is read-only.
- [x] Flag OFF restores original row activation and no cell navigation; source flag default remains OFF.
- [x] Focused browser 8/8 V2 plus 1/1 rollback; web 701/701; focused API 43/43; typecheck, webpack build and scoped lint (zero errors, seven existing warnings). Vercel services configuration checked separately.
- [x] Real synthetic-data recordings and visual captures inspected; named local evidence index retained, no traces/cookies/token files committed.
- [x] Existing baseline limitations remain visible: first-save legacy catalogue binding is outside the canonical Account assertion; existing financial-fixture failures are not claimed fixed; manual screen reader and owner Design Acceptance remain open.


## CP-121 consolidated six-ledger spreadsheet adoption — 2026-11-03

- [x] UI/accessibility/modal-parity contracts, local review/consistency skills and native workflow authorities applied. `PD-PR-117A-21–26` mapped before implementation under #118.
- [x] Reused CP-120 `LedgerTableScroll`, approved Lab floating surface, native typed drafts/controls, `workflow-panel-header`, modal close/actions and existing API Save. No financial/schema/API redesign or second calculation engine.
- [x] All six ledger cell mappings; native settled/correction gates, Cash explicit Edit, confirmed fee withdrawal restriction, Account catalogue/commission/signup coupling and Casino normalization fallback preserved.
- [x] Real save/reload/reopen, invalid/rejected input retention, error focus/retry, pending/duplicate exclusion, full-editor draft handoff and foreign-Profile read/write rejection verified.
- [x] Light/dark 390px, real 200% zoom, body/document scrollbar gutter, field/footer containment, close target alignment and enabled Save AA text contrast have automated evidence. Local captures inspected; native full editor actions/geometry retained.
- [x] Seven independent-runner guard tests; generated synthetic key/session/database only, standard runtime-safety checks, occupied/normal port/private source refusal, fresh Next graph and real client-route readiness; V2/OFF/V2 runner cycle proved.
- [x] 21 V2 and two rollback browser paths; web 701 and focused API/runtime 152; typecheck and webpack build. Existing Free Bet render-ref lint error and ten source warnings remain explicit; prior broader financial-fixture failures are unchanged, not claimed fixed.
- [x] Existing columns, Add/Edit, sort/filter/resize and specialist actions retained; Calculators/Oddsmatcher/Reports navigation covered without provider activity. Flag default OFF and branch deployment guard preserved.
- [x] Adoption matrix and saved-view assessment updated. Durable real views/reorder require the documented minimal authority amendment; no browser-local saved-view authority introduced.
- [ ] Owner Design Acceptance, manual spoken screen-reader verification, full specialist lifecycle replacement and Today tracking remain open. Passing adapter tests do not imply those acceptances.

## CP-122 integrated V2 visual adoption — 2026-11-03

- [x] Compared the connected Design Lab and independently authenticated integrated V2 at matched desktop/mobile widths and both themes. Route-by-route presentation, interaction and integration states are in the adoption matrix; partial surfaces remain visible.
- [x] Reused V2 shell, Material tokens, `workflow-panel-header`, existing Profile/Account/ledger surfaces, Report Explorer and native editor controls. No duplicate calculation, mutation, reporting or authentication authority.
- [x] Flag-scoped neutral surfaces remove decorative gradients/glows and visible money animation. Position uses real cash, selected-range reporting P&L, current liability, Profile fees, warnings, source links and progressive detail; unknown remains unknown.
- [x] Shared ledger header/table/editor geometry, Account/Profile/Settings surfaces and specialist shell checked for page overflow at 1440/390 px in light/dark. Native Add/Edit, protected correction paths and source identity retained.
- [x] Comparable screenshots and actual integrated V2 videos captured privately, without credentials or owner data. Governed Reports points, filters and source drilldown exercised. Visual browser 62/62, loaded Today/Notifications recapture 8/8 and final-source recordings 3/3; web 701/701, typecheck and build pass; isolated runner V2 21/21, OFF 2/2 and V2 restored.
- [ ] Owner visual Design Acceptance, spoken screen-reader review, Today annotation authority, saved-view preference authority and remaining partial page compositions are open. UI verification does not clear historical broader financial-fixture failures.

## CP-123 single-host direct Lab presentation adoption — 2026-11-03

- [x] Approved local normal web source moved to the CP-117 branch using the canonical normal environment and exact source revision. Normal API process and database remain in place; no preview secret/session/database copy. Both `/` and `/design-lab` use `localhost:3010`. Owner completed a fresh Google sign-in.
- [x] Nearest signed-off equivalents: connected Lab Position metric/action/surface components and Lab Today task row. Shared components render synthetic Lab state or real governed state through separate props; native API, Profile, reporting, source commands and specialist workflows stay authoritative. Removed duplicate Position CSS rather than making another visual variant.
- [x] Semantic financial statuses, known/unknown values, focusable action controls, accessible task-row names, 44px action targets, legacy flag-OFF path, light/dark tokens and responsive Lab geometry retained in shared presentation.
- [x] Focused synthetic Playwright passed Position/Today Lab-versus-V2 geometry in desktop/mobile and both themes (8/8); the independent runner passed integrated navigation (1/1) and V2/legacy rollback (2/2). Final-source `pnpm build:web` passed. Normal 3010 restarted from d3185bd with `/login` 200, `/` and `/design-lab` protected, normal API health 200. Existing editor coverage and earlier recordings remain evidence for unchanged workflow code.
- [ ] Full route-by-route presentation adoption, new consolidated recording set, owner Design Acceptance and spoken screen-reader review remain open.

## CP-124 Today and Notifications shared presentation — 2026-11-03

- [x] Signed-off equivalents: connected Lab Today List/Board toggle, board, task row and detail layout; Lab Notifications full-page panel, tabs, sections and row. The same presentation components now accept synthetic Lab or real source-backed data.
- [x] Existing Today source-priority, due-state, Profile filter, source recheck and clear/restore commands preserved. Real Board is grouped by recorded priority; synthetic Lab work states and personal tracking are excluded pending their separate persistence authority.
- [x] Existing Notifications read, clear, search, type/status and source-link authorities preserved. V2 tabs derive Action Required, System & Results and History from retained real notification kinds and states; flag-OFF keeps the legacy page.
- [x] Reports Explorer uses the actual Lab report chart for complete, finite realised daily P&L series of at most twelve points; it passes the existing governed daily points and opens the existing source-record disclosure. Incomplete, unsupported metric and larger series retain the established chart/availability path. No new financial calculation or report authority.
- [x] Focused synthetic visual browser checks passed 12/12 across 1440/390 and light/dark, including List/Board pointer operation, desktop close hit-test, mobile Escape, shared row geometry and tabs keyboard navigation. Web tests passed 701/701; changed UI files passed focused lint and typecheck.
- [x] Final-source web build passed. Independent runner passed integrated navigation 1/1 and flag-OFF 2/2, including legacy Notifications without V2 tabs. The repository-wide web lint gate has one unchanged Free Bets render-time ref error; changed CP-124 files pass focused lint.
- [x] Reports chart integrated visual checks passed 5/5, including source drilldown, Bar/Line control, bounded geometry and paired Lab/V2 screenshots at 1440/390 in light/dark. Profit Tracker retains its specialist chart because its cumulative Profile trend is not the Lab's settled-source daily series.
- [x] Lab and six real ledger toolbars share `DesignLedgerSearch`; real query/page-reset handlers and legacy flag-OFF styling remain. Paired synthetic geometry, theme and overflow checks passed 4/4 across all six routes at 1440/390. Broader toolbar/table/editor parity remains open.
- [x] The V2 notification dropdown now shares Lab panel/section/row presentation, keeps existing read/clear/complete/source commands and hover/focus read behavior, and retains the flag-OFF legacy dropdown. Paired synthetic boundary and row checks passed 4/4 at 1440/390 in both themes; read/clear persisted through reload in 1/1 focused test. Real retained-history and full-page filter differences remain open.
- [x] Normal 3010 web restarted from the pinned CP-124 source; `/login` 200, `/` and `/design-lab` protected, Google initiation 302 to Google's host, existing 8010 API health 200. Disposable test ports closed and worktree clean.
- [ ] Full-route parity and spoken screen-reader review remain open at this stage.

## CP-125 six-ledger whole-screen checkpoint — 2026-11-03

- [x] Canonical equivalent: connected Design Lab ledger screen, page head, toolbar, select and table-scroll components. The six real ledgers now use those surfaces with real row/filter/range/Add adapters and source-default-OFF flag. Lab fixture callbacks do not enter real financial commands.
- [x] Existing semantic tables, accessible toolbar/field names, stable `data-pd-id`, financial status and unknown-state renderers, Profile isolation and native Add/Edit/correction authorities retained. Account opportunities and specialist Extra Place quick loadouts remain available.
- [x] Full-screen Lab/V2 pairs at 1440 light and 390 dark; each route checked for surface class, toolbar/table presence and page overflow. Six real native Add editors captured at both widths, with viewport bounds and close controls asserted.
- [x] Shared wide-table adoption exposed a mobile pinned-column pointer blocker. Corrected the real V2 narrow geometry and passed the actual six-ledger pointer/floating-editor regression. The signed-off Lab grid retains its own geometry.
- [x] Web source suite 701/701 and typecheck pass. The unchanged Free Bet render-ref lint error remains in the incoming checkpoint; focused changed-file lint has that one error and ten warnings, without a new CP-125 lint error.
- [ ] Full Design Acceptance remains open: real operational grid density, Lab mobile labelled details and specialist modal compositions differ. Equivalent Profile/range fixture content and owner visual/spoken screen-reader review remain separate acceptance work.
- [x] Consolidated synthetic Playwright 21/21 V2 paths (two flag-OFF paths skipped in that run); refreshed paired visual/editor paths 4/4; independent runner then passed V2 navigation 1/1 and flag-OFF rollback 2/2. Final web build passed. Git checkpoint, issue receipt and normal 3010 restoration are recorded in the delivery report.
