"""Independent #85/#106 exact observation, atomicity, isolation and retry fixtures."""

from uuid import uuid4

from fastapi.testclient import TestClient
from test_calculator_conversions import add_account, authenticated_client, configure_temp_database

from openforge_api.main import app


def test_atomic_observations_retry_isolation_and_restore(tmp_path, monkeypatch):
    configure_temp_database(tmp_path)
    client = authenticated_client()
    created = client.post(
        "/profiles/onboarding",
        json={
            "display_name": "Synthetic observations",
            "profile_code": "OBS-001",
            "setup_path": "import",
            "tracking_start_date": "2026-09-01",
            "enabled_modules": ["sportsbook-bets", "free-bets", "cash-adjustments"],
            "accounts": [],
            "quick_actions": [],
        },
    )
    assert created.status_code == 201, created.text
    profile = created.json()["profile"]["profile_id"]
    add_account(client, profile, "Smarkets", "Exchange")
    response = client.post(
        f"/profiles/{profile}/accounts",
        json={
            "account": "Bet365",
            "type": "Bookie",
            "status": "Active",
            "lifecycle_status": "Active",
            "current_balance": "",
            "channel": "Online",
            "restrictions": [],
        },
    )
    assert response.status_code == 201, response.text
    account = response.json()
    url = f"/profiles/{profile}/accounts/{account['account_id']}/balance-observations"
    read = client.get(url)
    assert read.status_code == 200, read.text
    assert read.json()["observations"] == [] and read.json()["account"]["current_balance"] == ""

    def payload(amount, state, operation=None):
        return {
            "operation_id": operation or str(uuid4()),
            "balance_amount": amount,
            "reason": "Observed directly",
            "expected_balance": state["account"]["current_balance"],
            "expected_observation_id": state["latest_observation_id"],
        }

    initial = payload("208.51", read.json())
    first = client.post(url, json=initial)
    assert first.status_code == 201, first.text
    one = first.json()
    assert one["account"]["current_balance"] == "208.51"
    assert (
        one["account"]["last_balance_update"]
        == one["observation"]["snapshot_at"]
        == one["observation"]["created_at"]
    )
    assert len(client.get(url).json()["observations"]) == 1
    same = client.post(url, json=initial)
    assert same.status_code == 200 and same.json()["observation"] == one["observation"]
    second = payload("208.68", client.get(url).json())
    two = client.post(url, json=second)
    assert two.status_code == 201, two.text
    assert client.post(url, json=initial).json()["account"]["current_balance"] == "208.68"
    assert client.post(url, json={**initial, "balance_amount": "999"}).status_code == 409
    assert client.post(url, json={**second, "operation_id": str(uuid4())}).status_code == 409
    confirmation = payload("208.68", client.get(url).json())
    three = client.post(url, json=confirmation)
    assert three.status_code == 201, three.text
    assert three.json()["observation"]["snapshot_at"] >= two.json()["observation"]["snapshot_at"]
    state = client.get(url).json()
    assert [o["balance_amount"] for o in state["observations"]] == ["208.68", "208.68", "208.51"]
    assert [o["balance_change"] for o in state["observations"]] == ["0.00", "0.17", None]
    # An old full Account editor cannot overwrite a later confirmation, even within one second.
    stale = client.put(
        url.removesuffix("/balance-observations"),
        json={**account, "current_balance": "99", "expected_updated_at": account["updated_at"]},
    )
    assert stale.status_code == 409, stale.text
    other = client.post(
        "/profiles/onboarding",
        json={
            "display_name": "Synthetic second Account owner",
            "profile_code": "OBS-002",
            "setup_path": "import",
            "tracking_start_date": "2026-09-01",
            "enabled_modules": ["sportsbook-bets", "free-bets", "cash-adjustments"],
            "accounts": [],
            "quick_actions": [],
        },
    ).json()["profile"]["profile_id"]
    same_name = client.post(
        f"/profiles/{other}/accounts",
        json={"account": "Bet365", "type": "Bookie", "status": "Active", "current_balance": "4.00"},
    ).json()
    other_url = f"/profiles/{other}/accounts/{same_name['account_id']}/balance-observations"
    assert client.post(other_url, json={**initial, "expected_balance": "4.00"}).status_code == 409
    assert client.get(other_url).json()["account"]["current_balance"] == "4.00"
    assert client.get(url.replace(profile, other)).status_code == 404
    assert client.get(f"/profiles/{profile}/casino-offers").json() == []
    assert client.get(f"/profiles/{profile}/sportsbook-bets").json() == []
    assert client.get(url.replace(profile, "not-this-profile")).status_code == 404
    # Simultaneous identical requests create one observation on both storage adapters.
    from concurrent.futures import ThreadPoolExecutor

    concurrent = payload("208.68", client.get(url).json())
    with ThreadPoolExecutor(max_workers=2) as pool:
        receipts = list(pool.map(lambda _: client.post(url, json=concurrent), range(2)))
    assert sorted(receipt.status_code for receipt in receipts) == [200, 201]
    assert receipts[0].json()["observation"] == receipts[1].json()["observation"]
    state = client.get(url).json()
    assert len(state["observations"]) == 4
    for amount in ["", "NaN", "1,000", "12.345", "abc"]:
        assert client.post(url, json=payload(amount, state)).status_code == 422
    from openforge_api import account_observations

    original = account_observations.append_observation

    def fail(*args, **kwargs):
        original(*args, **kwargs)
        raise RuntimeError("Synthetic failure before commit")

    monkeypatch.setattr(account_observations, "append_observation", fail)
    with TestClient(app, raise_server_exceptions=False) as failing:
        assert failing.post(url, json=payload("0", state)).status_code == 503
    assert client.get(url).json() == state
    monkeypatch.setattr(account_observations, "append_observation", original)
    for amount in ["-12.34", "0"]:
        saved = client.post(url, json=payload(amount, client.get(url).json()))
        assert saved.status_code == 201, saved.text
    latest = client.get(url).json()
    assert latest["account"]["current_balance"] == "0.00"
    # A general Account edit records a changed balance atomically; Notes do not confirm it.
    row = latest["account"]
    updated = client.put(
        url.removesuffix("/balance-observations"),
        json={**row, "current_balance": "208.68", "last_balance_update": "1900-01-01"},
    )
    assert updated.status_code == 200, updated.text
    state = client.get(url).json()
    assert state["observations"][0]["snapshot_type"] == "account-observation-v1:account-editor"
    count = len(state["observations"])
    assert updated.json()["last_balance_update"] != "1900-01-01"
    note = client.put(
        url.removesuffix("/balance-observations"),
        json={**updated.json(), "notes": "A neutral note"},
    )
    assert note.status_code == 200 and len(client.get(url).json()["observations"]) == count
    assert note.json()["last_balance_update"] == updated.json()["last_balance_update"]
    legacy = client.post(
        f"/profiles/{profile}/balance-snapshots",
        json={
            "snapshot_at": "2026-08-01T12:00:00Z",
            "snapshot_type": "Imported statement",
            "account_id": account["account_id"],
            "balance_amount": "200.00",
            "notes": "Retained synthetic statement",
        },
    )
    assert legacy.status_code == 201, legacy.text
    assert client.get(url).json()["observations"][-1]["snapshot_at"] == "2026-08-01T12:00:00Z"
    from test_profile_portable_restore import portable_payload

    current = client.get(url).json()
    unknown = client.put(
        url.removesuffix("/balance-observations"),
        json={
            **current["account"],
            "current_balance": "",
            "expected_updated_at": current["account"]["updated_at"],
        },
    )
    assert unknown.status_code == 200, unknown.text
    after_unknown = client.get(url).json()
    assert after_unknown["account"]["current_balance"] == ""
    assert len(after_unknown["observations"]) == len(current["observations"])
    confirmed = client.post(url, json=payload("208.68", after_unknown))
    assert confirmed.status_code == 201, confirmed.text
    assert (
        client.post(
            url, json={**payload("1", client.get(url).json()), "snapshot_at": "1900-01-01"}
        ).status_code
        == 422
    )
    from openforge_api.profile_portable_export import build_profile_portable_export
    from openforge_api.profile_portable_restore import (
        analyse_portable_restore,
        execute_portable_restore,
    )

    analysis = analyse_portable_restore(
        payload=portable_payload(build_profile_portable_export(profile).content),
        owner_email="owner@example.invalid",
    )
    assert analysis["status"] == "READY", analysis
    restored = execute_portable_restore(
        restore_run_id=analysis["restore_run_id"],
        owner_email="owner@example.invalid",
        actor_email="owner@example.invalid",
    )
    assert restored["status"] == "COMPLETE", restored
    restored_accounts = client.get(f"/profiles/{restored['target_profile_id']}/accounts").json()
    target = next(a for a in restored_accounts if a["account"] == "Bet365")
    history = client.get(
        f"/profiles/{restored['target_profile_id']}/accounts/{target['account_id']}/balance-observations"
    ).json()
    assert [o["balance_amount"] for o in history["observations"]] == [
        o["balance_amount"] for o in client.get(url).json()["observations"]
    ]
    assert all(o["account_id"] == target["account_id"] for o in history["observations"])

    original_history = client.get(url).json()["observations"]
    fields = ("snapshot_at", "created_at", "snapshot_type", "balance_amount", "notes")
    assert [tuple(o[field] for field in fields) for o in history["observations"]] == [
        tuple(o[field] for field in fields) for o in original_history
    ]
