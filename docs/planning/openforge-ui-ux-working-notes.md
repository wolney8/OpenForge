# OpenForge UI/UX Working Notes

_Last updated: 2026-06-30_

## Purpose

This document records the current working interpretation of OpenForge UI/UX
expectations as they are discussed during build and testing.

These notes are:

- important enough to preserve across sessions
- not final product law
- expected to evolve through review, testing, and workbook-parity checks

If a later decision changes these notes, update this document rather than
assuming older chat context will be remembered.

## Standing interpretation

### Workbook parity first

- Preserve workbook structure, workflow order, and table expectations before
  applying broader UX enhancement.
- Default column ordering and alignment should follow the original tracker sheets
  as closely as practical.
- Enhancement is welcome only after parity is preserved or consciously
  trade-tested.

### Material and accessibility baseline

- Web UI should follow Google Material design principles as the primary UI
  system direction.
- Accessibility expectations should be aligned with WCAG guidance.
- Navigation, forms, tables, toolbars, focus states, contrast, and keyboard
  flow should be treated as first-class concerns, not late polish.

### Working interpretation, not fixed specification

- The user expects ongoing UI/UX refinement during development.
- Current layout, visual direction, controls, and table behaviour are working
  interpretations, not permanent final decisions.
- Design decisions should remain easy to revisit after smoke testing.

## Current tracker UI expectations

### Tracker section toolbar

- Each profile tracker needs a clear toolbar above the tracker row area.
- The toolbar should allow movement between tracker sections such as:
  - dashboard
  - accounts
  - sportsbook bets
  - free bets
  - casino offers
  - cash adjustments
  - reports
  - profit tracker
- This should be implemented with accessibility-safe navigation and Material-like
  interaction patterns.

### Table layout and workbook alignment

- Tracker modules are expected to render in table form.
- Default columns should mirror the corresponding workbook sheet structure.
- Row and column presentation should remain flexible for later enhancement.
- Adjustable table behaviour is expected later, but it should not break default
  workbook-style alignment.

### Filtering and pagination

- Tracker tables are expected to support data filtering.
- Tracker tables are expected to support pagination or another clear row-volume
  management pattern.
- These controls should be designed as part of the core tracker table
  experience, not as an afterthought.

### Add-row workflow

- Users should be able to add new rows from the tracker modules.
- The current shell-level draft-row affordance is only a bridge toward the real
  workflow.
- Final row-entry UX should still reflect workbook logic and field structure.

### Theming and user presentation settings

- Light mode and dark mode are required early for daily use and testing.
- Row/value colouring, emphasis styling, and motion can evolve later.
- Date formatting should be settings-driven, including support for regional
  preferences such as UK vs US display.
- Future personal tracker theming should be treated as a configurable
  presentation layer, not a structural replacement for workbook parity.

## How to use this document

- Review this document before making major tracker UI changes.
- Update it when the user clarifies expectations or reverses an earlier UI
  assumption.
- Treat contradictions between this note and implementation as issues to surface
  explicitly.
