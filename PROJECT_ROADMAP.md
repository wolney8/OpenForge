# Project Roadmap — Plum Duff / OpenForge — Doc ID: PR-CODEX-001

## Product goal

Plum Duff is a local-first, profile-isolated matched-betting tracker based on Will's workbook.
It should preserve cash-first financial meaning while making planning, recording, settlement,
reporting and recovery clearer and safer.

## Current milestone

Continue the evidence-led platform audit from the completed local integration gate so the next
implementation batches are prioritised by financial, security and user impact rather than by
isolated visual polish.

## Now

- Keep the reviewed integration available through normal `localhost:3010` sign-in and data.
- Preserve completed Profile import, populated-ledger, combined-report and 200-record evidence.
- Keep the tested import-identity and durable-history candidate isolated until normal-local
  migration is separately authorised and the browser integration gate passes; the CP-013 runtime
  isolation and clone-migration safety gate is complete.
- Preserve the completed Account, ledger-write, award, Blackjack and calculator safeguards.
- Continue #114 accessibility, recovery, competitor, requirements and security evidence without
  waiting for deferred calculator-owner comparison.

## Next

- If authorised, migrate the newly backed-up normal-local database and complete source-relationship,
  durable-history and browser integration checks.
- Exercise remaining notification, failure/retry and recovery paths.
- Complete actual screen-reader, larger-scale and expensive-request evidence.
- Resolve or disposition dependency exposure and release prerequisites.
- Reconcile the next request groups and select bounded implementation batches.

## Later

- Interactive Dashboard and Reports analytics ([#111](https://github.com/wolney8/OpenForge/issues/111)).
- Account restrictions, capability intelligence, observations and freshness
  ([#70](https://github.com/wolney8/OpenForge/issues/70), [#82](https://github.com/wolney8/OpenForge/issues/82), [#85](https://github.com/wolney8/OpenForge/issues/85), [#106](https://github.com/wolney8/OpenForge/issues/106)).
- Daily tasks and explainable advisory support
  ([#25–#31](https://github.com/wolney8/OpenForge/issues), [#86](https://github.com/wolney8/OpenForge/issues/86)).
- Remaining calculator/ledger gaps, including richer Multi-Lay placement and changed-odds fills.
- Subscriber access, billing and governed AI capabilities when their contracts are approved.

## Deferred / decision required

- The #113 bulk owner calculator comparison is deferred without a date; engineering verification continues.
- CP-012/013 normal-local migration is ready for a separate owner decision; main, Neon and Vercel
  migration remain outside that approval.
- An owner smoke test may follow the engineering gate but does not block independent audit work.
- Vercel Preview or release requires isolated data, genuine authentication, PostgreSQL evidence,
  dependency disposition and credential prerequisites.
- OddsForge, live scraping and autonomous wagering remain outside the current Plum Duff scope.
- Historical SR and bonus-on-win records remain compatible but are not everyday new-calculation priorities.

## Dependency flow

`Integrated local build` → `Engineering gate` → `Owner smoke test when convenient`

`Engineering gate` → `Continue platform audit` → `Prioritised feature batches`
→ `Approved Vercel Preview` → `Hosted acceptance`

The owner smoke test and continuing audit can proceed independently after the engineering gate.

## Detailed planning

- [Canonical request register](docs/planning/plum-duff-next-issue-tracking-register.md)
- [Milestone and readiness map](docs/planning/openforge-milestone-contract-fixture-readiness.md)
- [Planning index](docs/planning/README.md)
- [Platform quality audit](docs/audits/platform-quality-audit.md)
- [GitHub Issues](https://github.com/wolney8/OpenForge/issues)
- [GitHub Milestones](https://github.com/wolney8/OpenForge/milestones)
