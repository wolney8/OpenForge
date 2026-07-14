# OpenForge Repository Agent Instructions

Last updated: 2026-06-30

## Project purpose

Plum Duff is the user-facing platform developed in the OpenForge repository. It is a
local-first reconstruction of the user's matched betting tracker workbook.

The workbook is the architectural blueprint. The first goal is to mirror and improve the current tracker workflow, calculations, documentation, and reporting without drifting into a generic betting app.

## Product direction

- Build the Plum Duff Tracker first.
- Treat `Oddsmatcher` as a later, explicitly deferred module for odds matching or opportunity finding.
- Do not plan, design in detail, or implement Oddsmatcher unless a later task explicitly approves that scope.

## Route priority

The intended first application shell is:

`/login` -> `/profiles` -> `/profiles/:profileId/tracker`

Required initial route model to preserve in planning:

- `/login`
- `/profiles`
- `/profiles/new`
- `/profiles/:profileId`
- `/profiles/:profileId/tracker`
- `/profiles/:profileId/tracker/dashboard`
- `/profiles/:profileId/tracker/accounts`
- `/profiles/:profileId/tracker/sportsbook-bets`
- `/profiles/:profileId/tracker/free-bets`
- `/profiles/:profileId/tracker/casino-offers`
- `/profiles/:profileId/tracker/cash-adjustments`
- `/profiles/:profileId/tracker/reports`
- `/profiles/:profileId/tracker/profit-tracker`

## Local-first rule

- Assume local development first.
- Prefer local/demo authentication for MVP.
- Do not design hosted SaaS authentication, public sign-up, cloud sync, or production multi-tenant hosting unless explicitly approved.
- Each subscriber/profile must still be modelled as isolated data even in a single-user local MVP.

## Spreadsheet-as-blueprint rule

- Treat the current tracker workbook and current tracker-only source pack as the source of truth.
- Current source-pack files in `_input/`, `docs/planning/`, and `docs/templates/` override older archived references.
- Do not replace spreadsheet workflow with generic CRUD screens or generic matched-betting conventions.
- Preserve sheet intent, workflow order, user-entered fields, calculated fields, reporting logic, and audit concepts.

## Profile-scoped tracker rule

- Plum Duff is a profile-based platform with a Fund Manager overview and isolated subscriber/profile trackers.
- The Fund Manager overview is an aggregate control screen, not a replacement for the detailed tracker.
- Every profile-owned tracker record must be isolated, usually by `profile_id`.
- No profile may see another profile's accounts, bets, balances, reports, notes, or derived metrics.

## Cash-first tracker calculation rule

Plum Duff must preserve the workbook's cash-first principle:

`What is this row worth to the bankroll right now?`

Required implications:

- Keep projected/current value separate from settled/final value.
- Preserve conservative current-value behaviour, including `MIN()`-style scenario selection where the workbook uses it.
- Keep calculator/reference values separate from actual user-entered values.
- Keep manual overrides explicit, reasoned, and auditable.
- Do not flatten tracker logic into a standard equal-profit matched betting calculator.

## Financial safety rules

- No calculation without a calculation contract.
- No deterministic money logic without deterministic fixtures.
- No user-visible financial value without tests.
- No hidden assumptions.
- No silent rounding.
- No silent commission defaults.
- No silent liability or exposure inference.
- No human-facing balance, P&L, bankroll, exposure, deduction, or earnings number without traceable source logic.

Read `docs/codex/financial-safety-rules.md` before planning or changing money logic.

## Sensitive-data rules

- Treat the uploaded workbook and any extracted tracker data as sensitive.
- Never copy real personal or operational data into docs, fixtures, examples, tests, or commits.
- Use synthetic placeholders such as `USER-001`, `demo@example.invalid`, `Bookmaker A`, `Exchange A`, `Demo Offer`, and `DEMO-CODE-001`.
- Do not store full card numbers, bank login credentials, bookmaker passwords, exchange passwords, session cookies, or MFA secrets.
- Do not commit raw workbook exports, screenshots, or dumps unless explicitly approved.

Read `docs/codex/data-safety-rules.md` before handling workbook-derived data.

## No-bet-automation rule

- Do not create autonomous bookmaker or exchange bet placement.
- Do not auto-confirm bets.
- Do not automate wager execution.
- Do not store the secrets that would enable bet automation.

## No-live-scraping rule

- Do not implement live bookmaker scraping.
- Do not build unsafe browser automation against third-party betting platforms.
- Do not create session replay, cookie capture, or scraping workflows unless explicitly approved in a later scoped task.

## Calculation contract rule

- Any new or changed financial calculation must have a contract first.
- Use `docs/templates/calculation-contract.md`.
- If a contract conflicts with the current workbook source pack, stop and surface the contradiction.

## Fixture rule

- Every money-impacting workflow needs deterministic fixtures before implementation is considered complete.
- Fixtures must be synthetic or anonymised only.
- Include open/pending, settled, cancelled/void, and manual-override examples where relevant.

## Testing rule

- User-visible financial values require automated tests.
- Profile isolation requires automated tests.
- Import mapping and reporting logic require fixtures and assertions.
- If exact tolerances or rounding are unknown, stop and document the gap instead of guessing.

## Playwright rule

- UI-facing workflows must define a Playwright path before implementation is considered done.
- Playwright coverage is required for route flows such as login, profile selection, tracker navigation, and critical data-entry/reporting paths once those surfaces exist.
- Do not save Playwright videos, screenshots, or traces by default unless approval or troubleshooting requires them.

## Task cadence

Use the workflow in `docs/codex/task-cadence.md`.

Short version:

1. Restate the objective.
2. Identify relevant files.
3. Identify risks and assumptions.
4. Propose a short plan.
5. Wait for approval when scope touches architecture, schema, calculations, imports, auth, reporting, or other money-sensitive areas.
6. Implement only approved scope.
7. Run relevant tests.
8. Report changed files and results.
9. Stop for review.

## Branch baseline rule

- Treat `origin/main` as the cumulative source of truth for all completed work.
- Before starting a new issue branch, first update from `origin/main` and branch from that exact tip.
- Every new branch must be a clean layer on top of the previously merged work.
- After a branch is approved, validate it, merge it back to `main`, and push `main` before starting the next issue branch.
- Do not start the next issue from an older feature branch baseline when the same work already exists in `main`.

## Approval gates

Stop for explicit approval before:

- creating or changing application source code
- changing database schema design
- defining or altering financial calculations
- implementing import/export behaviour
- implementing authentication flows
- building UI screens beyond approved scope
- adding new dependencies that materially shape architecture
- committing changes

For bootstrap and planning tasks, stop after planning output unless explicitly approved to code.

## Definition of done

Read `docs/codex/definition-of-done.md`.

At minimum:

- scope satisfied
- assumptions documented
- safety rules followed
- changed files reported
- tests run or explicitly not run with reason
- unresolved risks surfaced

## File and folder conventions

- `docs/codex/`: durable Codex process rules and bootstrap prompts
- `docs/planning/`: planning, discovery, build sequencing, and risk research
- `docs/reference/`: safe reference summaries and approved non-raw extracts
- `docs/templates/`: reusable contracts and workflow templates
- `.skills/`: local project skills for recurring review/check tasks
- `tests/fixtures/`: synthetic or anonymised deterministic fixtures only
- `data/`: local-only data handling guidance, not committed sensitive raw data
- `_input/`: sensitive source-pack inputs; do not treat as safe-to-commit outputs

## Expected commands

Current scaffold commands:

- Build: `pnpm build:web`
- Test: `pnpm test`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Playwright: `pnpm playwright`

Python commands run through `scripts/run-python.sh` to avoid Apple Silicon / Rosetta
architecture mismatches when `pnpm` is launched from an x64 Node runtime.

## Bootstrap boundary

During bootstrap and planning phases:

- create docs, guardrails, templates, and skills only
- do not build frontend, backend, database, or import code
- do not modify the uploaded workbook
- do not start the build plan unless the task explicitly asks for it
- stop after planning output unless explicitly approved to code
