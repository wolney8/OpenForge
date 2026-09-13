"""Real, disposable PostgreSQL #114 probes. No operational DSN or data is accepted.

Run through scripts/run-python.sh. Artifacts stay in a uniquely created /tmp directory.
The cluster is stopped in finally; evidence/backup are retained, not automatically deleted.
"""
from __future__ import annotations

import argparse
from decimal import Decimal
import hashlib
import json
import multiprocessing
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT / "apps/api/src"), str(ROOT / "apps/api/tests")]
OWNER = "pqa114-owner@example.invalid"
ROLE = "pqa114_owner"


def command(*args: str) -> str:
    env = {k: v for k, v in os.environ.items() if not k.startswith(("PG", "OPENFORGE_"))}
    try:
        return subprocess.check_output(args, env=env, text=True, stderr=subprocess.STDOUT)
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(f"Disposable tool failed: {args[0]}: {exc.output}") from exc


def configure(dsn: str, runtime: str):
    runtime = str(Path(runtime).resolve())
    import psycopg
    from openforge_api.config import settings
    from openforge_api import db
    if not dsn.startswith("postgresql://pqa114_owner@127.0.0.1:") or ":5432/" in dsn:
        raise RuntimeError("Not a disposable test-only target")
    with psycopg.connect(dsn) as c:
        name, role, port, marker = c.execute(
            "SELECT current_database(),current_user,inet_server_port(),"
            "shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database()"
        ).fetchone()
        assert name in {"pqa114_primary", "pqa114_restored"} and role == ROLE and port != 5432
        assert marker == "Disposable PLATFORM-QUALITY-AUDIT-001 " + str(Path(runtime).resolve())
    settings.environment = "local"
    settings.database_mode = "postgres"
    settings.neon_database_url = dsn
    settings.database_url = "sqlite:///DO-NOT-USE-PQA114.sqlite3"
    settings.backup_directory = runtime + "/unused-application-backups"
    settings.account_catalogue_source = runtime + "/catalogue.json"
    settings.auth_required = True
    settings.auth_owner_emails = OWNER
    settings.auth_session_secret = "synthetic-pqa114-only-not-production"
    db.load_tracker_seed = lambda: None
    return db


def client_for(dsn: str, runtime: str):
    from fastapi.testclient import TestClient
    db = configure(dsn, runtime)
    from openforge_api.auth import create_session_token
    from openforge_api.main import app
    db.upsert_fund_manager_user(email=OWNER, google_subject="pqa114-only", display_name="Synthetic owner")
    client = TestClient(app, raise_server_exceptions=False)
    client.cookies.set("pd_session", create_session_token(subject="pqa114-only", email=OWNER, name="Synthetic owner"))
    return client


def concurrent_worker(dsn, runtime, payload, ready, release, results):
    try:
        client = client_for(dsn, runtime)
        ready.put(True)
        assert release.wait(30), "Concurrent process barrier timeout"
        r = client.post("/fund-manager/calculator-conversions/blackjack", json=payload)
        results.put((r.status_code, r.json()))
    except Exception as e:
        results.put((599, {"error": str(e)}))
        raise


def snapshot(label):
    from test_calculator_conversions import blackjack_snapshot
    s = blackjack_snapshot()
    s["started_at"] = label
    s["ended_at"] = "2026-09-13T04:00:00Z"
    unsigned = {k: v for k, v in s.items() if k not in {"source_checksum", "source_id"}}
    checksum = hashlib.sha256(json.dumps(unsigned, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    return {**unsigned, "source_checksum": checksum, "source_id": "blackjack-session-" + checksum[:20]}


def persisted(dsn):
    """Independent native-driver snapshot; excludes session rows changed by legitimate retry."""
    import psycopg
    tables = ["profiles", "accounts", "account_audit", "free_bets", "free_bet_audit", "casino_offers", "casino_offer_audit", "calculator_conversion_targets"]
    with psycopg.connect(dsn) as c:
        return {t: sorted(c.execute(f'SELECT row_to_json(t)::text FROM "{t}" t').fetchall()) for t in tables}


def primary_cases(dsn, runtime, evidence):
    import psycopg
    from openforge_api import db, free_bets, calculator_conversions as bridge
    from openforge_api.accounts import AccountPayload
    from test_free_bet_atomic_safety import payload as free_payload
    from test_account_money_safety import payload as money_payload
    client = client_for(dsn, runtime)
    passed = evidence.setdefault("passed", [])
    for pid in ["pqa114-a", "pqa114-b"]:
        db.create_profile_with_onboarding({"profile_id": pid, "display_name": "Synthetic " + pid, "profile_code": pid,
            "tracking_start_date": "2026-09-01", "current_cash_snapshot": "0.00", "enabled_modules": ["sportsbook-bets", "free-bets", "casino-offers"],
            "accounts": [], "quick_actions": [], "exchange_commissions": []})
        db.link_fund_manager_profile(email=OWNER, profile_id=pid)
        with db.connect() as c:
            c.execute("UPDATE profiles SET status='Active' WHERE profile_id=?", (pid,))
        for name, kind in [("Bookmaker A", "Bookie"), ("Exchange A", "Exchange"), ("BetMGM", "Bookie"), ("Bet365", "Bookie")]:
            p = AccountPayload(account=name, type=kind, status="Active", lifecycle_status="Active", current_balance="0.00").model_dump()
            p["restrictions_json"] = "[]"
            db.create_account(pid, p)
        db.upsert_profile_exchange_commission(pid, "Exchange A", "0.02")
    assert client.get("/profiles/pqa114-a/accounts").status_code == 200
    valid = client.post("/profiles/pqa114-a/accounts", json=money_payload())
    assert valid.status_code == 201, valid.text
    aid = valid.json()["account_id"]
    for field in ["current_balance", "pending_withdrawal_amount"]:
        for raw in ["not-money", "NaN", "Infinity", "-Infinity", "1.234", None]:
            before = persisted(dsn)
            r = client.post("/profiles/pqa114-b/accounts", json=money_payload(**{field: raw}))
            assert r.status_code == 422, r.text
            assert persisted(dsn) == before
            r = client.put(f"/profiles/pqa114-a/accounts/{aid}", json=money_payload(**{field: raw}))
            assert r.status_code == 422 and persisted(dsn) == before
    passed.append("A Account create/update invalid input and audits unchanged")
    for raw in ["not-money", "NaN", "Infinity", "-Infinity"]:
        before = persisted(dsn)
        r = client.post("/profiles/pqa114-a/free-bets", json=free_payload(free_bet_value=raw))
        assert r.status_code == 422 and persisted(dsn) == before
    financial = []
    for retention, reference, final in [("SNR", "7.72", "10.60"), ("SR", "9.65", "20.60")]:
        r = client.post("/profiles/pqa114-a/free-bets", json=free_payload(retention_mode=retention))
        assert r.status_code == 201, r.text
        row = r.json(); assert row["base_reference_lay_stake"] == reference
        ident = row["free_bet_id"]
        before = persisted(dsn)
        r = client.patch(f"/profiles/pqa114-a/free-bets/{ident}", json={"lay_actual": "NaN"})
        assert r.status_code == 422 and persisted(dsn) == before
        for boundary in ["build_response", "model_dump_json"]:
            target = free_bets if boundary == "build_response" else free_bets.FreeBetResponse
            with patch.object(target, boundary, side_effect=RuntimeError("Synthetic preparation fault")):
                assert client.post("/profiles/pqa114-a/free-bets", json=free_payload()).status_code == 500
                assert client.patch(f"/profiles/pqa114-a/free-bets/{ident}", json={"free_bet_value": "12.00"}).status_code == 500
            assert persisted(dsn) == before
        r = client.patch(f"/profiles/pqa114-a/free-bets/{ident}", json={"status": "Settled", "result": "Back Won"})
        assert r.status_code == 200, r.text
        assert r.json()["final_net_pnl"] == final
        assert client.get(f"/profiles/pqa114-a/free-bets/{ident}").json()["final_net_pnl"] == final
        with psycopg.connect(dsn) as c:
            source = c.execute("SELECT free_bet_value,back_odds,lay_matched_stake_1,lay_odds_1,retention_mode,result,status FROM free_bets WHERE free_bet_id=%s", (ident,)).fetchone()
            assert source == ("10.00", "5.00", "7.00", "5.20", retention, "Back Won", "Settled"), source
            value, odds, actual, lay_odds = map(Decimal, source[:4])
            cash_back = value * (odds - 1 if retention == "SNR" else odds)
            assert cash_back - actual * (lay_odds - 1) == Decimal(final)
        financial.append({"id": ident, "retention": retention, "reference": reference, "actual": "7.00", "final": final})
    passed.append("B Free Bet validation/create-update response preparation zero-write rollback")
    passed.append("D Native SNR/SR saved/reopened independent 10.60/20.60; sum31.20")
    p = {"snapshot": snapshot("2026-09-13T01:00:00Z"), "profile_id": "pqa114-a", "casino_account": "BetMGM"}
    before = persisted(dsn)
    original = bridge.complete_calculator_conversion_target
    def fail_claim(*args, **kwargs):
        original(*args, **kwargs)
        raise RuntimeError("Synthetic fault after successful claim SQL")
    with patch.object(bridge, "complete_calculator_conversion_target", fail_claim):
        r = client.post("/fund-manager/calculator-conversions/blackjack", json=p)
        assert r.status_code == 500, r.text
    after = persisted(dsn)
    assert after["casino_offers"] == before["casino_offers"] and after["casino_offer_audit"] == before["casino_offer_audit"]
    assert db.list_calculator_conversion_notifications() == []
    assert not any('"state":"Succeeded"' in row[0].replace(" ", "") for row in after["calculator_conversion_targets"])
    r = client.post("/fund-manager/calculator-conversions/blackjack", json=p)
    assert r.status_code == 200, r.text
    result = r.json()["results"][0]
    retry = client.post("/fund-manager/calculator-conversions/blackjack", json=p)
    assert retry.status_code == 200 and retry.json()["results"][0]["record_id"] == result["record_id"]
    for change in [{"profile_id": "pqa114-b"}, {"casino_account": "Bet365"}]:
        before = persisted(dsn)
        assert client.post("/fund-manager/calculator-conversions/blackjack", json={**p, **change}).status_code == 409
        assert persisted(dsn) == before
    for same in [True, False]:
        payload = {**p, "snapshot": snapshot("2026-09-13T02:00:00Z" if same else "2026-09-13T03:00:00Z")}
        ctx = multiprocessing.get_context("spawn")
        ready, release, results = ctx.Queue(), ctx.Event(), ctx.Queue()
        workers = [ctx.Process(target=concurrent_worker, args=(dsn, str(runtime), {**payload, "profile_id": pid}, ready, release, results))
            for pid in ["pqa114-a", "pqa114-a" if same else "pqa114-b"]]
        for w in workers: w.start()
        try:
            for _ in workers: assert ready.get(timeout=45)
            release.set()
            observed = [results.get(timeout=45) for _ in workers]
            codes = sorted(x[0] for x in observed)
            assert codes in ([[200, 200], [200, 409]] if same else [[200, 409]]), observed
            evidence.setdefault("race_observations", []).append({"same_target": same, "http_codes": codes, "processes": len(workers)})
        finally:
            for w in workers:
                w.join(timeout=20)
                if w.is_alive(): w.terminate(); w.join(timeout=5)
                assert w.exitcode == 0
        with psycopg.connect(dsn) as c:
            assert c.execute("SELECT COUNT(*) FROM calculator_conversion_targets WHERE source_checksum=%s AND state='Succeeded'", (payload["snapshot"]["source_checksum"],)).fetchone()[0] == 1
        successful = next(body["results"][0] for code, body in observed if code == 200)
        retry_payload = {**payload, "profile_id": successful["profile_id"]}
        retry = client.post("/fund-manager/calculator-conversions/blackjack", json=retry_payload)
        assert retry.status_code == 200 and retry.json()["results"][0]["record_id"] == successful["record_id"]
    with psycopg.connect(dsn) as c:
        assert c.execute("SELECT COUNT(*),SUM(final_net_pnl::numeric) FROM casino_offers").fetchone() == (3, 45)
    assert len(db.list_calculator_conversion_notifications()) == 3
    with psycopg.connect(dsn) as c:
        for pid, ident, link in c.execute("SELECT target_profile_id,destination_record_id,notification_link FROM calculator_conversion_targets WHERE state='Succeeded'"):
            assert link == f"/profiles/{pid}/tracker/casino-offers?record={ident}&source=calculator-conversion"
    evidence["casino_count"] = 3
    evidence["casino_total"] = "45.00"
    evidence["notification_count"] = 3
    passed.append("C Blackjack fault rollback, retry, cross-target and separate-process same/cross-target races")
    return {"passed": passed, "free_bets": financial, "blackjack": p, "casino_id": result["record_id"], "snapshot": persisted(dsn)}


def sportsbook_cases(dsn, runtime):
    import psycopg
    from openforge_api import db, sportsbook
    from openforge_api.accounts import AccountPayload
    from test_sportsbook_atomic_safety import payload
    client = client_for(dsn, str(runtime))
    pid = "pqa114-sportsbook"
    db.create_profile_with_onboarding({"profile_id": pid, "display_name": "Synthetic Sportsbook", "profile_code": "PQA-SB", "tracking_start_date": "2026-09-01", "current_cash_snapshot": "0.00", "enabled_modules": ["sportsbook-bets"], "accounts": [], "quick_actions": [], "exchange_commissions": []})
    db.link_fund_manager_profile(email=OWNER, profile_id=pid)
    with db.connect() as c:
        c.execute("UPDATE profiles SET status='Active' WHERE profile_id=?", (pid,))
    for name, kind in [("Bookmaker A", "Bookie"), ("Exchange A", "Exchange")]:
        p = AccountPayload(account=name, type=kind, status="Active", lifecycle_status="Active", current_balance="0.00").model_dump()
        p["restrictions_json"] = "[]"
        db.create_account(pid, p)
    db.upsert_profile_exchange_commission(pid, "Exchange A", "0.02")
    def stored():
        with psycopg.connect(dsn) as c:
            return {t: sorted(c.execute(f'SELECT row_to_json(t)::text FROM "{t}" t').fetchall())
                    for t in ["sportsbook_bets", "sportsbook_bet_audit", "free_bets", "free_bet_audit", "calculator_conversion_targets"]}
    url = f"/profiles/{pid}/sportsbook-bets"
    checks = 0
    for raw in ["not-money", "NaN", "Infinity", "-Infinity"]:
        before = stored()
        assert client.post(url, json=payload(back_stake=raw)).status_code == 422
        assert stored() == before
        checks += 1
    made = client.post(url, json=payload(status="Not Placed", lay_actual=""))
    assert made.status_code == 201, made.text
    assert made.json()["reference_lay_stake_standard"] == "9.65"
    ident = made.json()["sportsbook_bet_id"]
    for raw in ["not-money", "NaN", "Infinity", "-Infinity"]:
        before = stored()
        assert client.put(url + "/" + ident, json=payload(lay_actual=raw)).status_code == 422
        assert stored() == before
        checks += 1
    for boundary, target in [("calculate_sportsbook_current_value", sportsbook), ("build_response", sportsbook), ("model_dump_json", sportsbook.SportsbookBetResponse)]:
        before = stored()
        with patch.object(target, boundary, side_effect=RuntimeError("Synthetic preparation failure")):
            assert client.post(url, json=payload()).status_code == 500
            assert client.put(url + "/" + ident, json=payload(back_stake="12.00")).status_code == 500
        assert stored() == before
        checks += 2
    for result, expected in [("Back Won", "2.20"), ("Lay Won", "-1.18")]:
        r = client.put(url + "/" + ident, json=payload(status="Settled", result=result))
        assert r.status_code == 200, r.text
        assert r.json()["calculated_liability_1"] == "37.80"
        assert r.json()["final_net_pnl"] == expected
        assert client.get(url + "/" + ident).json()["final_net_pnl"] == expected
        with psycopg.connect(dsn) as c:
            assert c.execute("SELECT back_stake,back_odds,lay_actual,lay_odds_1,result FROM sportsbook_bets WHERE sportsbook_bet_id=%s", (ident,)).fetchone() == ("10.00", "5.00", "9.00", "5.20", result)
        checks += 1
    before = stored()
    assert client.post("/profiles/missing/sportsbook-bets", json=payload()).status_code in {403, 404}
    assert stored() == before
    checks += 1
    return {"passed": ["PD-QA-020 real PostgreSQL invalid create/update, calculation/model/JSON rollback, exact financial reopen/correction, missing Profile zero-write denial"], "sportsbook_checks": checks, "reference": "9.65", "actual_liability": "37.80", "back_won": "2.20", "lay_won": "-1.18"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pg-bin", required=True, type=Path, help="Explicit local server-tool directory; no inherited DSN")
    parser.add_argument("--sportsbook-only", action="store_true", help="PD-QA-020 targeted transactions; does not repeat recovery suite")
    args = parser.parse_args()
    pg_bin = args.pg_bin.resolve()
    def pg(name):
        return str(pg_bin / name)
    root = Path(tempfile.mkdtemp(prefix="openforge-pqa-pg-114-", dir="/tmp")).resolve()
    socket_dir = root / "socket"; socket_dir.mkdir(mode=0o700)
    data = root / "cluster"
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]
    assert port != 5432
    record = {"runtime": str(root), "app_sha": command("git", "-C", str(ROOT), "rev-parse", "HEAD").strip(), "port": port,
        "version": command(pg("initdb"), "--version").strip(), "pg_bin": str(pg_bin), "status": "STARTED"}
    root.joinpath("catalogue.json").write_text(json.dumps({"schema_version": "1.0", "catalogue_name": "Synthetic", "updated_at": "2026-09-13", "records": [{
        "catalogue_id": "BANK-DEMO-001", "account_type": "Bank", "brand_name": "Bank A", "short_display_name": "Bank A", "operator_group": "Synthetic", "platform": "Synthetic",
        "foreground_colour": "#FFFFFF", "background_colour": "#455A64", "operating_jurisdictions": ["GB"], "operating_subdivisions": [], "operating_channels": ["web"], "source": "Synthetic fixture"}]}))
    started = False
    print("Disposable PostgreSQL evidence directory:", root, flush=True)
    server = pg_bin / "postgres"
    if not server.is_file():
        record.update(status="BLOCKED", blocker=f"Client tools installed but matching server executable absent: {server}", cluster_stopped=False)
        root.joinpath("evidence.json").write_text(json.dumps(record, indent=2))
        print(json.dumps(record, indent=2), flush=True)
        raise SystemExit(2)
    try:
        command(pg("initdb"), "-L", str(pg_bin.parent / "share/postgresql"), "-D", str(data), "-U", ROLE, "-A", "trust", "--no-locale", "--encoding=UTF8")
        command(pg("pg_ctl"), "-D", str(data), "-l", str(root / "postgres.log"), "-o", f"-h127.0.0.1 -p{port} -k{socket_dir} -c dynamic_library_path={pg_bin.parent}/lib/postgresql", "-w", "start")
        started = True
        for name in ["pqa114_primary", "pqa114_restored"]:
            command(pg("createdb"), "-h", "127.0.0.1", "-p", str(port), "-U", ROLE, name)
            command(pg("psql"), "-h", "127.0.0.1", "-p", str(port), "-U", ROLE, "-d", name, "-v", "ON_ERROR_STOP=1", "-c", f"COMMENT ON DATABASE {name} IS 'Disposable PLATFORM-QUALITY-AUDIT-001 {root}'")
        primary = f"postgresql://{ROLE}@127.0.0.1:{port}/pqa114_primary"
        restored = f"postgresql://{ROLE}@127.0.0.1:{port}/pqa114_restored"
        import psycopg
        with psycopg.connect(primary) as c:
            record["server_version"] = c.execute("SELECT version()").fetchone()[0]
        if args.sportsbook_only:
            record.update(sportsbook_cases(primary, root))
            record["status"] = "PASS"
            return
        record.update(primary_cases(primary, root, record))
        backup = root / "synthetic-backup.dump"
        command(pg("pg_dump"), "-h", "127.0.0.1", "-p", str(port), "-U", ROLE, "-d", "pqa114_primary", "-Fc", "-f", str(backup))
        command(pg("pg_restore"), "-h", "127.0.0.1", "-p", str(port), "-U", ROLE, "-d", "pqa114_restored", "--exit-on-error", str(backup))
        command(pg("pg_ctl"), "-D", str(data), "-l", str(root / "postgres.log"), "-m", "fast", "-w", "restart")
        record["restarted_after_restore"] = True
        assert persisted(restored) == record["snapshot"], "Native PostgreSQL restored records/audits/source claims differ"
        record["restored_counts"] = {name: len(rows) for name, rows in record["snapshot"].items()}
        client = client_for(restored, str(root))
        for row in record["free_bets"]:
            assert client.get(f"/profiles/pqa114-a/free-bets/{row['id']}").json()["final_net_pnl"] == row["final"]
        from openforge_api import free_bets
        with patch.object(free_bets.FreeBetResponse, "model_dump_json", side_effect=RuntimeError("Synthetic post-restore fault")):
            assert client.patch(f"/profiles/pqa114-a/free-bets/{record['free_bets'][0]['id']}", json={"free_bet_value": "12.00"}).status_code == 500
        assert persisted(restored) == record["snapshot"]
        record["post_restore_rollback"] = True
        r = client.post("/fund-manager/calculator-conversions/blackjack", json=record["blackjack"])
        assert r.status_code == 200 and r.json()["results"][0]["record_id"] == record["casino_id"]
        assert client.post("/fund-manager/calculator-conversions/blackjack", json={**record["blackjack"], "profile_id": "pqa114-b"}).status_code == 409
        assert persisted(restored) == record["snapshot"]
        record["passed"].append("E pg_dump to test artifact, pg_restore second database, exact records/audits/source identities and duplicate protection")
        record["backup_sha256"] = hashlib.sha256(backup.read_bytes()).hexdigest()
        record["status"] = "PASS"
    except Exception as exc:
        record["status"] = "FAIL"
        record["error"] = repr(exc)
        raise
    finally:
        if started:
            command(pg("pg_ctl"), "-D", str(data), "-m", "fast", "-w", "stop")
        record["cluster_stopped"] = started
        root.joinpath("evidence.json").write_text(json.dumps(record, indent=2, default=str))
        print(json.dumps({k: v for k, v in record.items() if k != "snapshot"}, indent=2), flush=True)


if __name__ == "__main__":
    main()
