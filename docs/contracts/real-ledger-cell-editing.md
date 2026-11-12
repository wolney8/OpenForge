# Real ledger cell editing contract

2026-11-03 · CP-117 · #118 · PD-PR-117A-21–26

## Authority

Native cell editing uses loaded record drafts, typed controls, validation and Save commands. Combined-scope scalar editing rereads the exact Profile-owned record, checks the allowlist and field staleness, then submits that full record through the existing Profile-owned PUT and API validation; it does not add a generic PATCH or cross-Profile write authority. Casino eligibility reuses the native Save-preparation gate so a descriptive edit cannot normalize other legacy fields. Existing Add/Edit and protected correction paths remain authoritative. The V2 flag defaults OFF; OFF retains native row interaction. Every displayed combined column is classified by datatype and authority in `ledger-cell-capabilities.ts`; a displayed value alone never grants direct edit permission.

## Field map

| Ledger | Supported floating fields | Existing Save authority | Specialist / full-editor fallback |
| --- | --- | --- | --- |
| Sportsbook | Event name, Campaign Tag | Existing loaded `SportsbookFormState` / `saveEditorDraft` | Composite offer details, date, Account, strategy, placement, status, calculated value, settlement and overrides |
| Accounts | Access channels, using the existing bounded multi-select | Existing loaded `AccountFormState` / Account submit | Immutable/catalogue-derived identity, status/access restrictions, balances/observations, commission, cash inclusion and unsupported fields |
| Free Bets | Event name, Campaign Tag; expiry datetime on a valid Prospecting/Available/Not Yet Awarded Pending row | Existing loaded `FreeBetFormState` / `persistForm`; fresh Profile-owned full-record PUT for combined expiry | Offer composites, Account, strategy, placement, status, reward/retention, calculated/settled values |
| Casino | Offer name, Game; expiry datetime when native Save preparation is unchanged and the row is not Settled | Existing loaded `CasinoOfferFormState` / `persistForm`; fresh Profile-owned full-record PUT for combined expiry | Account/type, settlement date, cash/credit/wagering/reward, status, calculated/settled values and corrections |
| Extra Place | Runner/Race composite; date/time, authorised bookmaker choice with coupled account, and validated stake on a native Prospecting/Pending row | Existing loaded `Form` / `save`; fresh Profile-owned full-record PUT for combined typed fields | Placed/settled timing and stakes, terms, other odds/lay, result/status and derived values |
| Cash | Description | Existing loaded `CashAdjustmentFormState` / `persistForm` including idempotency | Account/date/type/direction/amount/inclusion and confirmed fee-withdrawal restrictions |

The map is an allowlist, never a generic permission inferred from a field looking editable. Eligibility also depends on the current source record and the native Save-preparation gate. If the native authority cannot safely save a row, preserve its draft/error and offer the full editor. The Extra Place stake uses the native decimal input pattern; its full Profile-owned Save recomputes derived values under the existing API authority. Immutable and calculated cells never receive fabricated writes.

## Interaction and state

Single click selects; arrows/Home/End move within the shared semantic table. Enter/F2/double-click opens a supported floating field. For protected and calculated cells, show the reason and an explicit governed review action; activation must not silently open a full editor. A selected row can be opened deliberately from the toolbar, and its Actions icon opens that row. The new-record action stays separate and never assumes the selected row. All source/Profile identities remain from the native selected record, not cell text. Full editor transition retains the same draft. Selection is reconciled when a row leaves the current page, filter or Profile.

Editable fields use the approved Lab anchored control, without a visible title, close action, Save button or full-editor footer. Its accessible field name and keyboard instructions remain available. Text, date/time, authorised choice and numeric controls are chosen from the field contract; the current record gate remains authoritative. Enter, Tab or Shift+Tab and changed click-away submit the existing native command once and await acknowledgement; Tab moves only after success. Pending disables input and conflicting actions. Failed and invalid saves retain the same draft and accurate native errors. Escape cancels an unsaved edit. The Account access-channel multi-select and Extra Place Runner/Race pair use their bounded native composite controls, not a text substitute. Other typed fields retain the governed workflow until their coupled validation and Save boundary is proven reusable. Financial forms continue to require their explicit Save/confirmation action.

The table stays mounted and geometrically stable. Only the floating presentation is active; it does not also mount or focus-trap a hidden full modal. Resize/scroll keeps the editor within the viewport; nested controls preserve their own Escape/selection ownership. Focus returns to the connected cell. Native row actions, pan suppression and text selection stay intact.

## Evidence

Deterministic synthetic data only. For each ledger assert one supported persisted edit, reload/reopen, identity/financial invariants and specialist handoff. Exercise validation and rejected requests, pending/duplicate controls, keyboard/outside/escape, themes/narrow/zoom, Profile rejection and flag-OFF Add/Edit. Keep old financial fixture assertions and unrelated baseline failures visible. Record the real application without credential-bearing traces/storage dumps.

## Views

Existing columns remain. Assess saved views against the current server persistence model after six-ledger editing. Do not establish browser storage as authoritative saved-view persistence. A new authority requires the smallest explicit amendment before implementation.

## Native gate and normalization limits

Sportsbook Settled/Void/Cancelled/Free Bet Awarded, Free Bet Settled and Casino Settled retain their populated read-only/correction editor. Floating editing does not enable their settled-edit state. Casino also falls back when the native Save preparation would change other form fields (including different legacy start/settlement dates or absent reward metadata). Accounts requires an existing catalogue link, a non-Exchange Account and no coupled signup-definition creation. Cash Description starts disabled for a resolved row and reuses the existing explicit **Edit cash-adjustment row** action; confirmed fee-withdrawal rows remain restricted to their monthly fee review correction authority. Extra Place retains its native Account/use checks and Save.

Existing full-form timestamp serialization may normalize representation while retaining calendar/time value; tests compare that value and assert financial fields separately. These adapters do not repair legacy records. Any native validation failure keeps the draft and offers the full editor.

## Saved views and columns: bounded assessment

CODE-VERIFIED: the approved Lab has one in-memory view snapshot per ledger with order, widths, hidden columns, filtering and sorting. Real ledger components already offer their existing sort/filter/resize and selected optional-column controls, with mandatory columns preserved. Their current component state and legacy persisted filter state are not a saved-view authority. The existing Fund Manager preference API covers selected range and Oddsmatcher settings, not ledger views. No real saved-view API/table was found in the relevant preference/source paths. No browser-local saved-view authority has been introduced.

**Smallest proposed amendment, NOT IMPLEMENTED:** one `ledger_view_preferences` record per authenticated viewer + authorised Profile + one of six ledger keys; a versioned JSON payload of stable allowlisted column keys/order/widths/visibility, existing filter values and sort. Profile-scoped GET/PUT must recheck the existing owner/Profile authority, validate bounds and retain mandatory columns/Actions, reject stale versions with 409, and safely default retired column keys. Restore Default writes the established default payload through that same authority. No financial records, task state, new domain calculations or cross-Profile payloads. One saved snapshot per ledger matches the approved Lab; named multi-view management is not assumed. Requires explicit approval for this narrow schema/API authority before persistence or reorder integration is represented as complete.

## Reproducible isolated integration

Run `./scripts/run-python.sh scripts/run-cp117-integration.py --test --keep-running` from this source worktree. The runner refuses occupied/normal ports, automatic environment files and private workbook/seed sources; creates its own private temporary SQLite database and fresh independent signing key; uses existing synthetic fixtures, native session issuance and canonical role-bound runtime launchers; and keeps browser authentication in memory/HTTP-only cookies. No owner configuration, token, record or provider key is read or copied. The generated env file is private (0600), and temporary data/sidecars are removed after the runner stops its own children. Standard runtime-safety checks remain enabled. A fresh generated Next graph is used only after verifying no runtime lock; an authenticated synthetic route must mount before readiness. No raw logs, traces or browser storage dumps are retained.

Default disposable review URLs are web `http://127.0.0.1:3127`, API `http://127.0.0.1:8127` and synthetic sign-in `http://127.0.0.1:9127/`. `--test` verifies V2, stops only its own web process, verifies flag-OFF rollback, then restores V2. Normal `3010/8010` is never selected or restarted. A fresh invocation creates a new database and independent authentication; nothing persists as owner data.

### Presentation comparison receipt

The previous labelled popup with a visible Save and full-editor footer is superseded for scalar fields. Sportsbook Event Name is the reference case. The actual Lab input class and anchored surface geometry are used in the real portal; a native form/fieldset remains underneath to preserve asynchronous validation, pending and Save authority. Error text appears inside that same compact surface. Position clamps against the usable viewport width. The bounded Account selector and two-field Extra Place editor remain composite controls. Protected fields still open their governed review/correction workflow. Full-editor transition retains the exact native draft and row/Profile identity.
