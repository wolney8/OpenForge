# Plum Duff UI Change Register

Record approved, durable UI requirements here when they alter a shared workflow or a
first-class ledger. This prevents implementation from silently drifting between request,
code, tests and parity review.

## 2026-08-24: Extra Place presentation contract

- The Extra Place table defaults to an **EP theme**. Its page-local left/right switch uses a
  horse icon for EP and a palette icon for the global Back/Lay theme.
- EP swatches are exact: Back light `#D4E6FF` / dark `#7DAAE8`; Win Lay light `#FAB6C2` /
  dark `#E18494`; Place Lay light `#FDE4E1` / dark `#E18E84`.
- The EP/Back-Lay selector is a left/right segmented control, not independent pills. Its options
  use the Material horse and palette icons and EP is the default.
- Column visibility belongs in the Extra Place Filter modal. Date/time, Runner/Race, Bookmaker,
  E/W Stake, Qualifying Loss, Extra Place Profit and Actions are always shown.
- Back-group columns include read-only derived **Place Odds**. It is calculated from the selected
  each-way term, never manually entered: `1 + ((back odds - 1) / term denominator)` for the
  current `1 / n` term model. For example, back odds `6.00` at `1 / 5` produces Place Odds
  `2.00`. It is the bookmaker's decimal odds for the place part of an each-way bet.
- Outcome values are always colour-coded: positive green, negative red and zero neutral. Stakes
  and liabilities remain neutral.
- Extra Place must inherit canonical Plum Duff modal/footer/action geometry before applying this
  page-specific presentation.
- The outcome-card heading uses the shared `calculator-result-card` geometry without a local
  vertical offset. Negative matrix components and totals are red; positive values are green.

## 2026-08-24: Extra Place contrast and action parity correction

- Approved EP swatches always use the dark foreground `#142533` for table headers and calculator
  section labels in both light and dark application modes. Grey copy is not permitted on these
  coloured surfaces.
- Outcome matrix components are semantic: positive is the shared success token, negative is the
  shared destructive token, and zero/unavailable is neutral. The value element owns this colour so
  parent outcome-row styles cannot override it.
- Extra Place uses the shared modal Save and Delete styles without page-specific overrides. Save
  retains the canonical blue shared action and Delete retains the canonical red destructive action.
