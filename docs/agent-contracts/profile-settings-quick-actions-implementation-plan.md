# Profile Settings And Quick Actions Implementation Plan

_Status: approved for planning; implementation requires explicit approval because it changes persisted
workflow authority and future security boundaries._

## Scope

This slice modernises Profile Settings while extending the existing Common Bet Combo authority. It does
not begin hosted persistence, OAuth, subscriber login, billing, or workbook cutover.

## Existing Authority To Reuse

- `fund_manager_combo_presets` is the global Common Bet Combo / Quick Add template store.
- `profile_quick_add_loadout_overrides` holds profile availability and allowed default overrides.
- `profile_quick_add_loadout_favourites` holds per-profile display ordering, currently capped at four
  per ledger.
- Profile lookup values already own Sportsbook/Free Bet and Casino offer labels.

The UI label becomes **Quick Actions**. The existing storage remains the authority where possible;
the work must not create a parallel unconnected template system.

## Profile Settings Changes

### Import/Export

- Rename the `Spreadsheet` section and route hash to **Import/Export**.
- Retain the current staged review/import workflow and expose export readiness without claiming the
  founder workbook is compatible until the separate cutover audit is complete.

### Offer Names

- Replace the two in-page editable lists with two entry cards:
  - **Sportsbook and Free Bet Offer Names**
  - **Casino Offer Names**
- Each card opens a canonical list dialog with search, add, edit and delete actions.
- Remove explanatory preamble copy that does not alter the operator's next action.
- Use the shared positive `Add Value` action, shared destructive delete action and shared modal close.

### Dialog Table Rule

Create a reusable `DialogTableViewport` structural class/primitive:

- fixed modal header and footer; only the dialog body/table viewport scrolls;
- semantic table with a sticky `thead` on an opaque surface and correct z-index;
- table viewport owns overflow and reserves top scroll padding equal to the heading height;
- body rows cannot visually underlap, bleed through or be hidden beneath column headers;
- all modal tables use it, beginning with Common Bet Combos and the two offer-name dialogs.

Playwright geometry checks must scroll each table and assert the first visible body row starts below the
header bottom edge. It must also assert no page-level horizontal overflow.

### Exchange Commission

- Display a percentage editing control, while retaining the existing decimal-fraction API contract:
  user input `2` is normalised and persisted as `0.02`.
- Accept only a valid non-negative percentage within the configured contract range; no silent invalid
  coercion.
- Debounce autosave after valid input and save immediately on blur.
- Keep a green saved tick and `Last updated <timestamp>` per exchange until the page refreshes or a
  later edit starts. Loading/error states remain visible and inputs stay recoverable.

## Quick Actions Authority

### Ownership And Precedence

1. **Fund Manager action**: global template. If enabled globally it is enforced for every eligible
   Profile and cannot be disabled at Profile level.
2. **Profile override**: may select an eligible provider and modify only fields expressly allowed by
   the global action. It cannot alter global identity, required fields or enforcement.
3. **Profile action**: created by the Profile/Fund Manager for that Profile only. It never mutates or
   becomes visible to other Profiles.

Existing global templates are migrated as optional global actions only after an explicit review of the
current enablement meaning. No existing action should become forced visible silently.

### Ledger Field Schemas

Allowed fields are contract-defined, not free-form JSON in the UI:

- **Sportsbook**: offer name, bookmaker, bet type, offer type, fixture type, event, market, stake,
  back odds, exchange and lay mode where contract-compatible.
- **Free Bets**: free-bet value/retention, bookmaker, fixture type, bet type, exchange and offer
  metadata where contract-compatible.
- **Casino**: offer name/type, bookmaker, game/slot, spin count/stake, reward and compact free-spin
  fields allowed by the casino contract.
- **Cash Adjustments**: adjustment category, payee/account, amount direction, date and notes.
- **Extra Places**: runner, race, bookmaker, E/W stake, E/W terms, paid-place terms, exchanges and
  default lay odds only where an explicit calculation contract allows a default.

Each schema records required, optional, globally locked and Profile-overridable fields. It must be
covered by synthetic fixtures and API validation before creating arbitrary custom actions.

### Ledger Presentation

- Render resolved eligible Quick Actions directly above pagination controls, within the established
  table-heading-controls row.
- Static carousel: maximum four visible actions on desktop; one action on reduced widths; left/right
  arrows page through overflow without auto-rotation.
- Labels cap at 40 characters with a full accessible name/title. Global enforced actions appear first,
  then Profile favourites by configured order.
- A blocked account/provider is not silently substituted; the action is unavailable with an explicit
  reason.

## Security Methodology

Introduce a central server-readable policy registry, not UI-only flags. Each route/module/action and
notification template receives a security tag such as:

- `fund_manager_only`
- `profile_operator`
- `subscriber_read`
- `subscriber_record`

When authentication is implemented, the API resolves the authenticated principal, role and profile
scope before allowing the action. The client uses the same registry only to present permitted controls;
it is never the enforcement layer. Existing modules will be tagged incrementally before Subscriber
access is enabled, with settings, imports, provider catalogue and global actions initially
`fund_manager_only`.

## Persistence, Tests And Documentation

- Add an authority migration only after schema approval: global enforcement state, profile-owned
  action identity and allowed profile-default overrides.
- Add API tests for global enforcement, Profile isolation, provider eligibility and denied overrides.
- Add unit tests for field schemas, carousel ordering and commission percent/decimal conversion.
- Add Playwright coverage for dialogs, autosave status, quick-action enablement, carousel bounds,
  keyboard operation, dark/light contrast and table-header containment.
- Update the Common Bet Combo/Quick Add contract and fixtures. Do not alter calculation contracts
  unless a newly supported default affects a calculation input.

## Decision Needed Before Implementation

Confirm this exact hierarchy: a globally enabled action is mandatory/always visible to eligible
Profiles; Profile-level actions are optional and Profile-scoped; both share the four-visible-action
carousel budget after global actions are ordered first.
