# Neon Runtime Cutover

Last updated: 2026-08-29

## Runtime architecture

`OPENFORGE_DATABASE_MODE` is the explicit runtime selector. Local development defaults to SQLite;
`neon`, `postgres` or `postgresql` selects psycopg and requires
`OPENFORGE_NEON_DATABASE_URL`. PostgreSQL connection or migration failure aborts the request and
never falls back to SQLite.

The version-controlled Account Catalogue JSON remains the canonical baseline seed. Neon stores the
active Fund Manager-managed catalogue document, so imports and edits survive cold starts and
redeploys without duplicating provider metadata into Profile Accounts.

## Persistence matrix

| Domain | Previous source | Neon behaviour |
|---|---|---|
| Fund Manager identity | Signed session only | OAuth identity and Profile links persist |
| Security preferences | Browser local storage | Per-email PostgreSQL preference; browser storage is fallback |
| Profiles/settings | SQLite/fixture seed | Existing Profile/onboarding tables |
| Profile Accounts | SQLite/fixture seed | Catalogue-linked Profile state, balances and restrictions |
| Account Catalogue | Bundled JSON/local file | JSON seeds one durable catalogue document; edits use Neon |
| Sportsbook Bets | SQLite/fixture seed | Existing ledger and audit tables |
| Free Bets | SQLite/fixture seed | Existing ledger and audit tables |
| Casino Offers | SQLite/fixture seed | Existing ledger and audit tables |
| Extra Places | SQLite/fixture seed | Existing ledger and audit tables |
| Cash Adjustments | SQLite/fixture seed | Existing ledger and audit tables |
| Notifications | Derived API plus browser state | Sources remain derived; read/clear/preferences persist |
| Reports | Derived from ledger/account source rows | Recomputed from Neon source data; not duplicated |

## Vercel Production activation

1. Configure `OPENFORGE_DATABASE_MODE=neon` for Production.
2. Keep `OPENFORGE_NEON_DATABASE_URL` server-only and scoped to Production.
3. Redeploy the exact current `main` commit.
4. Confirm authenticated `/api/config-summary` reports `postgresql`.
5. Complete Profile, account, setting and representative ledger persistence smoke checks.

## Recovery before founder import

The current Neon Free plan provides a six-hour point-in-time restore window and one snapshot. Before
any founder import, create/name the available snapshot from the root Production branch in Neon
Console **Backup & Restore**, and record its timestamp in the import approval report. If import
validation fails, stop writes, preview the snapshot/restore point, restore it to the active branch,
wait for the operation to complete, then rerun control totals before reopening the application.

Free-plan retention is not sufficient as the only long-term backup. Keep an encrypted logical export
outside Neon before real financial use or move to a plan with suitable retention. A transactionally
failed import must roll back without requiring restore; snapshot restore is the recovery path for an
incorrect but committed import.

## Hosted smoke gate

- OAuth lands on the Fund Manager Dashboard.
- Profile create/update survives refresh and sign-out/in.
- Profile Account attach/balance update survives refresh and sign-out/in.
- One synthetic row in each ledger survives refresh, can be edited, and can be removed.
- Catalogue branding resolves through stable `catalogue_id` relationships.
- Notification and inactivity preferences survive sign-out/in.
- No request silently reads local SQLite or fixture data after a PostgreSQL failure.

Real workbook data remains prohibited until this gate and a named recovery point pass.
