# Plum Duff owner acceptance — critical journeys

## Purpose

Use this runbook beside the local Plum Duff application and complete one checkbox at a time. It covers the ten critical owner journeys. Automated evidence supports a journey, but only the owner may mark it **OWNER ACCEPTED**. Completing every box does not itself approve a release or production readiness.

### Contents

- [Current local application](#current-local-application)
- [Safety rules](#safety-rules)
- [Status legend](#status-legend)
- [Recommended test order](#recommended-test-order)
- [Quick progress](#quick-progress)
- [Acceptance journeys](#acceptance-journeys)
- [Failed-test notes](#failed-test-notes)
- [Owner acceptance record](#owner-acceptance-record)
- [Cleanup checklist](#cleanup-checklist)

## Current local application

- Application: [http://localhost:3010](http://localhost:3010)
- API: [http://localhost:8010](http://localhost:8010)
- Installed Alpha revision: `f0205340241e779d1e54d03d5b3c07c7a337139b`
- Default synthetic acceptance Profile: `ALPHA-001`, where synthetic data is permitted

Record the build at the start of each test. Stop if it is not the build you intended to test.

## Safety rules

### Stop immediately if

- financial values change unexpectedly;
- another Profile's data appears;
- a duplicate record is created;
- balances change when they should not;
- a route remains loading indefinitely;
- an export/import proposes unexplained financial changes;
- a backup or restore target cannot be identified;
- an Oddsmatcher action offers placed-bet or exchange placement; or
- The Odds API quota changes by more than expected.

Keep the original workbook as the source of truth until workbook acceptance. Use `ALPHA-001`, or another explicitly identified synthetic Profile, when synthetic records are required. Never use a genuine financial Profile for synthetic acceptance records.

Stop at the first failed material step. Record the exact route, range, Profile, expected result, actual result and screenshot.

## Status legend

- **OWNER ACCEPTED** — the owner completed and recorded the journey on the stated build.
- **OWNER ACCEPTANCE PENDING** — the journey is implemented, but the owner result remains open.
- **CODE-VERIFIED ONLY** — automated or disposable evidence exists without an equivalent owner run.
- **BROKEN / BLOCKING** — the observed journey cannot safely continue.
- **DEFERRED** — the journey is intentionally outside the current acceptance sequence.
- **NOT STARTED** — no acceptance evidence has been collected.

Only the owner may change a journey to **OWNER ACCEPTED**. Automated tests do not constitute owner acceptance.

## Recommended test order

1. Login, refresh and restart.
2. Universal Selected Range and Profile switching.
3. Accounts and partial-known cash.
4. Sportsbook create, place, settle and correct.
5. Qualifying loss to linked Free Bet.
6. Refund/reward to wagering and release.
7. Reports and P&L only after a relevant boundary change.
8. Workbook import, use, export and no-write review.
9. Backup, restore and compatible rollback.
10. Oddsmatcher Alpha.

## Quick progress

| # | Journey | Current status | Last tested build | Owner result | Notes |
|---:|---|---|---|---|---|
| 1 | Login, refresh and restart | OWNER ACCEPTANCE PENDING | `f0205340…` | Pending | Genuine Google owner flow required. |
| 2 | Universal Selected Range and Profile switching | OWNER ACCEPTANCE PENDING | `f0205340…` | Pending | Universal Fund Manager range is installed. |
| 3 | Accounts and partial-known cash | OWNER ACCEPTANCE PENDING | `f0205340…` | Pending | Known/incomplete cash states are implemented. |
| 4 | Sportsbook create → place → settle → correct | CODE-VERIFIED ONLY | `f0205340…` | Not run | Synthetic data only. |
| 5 | Qualifying loss → linked Free Bet | CODE-VERIFIED ONLY | `f0205340…` | Not run | Award and settlement stay separate. |
| 6 | Refund/reward → wagering → release | OWNER ACCEPTANCE PENDING | `f0205340…` | Pending | Use the CB503-equivalent case. |
| 7 | Reports and P&L | OWNER ACCEPTED | `f0205340…` | PASS | Accepted for the current source/calculation boundary. |
| 8 | Workbook import → use → export → no-write review | OWNER ACCEPTANCE PENDING | `f0205340…` | Pending | Original workbook remains authoritative. |
| 9 | Backup → restore → compatible rollback | CODE-VERIFIED ONLY | `f0205340…` | Not run | Disposable restore only. |
| 10 | Oddsmatcher Alpha | OWNER ACCEPTANCE PENDING | `f0205340…` | Pending | Prospecting only; liquidity unknown. |

## Acceptance journeys

### Journey 1 — Login, refresh and restart

**Status:**
OWNER ACCEPTANCE PENDING

**What this proves:**
The API and frontend accept the same authorised owner session through Google callback, refresh, sign-out/sign-in and a coordinated canonical restart.

**Use this Profile/test identity:**
The genuine authorised owner Google identity. Never record credentials, cookies or tokens.

**Start here:**
[Login](http://localhost:3010/login)

#### Steps

- [ ] Complete a genuine **Continue with Google** sign-in.
  - **Expect:** the requested protected route opens under the authorised owner identity.
  - **Stop if:** consent succeeds but Plum Duff silently returns to Login, loops or shows the wrong identity.
- [ ] Refresh the protected route.
  - **Expect:** the authorised session and route remain available.
  - **Stop if:** refresh unexpectedly returns to Login or gives an unexplained 401.
- [ ] Sign out, then sign in again.
  - **Expect:** sign-out closes the session and the next authorised sign-in reaches the protected route.
  - **Stop if:** the old session remains active or the callback is rejected silently.
- [ ] Coordinate one canonical local restart only when you intend to test it.
  - **Expect:** after 3010/8010 are healthy, the session remains valid or expires with a clear sign-in path.
  - **Stop if:** the restart changes database identity, auth origin or owner access unexpectedly.

#### Pass criteria

- [ ] Callback, protected-route return, refresh, sign-out/sign-in and coordinated restart behave consistently without a silent Login loop.

#### Evidence to record

- Build:
- Date:
- Profile:
- Record IDs:
- Screenshot/path:
- Notes:

#### Cleanup

- [ ] Sign out only if you do not want the accepted owner session to remain active.

### Journey 2 — Universal Selected Range and Profile switching

**Status:**
OWNER ACCEPTANCE PENDING

**What this proves:**
One Fund Manager-level Selected Range controls all supported Profile surfaces without stale Profile/range results.

**Use this Profile/test identity:**
Two authorised Profiles, preferably including one with no Last Month activity.

**Start here:**
[Profiles](http://localhost:3010/profiles), then **Profile Operations**.

#### Steps

- [ ] Set **Selected Range** to **Last Month** once.
  - **Expect:** **Updating summary…** appears, then the summary resolves for Last Month.
  - **Stop if:** old P&L remains, loading never ends or the range changes itself.
- [ ] Switch Profiles from the Profile switcher.
  - **Expect:** Last Month and the equivalent Profile sub-route remain selected.
  - **Stop if:** range becomes Profile-specific, identity is wrong or stale P&L appears.
- [ ] Visit **Sportsbook Bets**, **Free Bets** and **Reports**.
  - **Expect:** each supported surface uses Last Month and its own correct scope.
  - **Stop if:** a ledger card inherits total Profile P&L or a route uses another range.
- [ ] Refresh, then sign out and sign in again.
  - **Expect:** Last Month remains the universal Selected Range.
  - **Stop if:** a Profile-specific saved range overrides it or **Updating summary…** never resolves.

#### Pass criteria

- [ ] The same range survives Profile switching, navigation, refresh and sign-out/sign-in with no stale value or permanent loader.

#### Evidence to record

- Build:
- Date:
- Profile:
- Record IDs:
- Screenshot/path:
- Notes:

#### Cleanup

- [ ] Restore the preferred everyday Selected Range once.

### Journey 3 — Accounts and partial-known cash

**Status:**
OWNER ACCEPTANCE PENDING

**What this proves:**
Known cash remains visible while unknown cash-counting Account balances remain explicit and actionable.

**Use this Profile/test identity:**
An authorised Profile with at least one known and one genuinely unknown cash-counting Account balance.

**Start here:**
Profile **Profile Operations**, then **Accounts**.

#### Steps

- [ ] Inspect **Current Account Cash**.
  - **Expect:** known cash/category subtotals remain visible; unknown categories say **Incomplete**, not £0.00.
  - **Stop if:** known cash is labelled complete or unknown money becomes zero.
- [ ] Select **Review affected Accounts**.
  - **Expect:** Accounts opens with **Needs attention** active, one row per unique affected Account and combined reasons.
  - **Stop if:** a Profile/Account repeats or another Profile opens.
- [ ] Follow one supported correction link without changing data.
  - **Expect:** the relevant Profile/Account correction surface opens.
  - **Stop if:** the wrong Account opens or Profile identity is lost.
- [ ] Check inactive/non-cash-counting Accounts.
  - **Expect:** lifecycle rules determine inclusion; blank alone does not create a warning.
  - **Stop if:** an excluded Account creates a false cash warning.

#### Pass criteria

- [ ] Known amounts, incomplete states, unique affected Accounts and correction links are clear and Profile-safe.

#### Evidence to record

- Build:
- Date:
- Profile:
- Record IDs:
- Screenshot/path:
- Notes:

#### Cleanup

- [ ] Leave balances unchanged unless a genuine observation was deliberately corrected.

### Journey 4 — Sportsbook create → place → settle → correct

**Status:**
CODE-VERIFIED ONLY

**What this proves:**
One Sportsbook bet retains identity, placement boundary, execution, settlement economics and correction history.

**Use this Profile/test identity:**
`ALPHA-001` while it remains the designated synthetic Profile, with existing synthetic Bookmaker/Exchange Accounts and small values.

**Start here:**
`ALPHA-001` → **Tracker** → **Sportsbook Bets**

#### Steps

- [ ] Create one clearly labelled small synthetic **Prospecting** Single bet.
  - **Expect:** one stable draft ID and no placed exposure or balance change.
  - **Stop if:** it is placed automatically, duplicates or changes a balance.
- [ ] Place it and enter actual back/lay values.
  - **Expect:** actual execution, commission and exposure are explicit; the ID stays the same.
  - **Stop if:** reference values silently replace actual values.
- [ ] Settle it with the predetermined result and verify P&L.
  - **Expect:** realised P&L appears only after settlement and matches the independent expectation.
  - **Stop if:** P&L appears early or another record changes.
- [ ] Save, close and reopen it.
  - **Expect:** identity, values and state remain once.
  - **Stop if:** data disappears or duplicates.
- [ ] Make one governed correction with a reason.
  - **Expect:** the current record updates and history retains the correction.
  - **Stop if:** history is replaced, identity changes or a balance mutates.

#### Pass criteria

- [ ] One stable record progresses Prospecting → Placed → Settled → Corrected with correct P&L and audit history.

#### Evidence to record

- Build:
- Date:
- Profile:
- Record IDs:
- Screenshot/path:
- Notes:

#### Cleanup

- [ ] Keep/archive the synthetic history under the agreed cleanup policy; do not hard-delete audit history.

### Journey 5 — Qualifying loss → linked Free Bet

**Status:**
CODE-VERIFIED ONLY

**What this proves:**
A qualifying loss creates one same-Profile Free Bet with stable parent lineage; award and settlement remain separate.

**Use this Profile/test identity:**
`ALPHA-001` with an explicitly synthetic qualifying Sportsbook row.

**Start here:**
`ALPHA-001` → **Tracker** → **Sportsbook Bets**

#### Steps

- [ ] Create/open the qualifying row and record its ID.
  - **Expect:** offer and Profile identity are explicit.
  - **Stop if:** Account or offer belongs to another Profile.
- [ ] Record the qualifying loss.
  - **Expect:** the Sportsbook row settles once with its own economics.
  - **Stop if:** Free Bet settlement or realised reward value is invented.
- [ ] Use the governed award action to create the linked Free Bet.
  - **Expect:** Profile, bookmaker, reward value and parent ID carry forward.
  - **Stop if:** retry duplicates the reward or parent identity is missing.
- [ ] Save, close and reopen both records.
  - **Expect:** the Free Bet appears once with the same parent.
  - **Stop if:** the link changes, duplicates or crosses Profiles.

#### Pass criteria

- [ ] One loss has one linked Free Bet; Free Bet settlement remains a later action.

#### Evidence to record

- Build:
- Date:
- Profile:
- Record IDs:
- Screenshot/path:
- Notes:

#### Cleanup

- [ ] Retain the linked synthetic records until acceptance and cleanup are coordinated.

### Journey 6 — Refund/reward → wagering → release

**Status:**
OWNER ACCEPTANCE PENDING

**What this proves:**
Cash P&L now, reward face value, estimated conversion, projected final P&L and wagering progress stay distinct.

**Use this Profile/test identity:**
`ALPHA-001`; CB503-equivalent: £100 back at 4.50, £79.81 lay at 5.20, zero commission, 50% refund capped at £50, 70% estimated conversion, 2× reward wagering.

**Start here:**
`ALPHA-001` → **Tracker** → **Sportsbook Bets**, then the promotion position.

#### Steps

- [ ] Inspect the Trigger before settlement.
  - **Expect:** bookmaker-win cash about +£14.80; losing cash -£20.19; conditional reward £50; estimate £35; projected final about +£14.81.
  - **Stop if:** face value/estimate is described as realised cash.
- [ ] Confirm the qualifying loss and £50 award.
  - **Expect:** cash now -£20.19; face £50; estimate £35; projected final +£14.81; wagering £0 / £100.
  - **Stop if:** reward and estimate both count as realised profit.
- [ ] Select **Add Wagering Bet** and save an eligible linked wager.
  - **Expect:** Profile, bookmaker, Offer Group, role and restrictions carry; only eligible actual activity contributes.
  - **Stop if:** planned activity counts or another Profile can link.
- [ ] Add another eligible wager, including a partial contribution where intended.
  - **Expect:** progress reflects governed contributions once.
  - **Stop if:** void/ineligible stake is blindly counted.
- [ ] Confirm release only after it genuinely occurs externally.
  - **Expect:** realised economics replace the estimate without double counting.
  - **Stop if:** target completion alone auto-confirms withdrawable value.

#### Pass criteria

- [ ] Trigger, award, multiple wagers and human-confirmed release preserve lineage and truthful actual/projected values.

#### Evidence to record

- Build:
- Date:
- Profile:
- Record IDs:
- Screenshot/path:
- Notes:

#### Cleanup

- [ ] Keep the synthetic Offer Group and bets until acceptance and bounded cleanup.

### Journey 7 — Reports and P&L

**Status:**
OWNER ACCEPTED

**What this proves:**
The accepted Reports layout, governed P&L, readiness evidence and secure drilldown remain approved for the current source/calculation boundary.

**Use this Profile/test identity:**
No new test identity while that boundary is unchanged.

**Start here:**
[Reports](http://localhost:3010/reports)

#### Steps

- [x] Retain the existing acceptance; do not rerun Reports without a relevant change.
  - **Expect:** reacceptance only if calculations, source membership, report-date rules or malformed-source handling change.
  - **Stop if:** a changed boundary is treated as covered by the old acceptance.

#### Pass criteria

- [x] Reports remains accepted for the current source/calculation boundary.

#### Evidence to record

- Build: `ec82df0…` acceptance evidence retained; current installed build `f0205340…`
- Date: 2026-10-09
- Profile:
- Record IDs:
- Screenshot/path:
- Notes: Owner recorded Reports as passing for now.

#### Cleanup

- [x] No cleanup required.

### Journey 8 — Workbook import → use → export → no-write review

**Status:**
OWNER ACCEPTANCE PENDING

**What this proves:**
Workbook identities, inputs, formulas, validation and relationships survive a controlled daily-use cycle without premature writes.

**Use this Profile/test identity:**
A disposable copy of the original workbook and one owner-approved destination. Keep the original untouched.

**Start here:**
Profile → **Tracker** → **Settings** → **Import/Export**

#### Steps

- [ ] **A. Export-content check:** choose Profile/range, review counts, then **Export as New Workbook**.
  - **Expect:** stated rows for that Profile only, with visible Profile name and ID.
  - **Stop if:** counts are wrong, another Profile appears or supported rows are absent.
- [ ] **B. Formula/dropdown and self-contained check:** inspect the disposable export in the approved spreadsheet host.
  - **Expect:** supported formulas, dropdowns and next-row behaviour work without an external-link warning.
  - **Stop if:** another workbook is required, fields shift or missing money becomes zero.
- [ ] **C. Harmless note edit:** change one non-financial note.
  - **Expect:** IDs, relationships and financial outputs do not change.
  - **Stop if:** anything else changes unexpectedly.
- [ ] **D. Save, close and reopen** the disposable workbook.
  - **Expect:** note, formulas, validation and visible/machine Profile identity remain.
  - **Stop if:** content is lost, duplicated or externally linked.
- [ ] **E. No-write import review:** import it and stop at review.
  - **Expect:** only the intended edit; stable IDs; no cross-Profile row or unexplained financial change.
  - **Stop if:** review proposes duplicates, overwrite, new money values or the wrong destination.
- [ ] **F. Do not select Apply** during this journey.
  - **Expect:** owner data remains unchanged.
  - **Stop if:** any write occurs before separate approval.

#### Pass criteria

- [ ] Counts match the generated workbook; it is self-contained; the edit survives; no-write review is exact and Profile-safe.

#### Evidence to record

- Build:
- Date:
- Profile:
- Record IDs:
- Screenshot/path:
- Notes:

#### Cleanup

- [ ] Keep the original untouched; retain/remove only the disposable copy after evidence is recorded.

### Journey 9 — Backup → restore → compatible rollback

**Status:**
CODE-VERIFIED ONLY

**What this proves:**
A verified backup restores into disposable storage and a compatible application reads it without overwriting owner data.

**Use this Profile/test identity:**
The recorded source revision/database identity and a clearly named disposable restore target.

**Start here:**
**Settings** → **Security** → **Database Backups**

#### Steps

- [ ] Record source revision and database identity.
  - **Expect:** both identify the intended local owner app.
  - **Stop if:** either is unknown.
- [ ] Open **Manage Database Backups**, enter a reason and select **Create Verified Backup**.
  - **Expect:** a named backup with checksum/integrity verification.
  - **Stop if:** verification fails.
- [ ] Coordinate restore into disposable storage only.
  - **Expect:** live `normal-owner` remains untouched.
  - **Stop if:** target could overwrite live/newer activity.
- [ ] Compare counts and representative financial controls.
  - **Expect:** restored evidence matches the backup.
  - **Stop if:** records are missing, duplicated or totals differ.
- [ ] Verify the compatible fallback app reads the restored schema.
  - **Expect:** protected routes/records load without erasing additive fields.
  - **Stop if:** it strips fields or needs destructive downgrade.

#### Pass criteria

- [ ] Integrity, disposable restore, controls and compatible read pass without touching live owner data.

#### Evidence to record

- Build:
- Date:
- Profile:
- Record IDs:
- Screenshot/path:
- Notes:

#### Cleanup

- [ ] Remove only disposable restore resources after retaining evidence; keep the verified recovery point per policy.

### Journey 10 — Oddsmatcher Alpha

**Status:**
OWNER ACCEPTANCE PENDING

**What this proves:**
The global Alpha shows ranked real Match Odds opportunities, applies optional Profile context without hiding global opportunities, preserves liquidity truth, recalculates qualifying outcomes and creates one unplaced Prospecting draft only after a Profile is selected.

**Use this Profile/test identity:**
`ALPHA-001`

**Start here:**
Top-level **Tools** → **Oddsmatcher** (`/oddsmatcher`), then select `ALPHA-001` as **Profile context** before creating a draft. The Profile Tracker link must open this same tool with that Profile preselected.

#### Steps

- [ ] Open Oddsmatcher.
  - **Expect:** table-first page, **No Profile / All opportunities**, Normal/Qualifying, search, filters, **Refresh**, **Settings/My Filters** state and no placed-bet action.
  - **Stop if:** page fails, another Profile's data appears or any action implies automatic placement.
- [ ] Open one Bet Summary without a Profile selected.
  - **Expect:** all-provider opportunity context is visible and **Add Prospecting Draft** is disabled with **Choose a Profile to add to Tracker**.
  - **Stop if:** a Profile restriction or commission is applied as universal, or a draft can be created.
- [ ] Select `ALPHA-001` as **Profile context**.
  - **Expect:** Account eligibility and exchange commission become Profile-specific and the URL retains the context.
  - **Stop if:** another Profile's authority is used or global opportunities disappear without an eligibility explanation.
- [ ] Record quota before refresh.
  - **Expect:** quota evidence is visible without exposing the API key.
  - **Stop if:** current quota cannot be established.
- [ ] Click **Refresh** exactly once and record quota after.
  - **Expect:** approximately three credits for the three approved competitions, subject to provider headers.
  - **Expect:** EPL, Championship and Champions League where available; bookmaker backs, exchange lays and **Liquidity unknown**.
  - **Stop if:** requests repeat, quota falls unexpectedly, liquidity is fabricated or an error clears last-good data.
- [ ] Test **Search**.
  - **Expect:** matching events/selections remain without unrelated filters resetting.
  - **Stop if:** different events or selections are joined.
- [ ] Test **Start Time**.
  - **Expect:** the displayed scope changes predictably and preserves unrelated filters.
  - **Stop if:** rows outside the time rule appear without explanation.
- [ ] Test **Back bookmaker**.
  - **Expect:** only matching, eligible bookmaker opportunities remain.
  - **Stop if:** Profile-ineligible Accounts appear without an explanation.
- [ ] Test **Lay exchange**.
  - **Expect:** only matching exchange quotes remain and liquidity stays Unknown.
  - **Stop if:** a lay price is presented as proven available depth.
- [ ] Test **Minimum Rating**.
  - **Expect:** the displayed governed rating applies without changing other filters.
  - **Stop if:** the threshold or row order is inconsistent.
- [ ] Test **Pagination** and return to the first page.
  - **Expect:** stable ordering and accurate visible/matching counts.
  - **Stop if:** rows repeat, disappear or reorder unpredictably.
- [ ] Select **Clear filters**.
  - **Expect:** filters reset without an unrequested provider refresh.
  - **Stop if:** quota changes or unrelated Profile state resets.
- [ ] Open one **Bet Summary**.
  - **Expect:** it matches the selected row and says **Liquidity unknown**.
  - **Stop if:** context is mismatched or executability is claimed.
- [ ] Verify event, market, selection, bookmaker/exchange and quote time.
  - **Expect:** every value matches the chosen opportunity.
  - **Stop if:** any context belongs to another event, selection or Profile.
- [ ] Change the back stake.
  - **Expect:** lay stake, liability, back-win, lay-win and conservative result recalculate live.
  - **Stop if:** a Calculate button is required or unknown liquidity becomes executable.
- [ ] Test **Underlay**.
  - **Expect:** governed outcomes change visibly while liquidity remains Unknown.
  - **Stop if:** maths becomes unavailable without explanation.
- [ ] Test **Standard**.
  - **Expect:** standard qualifying outcomes return without a Calculate button.
  - **Stop if:** stale Underlay values remain.
- [ ] Test **Overlay**.
  - **Expect:** governed outcomes change visibly and no Place Bet action appears.
  - **Stop if:** any placed-bet action becomes available.
- [ ] Manually change one odds field.
  - **Expect:** that field stops automatic quote updates.
  - **Stop if:** the manual value is silently overwritten.
- [ ] Reset/re-enable the automatic quote value.
  - **Expect:** the quoted value returns and automatic quote updates resume for that field.
  - **Stop if:** reset does not restore the quoted value or persists the manual value as provider data.
- [ ] Click **Add Prospecting Draft** once and record the returned ID.
  - **Expect:** one success result and no balance mutation.
  - **Stop if:** retry duplicates it, it is Placed or balances change.
- [ ] Open `ALPHA-001` → **Sportsbook Bets** and find the draft.
  - **Expect:** one unplaced Prospecting row; source Oddsmatcher; event/selection/providers/odds/timestamps retained; liquidity Unknown.
  - **Stop if:** missing, duplicate, cross-Profile, Placed or claims liquidity.

#### Pass criteria

- [ ] One refresh has expected quota impact; controls and maths behave; one unplaced Prospecting draft appears with no duplicate/balance change.

#### Evidence to record

- Build:
- Date:
- Profile:
- Record IDs:
- Screenshot/path:
- Notes:

#### Cleanup

- [ ] Do not delete, place or settle the first Prospecting row. Record its ID for a later bounded cleanup.

## Failed-test notes

Copy this at the first failed material step, complete it, and stop that journey:

```text
Journey:
Step:
Profile:
Route:
Selected range:
Expected:
Actual:
Record ID:
Screenshot:
Did any financial data change?:
Did I stop immediately?:
```

## Owner acceptance record

| Date | Build | Journey | PASS/FAIL | Evidence/notes | Owner initials |
|---|---|---|---|---|---|
| 2026-10-09 | `ec82df0…` | Reports and P&L | PASS | Accepted for current source/calculation boundary; reaccept after a relevant boundary change. |  |
|  |  |  |  |  |  |

Only the owner records acceptance here. A PASS does not itself approve a release or declare product readiness.

## Cleanup checklist

- [ ] Preserve the original workbook as source of truth until workbook acceptance.
- [ ] Record all synthetic Sportsbook, Free Bet, promotion and Oddsmatcher draft IDs.
- [ ] Do not delete the first Oddsmatcher Prospecting draft during acceptance.
- [ ] Do not hard-delete ledger/audit history.
- [ ] Remove only disposable workbook copies, restored databases and test artefacts after retaining evidence.
- [ ] Keep verified backups until their retention decision is recorded.
- [ ] Restore the preferred Selected Range and clear harmless filters if desired.
- [ ] Leave genuine owner records, balances, sessions and provider settings unchanged.
