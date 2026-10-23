# Plum Duff owner acceptance — critical journeys

## Purpose

Use this guide to record owner evidence for the nine workflows needed for dependable everyday use.
Automated evidence supports a journey but cannot mark it **OWNER ACCEPTED**. Only the owner may do
that. Completing every box does not by itself approve release or production readiness.

- Application: [http://localhost:3010](http://localhost:3010)
- Baseline before custody reconciliation: `f4b9771e9bf54e406d6c3caa023b939f61dd9ba4`
- Test identity: use an existing protected synthetic/test Profile, normally `ALPHA-001`, only while
  it remains formally designated for test data. Never use a genuine financial Profile for smoke data.

### Status legend

- **OWNER ACCEPTED** — owner has completed and recorded the current journey on the stated build.
- **IMPLEMENTED — OWNER ACCEPTANCE PENDING** — code and automated evidence exist; owner result is open.
- **CODE-VERIFIED ONLY** — automated/disposable evidence exists; no equivalent owner journey is recorded.
- **BROKEN / BLOCKING** — the observed journey cannot safely continue.

### Stop immediately if

- the Profile identity, Account or source workbook is not the intended one;
- a value changes before **Save**, or a retry creates a duplicate;
- unknown money is displayed as zero, projected value is presented as realised, or another Profile's
  records appear;
- an import, restore or correction proposes overwriting newer activity without an explicit review;
- the build, database identity or URL differs from the baseline recorded for the test.

## Recommended order

1. Login and session; 2. range/Profile switching; 3. Accounts/cash; 4–6. ledger and promotion
journeys; 7. Reports; 8. workbook round-trip; 9. recovery/rollback.

## Summary checklist

| Done | Journey | Current status |
| --- | --- | --- |
| [ ] | 1. Google login, refresh and canonical restart | IMPLEMENTED — OWNER ACCEPTANCE PENDING |
| [ ] | 2. Universal Selected Range and Profile switching | IMPLEMENTED — OWNER ACCEPTANCE PENDING |
| [ ] | 3. Accounts and partial-known cash readiness | IMPLEMENTED — OWNER ACCEPTANCE PENDING |
| [ ] | 4. Sportsbook create → place → settle → correct | CODE-VERIFIED ONLY |
| [ ] | 5. Qualifying loss → linked Free Bet → save/reopen | CODE-VERIFIED ONLY |
| [ ] | 6. Refund/reward → wagering → confirmed release | IMPLEMENTED — OWNER ACCEPTANCE PENDING |
| [x] | 7. Reports and P&L reconciliation | OWNER ACCEPTED — CP-078, subject to reacceptance after source/calculation change |
| [ ] | 8. Workbook import → PD edits → export → no-write re-import review | IMPLEMENTED — OWNER ACCEPTANCE PENDING |
| [ ] | 9. Backup → restore → compatible application rollback | CODE-VERIFIED ONLY |

## 1. Google login, refresh and canonical restart

- **Status:** IMPLEMENTED — OWNER ACCEPTANCE PENDING
- **What this proves:** the same authorised owner session is accepted by the API and frontend after
  callback, refresh and a canonical local restart.
- **Preconditions/test identity:** normal owner Google identity; canonical 3010/8010 processes.
- **Route:** [Login](http://localhost:3010/login), then any protected route.
- **Owner steps:**
  1. Select **Continue with Google** and complete the existing Google flow. Expect the requested
     protected page, not another Login page.
  2. Refresh. Expect the same authorised page and owner identity.
  3. Ask Codex to perform one canonical local restart; after it reports 3010/8010 healthy, refresh.
     Expect the session to remain valid or a clear, intentional sign-in expiry—not a silent loop.
- **PASS:** callback, refresh and restart preserve or clearly expire the authorised session.
- **STOP/FAIL:** silent return to Login, wrong owner, repeated consent, 401 after a valid callback.
- **Evidence:** date/build, destination route and any owner-facing error text. Never record cookies.
- **Cleanup:** none.
- **Known limitation:** OAuth issue #96 remains deferred owner-accepted development risk.

## 2. Universal Selected Range and Profile switching

- **Status:** IMPLEMENTED — OWNER ACCEPTANCE PENDING
- **What this proves:** one Fund Manager range controls every supported Profile surface without stale P&L.
- **Preconditions/test identity:** two authorised Profiles; one may have no activity in the range.
- **Route:** [Profiles](http://localhost:3010/profiles), then Profile Operations.
- **Owner steps:**
  1. Set **Selected Range** to **Last Month**. Expect summary values to enter **Updating summary…**
     and then resolve for that range.
  2. Switch Profile from the header. Expect the same range and the equivalent Profile sub-route.
  3. Open Sportsbook, Free Bets and Reports, then refresh and sign out/in. Expect **Last Month** to remain.
- **PASS:** one range persists; no stale Profile/range value or permanent loader appears.
- **STOP/FAIL:** range changes per Profile, old P&L reappears, or **Updating summary…** never resolves.
- **Evidence:** date/build, Profiles used, selected range and affected route.
- **Cleanup:** restore the preferred everyday range once.
- **Known limitation:** owner acceptance of the latest header/chart composition is still pending.

## 3. Accounts and partial-known cash readiness

- **Status:** IMPLEMENTED — OWNER ACCEPTANCE PENDING
- **What this proves:** known cash remains visible while unknown Account balances remain explicit.
- **Preconditions/test identity:** an authorised Profile with at least one known and one genuinely
  unknown cash-counting Account balance.
- **Route:** Profile Operations, then **Accounts**.
- **Owner steps:**
  1. Inspect **Current Account Cash**. Expect **Known cash**, one aligned row per category and an
     **Incomplete — N Account balances missing** message.
  2. Select **Review affected Accounts**. Expect each Account once with combined reasons.
  3. Confirm inactive/non-cash-counting Accounts are not treated as missing cash.
- **PASS:** known is not labelled complete; unknown is not zero; affected Accounts are unique.
- **STOP/FAIL:** duplicate Account rows, a fabricated zero, or Account cash makes betting P&L unavailable.
- **Evidence:** count and non-sensitive category labels; do not record real balances in public evidence.
- **Cleanup:** none unless the owner deliberately corrects a genuine Account observation.
- **Known limitation:** genuine missing balances remain warnings until recorded.

## 4. Sportsbook create → place → settle → correct

- **Status:** CODE-VERIFIED ONLY
- **What this proves:** one bet retains identity, draft/placement boundaries, settlement economics and history.
- **Preconditions/test identity:** protected synthetic Profile and existing synthetic Bookmaker/Exchange Accounts.
- **Route:** `/profiles/{PROFILE_ID}/tracker/sportsbook-bets`.
- **Owner steps:**
  1. Add a clearly labelled small synthetic **Prospecting** Single bet. Expect no placed exposure.
  2. Enter actual back/lay execution and change status to **Placed**; save and reopen. Expect the same ID.
  3. Settle with a deterministic result. Expect realised P&L only after settlement.
  4. Use the governed correction action and reason. Expect retained history and updated current record.
- **PASS:** one stable record, correct current/realised transition and auditable correction.
- **STOP/FAIL:** autosave before confirmation, duplicate retry, history loss or unexpected P&L.
- **Evidence:** synthetic ID, statuses and independently expected result.
- **Cleanup:** retain/archive according to synthetic financial-history policy; do not hard-delete history.
- **Known limitation:** this is not bookmaker placement automation.

## 5. Qualifying loss → linked Free Bet → save/reopen

- **Status:** CODE-VERIFIED ONLY
- **What this proves:** a qualifying Sportsbook row creates the intended same-Profile Free Bet lineage once.
- **Preconditions/test identity:** protected synthetic Profile; eligible synthetic Bet & Get-style source.
- **Route:** Sportsbook Bets, then Free Bets for the same Profile.
- **Owner steps:**
  1. Open the qualifying Sportsbook record and record the qualifying loss/award evidence.
  2. Select **Create Free Bet**. Expect Profile, bookmaker and parent identity to carry forward.
  3. Save, close and reopen the Free Bet. Expect one Free Bet and the same parent link.
- **PASS:** stable IDs, same-Profile parent, correct reward value/state and idempotent retry.
- **STOP/FAIL:** cross-Profile link, duplicate award, lost parent or reward counted as realised cash.
- **Evidence:** synthetic parent/child IDs and displayed lineage state.
- **Cleanup:** retain under the synthetic history policy.
- **Known limitation:** an award is not a settled Free Bet result.

## 6. Refund/reward → wagering → confirmed release

- **Status:** IMPLEMENTED — OWNER ACCEPTANCE PENDING
- **What this proves:** current cash, locked face value, estimated conversion and actual release stay distinct.
- **Preconditions/test identity:** protected synthetic Profile and a CP-075 refund-if-loses example.
- **Route:** Sportsbook Bets; open the linked promotion position.
- **Owner steps:**
  1. Inspect the Trigger scenarios before settlement. Expect separate bookmaker-win and refund paths.
  2. Confirm a qualifying loss and reward. Expect realised cash, locked reward, estimated conversion,
     projected final position and wagering progress to remain separately labelled.
  3. Select **Add Wagering Bet**. Expect Profile, bookmaker, Offer Group, role and restrictions to carry.
  4. Save multiple eligible wagering bets, then explicitly confirm external release. Expect no double counting.
- **PASS:** contribution/progress and realised/projected values evolve once and preserve lineage.
- **STOP/FAIL:** planned stake counts as completed, target completion auto-proves release, or reward is counted twice.
- **Evidence:** synthetic group/bet IDs, progress and independently checked expected values.
- **Cleanup:** retain synthetic history until acceptance is signed off.
- **Known limitation:** Plum Duff cannot observe bookmaker release automatically.

## 7. Reports and P&L reconciliation

- **Status:** OWNER ACCEPTED — CP-078
- **What this proves:** aggregate-first Reports preserve governed totals, readiness and secure drilldown.
- **Preconditions/test identity:** authorised owner scope; no write required.
- **Route:** [Reports](http://localhost:3010/reports).
- **Owner steps:**
  1. Confirm **Active** is the default, then inspect Inactive, All and Custom.
  2. Check Period P&L, breakdown, Profile comparison and one drilldown/return.
  3. Confirm malformed source evidence is explicit and incomplete totals are withheld.
- **PASS:** accepted CP-078 behaviour remains and return context is preserved.
- **STOP/FAIL:** fabricated totals, another Profile leaks, or combined scope returns an unexplained error.
- **Evidence:** accepted date/build and scope; do not publish real values.
- **Cleanup:** reset filters if desired.
- **Known limitation:** any later calculation or source-membership change requires reacceptance.

## 8. Workbook import → PD edits → export → no-write re-import review

- **Status:** IMPLEMENTED — OWNER ACCEPTANCE PENDING
- **What this proves:** supported workbook identities, edits, formulas and relationships survive a controlled cycle.
- **Preconditions/test identity:** disposable copy of the source workbook and one owner-approved destination.
- **Route:** `/profiles/{PROFILE_ID}/tracker/settings#import-export`.
- **Owner steps:**
  1. Under **Ledger Data**, import the disposable copy and complete only explicit review decisions.
  2. Reopen the Profile and inspect expected Sportsbook, Free Bet and promotion relationships.
  3. Make agreed PD edits, save/reopen, choose the working-workbook range and select
     **Export as New Workbook**. Confirm the preview counts first.
  4. Re-import that export into a separate disposable target and stop at the no-write review.
- **PASS:** stable IDs/relationships, intended changes only, no duplicates and truthful review conflicts.
- **STOP/FAIL:** unexpected Profile, missing rows, silent overwrite, external-workbook dependency or total drift.
- **Evidence:** source/export checksums, counts, review summary and supported-host result kept privately.
- **Cleanup:** retain source workbook; archive disposable target only after evidence is secured.
- **Known limitation:** local structural XLSX proof is separate from Excel/Google runtime evidence.

## 9. Backup → restore → compatible application rollback

- **Status:** CODE-VERIFIED ONLY
- **What this proves:** a verified recovery point restores data and a schema-compatible application can read it.
- **Preconditions/test identity:** current build/database identity recorded; no active financial editing.
- **Route:** Profile Settings **Security** → **Database Backups**; portable restore at `/profiles/restore`.
- **Owner steps:**
  1. Open **Manage Database Backups**, enter a reason and select **Create Verified Backup**.
  2. Verify/export the backup and record its identity/checksum.
  3. Ask Codex to rehearse restore and compatible application fallback against a disposable copy;
     observe the stated source/database identity and representative read-only smoke.
  4. Confirm the live owner database was never used as the disposable restore target.
- **PASS:** integrity/identity pass, representative records survive and compatible fallback reads the restored schema.
- **STOP/FAIL:** target identity is uncertain, verification fails, newer activity would be overwritten or rollback rejects additive columns.
- **Evidence:** backup identity/checksum, source revision and private restore receipt.
- **Cleanup:** stop disposable services/copies; keep the verified owner recovery point per retention policy.
- **Known limitation:** application rollback across non-additive schema change requires database recovery; it is never assumed safe.

## Acceptance record

| Date | Build | Journey | PASS/FAIL | Evidence/notes | Owner initials |
| --- | --- | --- | --- | --- | --- |
| 2026-10-09 | `ec82df0…` | Reports and P&L reconciliation (CP-078) | PASS for checkpoint | Owner accepted “passes for now”; reaccept after calculation/source change |  |
|  |  |  |  |  |  |

