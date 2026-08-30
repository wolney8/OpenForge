# Founder Readiness Execution Register

_Last updated: 2026-08-30_

This register tracks the bounded path from hosted preview to owner-only founder use. Real financial
data must not be uploaded until every safety gate in `PD-FR-010` is complete.

| ID | Area | Requirement | Reference | Status |
|---|---|---|---|---|
| PD-FR-001 | Notifications | Reconcile triggers, timing, templates, routes, lifecycle, preferences and security tags | Fund Manager notification centre contract | COMPLETE |
| PD-FR-002 | Account Catalogue | Fix structured import errors, validate rollback/conflicts and reconcile any partial attempt | Existing catalogue import/preflight workflow | COMPLETE |
| PD-FR-002A | Catalogue evidence import | Accept evidence for contracted provider identity/theme fields and identify rejected values | Master Account Catalogue schema | COMPLETE |
| PD-FR-002B | Catalogue bulk management | Clear staged imports and bulk archive providers without breaking Profile references | Account Catalogue authority workflow | COMPLETE |
| PD-FR-002C | Catalogue feedback | Auto-dismiss transfer toasts and retain import/export success or failure in Notifications | Signed-off toast and notification patterns | COMPLETE |
| PD-FR-002D | New provider discovery | Persist provider introduction time and show a New tag during Profile account selection | Master Account Catalogue schema | COMPLETE |
| PD-FR-003 | Profile onboarding | Provide reusable Fund Manager-created Profile onboarding using global providers plus Profile-owned state | Existing Profile and Accounts flows | COMPLETE |
| PD-FR-003A | Reusable onboarding | Use one repeatable Profile flow for founder now and subscriber Profiles later | `/profiles/new` and Profile isolation contract | COMPLETE |
| PD-FR-003B | Provider authority | Make the Fund Manager Account Catalogue the only new Profile/account provider source | Global catalogue/Profile state contract | COMPLETE |
| PD-FR-003C | Guided onboarding | Use the signed-off stepper, guided access, dirty-route guard and explicit Cancel on the non-modal page | Ledger editor stepper and unsaved-change guard | COMPLETE |
| PD-FR-003D | Profile financial/jurisdiction inputs | Format bankroll/fees consistently and default operating jurisdiction to GB | Financial input and Account Catalogue availability rules | COMPLETE |
| PD-FR-003E | Onboarding Accounts table | Add eight-row pagination, sorting, resizing and consistent provider/status/balance controls | Signed-off ledger table controls | COMPLETE |
| PD-FR-003F | Subscriber provisioning boundary | Registration approval creates or claims the same Profile type; it does not introduce another Profile model | Subscriber registration contract | COMPLETE |
| PD-FR-003G | Exchange calculation authority | Require at least one selected Exchange and an explicit Profile commission during onboarding | Profile onboarding and financial-safety contracts | COMPLETE |
| PD-FR-003H | Existing Profile account authority | Let Fund Managers add, reactivate or archive catalogue-backed Profile accounts without mutating global providers | Global catalogue/Profile state contract | COMPLETE |
| PD-FR-003I | Accounts editor provider authority | Replace the legacy bookmaker-only Add Account selector with grouped canonical Bookmaker, Exchange and Bank providers | Global catalogue/Profile state contract | COMPLETE |
| PD-FR-003J | Accounts render regression | Make shared persisted ledger state SSR-stable so stored collapse values cannot cause hydration failure | Ledger UI persistence contract | COMPLETE |
| PD-FR-003K | Profile account surface consolidation | Use Profile Accounts as the sole relationship/state editor and remove the duplicate Settings editor | Global catalogue/Profile state contract | COMPLETE |
| PD-FR-003K1 | Duplicate Profile provider prevention | Reject duplicate canonical or matching legacy provider relationships at API preflight and persistence write boundaries | Global catalogue/Profile state contract | COMPLETE |
| PD-FR-003K2 | Profile provider removal | Archive a Profile provider while retaining history and protecting the final active Exchange | Global catalogue/Profile state contract | COMPLETE |
| PD-FR-003K3 | Profile account offer availability | Show eligible configured Common Bet Combo / Quick Action offers in the consolidated account editor | Quick Actions and global catalogue contracts | COMPLETE |
| PD-FR-003L | Profile demographics settings | Replace the removed Settings Accounts tab with a non-persisting demographic and protected-financial placeholder | Authentication and hosted persistence gates | DEFERRED |
| PD-FR-003M | Accounts content visibility regression | Keep the signed-off Accounts controls and table visible even when obsolete local storage contains a collapsed-ledger value | Signed-off Accounts ledger layout and table-control parity test | COMPLETE |
| PD-FR-003N | Bank account editor semantics | Hide restrictions and offer eligibility for Bank relationships | Consolidated Profile Account editor | COMPLETE |
| PD-FR-003O | Account semantic chips | Distinguish provider type, lifecycle status and channels with canonical chips | Signed-off ledger chip taxonomy | COMPLETE |
| PD-FR-003P | Account financial presentation | Use canonical two-decimal financial values in the table, summary and editor | Financial display/input primitives | COMPLETE |
| PD-FR-003Q | Account removal confirmation | Replace browser confirmation with the shared warning dialog pattern | Platform confirmation dialog | COMPLETE |
| PD-FR-003R | Account save refresh | Refresh saved rows immediately without resetting search, filters or pagination | Consolidated Accounts state | COMPLETE |
| PD-FR-003S | Account date controls | Use themed Material date and time controls | Material date/time field | COMPLETE |
| PD-FR-003T | Catalogue display inheritance | Resolve provider identity and global display metadata by catalogue ID with legacy-name fallback | Master Account Catalogue | COMPLETE |
| PD-FR-003U | Canonical Search control | Establish responsive standard Search geometry for touched table surfaces | UI consistency enforcer | COMPLETE |
| PD-FR-003V | Profile Settings architecture | Map existing controls into General, Defaults, Preferences and Import/Export; add explicit Security and Subscriber stubs | Profile Settings shell | COMPLETE |
| PD-FR-003W | Fund Manager Profiles overview | Retain `/profiles` as the operational directory and expose explicit future Subscriber/access states | Existing Fund Manager Profiles directory | COMPLETE |
| PD-FR-004 | Authentication | Add Google OAuth, owner allowlist, server sessions, route/API/mutation protection and logout | Founder authentication and shell contract | NEEDS VERIFICATION |
| PD-FR-004A | Fund Manager identity role | Attach full Fund Manager authority to an authenticated user identity, never to a client-side Profile toggle | Founder authentication and shell contract | NEEDS VERIFICATION |
| PD-FR-004B | Global search | Add an authorized, grouped, keyboard-operable shell search for current safe entities | Canonical Search and shell patterns | COMPLETE |
| PD-FR-004C | Global navigation | Replace expanding Profile shortcuts with stable Fund Manager destinations and current-Profile context | Canonical drawer and Profiles directory | COMPLETE |
| PD-FR-004D | Shell consistency | Preserve canonical shell geometry, light/dark tokens, focus and responsive behaviour | UI consistency enforcer | COMPLETE |
| PD-FR-004E | Security matrix | Record current owner access and the deferred Subscriber boundary for every protected surface | Founder authentication and shell contract | COMPLETE |
| PD-FR-004F | OAuth deployment setup | Record exact local/Vercel callback, consent and environment configuration | Founder Google OAuth setup | NEEDS VERIFICATION |
| PD-FR-004G | Login UX | Reduce login to branding, Sign In, Google action and registration entry using canonical auth controls | Auth panel and primary action patterns | COMPLETE |
| PD-FR-004H | Registration stub | Add a public `/register` route that records future Subscriber registration without enabling it | Public auth shell | COMPLETE |
| PD-FR-004I | Fund Manager account | Add protected read-only identity and security details at `/account` | Settings content panels and semantic chips | COMPLETE |
| PD-FR-004J | Authenticated identity shell | Show a compact Fund Manager identity trigger with account and logout actions | Canonical app menu and chip patterns | COMPLETE |
| PD-FR-004K | Post-auth destination | Send normal direct sign-in to the Fund Manager performance dashboard while preserving safe requested routes | OAuth state/redirect contract | COMPLETE |
| PD-FR-004L | Public auth shell | Show branding and theme only on login/register; hide search, drawer, notifications, account and tracker theme controls | Canonical application shell | COMPLETE |
| PD-FR-004M | Production deployment verification | Verify current Vercel API routing, callback, protected routes, Founder session and logout | Vercel OAuth checklist | COMPLETE |
| PD-FR-004M1 | Hosted route diagnosis | Identify the exact production OAuth request and service that returns the public 404 | Live response headers plus Services routing contract | COMPLETE |
| PD-FR-004M2 | Services routing parity | Explicitly route API traffic to FastAPI and all remaining traffic to Next.js using the Vercel Services contract | Vercel Next.js + FastAPI starter | COMPLETE |
| PD-FR-004M3 | Production environment audit | Reconcile required OAuth variable names/scopes without exposing values | Founder OAuth deployment contract | COMPLETE |
| PD-FR-004M4 | Hosted OAuth smoke test | Verify health, Google redirect/callback, owner session, protected API, refresh and logout on the production domain | Vercel OAuth checklist | COMPLETE |
| PD-FR-004K1 | Hosted post-auth destination | Treat a root login return target as the normal Fund Manager Dashboard destination while preserving specific protected-route returns | OAuth state/redirect contract | COMPLETE |
| PD-FR-004T1 | Neutral error action alignment | Centre canonical actions on the shared neutral error surface | Canonical public error panel | COMPLETE |
| PD-FR-004M5 | Hosted FastAPI startup | Package the real API source, Python dependencies and runtime reference data in the Vercel backend service; preserve public auth paths beneath the hosted `/api` mount | Vercel Services FastAPI packaging contract | COMPLETE |
| PD-FR-004M6 | Hosted public brand asset | Render the canonical public logo without depending on the unavailable Next image optimizer route | Canonical BrandLogo component | COMPLETE |
| PD-FR-004N | Public auth brand alignment | Centre the canonical Plum Duff logo within the public auth card | Canonical auth panel | COMPLETE |
| PD-FR-004O | Public auth chrome and theme | Remove the application top bar from public auth routes; retain stored theme and default to dark | Canonical application shell and theme resolver | COMPLETE |
| PD-FR-004P | Login heading cleanup | Remove the redundant Sign In heading from the login card | Canonical auth panel | COMPLETE |
| PD-FR-004Q | Login content spacing | Preserve consistent spacing between logo, Google action and registration entry | Canonical stack spacing | COMPLETE |
| PD-FR-004R | Role-neutral public copy | Use neutral registration wording and avoid Profile/Fund Manager/Subscriber terminology before onboarding | Public auth copy boundary | COMPLETE |
| PD-FR-004S | Neutral public disclosure | Remove domain, role and implementation terminology from public auth and failure states | Founder auth shell contract | COMPLETE |
| PD-FR-004T | Neutral error boundary | Use one minimal public 404/error state and protect runtime configuration details | Canonical public auth panel and API owner middleware | COMPLETE |
| PD-FR-004U | Inactivity logout | Enforce optional inactivity expiry through a durable server session, with final-minute warning and cross-tab logout | Shared confirmation dialog and server session contract | COMPLETE |
| PD-FR-004V | Account security controls | Show identity authority, session state, inactivity preference and logout under `/account` | Existing account content panels and Material switch | COMPLETE |
| PD-FR-004W | Cookie inventory and policy | Record only actual cookies/storage and publish the public `/cookies` policy | Founder auth shell contract | COMPLETE |
| PD-FR-004W1 | Cookie policy public chrome | Remove the logo and legal preamble from the public policy page | Minimal public error/auth surfaces | COMPLETE |
| PD-FR-004W2 | Cookie policy table fit | Keep the policy table readable without page-level horizontal scrolling | Canonical contained table surface | COMPLETE |
| PD-FR-004X | Required-storage notice | Add a minimal accessible notice without fake optional-consent controls and allow reopening | Existing content panel and action primitives | COMPLETE |
| PD-FR-004X1 | Required-storage notice alignment | Centre the notice bar and its content at the bottom of the visible viewport | Canonical content panel and tracker navigation | COMPLETE |
| PD-FR-004Y | Static tab navigation | Restore Profile/Fund Manager Settings tabs to established normal document flow | Shared analytics tab rail | COMPLETE |
| PD-FR-005 | Persistence | Complete PostgreSQL runtime support and verified Vercel-to-Neon persistence | Existing Vercel wrapper and database contracts | IN PROGRESS |
| PD-FR-005A | Hosted Dashboard runtime diagnosis | Trace the hosted Dashboard failure and separate runtime defects from persistence prerequisites | Profile API and hosted fail-closed storage contract | COMPLETE |
| PD-FR-005B | Account Catalogue source audit | Record the bundled JSON source, current mutation durability and the canonical-seed plus durable-overlay target | Account Catalogue authority contract | COMPLETE |
| PD-FR-005C | PostgreSQL runtime adapter | Route authoritative API reads/writes through psycopg in explicit Neon mode without SQLite fallback | Local database/cloud backup contract | COMPLETE |
| PD-FR-005D | Deterministic migrations | Add versioned, transactional PostgreSQL schema migration and verification | Existing PostgreSQL schema plan | COMPLETE |
| PD-FR-005E | Founder Profile bootstrap | Persist a reusable owner-created Profile and associate it with the authenticated Founder identity | Existing Profile onboarding workflow | NEEDS VERIFICATION |
| PD-FR-005F | Profile Account persistence | Persist catalogue references, balances and Profile-specific account state with isolation and duplicate protection | Existing Profile Accounts contract | NEEDS VERIFICATION |
| PD-FR-005G | Ledger persistence | Verify Sportsbook, Free Bets, Casino, Extra Places and Cash Adjustments through PostgreSQL | Existing ledger APIs and calculation contracts | NEEDS VERIFICATION |
| PD-FR-005H | Notification/settings persistence | Persist notification state/preferences and currently durable Profile/Fund Manager settings | Notification and Settings contracts | NEEDS VERIFICATION |
| PD-FR-005I | Neon backup/recovery | Record and verify a pre-import recovery point and current-plan restore limitations | Local database/cloud backup contract | NEEDS VERIFICATION |
| PD-FR-005J | Hosted persistence verification | Verify owner-only Profile, account, setting and representative ledger persistence on Vercel | Founder hosted persistence checklist | NOT STARTED |
| PD-FR-005J1 | Production runtime configuration | Verify the deployed backend is explicitly using Neon with a configured server-only URL and no local fallback | Protected config summary and Vercel Production environment | COMPLETE |
| PD-FR-005J2 | Hosted Dashboard regression | Restore the authenticated `/profiles?view=performance` application data path and support a valid bootstrap/empty state | Fund Manager Dashboard and Profile API | COMPLETE |
| PD-FR-005J3 | Hosted Profile Account update regression | Trace and fix the existing-account save 500 through the real UI/API/PostgreSQL path with safe feedback | Consolidated Profile Accounts workflow | NEEDS VERIFICATION |
| PD-FR-005J4 | Server-enforced inactivity expiry | Enforce the saved Auto Logout preference on protected API/session access rather than relying on a browser timer | Owner authentication and security preference contracts | NEEDS VERIFICATION |
| PD-FR-005J5 | Founder identity/Profile association | Verify or establish a persisted primary Profile link for the authenticated Founder without importing workbook data | Reusable Profile onboarding contract | IN PROGRESS |
| PD-FR-005J6 | Account Catalogue runtime authority | Confirm canonical seed plus Neon-managed document ownership and preserve Profile references | Account Catalogue authority contract | COMPLETE |
| PD-FR-005J7 | Authenticated hosted application smoke | Verify Dashboard, Profile settings, Accounts and representative ledgers through the deployed UI/API paths | Founder hosted persistence checklist | NOT STARTED |
| PD-FR-005J8 | Neon pre-import recovery point | Create or verify the named Neon recovery point after hosted application smoke succeeds | Neon recovery procedure | BLOCKED |
| PD-FR-005J9 | Founder onboarding commission serialization | Omit blank optional commissions while preserving valid zero Exchange commission values during Profile creation | Reusable Profile onboarding contract | COMPLETE |
| PD-FR-005J10 | Founder-path loading consistency | Preserve stable shells and distinguish pending, empty, error and populated states across Dashboard, Profiles, onboarding, Accounts, Notifications, Account Catalogue and Profile Settings | Shared `LedgerLoadingIndicator` pattern | COMPLETE |
| PD-FR-005J11 | Profile onboarding input parity | Align Profile onboarding fields with canonical field geometry, labels, focus, disabled, theme and responsive behaviour | Signed-off `field-control` and financial input primitives | COMPLETE |
| PD-FR-005J12 | Notifications input parity | Replace route-local form treatment with canonical search/filter fields and loading state without redesigning Notifications | Signed-off table toolbar controls | COMPLETE |
| PD-FR-005J13 | Shared financial input behaviour | Centralize decimal sanitising, shorthand entry, two-decimal blur formatting and one-time default-zero selection | Existing `FinancialTextInput` | COMPLETE |
| PD-FR-005J14 | Onboarding commission entry | Display Exchange commission as a percentage while preserving decimal-fraction storage, explicit zero and blank/null distinction | Existing commission API/calculation contract | COMPLETE |
| PD-FR-005J15 | Temporary hosted Profile cleanup | Retain the `Vercel` test Profile through hosted onboarding smoke, then remove/archive it through the supported lifecycle | Profile lifecycle workflow | NEEDS VERIFICATION |
| PD-FR-005J16 | Profile management route restoration | Restore `/profiles` as the existing Profile directory and management surface rather than the global Dashboard | Existing `CrossProfileAnalytics` directory | COMPLETE |
| PD-FR-005J17 | Profile creation navigation | Expose the existing onboarding from the Profiles page and bounded Profiles drawer section | Existing `/profiles/new` onboarding | COMPLETE |
| PD-FR-005J18 | Recent Profile drawer | Show at most three genuinely browser-recent Profiles with View all and Add Profile actions | Existing application navigation drawer and Profile Dashboard route | COMPLETE |
| PD-FR-005J19 | Founder route consolidation | Make `/` the canonical Dashboard, `/profiles` the directory, `/reports` reports, and redirect legacy query routes | Existing authenticated shell and route guards | COMPLETE |
| PD-FR-005J20 | Root stub and logo navigation | Remove the obsolete authenticated root stub and keep the authenticated logo routed to Dashboard | Existing application brand link | COMPLETE |
| PD-FR-005J21 | Dashboard naming | Replace duplicated Fund Manager headings with one scoped `Dashboard` heading | Existing page-heading hierarchy and role badge | COMPLETE |
| PD-FR-005J22 | Dashboard control-bar sizing | Give Profile scope and Date Range controls canonical usable dimensions, spacing and responsive wrapping | Existing M3 analytics picker controls | COMPLETE |
| PD-FR-005J23 | Dashboard analytics controls | Retain only supported Profile scope and date controls in the analytics bar | Existing reporting filters | COMPLETE |
| PD-FR-005J24 | Global shell loading progress | Add a no-layout-shift top progress indicator for meaningful authenticated route transitions | Existing Material linear progress and application shell | COMPLETE |
| PD-FR-005J25 | Component loading parity | Preserve local skeleton/indicator states alongside the global transition bar | Existing `LedgerLoadingIndicator` | COMPLETE |
| PD-FR-005J26 | Profile Dashboard entry consistency | Route directory, recent-menu and detail actions to the canonical Profile Dashboard | Existing Profile tracker Dashboard | COMPLETE |
| PD-FR-005J27 | Onboarding lifecycle repeatability | Verify Profiles to Add Profile to persisted management/archive uses one onboarding flow | Existing founder/Profile onboarding | COMPLETE |
| PD-FR-005J28 | Temporary Profile lifecycle cleanup | Verify the hosted `Vercel` Profile through edit/navigation/recency, then archive it via the supported UI | Existing Profile `Archived` lifecycle status | NEEDS VERIFICATION |
| PD-FR-005J29 | Onboarding starting-bankroll entry | Apply the canonical bold financial field and clear only the untouched zero default until registration prefill exists | Existing `FinancialTextInput` | COMPLETE |
| PD-FR-005J30 | Onboarding fee entry | Default management and investment fees to 25%, accept percentage-point entry and format with the canonical percent suffix | Existing `PercentageTextInput` and Profile fee contract | COMPLETE |
| PD-FR-005J31 | Single onboarding navigation guard | Close shell drawers for platform confirmation and prevent a second native unload prompt after approved discard | Existing app confirmation and unsaved-change guard | COMPLETE |
| PD-FR-005J32 | Delayed top-bar state | Keep authenticated top-bar controls stable and expose accessible loading indicators while identity, notifications or Profile summary load | Existing `button-spinner` and shell loading hierarchy | COMPLETE |
| PD-FR-005J33 | Local development services | Run the repository-standard web and API services on their established ports for local smoke testing | Existing `dev:web` and `dev:api` commands | COMPLETE |
| PD-UX-LOAD-001 | Founder-path asynchronous states | Distinguish loading, empty, error and populated states on the Dashboard, Profile Accounts, onboarding catalogue and Profile Settings | Shared ledger loading indicator and stable data shells | COMPLETE |
| PD-FR-006 | Workbook mapping | Map the live workbook, including embedded Sportsbook `EP` rows, without inventing data | Existing staging/import workflow | COMPLETE |
| PD-FR-006A | Workbook Profile extraction | Resolve providers, extract signup/restriction/balance state and map all ledger rows in dry run | Founder migration workflow | COMPLETE |
| PD-FR-007 | Import dry run | Add anonymised real-schema fixtures, aliases, idempotency and a complete dry-run report | Spreadsheet import contracts | COMPLETE |
| PD-FR-007R1 | Founder import review route | Add an authenticated Fund Manager-only review workspace over the current private dry-run artifacts | Canonical Fund Manager page shell and owner middleware | COMPLETE |
| PD-FR-007R2 | Exception review table | Show decision context, deterministic identity, source trace, findings, proposed target and confidence with signed-off ledger controls | Accounts/Extra Places table toolbar, chips and pagination | COMPLETE |
| PD-FR-007R3 | Auditable row decisions | Support accept, override target, historical/incomplete, exclude, defer, provider resolution and notes without silent mutation | Existing import review and confirmation patterns | COMPLETE |
| PD-FR-007R4 | Safe batch review | Preview count, issue pattern, transformation and examples before explicitly confirming non-ambiguous batch decisions | Shared confirmation dialog | COMPLETE |
| PD-FR-007R5 | Review loadouts and filters | Add the approved exception loadouts plus canonical search and Filter modal | Signed-off ledger loadout/filter controls | COMPLETE |
| PD-FR-007R6 | Missing provider review | Present Fitzwilliam mapping, catalogue candidate, historical/archive and defer choices without silent provider creation | Fund Manager Account Catalogue authority | COMPLETE |
| PD-FR-007R7 | Historical Extra Place review | Present Historical Extra Place, retained Sportsbook EP and explicit reasoned reclassification choices for both embedded rows | Extra Place import preparation contract | COMPLETE |
| PD-FR-007R8 | Historical P&L provenance | Preserve trusted source realised P&L separately from native calculated values without inventing inputs | Financial safety and import provenance rules | COMPLETE |
| PD-FR-007R9 | Advanced-lay review | Group advanced branch exceptions and allow historical imported-calculation treatment where reconstruction is unsafe | Sportsbook branch-preserving import contract | COMPLETE |
| PD-FR-007R10 | Legacy text preservation | Preserve full source text in audit context while allowing an approved canonical shortened field | Import traceability contract | COMPLETE |
| PD-FR-007R11 | Casino fallback review | Offer a generated neutral historical label only through explicit row or batch approval | Casino offer import contract | COMPLETE |
| PD-FR-007R12 | Free Bet override review | Require an explicit reason, override removal, historical treatment, exclusion or deferral for the reasonless override | Free Bet override contract | COMPLETE |
| PD-FR-007R13 | Review decision persistence | Store decisions separately by checksum, mapping version, import ID and source fingerprint; reapply only compatible decisions | Private import artifact convention | COMPLETE |
| PD-FR-007R14 | Review status model | Enforce UNREVIEWED, REVIEWED/ACCEPTED, REVIEWED/OVERRIDDEN, DEFERRED, EXCLUDED and BLOCKED states | Import review lifecycle | COMPLETE |
| PD-FR-007R15 | Reviewed dry-run rerun | Rebuild the dry run with compatible decisions and report resolved, remaining, excluded, deferred, P&L and row-count impact | Founder dry-run analyzer | COMPLETE |
| PD-FR-007R16 | Import review UI consistency | Reuse canonical tables, filters, loadouts, dialogs, financial/provider chips, loading and accessibility behaviour | UI consistency enforcer and iconography protocols | COMPLETE |
| PD-FR-007R17 | Real-import safety gate | Keep review and rerun read-only with no production Profile or ledger writes | Founder import safety gate | COMPLETE |
| PD-FR-007H1 | Profile import ownership | Move workbook migration and review under one explicit target Profile | Profile Import/Export and existing review workspace | COMPLETE |
| PD-FR-007H2 | Hosted workbook upload | Validate and analyse authenticated `.xlsx` bytes without repository/runtime file dependencies | Existing XLSX parser and Profile import controls | COMPLETE |
| PD-FR-007H3 | Workbook privacy | Process raw bytes in memory, retain no workbook blob/path and require checksum re-upload for later import | Data safety rules | COMPLETE |
| PD-FR-007H4 | Durable review decisions | Persist checksum/version/fingerprint-bound decisions in Neon | Existing deterministic review contract | COMPLETE |
| PD-FR-007H5 | Import run lifecycle | Persist Profile target, effective timestamp, mapping version, counts and explicit review/readiness state | Existing import lifecycle conventions | COMPLETE |
| PD-FR-007H6 | Effective timestamp | Require explicit timezone-aware workbook effective time independent of filename | Founder snapshot contract | COMPLETE |
| PD-FR-007H7 | Hosted review source | Load review exceptions from the authenticated import run and show an upload empty state when absent | Canonical empty/error states | COMPLETE |
| PD-FR-007H8 | Dry-run regression oracle | Reproduce the 29 August checksum, account totals, ledger counts and reconciliation from upload bytes | Private developer dry-run evidence | COMPLETE |
| PD-FR-007H9 | Production inactivity audit | Expose and enforce safe server-calculated session policy/deadline metadata | Server session and security preference contract | NEEDS VERIFICATION |
| PD-FR-007H10 | Browser/session model | Keep the persistent cookie subordinate to server absolute and inactivity expiry | Authentication contract | COMPLETE |
| PD-FR-007H11 | Accelerated expiry proof | Verify expiry/activity reset/stale-cookie rejection with injected test time | Auth tests | COMPLETE |
| PD-FR-007H12 | Neon source matrix | Classify production source, table and durability for every founder-use domain | Database provider contract | COMPLETE |
| PD-FR-007H13 | Persistence diagnostic | Show a protected, secret-free System persistence status in Fund Manager Settings | Existing Site Settings and stat/table patterns | COMPLETE |
| PD-FR-007H14 | Real UI persistence smoke | Verify Profile, Account, preference and ledger writes across logout/redeploy | Hosted application checklist | NEEDS VERIFICATION |
| PD-FR-007H15 | Explicit Profile destination | Reject workbook analysis when the target Profile does not exist | Profile isolation contract | COMPLETE |
| PD-FR-007H16 | Import UI consistency | Reuse canonical upload, loading, table, chip, filter, modal and pagination patterns | UI consistency enforcer and iconography protocols | COMPLETE |
| PD-FR-007H17 | Import navigation | Remove permanent global Import Review navigation and retain a legacy redirect | Canonical drawer and Profile Settings | COMPLETE |
| PD-FR-007H18 | Real-import gate | Allow readiness approval only; do not expose a production write operation | Founder import safety gate | COMPLETE |
| PD-FR-007H19 | Hosted workflow verification | Verify upload, review persistence, rerun and session expiry on Vercel | Founder hosted import checklist | NEEDS VERIFICATION |
| PD-FR-007H20 | Safe hosted-workflow release | Isolate, commit, push and deploy only the hosted import/session/persistence tranche | Repository branch and data-safety rules | COMPLETE |
| PD-FR-007H21 | Annual £2.18 reconciliation trace | Previous snapshot-cutoff explanation; superseded by workbook-formula parity analysis | Private dry-run evidence and reconciliation contract | SUPERSEDED |
| PD-FR-007H22 | Workbook report parity | Reuse workbook week/month/year rollups instead of treating the effective timestamp as a row cutoff | Workbook cash-first map and reporting contracts | COMPLETE |
| PD-FR-007H23 | Open and future row preservation | Import all rows and retain future-dated pending bets as active records with current value and exposure | Sportsbook current-value and spreadsheet round-trip contracts | COMPLETE |
| PD-FR-007H24 | Current versus realised financial views | Report open current/worst-case P&L separately from settled/realised P&L while retaining workbook-equivalent totals | Cash-first calculation map | COMPLETE |
| PD-FR-007H25 | Semantic date quality | Accept future/open dates, review future/settled dates and reject only malformed dates without automatic mutation | Workbook workflow map | COMPLETE |
| PD-FR-007H26 | Import row accounting | Prove every parsed ledger row is mapped, partial or explicitly reviewed without snapshot-date exclusion | Import round-trip contract | COMPLETE |
| PD-FR-007H27 | Corrected workbook rerun | Recalculate completeness and financial parity from the next uploaded corrected workbook | Hosted Profile import workflow | NEEDS VERIFICATION |
| PD-FR-007H28 | Review P&L impact meaning | State that zero is no decision-caused imported P&L change and identify every non-zero contributing decision | Existing review reconciliation and FinancialValue | COMPLETE |
| PD-FR-007H29 | Compact review summary | Limit the primary review summary to Remaining, Resolved, provider conflicts, historical EP and P&L impact | Compact signed-off stat cards | COMPLETE |
| PD-FR-007H30 | Background analysis lifecycle | Persist real analysis/rerun stages and progress, allow navigation away and emit deep-linked lifecycle notifications | Shell progress, import runs and Notifications | COMPLETE |
| PD-FR-007H31 | Review reset and return | Expose auto-saved decisions, Save & leave and audited selected/all reset without source/Profile mutation | Shared confirmation dialog and persisted decisions | COMPLETE |
| PD-FR-007H32 | Fund Manager review evidence | Present plain-language problem, source evidence, proposed interpretation, review reason and decision effect with optional technical detail | Canonical workflow editor modal | COMPLETE |
| PD-FR-007H33 | Compact exception table | Use compact fixed-height ledger rows and move detailed decisions out of table expansion into the editor modal | Signed-off ledger table and modal | COMPLETE |
| PD-FR-007H34 | Reachable review loadouts | Keep every loadout reachable through a bounded horizontal rail and canonical arrow controls | Extra Places loadout rail | COMPLETE |
| PD-FR-007H35 | Review-to-next workflow | Add Save & next and evidence-rich safe batch confirmation | Existing modal footer and batch confirmation | COMPLETE |
| PD-FR-007H36 | Import semantic protection | Retain workbook-first calculations, deterministic IDs, provider resolution, EP options and decision semantics unchanged | Import review and financial regression tests | COMPLETE |
| PD-FR-007H46 | Non-executed Sportsbook opportunities | Auto-classify lifecycle-proven Prospecting/Not Placed pending rows as source-accounted non-transactional opportunities with zero imported betting P&L | Workbook workflow and cash-first contracts | COMPLETE |
| PD-FR-007H47 | Prospecting review/P&L baseline | Remove non-executed opportunities from manual review and decision-caused P&L impact without changing workbook report reconciliation | Import review reconciliation | COMPLETE |
| PD-FR-007H48 | Profile Account plan count clarity | Explain that new Account creation and point-in-time balance writes overlap and show the new/existing balance-write split | Existing Profile Account change reconciliation | COMPLETE |
| PD-FR-007H49 | Pre-import readiness gate | Require persisted decisions for every blocking row and expose provider and historical EP resolutions before import | Existing review status and approval contract | COMPLETE |
| PD-FR-007H50 | Final import summary | Show the server-owned Profile settings, Account, ledger and financial write plan before confirmation | Existing compact stats, tables and financial values | COMPLETE |
| PD-FR-007H51 | Pre-import recovery checkpoint | Persist a checksum-verified Profile snapshot tied to the run, Profile, workbook and mapping version before writes | Existing Neon runtime and import audit model | COMPLETE |
| PD-FR-007H52 | Scoped application rollback | Reverse only writes attributed to the ImportRun and verify the restored Profile against its checkpoint | Canonical destructive confirmation and import write audit | COMPLETE |
| PD-FR-007H53 | Transactional import | Apply Profile settings, Accounts and all ledger families atomically with no silent partial write | Existing runtime transaction boundary | COMPLETE |
| PD-FR-007H54 | Explicit import confirmation | Require the canonical high-consequence dialog naming the Profile plan, checksum, affected rows and rollback | Existing confirmation dialog | COMPLETE |
| PD-FR-007H55 | Persisted post-import reconciliation | Re-read persisted Profile/Neon rows and compare expected versus actual Accounts, ledgers, financial views, open positions and integrity | Workbook parity and reporting contracts | COMPLETE |
| PD-FR-007H56 | Import result and history | Persist the reconciliation with the ImportRun and expose it from Profile Import/Export history | Existing history table and review workspace | COMPLETE |
| PD-FR-007H57 | Rollback UI and audit | Expose one safe rollback action for eligible completed/failed imports and retain rollback audit history | Existing destructive lifecycle pattern | COMPLETE |
| PD-FR-007H58 | Import idempotency and authorization | Reject repeat writes by deterministic identity and retain authenticated Profile-scoped server authority | Existing session/API guards and deterministic import IDs | COMPLETE |
| PD-FR-007H59 | Synthetic cutover verification | Prove success, all ledger families, future-open preservation, duplicate blocking, midpoint transaction rollback, manual checkpoint rollback and minimal persisted source provenance without real data | Anonymised cutover fixture | COMPLETE |
| PD-FR-007H60 | Hosted cutover verification | Deploy and smoke-test the approved summary, controlled import, persisted reconciliation and rollback on a disposable hosted Profile | Vercel + Neon application path | NEEDS VERIFICATION |
| PD-FR-006R1 | Dashboard/Profile information architecture | Keep `/` as cross-Profile analytics and `/profiles` as Profile management | Existing analytics and Profile directory tabs | COMPLETE |
| PD-FR-006R2 | Founder rollout terminology | Remove the stale Founder Profile setup callout once normal Profiles exist | Existing zero-Profile empty state | COMPLETE |
| PD-FR-006R3 | Profile ownership verification | Confirm onboarding creates a normal Profile and links it to the authenticated Fund Manager | Existing onboarding transaction and `fund_manager_profile_links` | COMPLETE |
| PD-FR-006R4 | Profile archive lifecycle | Retain archive as the data-safe lifecycle and exclude archived Profiles from normal recent navigation | Existing Profile archive workflow | COMPLETE |
| PD-FR-006D1 | Workbook schema discovery | Read the current founder snapshot without modifying it and record sheets, tables and headers | Existing safe XLSX parser | COMPLETE |
| PD-FR-006D2 | Provider resolution | Resolve workbook accounts against the global catalogue as exact, alias, normalized, ambiguous or missing | Master Account Catalogue authority | COMPLETE |
| PD-FR-006D3 | Profile settings mapping | Classify Dashboard configuration as importable, derived, legacy or decision-required | Profile onboarding contract | COMPLETE |
| PD-FR-006D4 | Ledger mapping | Validate Sportsbook, Free Bet, Casino and Cash Adjustment rows against current contracts | Existing import mappers | COMPLETE |
| PD-FR-006D5 | Historical Extra Place extraction | Detect embedded sportsbook EP rows and classify migration completeness without invented fields | Extra Place contract | COMPLETE |
| PD-FR-006D6 | Import idempotency | Derive deterministic source identities and prove a repeated simulation is no-op | Existing import source hash contract | COMPLETE |
| PD-FR-006D7 | Financial reconciliation | Compare mapped ledger periods and account balances with workbook Reports | Existing reconciliation contracts | COMPLETE |
| PD-FR-006D8 | Private dry-run artifacts | Write private schema, mapping, provider, row-error, EP and readiness reports | Ignored `data/private/imports` convention | COMPLETE |
| PD-FR-008 | Founder import | Import the real workbook transactionally only after all safety gates pass | Explicit confirmation required | BLOCKED |
| PD-FR-009 | Reconciliation | Reconcile Profile, account, ledger and report totals against the live workbook | Workbook remains reconciliation authority | BLOCKED |
| PD-FR-010 | Real-data gate | Classify hosted state and prevent real-data use until auth, Neon, recovery and import checks pass | Security and data-safety rules | IN PROGRESS |
| PD-FR-011 | Vercel readiness | Verify production env, OAuth callbacks, sessions, protected APIs, writes and error handling | Existing Vercel deployment | NOT STARTED |
| PD-FR-012A | Searchable domains | Define authorized search coverage for providers, Profiles, accounts, ledgers, events and reports | Search Results workspace plan | DEFERRED |
| PD-FR-012B | Federated search service | Extend current authorized API queries without creating a duplicate external index | Search Results workspace plan | DEFERRED |
| PD-FR-012C | Search Results workspace | Add an actionable paginated results route using existing ledger/report primitives | Search Results workspace plan | DEFERRED |
| PD-FR-012D | Search Profile scope | Support current, selected and all-authorized Profile scopes | Search Results workspace plan | DEFERRED |
| PD-FR-012E | Search aggregates | Reuse contracted reporting calculations for balances, exposure and P&L; never fabricate totals | Search Results workspace plan | DEFERRED |
| PD-AUDIT-REPORT-001 | Reporting regression fixture | Reconcile the pre-existing cross-profile fee queue fixture expecting two entries while current data produces three | Cross-profile reporting tests; unrelated to PD-FR-004 | DEFERRED |
| PD-AUDIT-API-001 | Existing API regression suite | Reconcile pre-existing Account Catalogue authority assumptions; the Sportsbook optional-`catalogue_id` defect found by PostgreSQL CRUD is fixed under PD-FR-005G | API baseline outside PD-FR-004 | PARTIALLY COMPLETE |

## Hosted Persistence Debug Findings

- `PD-FR-005J1`: Production settings cannot be enumerated from this workspace because no Vercel
  project/CLI session is linked. The public health endpoint now fails closed unless the hosted
  function is explicitly configured for PostgreSQL/Neon and can execute a database query. The
  protected config summary remains the authenticated non-secret configuration check. On
  2026-08-29, the deployed health endpoint returned `200 {"status":"ok"}` after the Production
  Neon variables were applied, and a direct server-only connection check succeeded.
- `PD-FR-005J2`: every Dashboard source endpoint succeeds directly against Neon. The Vercel-only
  failure came from the server-rendered page calling the public deployment URL from inside the
  same deployment. Dashboard bootstrap now uses the authenticated browser same-origin API path and
  distinguishes loading, no-Profile setup and genuine service failure. The Fund Manager verified
  the hosted `Create the first Profile` state on 2026-08-29; this is the expected state until an
  authenticated identity creates its primary Profile link.
- `PD-FR-005J3`: canonical existing Account updates succeed directly against Neon. The deployed
  failure is consistent with the hosted function not using the same Neon runtime as the frontend;
  many seeded demo rows are also legacy and lack `catalogue_id`. The API now logs unexpected update
  failures server-side and returns a safe authenticated error, while the Account editor catches
  failed function/network requests instead of raising an unhandled UI exception. The exact hosted
  save path remains subject to post-deploy verification.
- `PD-FR-005J4`: the previous cookie was a signed 12-hour bearer token and Auto Logout was only a
  browser timer. Sessions now include a random server-side ID, are persisted/revoked in Neon, and
  validate inactivity on every protected API request. Browser activity explicitly refreshes the
  server timestamp; background data polling does not. Existing browser preferences are migrated to
  Neon on first authenticated use.
- `PD-FR-005J5`: the inspected Neon database has no persisted Fund Manager identity/Profile link.
  A successful OAuth callback in correctly configured Neon mode creates the identity; the existing
  reusable Create Profile workflow creates the primary link. No founder-only Profile model is added.
- `PD-FR-005J6`: the bundled catalogue JSON is the immutable bootstrap seed. The active managed
  document lives in Neon, and Profile Accounts reference it by stable `catalogue_id`; provider
  branding is resolved rather than copied into editable Profile state.
- `PD-FR-005J9`: Profile onboarding previously submitted `commission_rate: ""` for every selected
  Bookmaker and Bank, causing request validation to fail before the transactional create began.
  The client now omits empty optional commissions and preserves `0.00`; the API normalizes stale
  blank optional values while retaining the explicit selected-Exchange commission requirement.
- `PD-FR-005J10` to `PD-FR-005J14`: the canonical loading and field primitives are the signed-off
  source. Pending asynchronous data must not display authoritative zero/empty values. Money entry
  accepts shorthand decimals and selects an untouched default zero only on first focus. Exchange
  commission is entered as a human percentage (`2.00`) and transported/stored as the existing
  decimal fraction (`0.02`); blank remains absent and explicit zero remains `0.00`. Unit,
  typecheck, lint, production-build and focused Playwright verification passed on 2026-08-29,
  including light/dark input geometry and pending-versus-empty loading states.
- `PD-FR-005J15`: the Fund Manager-created hosted `Vercel` Profile is intentional temporary test
  data. It must remain available for this tranche's smoke test and then be removed through the
  normal Profile lifecycle before workbook migration begins.
- `PD-FR-005J29` to `PD-FR-005J33`: Profile onboarding now reuses the canonical adorned financial
  surface for starting bankroll and percentage-point fees. The untouched bankroll zero and default
  25% fees clear once for immediate entry, then format to two decimals without changing the
  established Profile fee storage unit. Registration prefill remains dependent on the deferred
  registration form and will use the same Profile field rather than a second source. Platform
  confirmations close shell popovers and suppress only the approved navigation's native unload
  prompt. Identity, notification and Profile-summary controls retain stable accessible loading
  feedback. Verification passed 245 web unit tests, 15 focused API tests and 10 focused Playwright
  checks, plus web lint/typecheck/build, targeted Ruff and `git diff --check` on 2026-08-29. Full
  API mypy retains five pre-existing diagnostics outside this corrective batch.

## PD-FR-001 Notification Matrix

| Source | Recipient and security | Trigger/timing | Duplicate control | Destination | Read/clear | Preference | Status |
|---|---|---|---|---|---|---|---|
| Database backup | Fund Manager; `fund_manager_only` | No verified backup, 7 days stale, or 25 changed tracker rows | Stable latest-backup/no-backup identity | `/settings#database` | Stage-aware read; local clear; no source mutation | Database Backup Reminders | COMPLETE |
| Partial lay | Fund Manager; `fund_manager_only` | Active/reopened; due day, 4h and 2h re-alert stages | Profile + row + reminder-change identity | Profile Sportsbook row | Stage-aware read; local clear; audited resolve/dismiss | Partial Lay Reminders | COMPLETE |
| Free-bet follow-up | Fund Manager; `fund_manager_only` | Active/reopened; due day, 4h and 2h re-alert stages | Profile + row + reminder-change identity | Profile Free Bet row | Stage-aware read; local clear; audited resolve/dismiss | Free Bet Follow-Up Reminders | COMPLETE |
| Account Catalogue transfer | Fund Manager; `fund_manager_only` | Import/export succeeds or fails | One local result per completed transfer | `/settings#catalogue` | Standard read/clear; no provider mutation | Account Catalogue Transfers | COMPLETE |

Current read, clear and preference state is intentionally local-first browser state. Durable hosted
persistence belongs to `PD-FR-005`. The API emits immutable Fund Manager audience/security tags,
and the client rejects malformed subscriber-scoped items as defence in depth. Authenticated
server-side owner enforcement is not complete until `PD-FR-004`; therefore the current hosted
classification remains **HOSTED PREVIEW ONLY - NO REAL FINANCIAL DATA**.

## PD-FR-004 Founder Authentication And Shell

FastAPI now owns Google authorization-code exchange with PKCE/state validation and issues a
short-lived signed HttpOnly session. A verified Google identity receives Fund Manager authority
only when its normalized email remains in the explicit owner allowlist. Next validates that same
session before protected pages, while FastAPI independently validates all application API reads
and mutations. Logout clears both session and OAuth state cookies.

The canonical top bar now includes an authorized grouped search over Fund Manager destinations,
Profiles and active global providers. The global drawer contains stable destinations and no longer
expands every Profile; current-Profile context retains a direct Dashboard route. Exact local and
Vercel configuration is recorded in `docs/deployment/founder-google-oauth-setup.md`.

Automated auth, shell, search, route and build checks must pass before this tranche leaves
`NEEDS VERIFICATION`. The real Google Vercel callback smoke test still requires production
verification by the Fund Manager. Until that check passes, the hosted classification
remains **HOSTED PREVIEW ONLY - NO REAL FINANCIAL DATA** and `PD-FR-005` must not start.

The Fund Manager completed the local allowlisted Google login and logout smoke test on 2026-08-28.
The production Vercel callback remains the final `PD-FR-004` verification gate. The public auth
shell now contains only centred branding, the Google action and a role-neutral registration stub.
It has no application top bar; it retains the locally stored theme and defaults to dark.
Authenticated pages show a compact Fund Manager identity menu linked to protected `/account`.
Direct login defaults to the canonical Dashboard at `/`; a safe protected `next` route still wins.

Production was redeployed from `5a13bd7` on 2026-08-28. The current frontend is live (`/register`
returns 200 and `/account` redirects to login), but `/api/healthz` and
`/api/auth/google/login` are still handled by the Next.js service and return its HTML 404. GitHub
reports a successful Vercel deployment, so this is not a stale commit. The Vercel project remains
configured with the `Next.js` Framework Preset rather than `Services`; change the project preset to
`Services`, retain repository root as the Root Directory, and redeploy before completing the
production OAuth smoke test. Neon remains blocked until this gate passes.

Live re-verification on 2026-08-28 reproduced the failure before Google: both
`GET /api/healthz` and `GET /api/auth/google/login` return the frontend Next.js HTML 404 with
`x-matched-path: /404`. The login control correctly targets the same-origin API and contains no
local host or development port. The repository Services contract now explicitly identifies the
backend as FastAPI and routes a final catch-all to the Next.js frontend, matching Vercel's
Next.js/FastAPI Services reference. Production remains blocked until the Vercel project Framework
Preset is `Services`, a deployment from the latest `main` completes, and the real hosted OAuth
smoke test passes. `PD-FR-005` remains unstarted.

`PD-AUDIT-REPORT-001` remains an explicitly unrelated, pre-existing reporting test mismatch: the
fee queue fixture expects two items while current fixture state produces three. It is not absorbed
into the authentication tranche and does not block its focused checks.

Focused verification passed five auth/API tests (including the mounted Vercel `/api` boundary),
229 web unit tests, eight shell/search Playwright tests, web typecheck, web lint, targeted Ruff,
production build and `git diff --check`. The production build retains the pre-existing dynamic
filesystem tracing warning from `apps/web/lib/local-db.ts`.

The final public-auth cleanup passed 229 web unit tests, three focused login/identity Playwright
tests, web lint, web typecheck, production build and `git diff --check`. The authenticated shell
retains its account and logout behavior; public login/register pages expose no application top bar.

The pre-auth hardening pass completed `PD-FR-004S` through `PD-FR-004Y`. Public OAuth failures,
unknown routes and generic errors now use neutral copy and no authenticated application chrome;
`/config-summary` requires an authenticated owner session. `/account` provides the optional
browser-local inactivity preference with 15, 30, 60, 120 and 240 minute choices, a canonical
final-minute warning and server logout. Activity and logout signals synchronize tabs. The actual
cookie/storage inventory is recorded at `docs/reference/browser-storage-cookie-inventory.md`; no
optional tracking technology is present, so the first-visit surface is an accurate required-storage
notice rather than fabricated consent choices. Profile and Fund Manager Settings tabs are restored
to normal document flow after removal of the unintended shared sticky positioning.

Verification on 2026-08-28 passed 231 web unit tests, five focused auth API tests, 14 focused
Playwright checks (including responsive/light-mode policy, inactivity warning/logout, cross-tab
logout and static tab geometry), web typecheck, web lint, production build and `git diff --check`.
The build retains the pre-existing dynamic filesystem tracing warning. Production Vercel Services
routing and the real hosted OAuth callback remain `PD-FR-004M`; this pass does not start Neon.

Production verification on 2026-08-28 confirmed commit `25aa3f1` serves `/api/healthz` with `200`,
redirects `/api/auth/google/login` to Google with the production callback
`https://plum-duff.vercel.app/api/auth/google/callback`, handles an invalid callback state neutrally,
serves the public brand asset directly, rejects an unauthenticated session request, and redirects an
unauthenticated protected page to login. A real Founder Google callback, authenticated refresh and
logout remain the manual `PD-FR-004M4` sign-off gate before Neon starts.

The repository-wide API run produced 235 passes and 46 pre-existing failures in untouched
Account Catalogue, Sportsbook, fee, opportunity, notification and import paths. The failures
include an untouched `create_sportsbook_bet` `KeyError: catalogue_id` and catalogue-authority
fixture assumptions affected by the existing local source. They are tracked as
`PD-AUDIT-API-001`; no auth-focused test failed and this tranche does not silently absorb them.

Focused verification on 2026-08-28 passed 15 notification/backup API tests, 223 web unit tests,
four notification-centre/preferences Playwright tests, six Free Bet/Settings Playwright tests,
web typecheck, web lint and `git diff --check`. Live public GitHub inspection found no dedicated
notification-centre issue; do not create a duplicate if authenticated issue reconciliation later
finds private or closed coverage.

## PD-FR-002 Account Catalogue Import Findings

The previous Import control performed preflight only and could not partially write provider data.
Its unhelpful `[object Object],[object Object]` message came from coercing FastAPI's structured
validation array into a JavaScript Error string. The corrected workflow formats field-specific
validation messages, requires an explicit reviewed Apply action, archives omitted providers,
blocks stable-id/name conflicts, validates the complete replacement and creates a local recovery
backup before atomic replacement. It never mutates Profile account rows or silently remaps their
provider relationships. Hosted durability remains blocked on `PD-FR-005` because this authority is
still file-backed.

Focused verification on 2026-08-28 passed the Account Catalogue and Profile onboarding API tests,
all 226 web unit tests, five focused Account Catalogue/Profile onboarding Playwright tests, web
typecheck, web lint and `git diff --check`.

## PD-FR-003 Reusable Profile Onboarding

The local onboarding flow can be repeated to create isolated Profiles with explicit module authority, catalogue-linked
Profile account state, opening balances, a main bank, Profile settings and optional Quick Action
favourites in one transaction. Sportsbook, Free Bets and Cash Adjustments remain mandatory;
Casino and Extra Places can be disabled without removing historical rows. Required global Quick
Actions remain inherited and cannot be disabled during onboarding.

Every created Profile must select at least one Exchange and store an explicit decimal commission
for each selected Exchange. Profile creation writes the selected accounts and commissions in the
same transaction, so a failed commission check cannot leave a partial Profile. Existing Profiles
manage the same catalogue-backed relationships from Profile > Accounts. That sole surface can
add or reactivate Bookmakers, Exchanges and Banks, archive unused relationships, and edit
Profile-owned balances/statuses; it cannot change global provider identity or archive the last
active Exchange.

The former Profile Settings Accounts editor has been removed; its legacy hash redirects to the
Accounts route. The Account editor resolves configured offer availability from the existing Quick
Action/Common Bet Combo authority. Duplicate providers are rejected both before the API write and
inside the serialized persistence boundary, while archival retains historical references.

The Accounts ledger Add Account editor uses the same authority. Its single grouped Account selector
lists active, operating-context-eligible Bookmakers, Exchanges and Banks from the Fund Manager
Account Catalogue. Legacy bookmaker presentation records may supply brand display metadata, but
cannot become selectable Profile providers unless a matching canonical provider exists. Selecting
an Exchange requires an explicit Profile commission and writes the account relationship and
commission in one transaction.

The implementation uses active GB global Account Catalogue identities and does not copy editable
global provider metadata into Profile settings. Invalid providers, duplicate codes and invalid
Quick Actions fail before any partial Profile is written. Focused automated coverage is complete;
Fund Manager synthetic-data smoke verification remains recommended before using the flow operationally.

Focused Exchange-authority verification on 2026-08-28 passed 22 Profile/account API tests, all
226 web unit tests, four focused onboarding/Settings Playwright checks, web typecheck, web lint,
targeted Ruff and `git diff --check`.

`PD-FR-003M` removed the inaccessible persisted-collapse state from Profile Accounts. The
consolidated Accounts surface has no collapse control, so obsolete local storage must never hide
its toolbar, loadouts, pagination or table. Regression coverage now leaves the old value set to
`true` while asserting the complete Accounts surface, editor and removal action remain available
without hydration, duplicate-key or runtime errors.

The founder is the first operational use of this shared flow, not a special one-off Profile type.
Later subscriber identity/invitation work will authorize access to an existing Profile rather than
creating another onboarding architecture. Workbook extraction remains `PD-FR-006A` and is blocked
from real-data execution until owner authentication and Neon persistence pass their safety gates.

The access model deliberately separates data ownership from identity authority. A Profile is the
isolated tracker/account container used for the founder and subscribers. A Fund Manager is an
authenticated user role that may administer Profiles. Subscriber registration will call the same
Profile provisioning service after approval; `PD-FR-004` must enforce the Fund Manager role on the
server before any UI may offer a full-security assignment.

## Profile Settings Ownership Map

- Former Demographics controls are under **General**.
- Tracker date, guided-entry and calculator defaults plus Exchange Commission are under **Defaults**.
- Profile offer-name lists and Quick Actions are under **Preferences**.
- Existing spreadsheet staging remains under **Import/Export**.
- **Security** is an explicit read-only future boundary for OAuth, sessions, login and MFA state.
- **Subscriber** is an explicit read-only future boundary for registration, approval, assignment,
  tier and portal state.

No control was deleted or moved into Fund Manager Settings. `/profiles` remains the Fund Manager's
operational Profile directory with search, status filtering, financial/open-position context and
direct Profile actions. Subscriber and authentication columns deliberately show unavailable future
state until their authoritative models exist.

## Profile Lifecycle And Shell Routing Checkpoint

`PD-FR-005J16` through `PD-FR-005J27` restore the existing Profile directory as the canonical
`/profiles` management surface instead of creating a second implementation. The authenticated root
`/` is the cross-Profile Dashboard, `/reports` is the global reports view, and legacy
`/profiles?view=performance`, `/profiles?view=reports` and `/performance` requests redirect to those
canonical routes. Profile directory, drawer and recent-menu actions consistently open
`/profiles/{profile_id}/tracker/dashboard`; Add Profile continues to use the existing
`/profiles/new` onboarding.

Profile archival uses the existing `Archived` lifecycle status and retains historical tracker data.
The application drawer limits recents to three Profile IDs recorded from genuine browser access,
then resolves those IDs against the current non-archived API catalogue. This browser-local recency
is intentionally a navigation preference, not a competing Profile authority; a future cross-device
recent-access field may replace it when that requirement is approved. Archive completion refreshes
the shell catalogue immediately so archived Profiles leave recent navigation without a reload.

The authenticated shell now owns a three-pixel, no-layout-shift route/data progress line beneath
the header. Existing structured surfaces retain `LedgerLoadingIndicator` skeleton/section feedback;
the global line does not replace component loading, empty or error states. Dashboard analytics retain
only the supported Profile scope and date range controls, with canonical desktop dimensions and
single-column responsive wrapping.

Verification on 2026-08-29 passed 245 web unit tests, 10 focused auth/API tests, seven focused
navigation/lifecycle Playwright checks plus the Dashboard loading-state check, web typecheck, web
lint and production build. The build retains the pre-existing dynamic filesystem tracing warning
from `apps/web/lib/local-db.ts`. `PD-FR-005J28` remains a hosted Fund Manager smoke gate: use the
temporary `Vercel` Profile to verify edit/navigation/recency and then archive it through the Profile
directory before founder workbook dry-run begins.

## Import Review Semantics And Accounts Pass

- `PD-FR-007H37` COMPLETE: a non-interactive review-table row click or Space key toggles its existing multi-select checkbox state.
- `PD-FR-007H38` COMPLETE: dry runs include a target-Profile Account change plan for creates, matches, balance/status updates, unchanged, unresolved and absent accounts.
- `PD-FR-007H39` COMPLETE: workbook `*No Exchange*` normalizes to canonical `No Lay`; no Exchange or lay fields are invented.
- `PD-FR-007H40` COMPLETE: pre-execution Free Bets do not require strategy or event data solely because they have not been placed.
- `PD-FR-007H41` COMPLETE: an unplaced £10 Free Bet retains face value and imports with £0.00 current P&L rather than -£10.
- `PD-FR-007H42` COMPLETE: the private regression oracle now produces 44 partial ledger rows (23 Sportsbook, 9 Free Bet, 12 Casino) instead of 114; all source rows remain accounted for.
- `PD-FR-007H46` COMPLETE: mapping v4 reclassifies five lifecycle-proven non-executed rows in the retained private oracle, reducing it to 39 partial ledger rows and 42 total review items while preserving 710/710 ledger-row accounting and zero week/month/year reconciliation differences. The newer hosted workbook must be re-uploaded because raw upload bytes are intentionally not retained.
- `PD-FR-007H43` COMPLETE: non-imported workbook review runs can be deleted with canonical destructive confirmation; completed/importing runs remain protected.
- `PD-FR-007H44` COMPLETE: unnecessary upload preamble was removed and the existing form/action geometry retained.
- `PD-FR-007H45` COMPLETE: review evidence sections use separate canonical stacked subpanels rather than concatenated headings/text.
- `PD-FR-007H46` NEEDS VERIFICATION: hosted smoke must confirm prior background analysis, notifications, persisted decisions, reset, Save & next, batch review, compact table, loadouts and P&L impact remain intact.

## Safety Gate

`PD-FR-008` may move out of `BLOCKED` only after notification sign-off, catalogue import
reconciliation, reusable Profile onboarding, owner-only authentication, Vercel protection, Neon CRUD,
recovery verification, anonymised dry-run fixtures and an understandable reconciliation report all
pass.
