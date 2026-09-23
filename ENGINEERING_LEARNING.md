# Engineering Learning — Plum Duff / OpenForge — Doc ID: EL-CODEX-001

**Last updated:** 2026-09-22 16:33 BST

This is a compact notebook of transferable lessons from building Plum Duff. It is not the audit,
roadmap, backlog or evidence record.

## Current learning focus

- Keep compute and its database in the same practical region.
- Reuse one request-scoped database snapshot instead of repeatedly paying connection setup.

## Concepts worth remembering

### Data locality

**What it means:** Put application compute close to the database it repeatedly reads, while keeping
runtime and data ownership explicit.

**Why it mattered in Plum Duff:** Batching removed duplicate work, but a small eligibility response
still took nearly 12 seconds while functions ran in Washington against a London database. The same
query path fell below one second when Preview functions moved to London.

**Remember:** Optimise query shape and physical distance; either one can dominate an otherwise small request.

### Scoped batch read

**What it means:** Read shared relationship evidence once for the governing Profile or request, then
resolve individual rows from that bounded set.

**Why it mattered in Plum Duff:** Hosted Free Bet summaries opened repeated lineage/audit reads for
250 children, while Account eligibility repeated work for 80 archived Profiles. Batching lineage and
selecting active Profiles removed the amplification without caching or changing business meaning.

**Remember:** If a list is fast when empty but slow when populated, count its downstream reads—not
just its top-level query.

### Authorization boundary

**What it means:** Every route to protected data must carry and validate the same authority at the
boundary where the read or write occurs.

**Why it mattered in Plum Duff:** Browser API requests were authenticated, but hosted server-side
rendering did not forward the protected request context to its internal API. The same signed-in user
therefore saw a branded data-unavailable state until that server-to-server boundary was repaired.

**Remember:** A successful browser login does not automatically authenticate an internal server fetch.

### Environment parity

**What it means:** Environments should exercise the same application contracts while retaining
explicitly different roles, data and credentials.

**Why it mattered in Plum Duff:** Preview runs the locally accepted schema and behaviour on hosted
PostgreSQL, but its `preview` role and database identity prevent “parity” becoming accidental access
to normal-owner or Production data.

**Remember:** Match behaviour across environments; never blur ownership between them.

### Promotion gate

**What it means:** A checkpoint that requires named evidence before a build can move into a more
consequential environment.

**Why it mattered in Plum Duff:** Healthy deployment, migrations and synthetic financial evidence
do not promote this Preview to Production. Genuine hosted OAuth and authenticated journeys must pass,
followed by a separate owner decision.

**Remember:** Deployment is an input to a promotion decision, not the decision itself.

### Baseline

**What it means:** A known source, data and environment combination whose important behaviour has
been tested and accepted.

**Why it mattered in Plum Duff:** The CP-027 local baseline joins the accepted calculator and Google
experience to one normal-owner revision, schema and verified database state. Future Preview defects
can now be compared with a stable reference rather than another moving target.

**Remember:** Freeze one known-good state before changing environments.

### Design invariant

**What it means:** A rule that must remain true wherever a component is used, independent of page
or calculator family.

**Why it mattered in Plum Duff:** Help now stays beside its section title and same-level calculator
sections share one outer grid because those rules live in shared primitives and regression checks.

**Remember:** Repeated visual rules belong in components, not owner memory.

### Semantic token

**What it means:** A shared style value named for meaning, such as bookmaker/back or exchange/lay,
rather than a local hard-coded colour.

**Why it mattered in Plum Duff:** Multi-Lay now distinguishes Back and Lay using the same paired
meaning in light, dark, standalone and embedded contexts without inventing a page-specific border.

**Remember:** Name colour by what it communicates, not by its hex value.

### OAuth state

**What it means:** A short-lived signed value ties the callback from an identity provider to the
login attempt the application actually started, including its safe return destination and PKCE
verifier.

**Why it mattered in Plum Duff:** The owner failure occurred before state existed because the API
had lost its private environment source. Once restored, mismatched, expired and replayed states are
rejected while valid callbacks can create the database-backed local session.

**Remember:** State connects one initiation to one callback; it is not a general login token.

### Semantic formatting

**What it means:** Presentation carries domain meaning: a stake is an instruction, liability is
exposure, and a final position is profit, loss or neutral—not merely another currency string.

**Why it mattered in Plum Duff:** Multi-Lay now uses the same financial primitives as its detailed
Outcomes table, so colour, signs, copy precision and accessible labels tell one consistent story.

**Remember:** Formatting is part of the financial contract when it changes how a number is read.

### Stable identity versus display label

**What it means:** A record key identifies the underlying entity; a name is presentation and may
legitimately be shared by several records.

**Why it mattered in Plum Duff:** Distinct Accounts called `Frank Eastender · 10Bet` collided when
React was keyed by the visible name. Canonical Account IDs now preserve both rows and the correct
edit/removal target.

**Remember:** If the database has an identity, do not make the UI invent one from text.

### Progressive disclosure

**What it means:** The default view presents the shortest common workflow while advanced choices
remain available in a deliberate secondary surface.

**Why it mattered in Plum Duff:** Multi-Lay now leads with Bet Type, back inputs, lay outcomes and
copyable results; reward modifiers and Underlay/Standard/Overlay/Custom allocation remain available
without forcing every user through them.

**Remember:** Hide complexity, not capability.

### Load amplification

**What it means:** One visible request triggers work multiplied across many Profiles, Accounts,
ledgers or connections, so growth outside the user's current scope slows ordinary work.

**Why it mattered in Plum Duff:** Three active Profiles caused 66 summary requests and hundreds of
database reads because archived Profiles and repeated schema initialisation were still on the
default path.

**Remember:** Hidden data is not cheap if every normal request still processes it.

### Data hygiene

**What it means:** Test data has explicit provenance, lifecycle and visibility rules so it remains
useful evidence without contaminating an owner's normal workspace.

**Why it mattered in Plum Duff:** Protected synthetic financial evidence had to remain archived,
while 24 proven empty synthetic Profiles could be removed without touching owner IDs or money.

**Remember:** Clean test residue by proof and policy, never by guessing from a name.

### Verification envelope

**What it means:** The exact environments, data and behaviours that a body of evidence proves.

**Why it mattered in Plum Duff:** Local OAuth, PostgreSQL recovery and financial journeys pass, but
that evidence does not automatically prove Vercel configuration, Neon recovery or Google's hosted
interaction.

**Remember:** Say where the proof stops as clearly as where it starts.

### Residual risk

**What it means:** The known uncertainty that remains after completed checks and repairs.

**Why it mattered in Plum Duff:** VoiceOver speech, provider interaction, hosted rollback and later
analytics policy remain explicit boundaries instead of being hidden behind 100% review coverage.

**Remember:** Full review can coexist with open risk; classify it rather than erasing it.

### System boundary

**What it means:** A system is responsible for the requests, validation and recovery it owns, while
an external provider remains responsible for its own secure interaction.

**Why it mattered in Plum Duff:** Google initiation, state validation, callback handling and local
session recovery are testable here; a genuine Google sign-in is not something Plum Duff can safely
simulate or bypass.

**Remember:** Test both sides of your boundary, but never claim control of the other system.

### Acceptance boundary

**What it means:** An acceptance result states exactly which evidence completes a journey and which
step still belongs to a different person, device or service.

**Why it mattered in Plum Duff:** Search and workbook/award journeys now pass end to end, while
VoiceOver speech and fresh Google interaction remain explicit owner/manual evidence rather than
being hidden inside a broad engineering PASS.

**Remember:** A precise partial result is stronger than an invented complete one.

### State precedence

**What it means:** Related states have one explicit order of authority, so the same inputs always
produce the same eligibility decision.

**Why it mattered in Plum Duff:** A hard login, KYC or risk block makes an Account unavailable even
when old Stake or Promo access values look permissive; the access fields then refine an operational
Account without duplicating lifecycle status.

**Remember:** Define which state wins before combining related classifications.

### Deterministic test fixtures

**What it means:** A test creates every identity, catalogue value and record it needs from committed
synthetic inputs, so its result does not depend on a private workbook or an already-populated database.

**Why it mattered in Plum Duff:** One explicit tracker seed and fresh per-test databases removed 122
broad-suite failures while preserving the financial and isolation assertions.

**Remember:** If a test needs yesterday's private database, it is not reproducible evidence.

### Capability versus observation

**What it means:** A small controlled state records what an Account can currently do; caps, affected
promotion types, source notes and the time checked record the evidence behind that judgement.

**Why it mattered in Plum Duff:** `Minimum Only` and `Boosts Only` describe restriction details, not
separate top-level Stake or Promo capabilities, and stale evidence should not multiply enum values.

**Remember:** Classify the capability; store the evidence separately.

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

### Reconciliation

**What it means:** Reconciliation compares related records and independently expected totals without
assuming that one record automatically mutates the other.

**Why it mattered in Plum Duff:** A Cash Adjustment records real cash movement and may identify the
Account involved, while the Account balance remains a separately observed value. Reports can explain
the movement without manufacturing an unobserved new balance.

**Remember:** Link the evidence; do not invent the balancing entry.

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

### Composite identity and scoped uniqueness

**What it means:** One value is not always a complete identity. A safe key combines the value with
the boundary in which it is meaningful.

**Why it mattered in Plum Duff:** External row `X` can legitimately exist in two Profiles. Import
resolution must use Profile + source namespace + external ID so one Profile can never acquire the
other Profile's parent.

**Remember:** Uniqueness is only safe when its scope matches the business owner.

### Append-only history

**What it means:** Lifecycle evidence is added as immutable events; later corrections do not rewrite
or erase the earlier evidence.

**Why it mattered in Plum Duff:** Current ledger audits are owned by deletable rows. A separate
history record can retain creation, settlement and correction evidence without becoming another
amount for reports to sum.

**Remember:** History explains current truth; it is not a second financial ledger.

### Audit trail versus user-facing history

**What it means:** An audit trail preserves exact evidence for integrity; a user-facing history
translates the useful parts into actions, times, reasons and financial meaning.

**Why it mattered in Plum Duff:** The database already retained immutable snapshots, but Will could
not understand a correction until the shared History panel showed the previous and current result
without exposing hashes, JSON or internal IDs.

**Remember:** Preserve technical evidence underneath; explain business meaning on top.

### Patch versus feature dependency upgrades

**What it means:** A patch upgrade should repair supported behaviour without deliberately changing
the product contract; a feature upgrade may require design and migration decisions.

**Why it mattered in Plum Duff:** Supported Next, sharp and Vitest patches removed reachable and
tooling advisories while the calculator, persistence and report contracts stayed unchanged.

**Remember:** Upgrade the smallest supported surface, then rerun its real consumers.

### Logical identity versus physical representation

**What it means:** A durable identity uses business meaning, while filenames, worksheet labels and
database row numbers are replaceable ways of representing it.

**Why it mattered in Plum Duff:** A workbook tab may be renamed and native IDs change during
portable restore. Profile + logical source namespace + external ID remains stable across both.

**Remember:** Name the thing by what it is, not by where one import happened to store it.

### Archiving versus reversing a financial event

**What it means:** Archiving changes whether a record appears in normal active work; reversal or
void changes its financial meaning.

**Why it mattered in Plum Duff:** A settled £5 result must not disappear from reports merely because
the row is archived. Only a governed correction, void or reversal may alter the report contribution.

**Remember:** Hidden is not financially undone.

### End-to-end journey testing

**What it means:** A workflow passes only when one realistic user task crosses its UI, API,
persistence, reload and final report boundaries successfully.

**Why it mattered in Plum Duff:** Extra Place calculations and append-only storage already passed
separately, yet the complete run exposed that a Void was described as a generic edit. Only the full
create→settle→void→History→report sequence revealed the misleading user-facing meaning.

**Remember:** Component passes are evidence inputs, not a completed user task.

### Environment isolation and failing closed

**What it means:** A process must prove which source, purpose and database belong together before
it may open storage. Missing or contradictory configuration stops work instead of selecting a
convenient default.

**Why it mattered in Plum Duff:** An explicit shell database URL overrode the candidate's intended
worktree target during CP-012. CP-013 binds startup and every direct connection to a declared role,
source checkout and safe database identity.

**Remember:** A disposable runtime must never have an owner-data fallback.

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

**Portability status:** On track

**Reason:** SQLite/PostgreSQL targets, source roots and endpoints have an explicit fail-closed runtime
contract; the broad tests are private-data-free; and the protected Preview now proves its hosted
role, database identity, schema, OAuth and recovery path. CP-029 additionally made the internal SSR
base URL and protected request context explicit instead of relying on project-wide inheritance.

**Smallest improvement:** Reconcile the protected-Preview #117 application repair into the normal
local source through the existing identity/backup gate; never copy Preview configuration or data.

## Learning log

| CP | Timestamp | Concept(s) | Why it mattered |
| --- | --- | --- | --- |
| CP-005 | 2026-09-16 12:52 BST | Planning versus actual; idempotency; failure atomicity and provenance | Reporting, imported parents and deletion history depend on keeping financial state and its source evidence distinct |
| CP-006 | 2026-09-16 14:02 BST | Current state versus event history; exposure-based dependency review | Notification history and dependency risk both required evidence beyond labels or current display state |
| CP-009 | 2026-09-16 14:54 BST | Persistence boundary/state ownership; static analysis | Settings, sessions and financial responses need explicit owners and safe shapes beyond happy-path runtime evidence |
| CP-010 | 2026-09-16 15:22 BST | Schema evolution; identity versus history | Two separate integrity gaps needed exact additive designs without guessed links, double-counted history or destructive rollback |
| CP-011 | 2026-09-16 15:37 BST | Composite identity; append-only history | Owner decisions need scoped uniqueness and immutable evidence with an explicit no-double-counting rule |
| CP-012 | 2026-09-16 21:04 BST | Logical identity versus physical representation; archive versus reversal | The implemented source key survives workbook/restore changes, while lifecycle visibility stays separate from report meaning |
| CP-013 | 2026-09-17 08:15 BST | Environment isolation; fail closed | Runtime purpose, source and database ownership now have to agree before any connection or migration |
| CP-014 | 2026-09-17 12:20 BST | Migration safety; schema compatibility | The normal cutover preserved every old row and current total while adding truthful unresolved identity and future append-only evidence |
| CP-015 | 2026-09-17 13:33 BST | Audit trail versus user history; patch versus feature upgrades | Immutable evidence became understandable in five ledgers while supported patches reduced dependency exposure without changing product meaning |
| CP-016 | 2026-09-17 14:46 BST | End-to-end journeys; lifecycle versus financial state | Full journeys exposed a mislabelled Void and proved that archive visibility can change without erasing retained P&L |
| CP-017 | 2026-09-17 15:59 BST | Reconciliation; idempotent business operations | Cash movement stayed distinct from observed balances, while award and adjustment retries recovered one logical result without duplication |
| CP-018 | 2026-09-18 09:15 BST | Deterministic fixtures; capability versus observation | Explicit synthetic seeds removed hidden-state failures, while #109 separates stable access classes from restriction evidence and freshness |
| CP-019 | 2026-09-18 11:20 BST | State precedence; test hermeticity | Account eligibility now has one governing order, while all ordinary API regressions run without owner data or hidden seeds |
| CP-020 | 2026-09-18 12:56 BST | System boundary; acceptance boundary | OAuth and VoiceOver evidence now stop exactly where external-provider or human-observed behaviour begins |
| CP-021 | 2026-09-18 13:10 BST | Verification envelope; residual risk | Local review closure now separates proven local behaviour from hosted, provider and owner/manual evidence |
| CP-022 | 2026-09-18 14:48 BST | Load amplification; data hygiene | Active owner routes now scale with their selected scope, while synthetic residue is classified, retained or removed without rewriting financial history |
| CP-023 | 2026-09-18 15:48 BST | Stable identity; progressive disclosure | Same-label records now retain canonical UI identity, while Multi-Lay exposes its common flow before validated advanced controls |
| CP-024 | 2026-09-19 06:48 BST | Shared primitives; semantic formatting | One shell and one financial language now connect Multi-Lay input, compact Result and detailed Outcomes |
| CP-025 | 2026-09-19 07:57 BST | OAuth state; fail closed | Normal-owner startup now proves its auth environment before serving, and every callback failure returns safely to the branded login shell |
| CP-026 | 2026-09-19 12:41 BST | Design invariant; semantic token | Shared headings, content grids and Back/Lay meaning now survive calculator, theme and viewport changes |
| CP-027 | 2026-09-21 10:44 BST | Baseline; environment promotion | Owner acceptance and focused engineering evidence now identify one stable local source/data/runtime reference before any hosted work |
| CP-028 | 2026-09-21 13:02 BST | Environment parity; promotion gate | A protected Preview now matches accepted contracts without sharing owner/Production data, and stops before Production or unobserved provider claims |
| CP-029 | 2026-09-21 15:24 BST | Environment parity; authorization boundary | Hosted auth passed, but authenticated SSR and client rendering still needed their own evidence before Preview promotion |
| CP-030 | 2026-09-22 11:57 BST | Shared external-state subscription; explicit hosted self-routing | One reduced-motion subscription prevents update fan-out, while an explicit protected internal API URL keeps server rendering on the intended Preview boundary |
| CP-031 | 2026-09-22 14:22 BST | Scoped batch reads | Profile-scoped batching and active-only eligibility removed hosted load amplification without hiding it behind caching |
| CP-032 | 2026-09-22 16:33 BST | Data locality | Request-scoped connections and London-colocated Preview functions removed latency without caching wrong-scope results |
| CP-033 | 2026-09-23 15:13 BST | Action-scoped validation | A harmless edit validates what changed and the invariants it can affect; it must not reinterpret an unchanged historical relationship as new business |

## Where detailed evidence lives

- [Current project status](PROJECT_STATUS.md)
- [Audit index](AUDIT_REGISTER.md)
- [Detailed platform audit](docs/audits/platform-quality-audit.md)
- [Calculation contracts](docs/calculation-contracts/)
- [Workflow contracts](docs/workflows/)
- [Fixture specifications](docs/fixture-specs/README.md)
