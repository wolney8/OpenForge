# Engineering Learning — Plum Duff / OpenForge — Doc ID: EL-CODEX-001

**Last updated:** 2026-09-16 15:22 BST

This is a compact notebook of transferable lessons from building Plum Duff. It is not the audit,
roadmap, backlog or evidence record.

## Current learning focus

- Evolving stored data without guessing historical facts or making rollback destructive.
- Keeping identity/linkage separate from the history of changes to a financial record.

## Concepts worth remembering

### Planning state versus actual financial state

**What it means:** A recommendation is context for a future action. It is not proof that the action
happened. Planned stake, copied stake, confirmed matched stake and settled profit are different facts.

**Why it mattered in Plum Duff:** Calculator plans can be saved and reopened, but only explicit
placement records can govern liability and settlement. Changing a plan must never rewrite an actual
bet or historical profit.

**Remember:** A number becomes financial truth only at its governed confirmation boundary.

### Idempotency and safe retries

**What it means:** Repeating the same operation after a timeout should return the first result rather
than performing the business action again.

**Why it mattered in Plum Duff:** Calculator conversion, Free Bet awards and completed Blackjack
sessions can be retried after an uncertain response. Stable operation identities prevent duplicate
credit, duplicate activities and cross-Profile reuse.

**Remember:** A retry should recover an operation, not mint a second one.

### Failure atomicity and provenance

**What it means:** A multi-step write either completes as one coherent change or leaves no partial
business state; provenance records where the surviving data came from.

**Why it mattered in Plum Duff:** Account, Sportsbook and Free Bet validation now happens before
commit, while imports and awards need source identities that survive export, restore and failure.
The current imported-parent and deletion-history gaps show why atomic writes alone are insufficient
when identity or evidence is later discarded.

**Remember:** Preserve both the transaction and the story of the data.

### Current state versus event history

**What it means:** Current state answers what is true now; event history records what happened and
must survive later edits, clearing or removal.

**Why it mattered in Plum Duff:** Notification clear tombstones are reliable, but Notification
History is rebuilt from live source rows. Resolving a reminder therefore replaced the earlier event
instead of retaining both facts.

**Remember:** A durable view needs durable events, not just durable display preferences.

### Exposure-based dependency review

**What it means:** A vulnerable version is a necessary warning, while runtime, configuration,
reachable input and deployment conditions determine the application's actual exposure.

**Why it mattered in Plum Duff:** The affected Next image optimiser is locally reachable, the
Windows-only condition is not locally applicable, and no Vitest server was observed; hosted facts
are still unknown.

**Remember:** “Affected” is not “exploited”, and “unknown” is not “safe”.

### Persistence boundary and state ownership

**What it means:** Every preference or saved value needs one deliberate owner and lifetime rather
than being stored wherever it is easiest.

**Why it mattered in Plum Duff:** Theme can belong to one browser, ledger views need a Profile key,
Auto Logout belongs to the signed-in Fund Manager, and the server—not the toggle—owns session expiry.

**Remember:** Decide who owns state before deciding where to store it.

### Static analysis

**What it means:** A type checker traces possible values and shapes without waiting for a particular
runtime path to fail.

**Why it mattered in Plum Duff:** Mypy exposed optional values and reused variable shapes across
financial write paths; narrowing those paths reduced 39 findings to the 22-file-local Early Payout
cluster without changing money rules.

**Remember:** Tests show exercised behaviour; static analysis challenges unexercised possibilities.

### Schema evolution

**What it means:** Stored data changes must define new fields, constraints, old-row behaviour,
portable export and a safe rollback path before a migration runs.

**Why it mattered in Plum Duff:** Imported-parent resolution needs explicit unresolved states, while
financial history must survive deletion. Guessing a backfill or dropping new data on rollback would
make either repair less trustworthy than the original gap.

**Remember:** A safe schema change explains the past, the future and the way back.

### Identity versus history

**What it means:** Identity says what a record belongs to; history says what happened to it over
time. The two may share identifiers but solve different integrity problems.

**Why it mattered in Plum Duff:** PD-QA-018 links an imported Free Bet to the correct Profile-owned
Sportsbook record. PD-QA-021 preserves create, settlement, correction and removal evidence even
after the live row changes or disappears.

**Remember:** Linkage answers “which record”; history answers “what happened”.

## Things I should personally inspect when AI changes code

- Does the test prove behaviour independently, or repeat the implementation's own answer?
- Is planned/reference data being confused with copied, actual or settled data?
- Can retrying after a lost response create a duplicate financial record?
- Can an older network response overwrite a newer edit?
- Is validation performed before every business write, including alternate paths?
- Can failure halfway through leave a child, notification or audit row behind?
- Does a correction retain the previous meaning and timestamp?
- Does deletion preserve the evidence required to understand past financial results?
- Is source identity scoped to the correct Profile?
- Could an ambiguous imported parent be guessed rather than reviewed?
- Is a shared UI repair used by all equivalent screens, or only one route?
- Are keyboard, focus, accessible names and reduced motion tested as behaviour?
- Do migrations preserve old rows and run safely more than once where intended?
- Can exported data be restored without silently losing versioned metadata?
- Are fixtures synthetic and independent of Will's private operational data?
- Does local success rely on an undocumented port, path, credential or provider?

## QA thinking prompts

- Happy path: can the person finish the full task from start to finish?
- Invalid input: is it rejected clearly before any business write?
- Boundary values: do zero, fractional values and absence retain their distinct meanings?
- Retry: does the same operation return the same result?
- Duplicate submission: does persistence enforce uniqueness across processes?
- Old response: can it replace a newer user edit?
- Partial failure: are successful and failed targets reported truthfully?
- Reload/reopen: does saved meaning survive a fresh read?
- Permissions: can another Profile's Account, source or totals leak across boundaries?
- Correction: does the prior financial meaning remain traceable?
- Rollback: is database state checked independently of the HTTP message?
- Import/export: are IDs, provenance and versioned metadata retained?
- Accessibility: are names, errors, focus, tables and values understandable without sight or motion?
- Responsive layout: do controls remain usable at half width, narrow width and 200% text?
- Performance: does realistic data cause request storms, repeated calculation or blocked interaction?

## Portability pulse

**Portability status:** Concern

**Reason:** Business calculations and synthetic fixtures are largely portable across SQLite and
PostgreSQL, and portable Profile export/restore is proven locally. Normal development still assumes
macOS paths, fixed local ports and Google authentication; hosted database, authentication and
recovery boundaries remain unverified.

**Smallest improvement:** Make the normal local launcher paths and endpoints configurable through
one documented, non-secret environment contract while retaining SQLite/PostgreSQL test parity.

## Learning log

| CP | Timestamp | Concept(s) | Why it mattered |
| --- | --- | --- | --- |
| CP-005 | 2026-09-16 12:52 BST | Planning versus actual; idempotency; failure atomicity and provenance | Reporting, imported parents and deletion history depend on keeping financial state and its source evidence distinct |
| CP-006 | 2026-09-16 14:02 BST | Current state versus event history; exposure-based dependency review | Notification history and dependency risk both required evidence beyond labels or current display state |
| CP-009 | 2026-09-16 14:54 BST | Persistence boundary/state ownership; static analysis | Settings, sessions and financial responses need explicit owners and safe shapes beyond happy-path runtime evidence |
| CP-010 | 2026-09-16 15:22 BST | Schema evolution; identity versus history | Two separate integrity gaps needed exact additive designs without guessed links, double-counted history or destructive rollback |

## Where detailed evidence lives

- [Current project status](PROJECT_STATUS.md)
- [Audit index](AUDIT_REGISTER.md)
- [Detailed platform audit](docs/audits/platform-quality-audit.md)
- [Calculation contracts](docs/calculation-contracts/)
- [Workflow contracts](docs/workflows/)
- [Fixture specifications](docs/fixture-specs/README.md)
