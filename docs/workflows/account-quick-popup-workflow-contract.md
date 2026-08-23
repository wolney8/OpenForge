# Workflow Contract: Account Quick Popup and Bookmaker Hygiene

_Last updated: 2026-08-21_

## Status

- Status: Draft
- Scope: Fund Manager profile tracker workflows
- Related planning:
  - `docs/planning/account-extra-places-fund-manager-discovery.md`
  - `docs/planning/github-contract-coverage-audit-2026-08-21.md`
- Related contracts:
  - `docs/contracts/account-health-intelligence-contract.md`
  - `docs/contracts/account-health-review-contract.md`

## Purpose

Give the Fund Manager a fast, non-disruptive way to inspect and update bookmaker/exchange account
state while working inside profile-ledger workflows.

This popup is operational. It is not a replacement for the full Accounts route.

## Entry points

- click bookmaker/exchange identity from a Sportsbook, Free Bets or Casino row
- click a quick account action from the profile tracker shell
- later: access from subscriber-safe views only where explicitly approved

## Primary user goals

- confirm or adjust current bookmaker/exchange balance
- mark promo state, restriction state or customer-service state
- see recent operational context without leaving the current workflow
- jump to a fuller account view only when deeper work is needed

## Core popup contents

- account identity and profile context
- current balance
- promotional state
- restriction state
- support/live-chat request state
- recent placed/settled counts for the active tracker range
- recent offer count for the active tracker range
- quick account note field

## Workflow rules

- popup opens above the current workflow context; it must not create modal-on-modal confusion
- the current tracker modal remains the source workflow
- saving popup changes must autosave the account change only
- popup close must return focus to the invoking control
- no bookmaker password, session, cookie or sensitive credential fields are stored here

## Route and data rules

- account popup is profile-scoped
- tracker-range summaries shown in the popup must respect the current active tracker range
- popup balance is current-state account balance, not selected-range P&L
- later account reconciliation automation must remain explicit and auditable

## Acceptance criteria

- Fund Manager can open the popup from at least one ledger identity surface
- popup can update balance and status without leaving the current ledger
- recent account context respects the active tracker range
- popup does not introduce nested-scroll, focus-trap or hidden-footer regressions
- account quick actions remain distinct from full account-management routes
