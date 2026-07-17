# M14 External Calculator Research Handoff Prompt

> This original broad brief is retained for reference, but it should not be sent
> as one request. Most search-enabled LLMs cannot operate JavaScript calculator
> controls, and the combined output is too large for a reliable single response.
> Use `docs/codex/m14-external-calculator-staged-handoff-prompts.md` instead.

Use the prompt below with an LLM that has reliable web access. Replace the URL placeholders with the public calculator pages to be analysed. Run one calculator family per research pass where possible so evidence and fixtures remain reviewable.

---

You are performing bounded public-web research for Plum Duff, a local-first matched-betting tracker. Your task is to analyse the observable behaviour of free, publicly accessible matched-betting calculators and produce evidence-backed candidate documentation. Do not implement application code.

## Safety and legal boundaries

- Use only calculator pages available without login or payment.
- Do not bypass access controls, CAPTCHAs, rate limits, paywalls or technical protections.
- Do not use bookmaker/exchange accounts, cookies, credentials or real betting data.
- Do not reproduce proprietary source code, site branding, long text passages or visual assets.
- Do not make automated wagers, scrape live odds or interact with betting accounts.
- Use synthetic examples only: `Bookmaker A`, `Exchange A`, `PROFILE-001`, and invented events.
- Respect robots, site terms and reasonable request rates.
- If inspection is blocked or terms prohibit the work, record that limitation and stop.

## Plum Duff authority rules

- The Plum Duff workbook and current source pack remain the source of truth for tracker workflow and cash-first current value.
- External calculators are reference evidence, not automatic authority.
- Keep calculator/reference values separate from actual user-entered placement values.
- Keep projected/current value separate from settled/final value.
- Never replace Plum Duff's conservative cash-first `MIN()`-style current value with a generic equal-profit headline.
- Do not infer a formula from one example. Use multiple controlled input changes.

## Calculator family

Research this calculator family:

- Family: `[STANDARD / FREE BET SNR-SR / REFUND-BONUS LOCK-IN]`
- Primary URL: `[https://www.teamprofit.com/calculator]`
- Comparison URL if available: `[https://matchedbettingblog.com/matched-betting-calculator/]`
- Access date: `[14 JUL 2026]`

## Required method

1. Record the calculator's visible inputs, defaults, units, options, validation rules and outputs.
2. Identify which inputs are mandatory and which controls appear conditionally.
3. Run a deterministic synthetic test matrix that varies one input at a time.
4. Include normal, boundary, invalid and rounding-sensitive cases.
5. Record exact observed outputs, including displayed precision and wording.
6. Infer candidate formulas only after enough observations distinguish competing formulas.
7. Mark every claim as `Observed`, `Inferred`, `Documented by source`, or `To confirm`.
8. State confidence as `High`, `Medium` or `Low` and explain why.
9. Compare results with a second public calculator where possible.
10. Map calculator outputs to Plum Duff fields without treating suggested stakes as actual placed stakes.

Do not use minified JavaScript as the sole evidence. If public client-side code is readable, describe behaviour and formula structure in your own words; do not copy implementation code.

## Minimum synthetic test matrix

Include at least:

- zero/blank input behaviour
- minimum valid stake
- ordinary decimal odds
- high odds
- zero commission
- non-zero commission
- a half-penny or other rounding boundary
- Standard strategy where applicable
- Underlay and Overlay where applicable
- Custom/actual stake where applicable
- void/cancelled or no-result behaviour if exposed
- every conditional branch specific to the calculator family

For refund/cashback calculators also vary maximum bonus, retention percentage and trigger side. For multi-outcome calculators vary outcome count and per-outcome commission. For each-way/extra-place calculators vary place terms and dead-heat inputs if exposed.

## Required output

Produce five sections.

### 1. Evidence report

- page title, provider, URLs and access date
- visible calculator workflow
- input/output dictionary
- defaults and validation
- observed test table
- limitations and inaccessible evidence
- source citations adjacent to claims

### 2. Candidate formula model

- formulas in named fields, not site-specific variable names
- commission treatment
- liability treatment
- standard/underlay/overlay/custom branches
- scenario P&L branches
- rounding order and precision
- blank/error handling
- unresolved ambiguities

### 3. Plum Duff adaptation

- spreadsheet/workbook equivalent
- calculator/reference outputs
- actual placement inputs
- projected/current scenario values
- settled/final values
- manual override/audit requirements
- changes needed to preserve cash-first conservative current value

### 4. Candidate calculation contract

Draft a contract following `docs/templates/calculation-contract.md`. Set status to `Research draft - human approval required`. Do not claim approval.

### 5. Candidate fixture pack

Provide:

- a fixture-spec table
- valid JSON containing deterministic synthetic inputs and expected outputs
- source/evidence reference for every expected numerical result
- acceptance tolerance
- explicit `To confirm` markers for any result that could not be independently reproduced

## Completion rule

Stop after research documentation, candidate contract and fixtures. Do not modify Plum Duff application code. End with a concise list of contradictions between the external calculator, Plum Duff workbook and common matched-betting conventions.

---
