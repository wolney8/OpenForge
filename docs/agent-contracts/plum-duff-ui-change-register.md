# Plum Duff UI Change Register

## 2026-09-16 local integration evidence

The accepted plain reference-card contract is now served by the normal local application at
`http://localhost:3010` from product `2ba9993`. The three Multi-Lay ledger checks pass with their own
synthetic routes. A reviewed Simple/Advanced plan must patch `match_strategy` and `lay_plan_json`
together; a range control may not select Custom until a real pointer or keyboard interaction occurs;
manual Save supersedes any older queued calculator autosave. Main and Vercel remain unchanged.

## PD-CALC-UI-PARITY-20260915 — compact shared calculator references

Acceptance correction: product `8f5dc5876a2830947fbfb79a88a89b4da171858d` supersedes the
shortened-chevron design below. Standard-style reference cards are now plain equal summaries in
Underlay/Standard/Overlay order; Custom/input/Copy/slider and then Outcomes follow. Reference cards
have no chevrons, Total, preamble or Apply/Use-plan action. Multi-Lay retains only necessary all-leg
allocation actions. The rule is proven on standalone, pop-out and Sportsbook/Free Bet editors,
including 200% text reflow.

PD-FIX-231–236 replace two drifting result presentations with one shared reference-card rule.
Standard, pop-out and the Sportsbook/Free Bet calculators use short Standard/Underlay/Overlay/
Custom Lay headings, contextual keyboard help, a compact fixed chevron-label track and independent
value/copy columns. Reference cards have no `Total` heading; the full Exchange/Bookmaker/Total grid
remains exclusive to Outcomes. Custom keeps its editable stake, direct Copy and slider together.

Multi-Lay now puts Bet Type, Mode and Exchange before its Back/Lay content, keeps Back Stake/Odds
as a stack, and uses the same reference rows. Product `c7d923e` passes 1280/720/390, light/dark,
enlarged-text, keyboard and reduced-motion checks plus native and converted save/reopen flows. No
calculator formula, actual placement, historical record or global Outcomes semantics changed.

## PD-CALC-20260914 — visible core planner C04–C07 / core C09

2026-09-15 useful-bundle addendum: the same Sportsbook editor now exposes all four Profit Boost
source modes and conditional Cashback eligibility/cap/receipt fields. Matching shows source inputs,
raw and effective odds, bookmaker return/profit and accepted-odds precedence. Settlement records
cash receipt identity/date/amount or links existing awarded credit without treating credit as cash.
Offer switching clears incompatible drafts; latest-edit protection, shared footer errors, percentage
commission, modal focus and copy-only planning remain unchanged. Real 1440 light and 760 dark
browser checks show no page overflow; native/conversion save/reopen and report/reload pass.
Existing fields, tabs, FinancialValue, Outcomes, selectors and footer actions were reused—no new
visual primitive or local positional workaround. Screen-reader execution remains NOT TESTED.

2026-09-14 engineering continuation: shared focus lifecycle/native ModalBoundary now retain focus
through disabled Save and nested keyboard cycling, return the original opener, and expose Matching
HTTP/network errors in canonical footer alerts. Selected-record footer actions use explicit shared
tracks and constrained-container stacking; six selected plus eighteen empty modal variants cover
pairwise collision, pointer Save, keyboard, both themes and enlarged text. No hidden overflow or
route-specific positional patches. Profit Boost uses existing request revision/abort/input-key rules;
offer changes reset incompatible Custom/reward drafts without altering explicit saved/pop-out input.
Outgoing fixed-source evidence is recorded in the existing audit, not inferred from these components.

Canonical equivalents: accepted CalculatorSegmentedControl, CalculatorSegmentEyebrow,
CalculatorReferenceSection/CalculatorOutcomes, CommissionInput, CopyableFinancialValue,
SingleLayCustomSlider and existing ledger modal/footer. No family-specific financial engine/CSS.
New native/versioned Normal Sportsbook and SNR Free Bet reuse these standalone/pop-out components.
All Advanced references visible; slider follows Custom; percentages have explicit ratio units;
copy-only/apply-plan/explicit actual-confirmation semantics consume lay-plan-v1. Historical null
plans require explicit eligible replan. C08 and broader C01/C02 remain tracked, not superseded.

Implementation checklist: instructions/equivalent search completed; shared tokens/Material icons/
stable input IDs/inline errors reused; typecheck and targeted lint pass. Four hub/pop-out and six
embedded geometry/theme/keyboard cases pass, including desktop200% text separately from narrow
390px and combined half-width200%. No page/editor overflow, full-width references, focus trap,
dirty Escape preservation and pointer Save assertions. Changed shared Standard/Multi-Lay/Sequential/
Early Payout presentation has eight representative no-overflow/eyebrow checks. Final native/conversion
and award evidence resides in the current audit; screen-reader behaviour remains UNVERIFIED.

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
