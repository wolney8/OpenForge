"""PD-QA-015: explicit synthetic Profiles, atomic completed-source safety."""
# ruff: noqa: F811

import json
import multiprocessing
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from test_account_money_safety import money_client  # noqa: F401
from test_calculator_conversions import blackjack_snapshot, standard_payload

from openforge_api import calculator_conversions as bridge
from openforge_api import db
from openforge_api.accounts import AccountPayload
from openforge_api.db import connect


def _independent_http_worker(database_url, catalogue, profile_id, ready, release, results):
    """Separate interpreter/connection; cannot share SQLite's in-process lock."""
    from fastapi.testclient import TestClient

    from openforge_api.auth import SESSION_COOKIE_NAME, create_session_token
    from openforge_api.config import settings
    from openforge_api.main import app

    settings.environment = "local"
    settings.database_mode = "local"
    settings.database_url = database_url
    settings.account_catalogue_source = catalogue
    settings.auth_required = False
    settings.auth_owner_emails = "money-owner@example.invalid"
    settings.auth_session_secret = "synthetic-money-test-secret-not-production"
    db.load_tracker_seed = lambda: None
    client = TestClient(app, raise_server_exceptions=False)
    client.cookies.set(
        SESSION_COOKIE_NAME,
        create_session_token(
            subject="synthetic-owner", email="money-owner@example.invalid", name="Synthetic owner"
        ),
    )
    ready.put(True)
    if not release.wait(15):
        raise RuntimeError("Synthetic process barrier timeout")
    response = client.post(
        "/fund-manager/calculator-conversions/blackjack",
        json={
            "snapshot": blackjack_snapshot(),
            "profile_id": profile_id,
            "casino_account": "BetMGM",
        },
    )
    results.put((response.status_code, response.text))


@pytest.mark.parametrize("same_target", [False, True])
def test_blackjack_independent_process_requests_are_globally_unique(money_client, same_target):
    from openforge_api.config import settings

    _blackjack_synthetic_client(money_client)
    context = multiprocessing.get_context("spawn")
    ready, results, release = context.Queue(), context.Queue(), context.Event()
    profiles = ["profile-demo-001", "profile-demo-001" if same_target else "profile-demo-002"]
    workers = [
        context.Process(
            target=_independent_http_worker,
            args=(
                settings.database_url,
                settings.account_catalogue_source,
                p,
                ready,
                release,
                results,
            ),
        )
        for p in profiles
    ]
    for worker in workers:
        worker.start()
    try:
        for _ in workers:
            assert ready.get(timeout=20)
        release.set()
        observed = [results.get(timeout=20) for _ in workers]
        codes = sorted(row[0] for row in observed)
        assert codes in ([[200, 200], [200, 409]] if same_target else [[200, 409]]), observed
    finally:
        for worker in workers:
            worker.join(timeout=20)
            if worker.is_alive():
                worker.terminate()
                worker.join(timeout=5)
            assert worker.exitcode == 0
    with connect() as c:
        assert c.execute("SELECT COUNT(*) FROM casino_offers").fetchone()[0] == 1
        assert (
            c.execute(
                "SELECT COUNT(*) FROM calculator_conversion_targets WHERE state='Succeeded'"
            ).fetchone()[0]
            == 1
        )
    assert len(db.list_calculator_conversion_notifications()) == 1


def _blackjack_synthetic_client(client):
    for profile_id in ["profile-demo-001", "profile-demo-002"]:
        db.create_profile_with_onboarding(
            {
                "profile_id": profile_id,
                "display_name": "Synthetic " + profile_id,
                "profile_code": profile_id,
                "tracking_start_date": "2026-09-01",
                "current_cash_snapshot": "0.00",
                "enabled_modules": ["casino-offers", "sportsbook-bets"],
                "accounts": [],
                "quick_actions": [],
                "exchange_commissions": [],
            }
        )
        with connect() as connection:
            connection.execute(
                "UPDATE profiles SET status='Active' WHERE profile_id=?", (profile_id,)
            )
        for name, kind in [("BetMGM", "Bookie"), ("Bet365", "Bookie"), ("Smarkets", "Exchange")]:
            p = AccountPayload(
                account=name, type=kind, status="Active", lifecycle_status="Active"
            ).model_dump()
            p["restrictions_json"] = "[]"
            db.create_account(profile_id, p)
        db.upsert_profile_exchange_commission(profile_id, "Smarkets", "0.02")
    return client


@pytest.mark.parametrize("mode,expected", [("live_play", "15.00"), ("free_play", "4.00")])
def test_blackjack_global_completed_source_excludes_other_targets(
    money_client, mode, expected
) -> None:  # noqa: F811
    client = _blackjack_synthetic_client(money_client)
    for profile_id, name in [
        ("profile-demo-001", "BetMGM"),
        ("profile-demo-001", "Bet365"),
        ("profile-demo-002", "BetMGM"),
    ]:
        assert db.list_accounts(profile_id)
    payload = {
        "snapshot": blackjack_snapshot(
            mode=mode, activity_source="own_cash" if mode == "live_play" else "free_credit"
        ),
        "profile_id": "profile-demo-001",
        "casino_account": "BetMGM",
    }
    first = client.post("/fund-manager/calculator-conversions/blackjack", json=payload)
    assert first.status_code == 200, first.text
    for change in [{"casino_account": "Bet365"}, {"profile_id": "profile-demo-002"}]:
        rejected = client.post(
            "/fund-manager/calculator-conversions/blackjack", json={**payload, **change}
        )
        assert rejected.status_code == 409, rejected.text
    retry = client.post("/fund-manager/calculator-conversions/blackjack", json=payload)
    assert retry.json()["results"][0]["record_id"] == first.json()["results"][0]["record_id"]
    with connect() as connection:
        rows = connection.execute("SELECT final_net_pnl FROM casino_offers").fetchall()
        assert [row["final_net_pnl"] for row in rows] == [expected]
        assert (
            connection.execute(
                "SELECT COUNT(*) FROM calculator_conversion_targets WHERE state='Succeeded'"
            ).fetchone()[0]
            == 1
        )
    sources = client.get("/profiles/profile-demo-001/tracker-summary-sources")
    assert sources.status_code == 200, sources.text
    assert [r["final_net_pnl"] for r in sources.json()["casino_offers"]] == [expected]
    assert (
        client.get("/profiles/profile-demo-002/tracker-summary-sources").json()["casino_offers"]
        == []
    )


@pytest.mark.parametrize("same_target", [False, True])
@pytest.mark.parametrize("mode", ["live_play", "free_play"])
def test_blackjack_simultaneous_cross_target_requests_create_one_activity(
    money_client, same_target, mode
) -> None:  # noqa: F811
    client = _blackjack_synthetic_client(money_client)
    for profile_id in ["profile-demo-001", "profile-demo-002"]:
        assert db.list_accounts(profile_id)
    barrier = Barrier(2)

    def submit(profile_id: str) -> int:
        barrier.wait(timeout=10)
        return client.post(
            "/fund-manager/calculator-conversions/blackjack",
            json={
                "snapshot": blackjack_snapshot(
                    mode=mode, activity_source="own_cash" if mode == "live_play" else "free_credit"
                ),
                "profile_id": profile_id,
                "casino_account": "BetMGM",
            },
        ).status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        codes = list(
            pool.map(
                submit,
                ["profile-demo-001", "profile-demo-001" if same_target else "profile-demo-002"],
            )
        )
    assert sorted(codes) in ([[200, 200], [200, 409]] if same_target else [[200, 409]])
    with connect() as connection:
        assert connection.execute("SELECT COUNT(*) FROM casino_offers").fetchone()[0] == 1


@pytest.mark.parametrize("boundary", ["claim_completion", "response_json", "response_value_error"])
def test_blackjack_failure_rolls_back_activity_audit_and_success(
    money_client,
    monkeypatch,
    boundary,  # noqa: F811
):  # noqa: F811
    client = _blackjack_synthetic_client(money_client)
    payload = {
        "snapshot": blackjack_snapshot(),
        "profile_id": "profile-demo-001",
        "casino_account": "BetMGM",
    }
    with monkeypatch.context() as patch:
        if boundary == "claim_completion":
            original = bridge.complete_calculator_conversion_target

            def fail_after_claim(*args, **kwargs):
                original(*args, **kwargs)
                raise RuntimeError("synthetic transaction failure after successful-claim SQL")

            patch.setattr(bridge, "complete_calculator_conversion_target", fail_after_claim)
        else:

            def fail_json(*args, **kwargs):
                if boundary == "response_value_error":
                    raise ValueError("synthetic internal response validation failure")
                raise RuntimeError("synthetic response serialization failure")

            patch.setattr(bridge.ConversionResponse, "model_dump_json", fail_json)
        response = client.post("/fund-manager/calculator-conversions/blackjack", json=payload)
    assert response.status_code == 500
    with connect() as c:
        assert c.execute("SELECT COUNT(*) FROM casino_offers").fetchone()[0] == 0
        assert c.execute("SELECT COUNT(*) FROM casino_offer_audit").fetchone()[0] == 0
        claim = c.execute("SELECT * FROM calculator_conversion_targets").fetchone()
        assert claim["state"] == "Failed" and claim["destination_record_id"] is None
        assert claim["notification_title"] == ""
    assert db.list_calculator_conversion_notifications() == []
    retry = client.post(
        "/fund-manager/calculator-conversions/blackjack",
        json={**payload, "profile_id": "profile-demo-002"},
    )
    assert retry.status_code == 200, retry.text
    with connect() as c:
        assert c.execute("SELECT COUNT(*) FROM casino_offers").fetchone()[0] == 1
        assert (
            c.execute(
                "SELECT COUNT(*) FROM calculator_conversion_targets WHERE state='Succeeded'"
            ).fetchone()[0]
            == 1
        )


def test_blackjack_legacy_success_and_orphan_activity_are_not_recreated(money_client):  # noqa: F811
    client = _blackjack_synthetic_client(money_client)
    payload = {
        "snapshot": blackjack_snapshot(),
        "profile_id": "profile-demo-001",
        "casino_account": "BetMGM",
    }
    first = client.post("/fund-manager/calculator-conversions/blackjack", json=payload)
    assert first.status_code == 200
    with connect() as c:
        c.execute("UPDATE calculator_conversion_targets SET attempt_id='CCT-SYNTHETIC-LEGACY'")
    assert (
        client.post("/fund-manager/calculator-conversions/blackjack", json=payload).json()[
            "results"
        ][0]["record_id"]
        == first.json()["results"][0]["record_id"]
    )
    assert (
        client.post(
            "/fund-manager/calculator-conversions/blackjack",
            json={**payload, "profile_id": "profile-demo-002"},
        ).status_code
        == 409
    )
    with connect() as c:
        c.execute(
            "UPDATE calculator_conversion_targets SET state='Failed', destination_record_id=NULL"
        )
    assert (
        client.post("/fund-manager/calculator-conversions/blackjack", json=payload).status_code
        == 409
    )
    with connect() as c:
        assert c.execute("SELECT COUNT(*) FROM casino_offers").fetchone()[0] == 1
        assert (
            c.execute("SELECT attempt_id FROM calculator_conversion_targets").fetchone()[0]
            == "CCT-SYNTHETIC-LEGACY"
        )


def test_blackjack_source_permissions_notifications_and_new_exploratory_intents(money_client):  # noqa: F811
    client = _blackjack_synthetic_client(money_client)
    payload = {
        "snapshot": blackjack_snapshot(),
        "profile_id": "profile-demo-001",
        "casino_account": "BetMGM",
    }
    for change in [
        {"profile_id": "missing"},
        {"casino_account": "Missing Account"},
        {"snapshot": {**payload["snapshot"], "ended_at": "tampered"}},
    ]:
        assert client.post(
            "/fund-manager/calculator-conversions/blackjack", json={**payload, **change}
        ).status_code in [404, 409, 422]
    with connect() as c:
        assert c.execute("SELECT COUNT(*) FROM calculator_conversion_targets").fetchone()[0] == 0
    first = client.post("/fund-manager/calculator-conversions/blackjack", json=payload).json()
    for _ in range(3):
        retry = client.post("/fund-manager/calculator-conversions/blackjack", json=payload).json()
        assert retry["results"][0]["record_id"] == first["results"][0]["record_id"]
    notices = db.list_calculator_conversion_notifications()
    assert len(notices) == 1 and notices[0]["notification_link"] == first["results"][0]["href"]
    with connect() as c:
        claim = c.execute("SELECT * FROM calculator_conversion_targets").fetchone()
        assert claim["source_checksum"] == payload["snapshot"]["source_checksum"]
        assert json.loads(claim["source_envelope_json"])["monetary"]["session_result"] == "15.00"
        assert c.execute("SELECT final_net_pnl FROM casino_offers").fetchone()[0] == "15.00"
    standard = standard_payload(["profile-demo-001"])
    # Use the same canonical source/request but an independently chosen new intent.
    results = []
    for intent in ["synthetic-one", "synthetic-one", "synthetic-two"]:
        response = client.post(
            "/fund-manager/calculator-conversions/standard",
            json={**standard, "conversion_intent_id": intent},
        )
        assert response.status_code == 200, response.text
        results.append(response.json()["results"][0])
    assert [r["state"] for r in results] == ["succeeded", "already_succeeded", "succeeded"], results
    assert results[0]["record_id"] == results[1]["record_id"] != results[2]["record_id"]


@pytest.mark.parametrize(
    "denial",
    [
        "unauthenticated",
        "non_owner",
        "archived_profile",
        "blocked_account",
        "foreign_account_id",
        "simulation",
    ],
)
def test_blackjack_denials_precede_global_claim_and_business_writes(
    money_client, monkeypatch, denial
):
    from fastapi.testclient import TestClient

    from openforge_api.auth import SESSION_COOKIE_NAME, create_session_token
    from openforge_api.config import settings
    from openforge_api.main import app

    client = _blackjack_synthetic_client(money_client)
    payload = {
        "snapshot": blackjack_snapshot(),
        "profile_id": "profile-demo-001",
        "casino_account": "BetMGM",
    }
    if denial in {"unauthenticated", "non_owner"}:
        monkeypatch.setattr(settings, "auth_required", True)
        client = TestClient(app, raise_server_exceptions=False)
        if denial == "non_owner":
            client.cookies.set(
                SESSION_COOKIE_NAME,
                create_session_token(
                    subject="synthetic-subscriber",
                    email="subscriber@example.invalid",
                    name="Synthetic subscriber",
                ),
            )
    elif denial == "archived_profile":
        with connect() as c:
            c.execute("UPDATE profiles SET status='Archived' WHERE profile_id='profile-demo-001'")
    elif denial == "blocked_account":
        with connect() as c:
            c.execute(
                "UPDATE accounts SET lifecycle_status='Archived' "
                "WHERE profile_id='profile-demo-001' AND account='BetMGM'"
            )
    elif denial == "foreign_account_id":
        foreign = next(a for a in db.list_accounts("profile-demo-002") if a.account == "BetMGM")
        payload["casino_account_id"] = foreign.account_id
    else:
        snapshot = blackjack_snapshot(mode="simulation")
        snapshot["conversion_eligible"] = False
        unsigned = {k: v for k, v in snapshot.items() if k not in {"source_id", "source_checksum"}}
        import hashlib

        checksum = hashlib.sha256(
            json.dumps(unsigned, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
        payload["snapshot"] = {
            **unsigned,
            "source_checksum": checksum,
            "source_id": f"blackjack-session-{checksum[:20]}",
        }
    response = client.post("/fund-manager/calculator-conversions/blackjack", json=payload)
    expected_status = {
        "unauthenticated": 401,
        "non_owner": 401,  # Existing authoritative approval guard denies this signed identity.
        "archived_profile": 409,
        "blocked_account": 409,
        "foreign_account_id": 422,
        "simulation": 422,
    }
    assert response.status_code == expected_status[denial], response.text
    with connect() as c:
        assert c.execute("SELECT COUNT(*) FROM calculator_conversion_targets").fetchone()[0] == 0
        assert c.execute("SELECT COUNT(*) FROM casino_offers").fetchone()[0] == 0
        assert c.execute("SELECT COUNT(*) FROM casino_offer_audit").fetchone()[0] == 0
    assert db.list_calculator_conversion_notifications() == []
