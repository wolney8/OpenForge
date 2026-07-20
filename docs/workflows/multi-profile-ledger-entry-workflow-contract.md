# Workflow Contract: Multi-Profile Ledger Entry

_Last updated: 2026-07-19_

## Status and scope

- Status: Approved for sportsbook-first implementation
- Milestone: M11 Fund Manager Add Bet Ledger to Multiple Profiles Workflow
- User: Fund Manager only
- Initial records: sportsbook rows, followed later by free-bet rows

## User goal

Use one offer as the starting point for sequentially creating similar profile-scoped rows without opening every tracker manually, while still reviewing and submitting each profile separately.

## Entry modes

### Saved-row copy

1. Save or select an existing sportsbook source draft/row in the first profile.
2. Choose `Copy to profiles` and select candidate profiles.
3. Resolve account eligibility separately for each target profile.
4. Open a sequential review step for each eligible profile.
5. Copy shared descriptive fields, but require review of profile-variable fields such as bookmaker account, back odds, exchange, lay odds, stake, commission and settlement details.
6. Keep the source row unchanged, then submit each additional target profile explicitly in order.
7. Show a final per-profile result list: created, skipped, blocked or failed.

### Fund Manager opportunity-first quick add

1. From the Fund Manager dashboard, open `Add opportunity`.
2. Enter the shared opportunity fields: long `Offer` description (`offer_text`), optional minimum
   back odds, optional default back stake, optional expected settlement date/time, optional reward
   timing (`On placement` or `On settlement`), bookmaker, optional bet type, offer type, fixture
   type, and controlled `Offer programme` (`offer_name`). Status is fixed to `Prospecting`.
3. Resolve bookmaker eligibility for every active profile and require explicit target selection.
   `Select all eligible` is permitted. Blocked profiles remain visible with reasons but cannot be
   selected and receive no sportsbook row.
4. Saving Stage 1 creates one isolated `Prospecting` / `Pending` sportsbook row for every selected
   eligible profile and links those rows to a resumable Fund Manager opportunity batch.
5. Continue to Stage 2, where each profile row has editable back stake, back odds, exchange, lay
   odds, lay stake and strategy. Existing sportsbook calculation contracts provide match rating,
   bookmaker-win P&L and exchange-win P&L.
6. Autosave valid profile-row changes. Complex strategies may be opened in the full profile
   sportsbook editor; all other batch rows remain safely saved and the batch remains resumable.
7. `Record selected as placed` updates only selected rows whose placement requirements are valid.
   It records operator activity in Plum Duff and never places or confirms an external wager.
8. Keep the opportunity available until every target is placed, skipped or cancelled.
9. Show the two most recently updated resumable opportunities by default. Older opportunities
   remain available behind an explicit, keyboard-operable expand action; collapsing restores the
   two-item recent view without deleting or changing any batch.

### Mug-bet preset

- A Fund Manager may start one opportunity in `Mug Bet` mode and add one or more explicit
  profile/bookmaker targets.
- The same profile may appear more than once when each target uses a different active bookmaker.
- Each target remains a separate profile-owned sportsbook row. The opportunity container does not
  combine their balances, calculations or audit records.
- Mug-bet targets start with `No Lay` and no exchange requirement. The Fund Manager may switch an
  individual target to `Standard`, `Underlay`, `Overlay` or `Custom` and then enter exchange/lay
  values for that target.
- The quick-add table does not support complex strategy editors. Complex placement continues in
  the linked profile sportsbook editor.

### Placement assistance and copy-down

- Quick-add strategies are limited to `Standard`, `Underlay`, `Overlay` and `Custom`; Mug Bet also
  permits `No Lay`.
- Suggested lay actions use the existing sportsbook calculation contract outputs for the target
  row's resolved exchange commission. `Custom` remains manually entered.
- The quick-add lay field shows a calculator action only when a real suggestion has resolved.
  Activating it writes that value into the lay field and hides the action. Changing stake, odds,
  exchange or strategy clears the accepted suggestion and stale projections until the latest
  profile-scoped calculation resolves; an old suggestion must never remain actionable.
- The global opportunity bookmaker selector is sourced from the active master account catalogue.
  Profile-specific status then determines whether that catalogue bookmaker can be used.
- A target bookmaker remains editable while its row is `Prospecting`. `Active` is usable;
  `Pending Sign Up` and `Limited` are usable with an explicit confirmation warning. `Gubbed`,
  `Blocked`, inactive and unconfigured accounts remain visible but unavailable. `Bonus Restricted`
  remains unavailable for promotional offers. A rejected replacement leaves the existing target
  unchanged.
- Copy-down may copy back stake, back odds, lay odds and strategy. Exchange is copied only when it
  is active for the target profile; otherwise the target's resolved default remains.
- Copy-down remains disabled until the source has valid back stake and odds and, for a lay
  strategy, an active exchange and valid lay odds. The disabled control states the missing
  precondition instead of silently doing nothing.
- When a target moves from `No Lay` to a lay strategy with no stored exchange, Plum Duff persists
  that profile's resolved active default exchange before calculating the suggested lay.
- Copy-down must clear the copied lay stake and recalculate the target-specific suggestion. A lay
  stake from one profile is never authoritative for another profile.
- Back and lay odds are normalised to two decimal places on field exit and API persistence.
- Per-target autosaves are ordered. A slower response from an older field edit must never replace
  newer odds, strategy, bookmaker or suggested-lay state in the interface.

### Opportunity removal

- Deleting an opportunity with only unplaced rows physically removes those draft rows and the
  workflow container.
- If any linked row is already `Placed`, `Settled` or `Free Bet Awarded`, those rows are retained
  and the workflow container is archived. Remaining unplaced drafts are deleted.
- Opportunity removal never deletes or rewrites a placed financial ledger row.
- A Prospecting target row offers separate `Reset Row Data` and `Remove from Opportunity` actions.
  Reset preserves the linked row and opportunity defaults while clearing operator-entered
  placement values. Remove physically deletes that unplaced sportsbook row and hides the target.
- A Fund Manager may add an omitted profile or restore a removed target from Stage 2. Restoration
  creates a new isolated Prospecting sportsbook row after rechecking current profile eligibility.

The Fund Manager profile directory may provide the candidate-selection entry point, but it must
hand control to this sequential workflow. Directory selection is not row creation and must never
become an implicit bulk-submit action.

## Eligibility rules

- The selected bookmaker/account must exist for the target profile.
- The target profile must be `Active`.
- Account status must permit offer entry. `Active` is available. `Pending Sign Up` and `Limited`
  remain selectable with a visible warning and require Fund Manager confirmation. `Inactive`,
  `Gubbed`, `Blocked` and unconfigured accounts are unavailable. `Bonus Restricted` blocks
  promotional offers.
- Exchange and commission resolve from the target profile settings, not the source row.
- A lay strategy requires an active target exchange with a configured commission rate.
- Missing required target-profile authority values block that target only.
- A blocked profile is never silently skipped or written.
- Candidate selection should identify unavailable profiles before review where account data is
  already known, while preserving the blocked reason in the final result.
- Profile-directory search, reporting inclusion, status filters and pinning do not define offer
  eligibility. Eligibility is resolved from the target profile's current account authorities.

## Copy rules

Safe shared draft fields may include offer, offer type, offer programme, bet type, fixture type,
event, market, default stake, minimum odds, expected settlement and reward timing. Financial and
placement values remain editable per profile. Source notes and placed multi-lay branch state are
not copied. Every created row receives its own id, `profile_id`, calculation audit and timestamps.

An opportunity batch is an auditable workflow container, not a financial ledger row. It must never
contribute directly to P&L, bankroll, reports or exposure. Only its profile-owned sportsbook rows
feed calculations and reports.

## Status and safety

- Drafting or copying does not place or confirm a real bet.
- Each target row starts in the explicitly selected draft/prospecting state.
- Saved-row copying remains sequential. Opportunity-first batches may record multiple selected,
  individually valid profile rows as placed in one operator action.
- Failure for one profile does not rewrite a successfully confirmed row for another profile.

## Calculations and reports touched

- Use existing row calculation contracts independently for each target profile.
- Cross-profile views aggregate the resulting profile rows; they do not own them.
- No calculation result is copied as authoritative when target odds/commission differ.

## Audit requirements

Record source draft id, batch/copy group id, target profile, copied fields, changed fields, eligibility result, actor and submit result. Do not copy notes containing sensitive profile-specific information by default.

## Tests and Playwright path

- two eligible targets with different odds create two isolated rows in addition to the unchanged source
- inactive/gubbed target account blocks only that profile
- target commission resolves from target settings
- sequential confirmation required
- cancel before target submit creates no target row
- partial batch result is explicit and auditable
- UI: source draft -> select profiles -> review Profile 1 -> submit -> review Profile 2 -> submit -> result summary
- opportunity UI: Fund Manager dashboard -> shared setup -> eligibility/selection -> create
  Prospecting rows -> per-profile placement table -> record selected valid rows as placed
- minimum odds prevents a below-threshold profile row from being recorded as placed
- complex-strategy handoff preserves every other target row and the resumable batch
- bulk record action ignores invalid/unselected rows and never invokes third-party bet placement
- deleting an unplaced workflow removes its draft rows; mixed workflows retain placed rows
- Mug Bet supports multiple bookmakers for one profile without sharing row identity
- copy-down recomputes each target's suggested lay from its own commission
- odds persist with two decimal places
- only the two newest resumable opportunities show by default; expanding reveals older batches
- changing a Prospecting target to another eligible bookmaker updates that target and linked row,
  while an ineligible bookmaker is rejected
- rapid strategy/odds autosaves retain the newest suggested-lay state
