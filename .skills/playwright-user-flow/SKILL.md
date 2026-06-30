# Playwright User Flow

## Purpose

Use this skill when defining UI workflow test expectations for OpenForge.

## Scope

This skill is for user-facing route flows such as:

- login
- profile selection
- tracker navigation
- profile-scoped data-entry flows
- reporting views

## Expectations

For each UI flow, define:

- entry route
- preconditions
- seed data or fixture state
- user steps
- expected route transitions
- expected visible assertions
- profile-context assertions
- error/empty-state assertions

## OpenForge-specific checks

- the active `profile_id` context must be obvious
- profile switching must not leak previous profile data
- current/projected values must be labelled if shown
- sensitive raw data must not appear in fixtures or recordings

## Output format

Provide a concise Playwright path spec, not implementation code, unless explicitly requested.
