# Workflow Contract: In-App Route Guard and Unsaved State Handling

_Last updated: 2026-08-21_

## Status

- Status: Draft
- Scope: all tracker modals, drawers and workflow editors

## Purpose

Replace browser-native leave warnings with a consistent in-app confirmation flow that respects
draft state, focused workflow context and the Plum Duff modal shell.

## Trigger conditions

- modal editor has actual unsaved ledger changes
- drawer or popup contains edited form state not yet persisted
- profile or route switch would discard meaningful changes

## Non-trigger conditions

- opening a row for view-only inspection
- switching tabs inside the same modal with no unsaved changes
- background refresh or non-mutating tracker navigation
- workflow-only helper state changing while comparable persisted data is unchanged

## Required UI behaviour

- use Plum Duff modal/dialog styling, not browser-native confirm
- concise copy only:
  - title
  - one explanatory sentence
  - actions
- actions:
  - `Stay`
  - `Discard changes`
  - optional `Save and continue` where the flow already supports it safely

## Acceptance criteria

- false-positive leave prompts are eliminated
- prompts appear only for genuine unsaved data
- focus returns cleanly after cancelling
- the same guard rules apply across sportsbook, free bets, casino and cash adjustments
