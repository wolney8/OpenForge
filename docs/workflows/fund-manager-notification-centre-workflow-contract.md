# Workflow Contract: Fund Manager Notification Centre

_Last updated: 2026-07-21_

## 1. Workflow name

- Name: Fund Manager notification centre
- Initial notification sources: active partial-lay and free-bet follow-up reminders

## 2. User goal

Give the Fund Manager one persistent top-bar location for time-sensitive operational notifications,
with direct links back to the affected profile and ledger row.

The notification centre is an attention and navigation layer. It does not replace the underlying
tracker workflow or change a financial value. Its explicit green completion action is an alternate
entry point to the same audited reminder resolution used in the sportsbook ledger.

## 3. Entry point and layout

- entry point: bell icon in the global top bar, immediately before the back/lay colour-theme control
- route availability: all current Fund Manager routes, including login, profiles, global settings,
  reports and every profile tracker route
- empty icon: Material Symbol `notifications`
- retained notification icon: Material Symbol `notifications_active`, including when all retained
  notifications have been read
- unread badge: exact count from `1` to `9`, then `9+`
- panel: bounded non-modal popover with a fixed header and independently scrollable notification list
- profile context: notifications may span all profiles managed by the local Fund Manager

## 4. Notification lifecycle

| Action | Notification result | Underlying reminder result |
|---|---|---|
| Reminder becomes active or is reopened | New unread notification | Remains `Active` |
| Hover notification for at least 750 ms | Marked read; unread dot and badge count update; active bell remains | Remains `Active` |
| Brief pointer pass under 750 ms | Remains unread | Remains `Active` |
| Focus or activate notification | Marked read immediately for keyboard and action clarity | Remains `Active` |
| Reminder reaches its due calendar day | Re-enters unread state if its due-day stage was not already read | Remains `Active` |
| Reminder reaches four hours before due | Re-enters unread state if its four-hour stage was not already read | Remains `Active` |
| Reminder reaches two hours before due | Re-enters unread state if its two-hour stage was not already read | Remains `Active` |
| Mark all as read | All visible notifications marked read | Remain `Active` |
| Mark task done | Moved to `Done` until related settlement time passes | Becomes `Resolved` with an audit note |
| Clear one task notification | Inline `Are you sure?` confirmation, then hidden locally | Source state is unchanged |
| Clear notifications | All visible notifications hidden locally | Remain `Active` |
| Resolve reminder in its ledger workflow | Moved to `Done` until the related lifecycle cutoff passes | Becomes `Resolved` with audit note |
| Dismiss reminder in its ledger workflow | Removed from the notification centre | Becomes `Dismissed` with audit note |

Read and cleared state is local view state for the single local Fund Manager MVP. Resolving or
dismissing the source reminder remains a profile-scoped, audited sportsbook action.

Read state is stored against the reminder's current attention stage: `created`, `due-day`,
`due-4h`, or `due-2h`. A previously read reminder becomes unread again when it reaches a later
stage. If it is already unread, crossing a threshold leaves the existing card and single unread
badge contribution in place; it never creates duplicate cards or increments the count more than
once for the same reminder.

The `New` / `Done` toggle separates active work from completed tasks. Both views are derived from
the audited reminder state returned by the server. `Resolved` tasks remain under `Done` until
`settles_at`; they do not become a second source of financial or ledger truth.

## 5. Data boundaries

- source records remain profile-scoped in their owning ledger table
- every response carries `audience = fund_manager`; this feed must never be returned to a future
  subscriber session
- the feed endpoint returns only presentation-safe operational metadata and profile-scoped links
- notification identity includes profile, ledger row and latest reminder action timestamp
- each task exposes a source-specific completion endpoint; the notification UI must not hard-code
  sportsbook completion for other ledger sources
- reopening or materially updating a reminder creates a new notification identity
- local read/dismissed state must not contain credentials, financial inputs or workbook data

## 6. Interaction and accessibility

- the bell has a contextual accessible name including unread count
- notification cards expose the action title, source ledger, bookmaker, bet event or offer fallback,
  profile, due time and target link
- the line directly beneath the title uses `<ledger> · <bookmaker> · <record context>` so future
  notification sources remain identifiable without relying on the action title
- unread state is represented by text semantics and a coloured dot, not colour alone
- Escape closes the panel and returns focus to the bell
- outside click and page scroll close the panel
- every closed-to-open transition defaults the panel to `New`, regardless of the previously viewed
  section
- the three-dot action menu contains `Mark all as read` and `Clear notifications`
- task cards use a green Material completion action; destructive clearing requires inline
  confirmation rather than a nested modal
- disabled actions remain unavailable when their exact preconditions are false
- all important controls and regions use stable `data-pd-id` identifiers

## 7. Calculation and safety boundary

- no calculation is introduced or changed
- reading or clearing a notification must not change stake, liability, exposure, current value,
  settled value, status, result or reminder state
- resolving the source reminder remains governed by its source workflow contract:
  `docs/workflows/partial-lay-follow-up-workflow-contract.md` or
  `docs/workflows/free-bet-follow-up-reminder-workflow-contract.md`

## 8. Tests required

- active reminders appear once with the correct profile-scoped link
- notification context identifies both the source ledger and affected bet
- resolved reminders move to `Done` whether resolution occurs in the ledger or notification centre
- dismissed reminders disappear from the feed
- unread count excludes read and locally dismissed notifications
- count above nine renders `9+`
- bell precedes the back/lay colour-theme control
- panel remains inside viewport and does not create page-level horizontal scroll
- pointer hover shorter than 750 ms does not mark a notification read
- pointer hover of at least 750 ms marks a notification read
- keyboard focus and activation mark a notification read immediately
- opening the panel always selects `New`
- a read reminder becomes unread again on its due day, four hours before due and two hours before
  due
- an unread reminder remains one card and one unread badge contribution as thresholds advance
- mark-all-read removes unread badge without hiding notifications or deactivating the bell
- task completion resolves the source reminder and moves the card to `Done`
- completed cards disappear after the related bet settlement time
- task clear requires inline confirmation
- clear hides notifications without resolving the source reminder
- Escape closes the panel and restores trigger focus

## 9. Deferred extensions

Future approved Fund Manager notification sources may include automatic free-bet expiry, overdue
settlement, account-health actions, cash-adjustment follow-ups and fee-review blockers. Each source
requires its own workflow contract and deterministic fixture before it can enter this shared feed.

Subscriber notifications are a separate deferred product surface. They require a subscriber-only,
profile-scoped endpoint, separate view state and explicit visibility contract; they must not reuse or
expose this cross-profile Fund Manager feed.
