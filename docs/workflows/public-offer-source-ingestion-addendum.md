# Workflow Addendum: Approved Public Offer Source Ingestion

_Last updated: 2026-08-21_

## Status

- Status: Draft
- Parent contract: `docs/contracts/public-offer-source-ingestion-contract.md`

## Purpose

Define the next-level workflow rules for ingesting publicly visible offer sources after the baseline
source-ingestion contract.

## Approved source families for future scoped work

- curated welcome-offer pages
- curated reload-offer pages
- curated free-to-play or daily-offer pages
- approved Discord offer channels, if the integration is explicitly enabled later

## Non-goals

- no autonomous scraping against bookmaker accounts
- no private-session scraping
- no cookie capture, browser replay or odds-bot behaviour
- no direct placement automation

## Ingestion workflow expectations

- capture source URL, source type, observed time and basic extracted offer fields
- classify each candidate as:
  - `new`
  - `duplicate`
  - `needs review`
  - `rejected`
- route accepted candidates into Fund Manager review before they become platform-authoritative lists
- keep source lineage visible so the Fund Manager can see where a suggested offer came from

## Source-specific expectations

### Welcome / sign-up sources

- support bookmaker identity reconciliation against the master account catalogue
- highlight linked risk-team/operator relationships where known

### Reload / daily sources

- support recurrence markers such as daily, weekly, festival, season opener or ad hoc
- allow the Fund Manager to convert approved offers into common bet combos or opportunity-first
  workflows later

### Discord sources

- Discord ingestion must remain read-only and review-gated
- channel-level allow/deny lists are required before production use
- extracted posts must not become tracker rows automatically

## Acceptance criteria

- future source ingestion work uses this addendum plus the baseline source contract
- extracted offers always retain their source lineage
- no source can create authoritative tracker data without Fund Manager review
