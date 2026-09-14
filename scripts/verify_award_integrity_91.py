"""One parametrised SQLite/PostgreSQL award transaction and process-race probe."""

from __future__ import annotations

import json
import multiprocessing
from pathlib import Path
import sqlite3
import sys
import tempfile
from unittest.mock import patch
from decimal import Decimal

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [
    str(ROOT / "apps/api/src"),
    str(ROOT / "apps/api/tests"),
    str(ROOT / "scripts"),
]
OWNER = "pqa114-owner@example.invalid"
TABLES = ["sportsbook_bets", "sportsbook_bet_audit", "free_bets", "free_bet_audit"]


def client_for(target, runtime):
    if target.startswith("postgresql:"):
        from verify_platform_postgres_114 import client_for as pg_client

        return pg_client(target, str(runtime))
    path = Path(target).resolve()
    assert path.parent == Path(runtime).resolve() and path.name == "award-test.sqlite3"
    assert path.parent.name.startswith("openforge-award-91-")
    from openforge_api.config import settings
    from openforge_api import db

    settings.database_mode = "local"
    settings.database_url = "sqlite:///" + str(path)
    settings.backup_directory = str(path.parent / "test-backups")
    settings.account_catalogue_source = str(path.parent / "catalogue.json")
    settings.auth_required = True
    settings.auth_owner_emails = OWNER
    settings.auth_session_secret = "synthetic-pqa114-only-not-production"
    db.load_tracker_seed = lambda: None
    from fastapi.testclient import TestClient
    from openforge_api.main import app
    from openforge_api.auth import create_session_token

    client = TestClient(app, raise_server_exceptions=False)
    client.cookies.set(
        "pd_session",
        create_session_token(subject="pqa114-only", email=OWNER, name="Synthetic"),
    )
    return client


def stored(target):
    """Native driver, independent of HTTP/model preparation."""
    if target.startswith("postgresql:"):
        import psycopg
        from psycopg.rows import dict_row

        with psycopg.connect(target, row_factory=dict_row) as c:
            return {
                t: [dict(r) for r in c.execute("SELECT * FROM " + t).fetchall()]
                for t in TABLES
            }
    with sqlite3.connect(target) as c:
        c.row_factory = sqlite3.Row
        return {
            t: [dict(r) for r in c.execute("SELECT * FROM " + t).fetchall()]
            for t in TABLES
        }


def worker(target, runtime, url, method, payload, ready, release, results):
    try:
        client = client_for(target, runtime)
        ready.put(True)
        assert release.wait(30)
        response = getattr(client, method)(
            url, **({"json": payload} if payload is not None else {})
        )
        results.put(
            (response.status_code, response.json() if response.content else None)
        )
    except Exception as error:
        results.put((599, str(error)))


def race(target, runtime, calls):
    ctx = multiprocessing.get_context("spawn")
    ready, results, release = ctx.Queue(), ctx.Queue(), ctx.Event()
    processes = [
        ctx.Process(
            target=worker, args=(target, str(runtime), *call, ready, release, results)
        )
        for call in calls
    ]
    for process in processes:
        process.start()
    for _ in processes:
        assert ready.get(timeout=45)
    release.set()
    out = [results.get(timeout=45) for _ in processes]
    for process in processes:
        process.join(15)
        assert process.exitcode == 0
    assert all(status != 599 for status, _ in out), out
    return out


def award_cases(target, runtime):
    from openforge_api import db, free_bets, sportsbook
    from openforge_api.accounts import AccountPayload
    from test_sportsbook_atomic_safety import payload as back
    from test_award_integrity import request, child

    client = client_for(target, runtime)
    pid = "pqa114-award"
    db.create_profile_with_onboarding(
        {
            "profile_id": pid,
            "display_name": "Synthetic award",
            "profile_code": "PQA-AWARD",
            "tracking_start_date": "2026-09-01",
            "current_cash_snapshot": "0.00",
            "enabled_modules": ["sportsbook-bets", "free-bets"],
            "accounts": [],
            "quick_actions": [],
            "exchange_commissions": [],
        }
    )
    db.link_fund_manager_profile(email=OWNER, profile_id=pid)
    with db.connect() as c:
        c.execute("UPDATE profiles SET status='Active' WHERE profile_id=?", (pid,))
    for name, kind in [("Bookmaker A", "Bookie"), ("Exchange A", "Exchange")]:
        payload = AccountPayload(
            account=name,
            type=kind,
            status="Active",
            lifecycle_status="Active",
            current_balance="0.00",
        ).model_dump()
        payload["restrictions_json"] = "[]"
        db.create_account(pid, payload)
    db.upsert_profile_exchange_commission(pid, "Exchange A", "0.02")

    def source():
        r = client.post(
            f"/profiles/{pid}/sportsbook-bets",
            json=back(status="Settled", result="Lay Won"),
        )
        assert r.status_code == 201, r.text
        return r.json()["sportsbook_bet_id"]

    checks = []
    sid = source()
    url = f"/profiles/{pid}/sportsbook-bets/{sid}/free-bet-awards"
    original = free_bets.prepare_write_response
    count = 0

    def fail_second(*args, **kwargs):
        nonlocal count
        count += 1
        if count == 2:
            raise RuntimeError("Synthetic second-child failure")
        return original(*args, **kwargs)

    before = stored(target)
    with patch.object(free_bets, "prepare_write_response", side_effect=fail_second):
        assert client.post(url, json=request("award-rollback")).status_code == 500
    after = stored(target)
    for t in ["sportsbook_bets", "free_bets", "free_bet_audit"]:
        assert after[t] == before[t]
    pending = [
        r for r in after["sportsbook_bet_audit"] if r["action"] == "award_operation"
    ]
    assert (
        len(pending) == 1
        and json.loads(pending[0]["payload_json"])["state"] == "pending"
    )
    checks.append("second-child rollback; only durable pending intent remains")
    saved = client.post(url, json=request("award-rollback"))
    assert saved.status_code == 201, saved.text
    ids = saved.json()["free_bet_ids"]
    assert len(ids) == 2
    assert sum(
        Decimal(r["free_bet_value"]) for r in stored(target)["free_bets"]
    ) == Decimal("10")
    before = stored(target)
    # Treat successful response as lost, then recreate client and retry.
    reopened = client_for(target, runtime)
    assert (
        reopened.post(url, json=request("award-rollback")).json()["free_bet_ids"] == ids
    )
    assert stored(target) == before
    assert (
        client.post(
            url, json=request("award-rollback", [child(value="10.00")])
        ).status_code
        == 409
    )
    assert stored(target) == before
    checks.append(
        "rollback retry exactly10; ambiguous delivery replay IDs/audits unchanged; changed payload409"
    )
    responses = race(target, runtime, [(url, "post", request("award-concurrent"))] * 2)
    assert all(s == 201 for s, _ in responses), responses
    assert responses[0][1]["free_bet_ids"] == responses[1][1]["free_bet_ids"]
    checks.append("same operation concurrent separate processes exactly two children")
    assert client.delete(f"/profiles/{pid}/free-bets/{ids[0]}").status_code == 204
    replay = client.post(url, json=request("award-rollback")).json()
    assert ids[0] in replay["removed_free_bet_ids"]
    assert not any(r["free_bet_id"] == ids[0] for r in stored(target)["free_bets"])
    assert (
        client.get(f"/profiles/{pid}/sportsbook-bets/{sid}").json()["final_net_pnl"]
        == "-1.18"
    )
    assert (
        client.post(
            url, json=request("award-separate", [child(value="10.00")])
        ).status_code
        == 201
    )
    checks.append(
        "unused removal/source result retained/replay no resurrection; distinct later single10"
    )
    # Settle genuinely generated remaining split children independently.
    financial_ids = responses[0][1]["free_bet_ids"]
    totals = []
    for ident, expected in zip(financial_ids, ["5.30", "10.30"]):
        r = client.patch(
            f"/profiles/{pid}/free-bets/{ident}",
            json={
                "status": "Settled",
                "result": "Back Won",
                "back_odds": "5.00",
                "lay_odds_1": "5.20",
                "exchange_name": "Exchange A",
                "lay_actual": "3.50",
                "date_settled": "2026-09-14",
            },
        )
        assert r.status_code == 200, r.text
        assert r.json()["final_net_pnl"] == expected
        assert (
            client.get(f"/profiles/{pid}/free-bets/{ident}").json()["final_net_pnl"]
            == expected
        )
        before = stored(target)
        assert client.delete(f"/profiles/{pid}/free-bets/{ident}").status_code == 409
        assert (
            client.delete(f"/profiles/{pid}/sportsbook-bets/{sid}").status_code == 409
        )
        assert stored(target) == before
        totals.append(Decimal(expected))
    assert sum(totals) + Decimal("-1.18") == Decimal("14.42")
    checks.append(
        "generated5 SNR5.30/SR10.30; source-1.18=>offer14.42; protected deletion zero mutation"
    )
    raced_id = client.post(
        url, json=request("award-raced-child", [child(value="10.00")])
    ).json()["free_bet_ids"][0]
    childurl = f"/profiles/{pid}/free-bets/{raced_id}"
    responses = race(
        target,
        runtime,
        [
            (childurl, "delete", None),
            (
                childurl,
                "patch",
                {
                    "status": "Placed",
                    "back_odds": "5.00",
                    "lay_odds_1": "5.20",
                    "exchange_name": "Exchange A",
                    "lay_actual": "3.50",
                },
            ),
        ],
    )
    statuses = sorted(s for s, _ in responses)
    assert statuses in [[200, 409], [204, 404]], responses
    checks.append(
        "delete versus actual child placement: protected row or controlled missing row, never orphan"
    )
    fresh = source()
    responses = race(
        target,
        runtime,
        [
            (f"/profiles/{pid}/sportsbook-bets/{fresh}", "delete", None),
            (
                f"/profiles/{pid}/sportsbook-bets/{fresh}/free-bet-awards",
                "post",
                request("award-source-race"),
            ),
        ],
    )
    assert sorted(s for s, _ in responses) in [[201, 409], [204, 404]], responses
    rows = stored(target)
    source_ids = {r["sportsbook_bet_id"] for r in rows["sportsbook_bets"]}
    assert all(r["origin_qual_bet_id"] in source_ids for r in rows["free_bets"])
    checks.append("source deletion versus issuance separate-process race: no orphan")
    before = stored(target)
    assert (
        client.post(
            f"/profiles/{pid}/sportsbook-bets/missing/free-bet-awards",
            json=request("award-missing"),
        ).status_code
        == 404
    )
    assert stored(target) == before
    checks.append("missing source controlled zero writes")
    before = stored(target)
    bad = request("award-invalid")
    bad["children"][1]["free_bet_value"] = "NaN"
    assert client.post(url, json=bad).status_code == 422
    assert stored(target) == before
    bad = request("award-foreign-account")
    bad["children"][1]["bookmaker"] = "Not this Profile"
    assert client.post(url, json=bad).status_code == 422
    assert stored(target) == before
    assert client.post(
        f"/profiles/missing/sportsbook-bets/{sid}/free-bet-awards",
        json=request("award-profile-missing"),
    ).status_code in {403, 404}
    assert stored(target) == before
    assert (
        client.post(
            f"/profiles/{pid}/sportsbook-bets/foreign-source/free-bet-awards",
            json=request("award-source-foreign"),
        ).status_code
        == 404
    )
    assert stored(target) == before
    checks.append(
        "invalid/foreign child Account and missing/foreign Profile/source zero writes"
    )
    with db.connect() as c:
        c.execute(
            "UPDATE accounts SET lifecycle_status='Archived' WHERE profile_id=? AND account='Bookmaker A'",
            (pid,),
        )
    before = stored(target)
    assert client.post(url, json=request("award-archived-account")).status_code == 409
    assert stored(target) == before
    with db.connect() as c:
        c.execute(
            "UPDATE accounts SET lifecycle_status='Active' WHERE profile_id=? AND account='Bookmaker A'",
            (pid,),
        )
        c.execute("UPDATE profiles SET status='Archived' WHERE profile_id=?", (pid,))
    before = stored(target)
    assert client.post(url, json=request("award-archived-profile")).status_code in {
        403,
        409,
    }
    assert stored(target) == before
    with db.connect() as c:
        c.execute("UPDATE profiles SET status='Active' WHERE profile_id=?", (pid,))
    checks.append("archived Account/Profile denial with unchanged business state")
    before = stored(target)
    with patch.object(
        sportsbook,
        "prepare_write_response",
        side_effect=RuntimeError("Synthetic final source response fault"),
    ):
        assert (
            client.post(url, json=request("award-source-preparation")).status_code
            == 500
        )
    after = stored(target)
    for table in ["sportsbook_bets", "free_bets", "free_bet_audit"]:
        assert after[table] == before[table]
    assert client.post(url, json=request("award-source-preparation")).status_code == 201
    checks.append(
        "final source response failure rolls back entire group/source; retry once"
    )
    return {
        "award_checks": checks,
        "offer_independent_result": "14.42",
        "child_independent_results": ["5.30", "10.30"],
        "status": "PASS",
    }


def main():
    root = Path(tempfile.mkdtemp(prefix="openforge-award-91-", dir="/tmp")).resolve()
    root.joinpath("catalogue.json").write_text(
        json.dumps(
            {
                "schema_version": "1.0",
                "catalogue_name": "Synthetic",
                "updated_at": "2026-09-14",
                "records": [],
            }
        )
    )
    target = str(root / "award-test.sqlite3")
    record = {
        "runtime": str(root),
        "backend": "SQLite",
        "application_sha": __import__("subprocess")
        .check_output(["git", "-C", str(ROOT), "rev-parse", "HEAD"], text=True)
        .strip(),
    }
    print("Isolated award evidence:", root, flush=True)
    try:
        record.update(award_cases(target, root))
    except Exception as error:
        record.update(status="FAIL", error=str(error))
        raise
    finally:
        root.joinpath("evidence.json").write_text(json.dumps(record, indent=2))
        print(json.dumps(record, indent=2), flush=True)


if __name__ == "__main__":
    main()
