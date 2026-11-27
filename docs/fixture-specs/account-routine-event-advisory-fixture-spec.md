# Fixture Plan: Account Evidence, Reviewed Occurrences and Optional Advice

_Planning only, 2026-11-27. All names and IDs below are synthetic. These are acceptance cases to implement after the relevant storage/scheduling/provider decisions, not claims of passing tests._

| ID | Synthetic input | Required assertion |
| --- | --- | --- |
| ARE-001 | `Profile A` / `Bookmaker A`: last working login known; promotions later absent without a message; observation date approximate. | Suspected loss, not confirmed gub; recorded time differs from approximate observed time; prior working evidence retained. |
| ARE-002 | A previously sign-up-restricted `Bookmaker B` Account later accepts an ordinary stake and a reviewed promotion. | Evidence updates only tested capabilities/context; no blanket Active/full-promo restoration. |
| ARE-003 | Long-used restricted Account receives one `Demo Offer`, then returns to its prior limited state. | One-off exception and later limitation coexist in chronological history; no global eligibility claim. |
| ARE-004 | Two accepted stake tests at different odds/markets, one public maximum and distinct personal maximum. | Each limit remains contextual; expected value is distinct from canonical realised P&L. |
| ARE-005 | Conflicting access evidence followed by an explicit full review; an earlier mistaken observation is superseded. | Conflict and traceable correction remain visible; current state cites last review, actor and source. |
| ARE-006 | `Profile A` and `Profile B` share a provider catalogue identity but have different Account restrictions. | No cross-Profile evidence, task or value leakage. |
| ARE-007 | Dormant/restricted Account has a user-set quarterly recheck; review records `no_opportunity_to_test`. | Review schedule remains until explicit pause/closure; no false unavailable/verified capability. |
| ARE-008 | Imported current Stake/Promo Access with no dated history. | Provenance-labelled baseline; no invented restriction or restoration event. |
| RTE-001 | Reviewed weekly `Demo Routine A`, two consecutive Europe/London weekend windows. | Distinct stable occurrences; completing first does not complete second; refresh/retry creates neither duplicate task nor alert. |
| RTE-002 | Monthly/yearly/seasonal and one-off definitions near DST and month end. | Explicit timezone/window rule; missed, skipped and snoozed outcomes follow the future approved policy, never guessed by tests. |
| RTE-003 | `Demo Event A` postponed, then cancelled after a task was completed. | Completed history stays; future windows are rescheduled/suppressed idempotently and no false completion is inferred. |
| RTE-004 | Reviewed routine source is stale and Account eligibility unknown. | Today prompts verification with reason/source; no confirmed offer, stake or financial action. |
| RTE-005 | Per-occurrence offer review returns no test opportunity; another occurrence has changed terms. | Distinct review outcomes; explicit Account observation only when user chooses it; native Prospecting/reminder/Combo handoff requires confirmation. |
| AIA-001 | Optional adviser unavailable or disabled with structured Account and task evidence. | Deterministic queue and native routes still work; no missing-provider failure becomes a false empty task list. |
| AIA-002 | Adviser summary conflicts with one dated Account observation or claims a one-off offer means full restoration. | Output flags conflicting/missing evidence and uncertainty; baseline and source dates remain visible; no capability or P&L mutation. |

Do not copy owner-specific brands, stake limits or operational histories into fixtures. Numerical capability evidence, if later shown as money, needs its own deterministic source/value assertions under the financial safety rules. Financial lifecycle tests remain under existing native ledger fixtures.
