# Contract: Fund Manager Tracker Authorities

_Last updated: 2026-07-20_

## Status and ownership

- Status: Approved for implementation
- Related issue: GitHub issue `#32`
- Authority owner: Fund Manager
- Profile scoped operational state: Yes

## Universal authority

The Fund Manager owns shared, editable lists for:

- master accounts: bookmakers, exchanges and banks
- sportsbook and free-bet offer names
- casino offer names
- offer types
- bet types
- fixture types
- strategies and operational row statuses where editing is safe
- groups, platforms and risk teams

Ledgers consume active universal authority values. Archiving an authority prevents new selection but
does not rewrite or invalidate historical rows. Imported legacy values remain displayable and must
be explicitly mapped before reuse when no active authority exists.

Campaign tags are deliberately excluded. A campaign tag is free text owned by its ledger row and
must not be filtered, suggested or persisted as a controlled authority.

## Profile account relationship

The universal catalogue says an account exists. Each profile separately records whether and how it
can use that account.

Lifecycle is one of:

- `Not Signed Up`
- `Pending Sign Up`
- `Verification Pending`
- `Active`
- `Suspended`
- `Closed`
- `Archived`

Restrictions are independent flags so valid combinations are representable:

- `Bonus Restricted`
- `Soft Limited`
- `Casino Only`
- `Sportsbook Only`
- `KYC Blocked`
- `Risk Blocked`
- `Deposit Restricted`
- `Withdrawal Restricted`

Restrictions are manually recorded operational facts. Plum Duff must not infer KYC or risk status.

## Eligibility rules

- `Active` with no blocking restriction is usable.
- `Pending Sign Up`, `Verification Pending` and `Soft Limited` remain visible with warnings.
- `Bonus Restricted` blocks promotional sportsbook/free-bet offers but permits non-promotional mug bets.
- `Casino Only` blocks sportsbook/free-bet rows; `Sportsbook Only` blocks casino rows.
- `KYC Blocked`, `Risk Blocked`, `Suspended`, `Closed`, `Archived` and `Not Signed Up` are unavailable.
- The UI explains why an account is unavailable and never silently chooses a replacement.

## Legacy compatibility

Legacy flat statuses load as follows without rewriting historical audit values:

- `Gubbed` -> lifecycle `Active` plus `Bonus Restricted`
- `Limited` -> lifecycle `Active` plus `Soft Limited`
- `Blocked` -> lifecycle `Suspended`; restriction reason remains `To confirm`
- `Inactive` / `Not Using` -> lifecycle `Not Signed Up`

## Safety and tests

- Every profile-account relationship requires `profile_id` and account/catalogue identity.
- Updating one profile never changes another profile's relationship.
- Universal authority edits never modify profile balances, credentials or ledger rows.
- No passwords, cookies, MFA data or banking secrets are stored.
- Fixtures cover eligibility by ledger, combined restrictions, legacy mapping and profile isolation.

