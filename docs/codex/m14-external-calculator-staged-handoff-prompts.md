# M14 External Calculator Staged Handoff Prompts

_Last updated: 2026-07-14_

## Why this version exists

Ordinary LLM web search can often read a page but cannot operate a JavaScript calculator. Asking one response to inspect multiple sites, run dozens of cases, infer formulas, understand Plum Duff and draft contracts is also too broad.

Use this sequence for one calculator URL and one calculator mode at a time. The external model produces only a compact evidence packet. Codex will compare that evidence with the workbook and create the final Plum Duff contract and fixture files.

## Operating rule

Do not send every phase at once. Complete one phase, retain its output, then start the next phase in the same conversation if capacity allows. A comparison calculator is a separate research run after the primary calculator is complete.

## Phase 0: Capability check

```text
I need a capability check before assigning research.

Target URL: [INSERT ONE PUBLIC CALCULATOR URL]
Calculator mode: [INSERT ONE MODE, E.G. STANDARD QUALIFYING]

Can you actually interact with this page's JavaScript controls, enter values, activate Calculate, and read the resulting values?

Do not perform the full research yet. Reply with only:

1. Page retrieval: YES/NO
2. Interactive form control: YES/NO/UNCERTAIN
3. Result text observable after calculation: YES/NO/UNCERTAIN
4. Access limitation encountered
5. Recommended route: INTERACTIVE RESEARCH / MANUAL CAPTURE REQUIRED / STOP

Do not claim interactive access merely because you can read the page HTML or search result.
```

If the result is `MANUAL CAPTURE REQUIRED`, skip to the manual route below. If it is `INTERACTIVE RESEARCH`, continue.

## Phase 1: One-page inventory

```text
Inspect only this one public calculator and this one mode.

URL: [INSERT URL]
Mode: [INSERT MODE]
Access date: [INSERT DATE]

Do not infer formulas and do not compare another site yet.

Return no more than 1,200 words containing:

- page/provider title
- visible input labels
- default values
- units and accepted formats
- selectable modes/options
- conditional controls in this mode
- visible output labels
- validation or error messages observed
- whether a Calculate action is required
- any access limitations

Mark each item OBSERVED or TO CONFIRM. Paraphrase page text and do not copy source code or long proprietary wording.
```

## Phase 2: Generate a small test batch

```text
Using the inventory above, propose exactly six synthetic test cases for this one calculator mode.

The six cases must cover:

1. ordinary zero-commission case
2. ordinary non-zero commission case
3. one changed odds input while other values remain fixed
4. one changed stake input while other values remain fixed
5. one rounding-sensitive decimal case
6. one blank/invalid/boundary case

For a specialised calculator, replace only the least relevant ordinary case with one mode-specific branch such as SNR/SR, refund retention, cashback trigger, multi-outcome, each-way place terms or early payout.

Return only a compact table of exact values to enter. Do not invent outputs.
```

## Phase 3: Execute only the six observations

```text
Execute only the six agreed synthetic cases on the public calculator.

Safety boundaries:

- no login, paywall bypass, CAPTCHA bypass or live betting account
- no bookmaker/exchange credentials or real data
- no automated wagering or live-odds scraping
- stop if the page blocks interaction

For each case record:

- exact inputs entered
- exact displayed outputs
- displayed decimal precision
- validation/error state
- any conditional control change

Return valid JSON shaped like the observation template in:
`docs/templates/m14-calculator-observation-packet.json`

Do not infer formulas in this phase. Use null plus a limitation note for an output you cannot observe. Do not fabricate a result.
```

If six cases are too many, run cases 1-3 first and cases 4-6 in a second message. Append observations; do not rewrite earlier results.

## Phase 4: Formula inference from observations

```text
Use only the supplied calculator inventory and observed input/output JSON. Do not perform additional web research unless a specific ambiguity requires one extra controlled test.

For each output:

- propose the candidate formula using descriptive field names
- explain which observation pairs support it
- identify commission treatment
- identify rounding order and precision
- list alternative formulas still compatible with the evidence
- assign HIGH, MEDIUM or LOW confidence
- mark unsupported behaviour TO CONFIRM

Reject any formula that cannot reproduce every relevant observed output within the displayed precision. Keep the response under 1,500 words.
```

## Phase 5: Evidence packet finalisation

```text
Produce one compact final evidence packet for this calculator mode. Do not draft a Plum Duff contract.

Include only:

1. URL, provider, mode and access date
2. input/output inventory
3. the six observed cases as valid JSON
4. candidate formulas and confidence
5. rounding and commission findings
6. unresolved questions
7. access limitations

Clearly distinguish OBSERVED from INFERRED. Include direct page citations for page-level claims and observation case IDs for numerical claims.

Stop after the evidence packet. Plum Duff Codex will perform workbook comparison, contract drafting and fixture acceptance.
```

## Manual capture route

Use this route when the LLM can read the page but cannot operate it.

1. Ask the LLM to complete Phases 1 and 2 only.
2. A human or browser-capable agent enters the six proposed cases.
3. Record inputs and displayed results in a copy of `docs/templates/m14-calculator-observation-packet.json`.
4. Give the completed JSON back to the LLM for Phases 4 and 5, or directly to Codex.

Manual capture is preferable to fabricated automation. Six controlled cases for one mode are enough for an initial formula hypothesis; Codex may request a small follow-up batch when two formulas remain possible.

## Handoff to Codex

Return these items to Codex:

- final evidence packet
- calculator URL and access date
- screenshots only if they contain public synthetic data and are necessary for layout evidence
- any failed or inaccessible cases

Codex will then:

1. compare the packet with the workbook/source pack
2. reproduce the arithmetic independently
3. identify contradictions
4. draft or update the calculation contract
5. create deterministic Plum Duff fixtures
6. request human approval before calculation implementation
