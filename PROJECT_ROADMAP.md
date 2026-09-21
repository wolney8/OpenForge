# Project Roadmap — Plum Duff / OpenForge — Doc ID: PR-CODEX-001

**Last updated:** 2026-09-21 15:24 BST

## Product goal

Plum Duff is a local-first, profile-isolated matched-betting tracker based on Will's workbook.
It should preserve cash-first financial meaning while making planning, recording, settlement,
reporting and recovery clearer and safer.

## Current milestone

**Completed milestone:** local whole-platform audit plus integrated owner acceptance. The accepted
normal-owner source/data/runtime combination is frozen as the comparison baseline.

**Current milestone:** protected hosted Preview verification. The isolated Preview is deployed and
its revision, `preview` role, dedicated PostgreSQL identity, schema, readiness and recovery boundary
are proven. Genuine hosted Google authentication now passes. Authenticated server rendering was
repaired, but the Reports route's React maximum-update-depth error keeps the engineering gate open.

**Next outcome:** repair the bounded Reports render loop, rerun the serial authenticated hosted
journeys, record owner environment acceptance, then make a separate retain/teardown decision.
Production remains a later, separately authorised promotion gate.

## Local defect / completeness

- Keep the reviewed integration available through normal `localhost:3010` sign-in and data.
- Preserve CP-025's explicit owner environment selection and fail-closed authentication readiness;
  a normal-owner process must never start silently without its Google/session boundary.
- Preserve the CP-022 active-only query boundary, grouped cash-health disclosure and governed
  synthetic-data retention so database growth cannot make ordinary owner work scale with archives.
- Preserve the CP-023 delayed branded session gate, canonical list identity and the owner-accepted
  CP-023–CP-026 Multi-Lay information hierarchy and visual contract.
- Preserve completed Profile import, populated-ledger, combined-report and 200-record evidence.
- Preserve the completed CP-014 normal-local identity/history migration, rollback checkpoint and
  authenticated browser evidence while main and hosted environments remain unchanged.
- Preserve the completed Account, ledger-write, award, Blackjack and calculator safeguards.
- Preserve the complete authenticated #109 workbook/award and Global Search/Quick Action journeys.
- Keep bounded local gaps visible: richer Multi-Lay placement/reward modes, changed-odds fills,
  later #111 controls and other explicitly planned features are not audit failures.

## Hosted acceptance

- The authorised Preview is live behind Vercel protection with dedicated synthetic-only PostgreSQL;
  its stable callback is `https://plum-duff-cp028-preview-homelab11.vercel.app/api/auth/google/callback`.
- Hosted OAuth passes. Finish the authenticated browser journey set without React/runtime errors
  before considering Preview verified. Deployment/readiness evidence alone is not product acceptance.
- Keep #96 credential rotation and provider-owned configuration as explicit owner/provider actions.

## Owner / manual acceptance

- One bounded VoiceOver spoken-output check remains pending.

## Planned product features

- #111 one period-P&L Reports preset is the next approved bounded reporting slice; the general
  metric/granularity/filter model and saved explorer presets need later design.
- Account freshness/trend reporting, decision-support tasks, richer Multi-Lay and approved source
  ingestion remain separately planned.

## Security / operations

- Retain zero known production advisories, fail-closed database ownership and verified local backup.
- Resolve hosted log retention/redaction, Preview teardown, Neon recovery and credential ownership
  inside the protected Preview gate, not by inference from local evidence.

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
- VoiceOver spoken output requires owner/manual evidence; application-owned accessibility evidence
  is complete. The genuine local Google interaction passed on the frozen baseline.
- Main and Production integration remain later, separately approved release decisions. CP-028's
  Neon/Vercel work is confined to one protected Preview database and deployment.
- An owner smoke test may follow the engineering gate but does not block independent audit work.
- The protected Preview gate is in progress under CP-029; Production is a later decision.
- OddsForge, live scraping and autonomous wagering remain outside the current Plum Duff scope.
- Historical SR and bonus-on-win records remain compatible but are not everyday new-calculation priorities.

## Dependency flow

`Integrated local build` → `Engineering gate` → `Owner acceptance` → `Frozen local baseline`

`Frozen local baseline` → `Approve protected Preview` → `Isolated hosted engineering gate`
→ `Hosted owner acceptance` → `Separate Production decision`

## Detailed planning

- [Canonical request register](docs/planning/plum-duff-next-issue-tracking-register.md)
- [Milestone and readiness map](docs/planning/openforge-milestone-contract-fixture-readiness.md)
- [Planning index](docs/planning/README.md)
- [Platform quality audit](docs/audits/platform-quality-audit.md)
- [GitHub Issues](https://github.com/wolney8/OpenForge/issues)
- [GitHub Milestones](https://github.com/wolney8/OpenForge/milestones)
