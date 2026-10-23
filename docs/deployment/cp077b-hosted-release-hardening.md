# CP-077B Hosted Release Hardening

Last checked: 2026-10-07 11:58:53 BST

## Boundary

- Branch: `release/cp077b-hosted-hardening`
- Baseline: `034304339304756319196459ae28d0269f82deb9`
- GitHub/Vercel remain unchanged at `f7a3b35073ecc87cdf8f8f881129f221ec44d395`.
- CP-075, OddsMatcher, workbook portability development and product features are excluded.

## Dependency gate

The baseline production audit reported three blocking advisories: Next.js `16.3.3`
(critical), `sharp` `0.35.4` (high) and `source-map-js` `1.2.1` (high). The bounded
update uses Next.js and `eslint-config-next` `16.3.6`, with deterministic workspace
overrides for `sharp` `0.35.5` and `source-map-js` `1.2.2`. `pnpm audit --prod`
then reported zero production advisories at every severity. This means the reported
advisories are removed; it is not a general claim that dependencies carry no risk.

## Hosted contract corrections

The two hosted readiness assertions expected `account-access-v1`. Production schema
detection has returned `invited-subscribers-v1` whenever
`subscriber_applications` exists since `a874b03`; the assertions, not the schema,
were stale. Production runtime identity is now explicitly supported and fails closed
unless it uses HTTPS, PostgreSQL, `OPENFORGE_ENVIRONMENT=production`, an exact
`production:<database-name>` identity, an explicit source revision and complete owner
authentication. No schema or financial calculation changed.

Turbopack's dynamic file trace formerly referenced the ignored local owner database
and emitted a broad filesystem warning. Runtime-only seed reads now carry the supported
ignore annotation and Next output tracing explicitly excludes `data/private/**`.
The rebuilt server trace contains zero private workbook, `_input` or owner-database
entries and no dynamic tracing warning.

## PostgreSQL upgrade and recovery rehearsal

A disposable PostgreSQL 18.6 database representing marker `20260905_002` was populated
with synthetic Profile, Account, Sportsbook, Free Bet, Casino and Cash records. The
exact historical migrations ran in order:

1. `20260905_002_portable_profile_restore`
2. `20260914_003_core_lay_plans`
3. `20260915_004_sportsbook_offer_metadata`
4. `20260916_005_import_identity_financial_history`
5. `20260918_006_account_access`
6. `20260926_007_profile_relationship`
7. `20260927_008_invited_subscribers`

The legacy-row digest was unchanged before and after upgrade:
`d269f4c040d87747212d9183d7bc1976d86704ef77fa0404db7f2dd9ad914c2b`.
Foreign keys, the append-only trigger, migration retry, current application startup,
Profile isolation, writes, Daily Tasks and combined Reports passed. A pre-upgrade dump
with SHA-256
`5bb8e1bfc3b8a86d329296b3b4ec305e5ff4cfba34b17822bee8a4989d8fc1ae`
was restored into a fresh database. The restored digest and `002` marker matched, and
the old hosted application `f7a3b350` passed health, representative reads and a write.
No hosted database was contacted.

## Verification receipt

- Web unit tests: 536 passed.
- Focused API release coverage: 225 passed, with the known pre-existing
  subscriber/Profile delete-cascade invariant deselected and unchanged.
- Hosted runtime/readiness checks: 55 passed.
- Workbook structure/import/export baseline: 88 passed, 10 private-source-dependent
  cases skipped.
- Focused protected browser checks: pre-auth security 11 passed; aggregate Reports 2
  passed. A disposable unauthenticated Daily Tasks attempt redirected to login as
  designed and is not represented as a passing authenticated hosted smoke.
- Web and API typechecks, production build, focused ESLint and Ruff: passed.
- Full repository web lint still reports the pre-existing Free Bet render-time ref
  access error plus unrelated warnings; no changed file has a lint finding.

## OAuth issue #96: owner/provider procedure

The established deployment currently shares one Google Web OAuth client binding between
Production and the stable protected Preview. Rotate it without revealing either secret:

1. In Google Cloud Console, open **APIs & Services → Credentials** for the approved Plum
   Duff project and create a new **OAuth client ID → Web application**.
2. Add JavaScript origins `https://plum-duff.vercel.app` and
   `https://plum-duff-cp028-preview-homelab11.vercel.app`. Retain
   `http://localhost:3010` only if the same replacement client will continue to serve
   authorised local Google sign-in.
3. Add matching redirect URIs ending `/api/auth/google/callback` for those same origins.
4. In Vercel project `plum-duff`, update encrypted
   `OPENFORGE_GOOGLE_OAUTH_CLIENT_ID` and
   `OPENFORGE_GOOGLE_OAUTH_CLIENT_SECRET` for both Production and Preview. Do not paste
   the values into source, logs or issue comments.
5. At the approved release, redeploy Preview first, confirm Google sign-in reaches an
   authorised protected page, then deploy Production and repeat on the Production domain.
6. Only after both replacement logins succeed, delete/revoke the old exposed Google OAuth
   client and confirm a fresh sign-in still succeeds.

Before deployment, Vercel Production also needs the non-secret production runtime role,
endpoints, exact source revision and `production:<actual-database-name>` identity plus a
Production-scoped Neon connection. Create a named Neon recovery point immediately before
the `002 → 008` migration. These provider actions and explicit hosted release approval
remain outside this checkpoint.
