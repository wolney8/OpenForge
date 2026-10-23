# Project Roadmap — Plum Duff / OpenForge — Doc ID: PR-CODEX-001

## CP-079 Oddsmatcher programme decision — 2026-10-23

Oddsmatcher remains audit/research only. The first releasable tranche is not a mock table: after an
owner-approved provider/terms gate, deliver a read-only Football Match Odds Normal/single-lay finder
using authorised bookmaker and exchange data, truthful freshness/liquidity, Profile Account
eligibility, the existing calculator and an explicit idempotent Prospecting draft. Then add SNR/SR
and refund modes, full discovery controls, wider market matching and reliability. Direct exchange
placement is excluded pending a separate product/security approval. Preserve M8 provenance but use
the current canonical no-copy/no-scraping boundary. Full audit, provider matrix and estimates are in
[CP-079](docs/audits/platform-quality-audit.md#cp-079-local-ship-audit-and-oddsmatcher-knowledge-freeze--2026-10-23).


**Last updated:** 2026-09-26 23:29:27 BST

## Product goal

Plum Duff is a local-first, profile-isolated matched-betting tracker based on Will's workbook.
It should preserve cash-first financial meaning while making planning, recording, settlement,
reporting and recovery clearer and safer.

## Current milestone

**Completed milestone:** local whole-platform audit plus integrated owner acceptance. The accepted
normal-owner source/data/runtime combination is frozen as the comparison baseline.

**Completed milestone:** protected hosted Preview engineering verification within the supported
scope. The isolated Preview proves its revision, `preview` role, dedicated PostgreSQL identity,
schema, OAuth, supported journeys, responsive UI, authorization, diagnostics and recovery boundary.

**Completed milestone:** hosted performance closure and local reconciliation. The tested shared
application fixes now run on the canonical normal-owner runtime after clone, backup and unchanged-
projection evidence; Preview-only role, database and protection configuration stayed hosted-only.

**Completed correction gate:** #117 existing-row Notes editing is repaired across all five ledger
editors, protected-Preview verified and reconciled into the normal local build through the existing
backup/identity gate.

**Current correction gate:** CP-035 explicit Save/Discard is owner-confirmed; CP-037 completes the
authenticated CP-036 settled-value/disclosure check. #117 remains open for separate owner acceptance,
not another bulk engineering audit. CP-037 also repairs #111 chart hover and betting-P&L scope.

**Completed bounded slice:** CP-038 delivers #111's weekly period-P&L preset, record reconciliation
and saved return context, with #92 compact Report/help/header repairs. Preview and normal localhost
share application `516baf5`; direct authenticated normal-owner browser recheck remains unexecuted,
while isolated SQLite and authenticated Preview evidence pass.

**Completed feature slices (CP-047):** Normal Multi-Lay actual fills through settlement, correction,
History/Reports and restore; Sportsbook/Account review with atomic balance confirmation and core
observation history. Application `e2d70e0` runs locally and on protected Preview. Existing storage
was sufficient; no SQL migration. #105's named engineering pass remains complete.

**Current milestone (CP-055):** explicit Personal/Managed relationship, bounded Reports Explorer V1 and Accounts-only authority/portability are implemented and tested locally at `534a5f4`. Additive schema preserves prior data/financial projections and leaves legacy relationships unclassified. Protected Preview remains `b6437e8`: fresh dedicated DB recovery access and synthetic session renewal are missing.

**Next outcomes:** (1) recover the specific Preview resources, then promote/test the complete slice and inspect remaining synthetic hygiene; (2) answer ALPHA purpose and prepare exact new-Personal cutover for separate approval. No real import, archive, merge or reclassification before approval.

Subscriber invitation/request/access remains the existing minimal proposal, awaiting exact state/visibility/role/storage approval. Reuse identities; do not begin a second model. AI/provider/spend remains unapproved. No cosmetic tranche, new audit, merge engine, public signup, Production or Git push.

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
- Keep bounded local gaps visible: unsupported Multi-Lay backing/reward/multiple-market configurations,
  later #111 controls and other explicitly planned features are not audit failures.

## Hosted acceptance

- The authorised Preview is live behind Vercel protection with dedicated synthetic-only PostgreSQL;
  its stable callback is `https://plum-duff-cp028-preview-homelab11.vercel.app/api/auth/google/callback`.
- Hosted OAuth and the supported authenticated browser journey set pass. The claim excludes richer
  Multi-Lay placement/reward modes and the recorded 600-row pagination/capacity item.
- Keep #96 credential rotation and provider-owned configuration as explicit owner/provider actions.

## Owner / manual acceptance

- One bounded VoiceOver spoken-output check remains pending.

## Planned product features

- #111 weekly/formal Reports and Explorer V1 range/metric/filter/group/source paths are implemented locally. Reliable historical Sportsbook/Free Bet placement dates are unavailable; counts explicitly use reporting dates. Saved presets and richer analytics remain separate.
- Account freshness/trends and broader task dispositions remain planned; core observations and Daily Tasks are delivered. Richer Multi-Lay configurations remain explicit unsupported scope.

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
- Remaining calculator/ledger gaps, including unsupported Multi-Lay backing/reward/multiple-market configurations; Normal changed-odds fills are delivered.
- Subscriber access, billing and governed AI capabilities when their contracts are approved.

## Deferred / decision required

- The #113 bulk owner calculator comparison is deferred without a date; engineering verification continues.
- VoiceOver spoken output requires owner/manual evidence; application-owned accessibility evidence
  is complete. The genuine local Google interaction passed on the frozen baseline.
- Main and Production integration remain later, separately approved release decisions. CP-028's
  Neon/Vercel work is confined to one protected Preview database and deployment.
- An owner smoke test may follow the engineering gate but does not block independent audit work.
- The protected Preview engineering and performance gates completed under CP-032; Production is a later decision.
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
