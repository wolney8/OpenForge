# Workflow Contract: Reviewed Recurring Activities and Occurrences

_Draft requirement reconciliation: 2026-11-27; issues #86, #68, #72, #70, #82, #28. No scheduler or occurrence storage is approved or implemented by this document._

## Existing authority and boundary

Today already combines certain source-backed attention items, native links and viewer-scoped personal annotations. Account audit, manual offer/Combo foundations and financial ledgers retain their own permissions and commands. None is a general routine scheduler. A task occurrence, notification delivery, personal Track/work state, Account capability observation and financial source resolution are different records and actions. Opening, dismissing or completing a check never confirms access, places a bet or settles a source.

## Proposed reviewed activity

A user-reviewed definition has a stable routine ID/version, Profile or authorised scope, source reference, account/capability or reviewed offer family, what to check and why, timezone, source checked time/confidence, valid window, cadence and pause/archive state. Supported cadence requirements are daily, weekly, monthly, yearly, seasonal, one-off and named-event linked. Manual-only and Do Not Review account settings remain distinct from an automatic cadence. A changed definition preserves completed occurrences tied to its prior version.

Each generated occurrence needs stable `(routine version, Profile, window)` identity, source snapshot/as-of, due/expiry window and its own pending, completed, skipped, snoozed or No/Low Value disposition with optional reason/evidence. Refresh, retry or duplicate delivery cannot mint another occurrence or alert for the same identity. Completing one weekend cannot complete the next. Feedback may inform transparent future ordering but never silently changes the definition or financial state.

Before presentation or action, resolve current Profile permission, Account capability/eligibility and source freshness. A stale source prompts review; an event window cannot confirm a promotion. Use the accepted Today row/detail presentation and native destination. Show account, capability, task reason, window, last verified time and unknown evidence explicitly. A user may configure priority, cadence and notification/digest preferences. No AI provider is required for a deterministic queue.

## Decisions required before code

- Exact definition/occurrence storage, versioning, stable window key and idempotent delivery boundary.
- Next-due rule for missed occurrences; whether late work remains open or is skipped; snooze versus schedule shift; explicit close/pause effect on dormant Accounts.
- Europe/London and source timezone interpretation across DST gaps/overlaps, month-end/yearly dates, seasons and postponed/cancelled named events. Preserve completed history and avoid duplicate future tasks after event rescheduling.
- Notification/digest batching and user preference storage; source-change and unavailable-history behavior; Account review scheduling precedence versus routine scheduling.

The smallest proposed tranche is manual reviewed definitions plus deterministic occurrence creation and Today display for one Account capability recheck and one manually reviewed offer routine, using existing Account and native source destinations. Implement only after the storage/scheduling choices and synthetic cases in the [fixture spec](../fixture-specs/account-routine-event-advisory-fixture-spec.md) are approved. Recurring scheduling remains unimplemented.
