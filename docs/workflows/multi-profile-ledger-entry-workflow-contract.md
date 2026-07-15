# Workflow Contract: Multi-Profile Ledger Entry

_Last updated: 2026-07-14_

## Status and scope

- Status: Draft, ready for human review
- Milestone: M11 Fund Manager Add Bet Ledger to Multiple Profiles Workflow
- User: Fund Manager only
- Initial records: sportsbook rows, followed later by free-bet rows

## User goal

Use one offer as the starting point for sequentially creating similar profile-scoped rows without opening every tracker manually, while still reviewing and submitting each profile separately.

## Workflow

1. Create or select a source draft for Profile 1.
2. Choose `Copy to profiles` and select candidate profiles.
3. Resolve account eligibility separately for each target profile.
4. Open a sequential review step for each eligible profile.
5. Copy shared descriptive fields, but require review of profile-variable fields such as bookmaker account, back odds, exchange, lay odds, stake, commission and settlement details.
6. Submit Profile 1 explicitly, then Profile 2 explicitly, continuing in order.
7. Show a final per-profile result list: created, skipped, blocked or failed.

The Fund Manager profile directory may provide the candidate-selection entry point, but it must
hand control to this sequential workflow. Directory selection is not row creation and must never
become an implicit bulk-submit action.

## Eligibility rules

- The selected bookmaker/account must exist for the target profile.
- Account status must permit offer entry; `Inactive`, `Gubbed` or `Bonus Restricted` blocks offer-dependent copying unless an approved rule says otherwise.
- Exchange and commission resolve from the target profile settings, not the source row.
- Missing required target-profile authority values block that target only.
- A blocked profile is never silently skipped or written.
- Candidate selection should identify unavailable profiles before review where account data is
  already known, while preserving the blocked reason in the final result.
- Profile-directory search, reporting inclusion, status filters and pinning do not define offer
  eligibility. Eligibility is resolved from the target profile's current account authorities.

## Copy rules

Safe shared draft fields may include offer, offer type, offer name, bet type, fixture type, event and market. Financial/placement fields are proposed values only and remain editable per profile. Every created row receives its own id, `profile_id`, calculation audit and timestamps.

## Status and safety

- Drafting or copying does not place or confirm a real bet.
- Each target row starts in the explicitly selected draft/prospecting state.
- There is no single bulk-submit action in the first implementation.
- Failure for one profile does not rewrite a successfully confirmed row for another profile.

## Calculations and reports touched

- Use existing row calculation contracts independently for each target profile.
- Cross-profile views aggregate the resulting profile rows; they do not own them.
- No calculation result is copied as authoritative when target odds/commission differ.

## Audit requirements

Record source draft id, batch/copy group id, target profile, copied fields, changed fields, eligibility result, actor and submit result. Do not copy notes containing sensitive profile-specific information by default.

## Tests and Playwright path

- two eligible profiles with different odds create two isolated rows
- inactive/gubbed target account blocks only that profile
- target commission resolves from target settings
- sequential confirmation required
- cancel before target submit creates no target row
- partial batch result is explicit and auditable
- UI: source draft -> select profiles -> review Profile 1 -> submit -> review Profile 2 -> submit -> result summary
