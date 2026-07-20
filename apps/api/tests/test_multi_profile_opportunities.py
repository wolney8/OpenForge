from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.main import app


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'opportunity-first.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")


def add_authorities(
    client: TestClient, profile_id: str, *, bookmaker_status: str = "Active"
) -> None:
    assert client.patch(f"/profiles/{profile_id}", json={"status": "Active"}).status_code == 200
    assert (
        client.post(
            f"/profiles/{profile_id}/accounts",
            json={
                "account": "Bookmaker Opportunity Demo",
                "type": "Bookie",
                "status": bookmaker_status,
                "channel": "Online",
            },
        ).status_code
        == 201
    )
    assert (
        client.post(
            f"/profiles/{profile_id}/accounts",
            json={
                "account": "Exchange Opportunity Demo",
                "type": "Exchange",
                "status": "Active",
                "channel": "Online",
            },
        ).status_code
        == 201
    )
    assert (
        client.put(
            f"/profiles/{profile_id}/exchange-commissions",
            json={"exchange_name": "Exchange Opportunity Demo", "commission_rate": "0.02"},
        ).status_code
        == 200
    )


def setup_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "offer_text": "World Cup Bet 10 Get 10 on Spain v Argentina",
        "bookmaker": "Bookmaker Opportunity Demo",
        "offer_type": "Bet & Get",
        "bet_type": "Single",
        "offer_name": "Special Offer",
        "fixture_type": "Football",
        "minimum_back_odds": "2.00",
        "default_back_stake": "10.00",
        "expected_settlement": "2026-07-21T20:00:00",
        "reward_timing": "On settlement",
        "selected_profile_ids": ["profile-demo-001", "profile-demo-002"],
    }
    payload.update(overrides)
    return payload


def test_opportunity_creates_isolated_prospecting_rows_and_is_resumable(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    add_authorities(client, "profile-demo-001")
    add_authorities(client, "profile-demo-002")

    response = client.post("/multi-profile-opportunities", json=setup_payload())
    assert response.status_code == 201, response.text
    opportunity = response.json()
    assert opportunity["state"] == "In Progress"
    selected_targets = [target for target in opportunity["targets"] if target["sportsbook_bet"]]
    assert {target["profile_id"] for target in selected_targets} == {
        "profile-demo-001",
        "profile-demo-002",
    }
    assert all(target["workflow_state"] == "Prospecting" for target in selected_targets)
    assert all(target["sportsbook_bet"]["status"] == "Prospecting" for target in selected_targets)
    assert all(target["sportsbook_bet"]["result"] == "Pending" for target in selected_targets)
    assert all(target["sportsbook_bet"]["back_stake"] == "10.00" for target in selected_targets)
    assert all(
        "Reward timing: On settlement" in target["sportsbook_bet"]["user_notes"]
        for target in selected_targets
    )

    listed = client.get("/multi-profile-opportunities").json()
    assert [row["opportunity_id"] for row in listed] == [opportunity["opportunity_id"]]


def test_opportunity_list_uses_creation_order_when_timestamps_match(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    add_authorities(client, "profile-demo-001")

    created = [
        client.post(
            "/multi-profile-opportunities",
            json=setup_payload(
                offer_text=f"Rapid opportunity {index}",
                selected_profile_ids=["profile-demo-001"],
            ),
        ).json()
        for index in range(3)
    ]

    listed = client.get("/multi-profile-opportunities").json()
    assert [row["opportunity_id"] for row in listed] == [
        row["opportunity_id"] for row in reversed(created)
    ]


def test_blocked_profile_gets_no_row(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    add_authorities(client, "profile-demo-001")
    add_authorities(client, "profile-demo-002", bookmaker_status="Bonus Restricted")

    eligibility = client.post(
        "/multi-profile-opportunities/eligibility",
        json={"bookmaker": "Bookmaker Opportunity Demo", "offer_type": "Bet & Get"},
    ).json()
    blocked = next(target for target in eligibility if target["profile_id"] == "profile-demo-002")
    assert blocked["eligible"] is False

    response = client.post(
        "/multi-profile-opportunities",
        json=setup_payload(selected_profile_ids=["profile-demo-001"]),
    )
    assert response.status_code == 201
    blocked_audit = next(
        target
        for target in response.json()["targets"]
        if target["profile_id"] == "profile-demo-002"
    )
    assert blocked_audit["workflow_state"] == "Blocked"
    assert blocked_audit["sportsbook_bet"] is None


def test_minimum_odds_blocks_only_invalid_target_then_valid_rows_can_be_placed(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    add_authorities(client, "profile-demo-001")
    add_authorities(client, "profile-demo-002")
    opportunity = client.post("/multi-profile-opportunities", json=setup_payload()).json()
    opportunity_id = opportunity["opportunity_id"]

    for profile_id, back_odds in (
        ("profile-demo-001", "1.90"),
        ("profile-demo-002", "2.20"),
    ):
        update = client.put(
            f"/multi-profile-opportunities/{opportunity_id}/targets/{profile_id}",
            json={
                "back_stake": "10.00",
                "back_odds": back_odds,
                "exchange_name": "Exchange Opportunity Demo",
                "lay_odds_1": "2.30",
                "lay_actual": "9.60",
                "match_strategy": "Standard",
            },
        )
        assert update.status_code == 200, update.text
        assert update.json()["sportsbook_bet"]["calculation_state"] == "resolved"

    placement = client.post(
        f"/multi-profile-opportunities/{opportunity_id}/place",
        json={"profile_ids": ["profile-demo-001", "profile-demo-002"]},
    )
    assert placement.status_code == 200
    by_profile = {result["profile_id"]: result for result in placement.json()}
    assert by_profile["profile-demo-001"]["state"] == "Blocked"
    assert by_profile["profile-demo-001"]["reasons"] == ["Back odds must be at least 2.00"]
    assert by_profile["profile-demo-002"]["state"] == "Placed"
    assert by_profile["profile-demo-002"]["sportsbook_bet"]["status"] == "Placed"

    resumed = client.get(f"/multi-profile-opportunities/{opportunity_id}").json()
    target_states = {
        target["profile_id"]: target["workflow_state"] for target in resumed["targets"]
    }
    assert target_states["profile-demo-001"] == "Prospecting"
    assert target_states["profile-demo-002"] == "Placed"


def test_profile_default_exchange_wins_opportunity_resolution(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    add_authorities(client, "profile-demo-001")
    assert (
        client.post(
            "/profiles/profile-demo-001/accounts",
            json={
                "account": "Preferred Exchange",
                "type": "Exchange",
                "status": "Active",
                "channel": "Online",
            },
        ).status_code
        == 201
    )
    assert (
        client.put(
            "/profiles/profile-demo-001/exchange-commissions",
            json={"exchange_name": "Preferred Exchange", "commission_rate": "0.03"},
        ).status_code
        == 200
    )
    settings_payload = client.get("/profiles/profile-demo-001/tracker-settings").json()
    for generated_field in ("profile_id", "created_at", "updated_at"):
        settings_payload.pop(generated_field)
    settings_payload["default_exchange_name"] = "Preferred Exchange"
    assert (
        client.put("/profiles/profile-demo-001/tracker-settings", json=settings_payload).status_code
        == 200
    )

    eligibility = client.post(
        "/multi-profile-opportunities/eligibility",
        json={
            "bookmaker": "Bookmaker Opportunity Demo",
            "offer_type": "Bet & Get",
        },
    ).json()
    target = next(row for row in eligibility if row["profile_id"] == "profile-demo-001")
    assert target["default_exchange_name"] == "Preferred Exchange"


def test_lay_strategy_persists_resolved_default_exchange_and_calculates_suggestion(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    add_authorities(client, "profile-demo-001")
    opportunity = client.post(
        "/multi-profile-opportunities",
        json=setup_payload(
            preset="Mug Bet",
            offer_type="Mug Bet",
            bet_type="Single",
            selected_profile_ids=["profile-demo-001"],
            target_selections=[
                {
                    "profile_id": "profile-demo-001",
                    "bookmaker": "Bookmaker Opportunity Demo",
                }
            ],
        ),
    ).json()
    target = next(row for row in opportunity["targets"] if row["sportsbook_bet"])

    updated = client.put(
        f"/multi-profile-opportunities/{opportunity['opportunity_id']}"
        f"/targets/{target['target_id']}",
        json={
            "bookmaker": "Bookmaker Opportunity Demo",
            "back_stake": "10.00",
            "back_odds": "2.10",
            "exchange_name": "",
            "lay_odds_1": "2.20",
            "lay_actual": "",
            "match_strategy": "Standard",
        },
    )

    assert updated.status_code == 200, updated.text
    row = updated.json()["sportsbook_bet"]
    assert row["exchange_name"] == "Exchange Opportunity Demo"
    assert row["reference_lay_stake_standard"] is not None


def test_skipping_target_cancels_linked_prospecting_row_and_closes_opportunity(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    add_authorities(client, "profile-demo-001")
    opportunity = client.post(
        "/multi-profile-opportunities",
        json=setup_payload(selected_profile_ids=["profile-demo-001"]),
    ).json()

    skipped = client.post(
        f"/multi-profile-opportunities/{opportunity['opportunity_id']}"
        "/targets/profile-demo-001/skip"
    )
    assert skipped.status_code == 200, skipped.text
    assert skipped.json()["state"] == "Complete"
    target = next(
        row for row in skipped.json()["targets"] if row["profile_id"] == "profile-demo-001"
    )
    assert target["workflow_state"] == "Skipped"
    assert target["sportsbook_bet"]["status"] == "Cancelled"

    update = client.put(
        f"/multi-profile-opportunities/{opportunity['opportunity_id']}"
        "/targets/profile-demo-001",
        json={"back_stake": "10.00", "back_odds": "2.00"},
    )
    assert update.status_code == 409


def test_deleting_unplaced_opportunity_removes_draft_rows_and_container(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    add_authorities(client, "profile-demo-001")
    opportunity = client.post(
        "/multi-profile-opportunities",
        json=setup_payload(selected_profile_ids=["profile-demo-001"]),
    ).json()
    sportsbook_id = next(
        target["sportsbook_bet"]["sportsbook_bet_id"]
        for target in opportunity["targets"]
        if target["sportsbook_bet"]
    )

    deleted = client.delete(
        f"/multi-profile-opportunities/{opportunity['opportunity_id']}"
    )
    assert deleted.status_code == 200, deleted.text
    assert deleted.json() == {
        "disposition": "deleted",
        "removed_draft_rows": 1,
        "retained_placed_rows": 0,
    }
    missing = client.get(f"/multi-profile-opportunities/{opportunity['opportunity_id']}")
    assert missing.status_code == 404
    rows = client.get("/profiles/profile-demo-001/sportsbook-bets").json()
    assert all(row["sportsbook_bet_id"] != sportsbook_id for row in rows)


def test_deleting_mixed_opportunity_retains_placed_rows_and_archives_container(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    add_authorities(client, "profile-demo-001")
    add_authorities(client, "profile-demo-002")
    opportunity = client.post("/multi-profile-opportunities", json=setup_payload()).json()
    placed_target = next(
        target for target in opportunity["targets"] if target["profile_id"] == "profile-demo-001"
    )
    update = client.put(
        f"/multi-profile-opportunities/{opportunity['opportunity_id']}"
        f"/targets/{placed_target['target_id']}",
        json={
            "back_stake": "10.00",
            "back_odds": "2.10",
            "exchange_name": "Exchange Opportunity Demo",
            "lay_odds_1": "2.20",
            "lay_actual": "9.64",
            "match_strategy": "Standard",
        },
    )
    assert update.status_code == 200, update.text
    placed = client.post(
        f"/multi-profile-opportunities/{opportunity['opportunity_id']}/place",
        json={"target_ids": [placed_target["target_id"]]},
    )
    assert placed.status_code == 200, placed.text

    deleted = client.delete(
        f"/multi-profile-opportunities/{opportunity['opportunity_id']}"
    )
    assert deleted.status_code == 200, deleted.text
    assert deleted.json() == {
        "disposition": "archived",
        "removed_draft_rows": 1,
        "retained_placed_rows": 1,
    }
    active = client.get("/multi-profile-opportunities").json()
    assert all(row["opportunity_id"] != opportunity["opportunity_id"] for row in active)
    rows = client.get("/profiles/profile-demo-001/sportsbook-bets").json()
    assert any(
        row["sportsbook_bet_id"] == placed_target["sportsbook_bet"]["sportsbook_bet_id"]
        for row in rows
    )


def test_mug_opportunity_supports_multiple_bookmakers_for_one_profile_and_odds_normalize(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    add_authorities(client, "profile-demo-001")
    assert (
        client.post(
            "/profiles/profile-demo-001/accounts",
            json={
                "account": "Bookmaker Mug Demo",
                "type": "Bookie",
                "status": "Active",
                "channel": "Online",
            },
        ).status_code
        == 201
    )
    opportunity_response = client.post(
        "/multi-profile-opportunities",
        json=setup_payload(
            preset="Mug Bet",
            offer_type="Mug Bet",
            bet_type="Single",
            selected_profile_ids=["profile-demo-001"],
            target_selections=[
                {
                    "profile_id": "profile-demo-001",
                    "bookmaker": "Bookmaker Opportunity Demo",
                },
                {
                    "profile_id": "profile-demo-001",
                    "bookmaker": "Bookmaker Mug Demo",
                },
            ],
        ),
    )
    assert opportunity_response.status_code == 201, opportunity_response.text
    opportunity = opportunity_response.json()
    targets = [target for target in opportunity["targets"] if target["sportsbook_bet"]]
    assert len(targets) == 2
    assert {target["bookmaker"] for target in targets} == {
        "Bookmaker Opportunity Demo",
        "Bookmaker Mug Demo",
    }
    assert all(target["sportsbook_bet"]["match_strategy"] == "No Lay" for target in targets)

    target = targets[0]
    update = client.put(
        f"/multi-profile-opportunities/{opportunity['opportunity_id']}"
        f"/targets/{target['target_id']}",
        json={"back_odds": "5.1", "lay_odds_1": "5"},
    )
    assert update.status_code == 200, update.text
    assert update.json()["sportsbook_bet"]["back_odds"] == "5.10"
    assert update.json()["sportsbook_bet"]["lay_odds_1"] == "5.00"


def test_target_bookmaker_can_change_only_to_an_active_profile_account(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    add_authorities(client, "profile-demo-001")
    for bookmaker, status in (
        ("Bookmaker Alternate Active", "Active"),
        ("Bookmaker Alternate Gubbed", "Gubbed"),
    ):
        assert (
            client.post(
                "/profiles/profile-demo-001/accounts",
                json={
                    "account": bookmaker,
                    "type": "Bookie",
                    "status": status,
                    "channel": "Online",
                },
            ).status_code
            == 201
        )
    opportunity = client.post(
        "/multi-profile-opportunities",
        json=setup_payload(selected_profile_ids=["profile-demo-001"]),
    ).json()
    target = next(row for row in opportunity["targets"] if row["sportsbook_bet"])

    changed = client.put(
        f"/multi-profile-opportunities/{opportunity['opportunity_id']}"
        f"/targets/{target['target_id']}",
        json={"bookmaker": "Bookmaker Alternate Active"},
    )
    assert changed.status_code == 200, changed.text
    assert changed.json()["bookmaker"] == "Bookmaker Alternate Active"
    assert changed.json()["sportsbook_bet"]["bookmaker"] == "Bookmaker Alternate Active"

    blocked = client.put(
        f"/multi-profile-opportunities/{opportunity['opportunity_id']}"
        f"/targets/{target['target_id']}",
        json={"bookmaker": "Bookmaker Alternate Gubbed"},
    )
    assert blocked.status_code == 409


def test_pending_and_limited_accounts_are_eligible_with_warnings(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    add_authorities(client, "profile-demo-001", bookmaker_status="Pending Sign Up")
    add_authorities(client, "profile-demo-002", bookmaker_status="Limited")

    eligibility = client.post(
        "/multi-profile-opportunities/eligibility",
        json={"bookmaker": "Bookmaker Opportunity Demo", "offer_type": "Bet & Get"},
    )
    assert eligibility.status_code == 200, eligibility.text
    rows = {row["profile_id"]: row for row in eligibility.json()}
    assert rows["profile-demo-001"]["eligible"] is True
    assert rows["profile-demo-001"]["bookmaker_account_status"] == "Pending Sign Up"
    assert "confirm it can be used" in rows["profile-demo-001"]["eligibility_warnings"][0]
    assert rows["profile-demo-002"]["eligible"] is True
    assert rows["profile-demo-002"]["bookmaker_account_status"] == "Limited"
    assert "confirm it can be used" in rows["profile-demo-002"]["eligibility_warnings"][0]


def test_prospecting_target_can_be_reset_removed_and_restored(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    add_authorities(client, "profile-demo-001")
    opportunity = client.post(
        "/multi-profile-opportunities",
        json=setup_payload(selected_profile_ids=["profile-demo-001"]),
    ).json()
    target = next(row for row in opportunity["targets"] if row["sportsbook_bet"])
    original_id = target["sportsbook_bet"]["sportsbook_bet_id"]

    changed = client.put(
        f"/multi-profile-opportunities/{opportunity['opportunity_id']}"
        f"/targets/{target['target_id']}",
        json={
            "back_stake": "25.00",
            "back_odds": "3.00",
            "exchange_name": "Exchange Opportunity Demo",
            "lay_odds_1": "3.20",
            "lay_actual": "23.00",
            "match_strategy": "Standard",
        },
    )
    assert changed.status_code == 200, changed.text

    reset = client.post(
        f"/multi-profile-opportunities/{opportunity['opportunity_id']}"
        f"/targets/{target['target_id']}/reset"
    )
    assert reset.status_code == 200, reset.text
    assert reset.json()["sportsbook_bet"]["back_stake"] == "10.00"
    assert reset.json()["sportsbook_bet"]["back_odds"] == ""
    assert reset.json()["sportsbook_bet"]["lay_actual"] == ""

    removed = client.delete(
        f"/multi-profile-opportunities/{opportunity['opportunity_id']}"
        f"/targets/{target['target_id']}"
    )
    assert removed.status_code == 200, removed.text
    removed_target = next(
        row for row in removed.json()["targets"] if row["target_id"] == target["target_id"]
    )
    assert removed_target["workflow_state"] == "Removed"
    assert removed_target["sportsbook_bet"] is None
    assert client.get(
        f"/profiles/profile-demo-001/sportsbook-bets/{original_id}"
    ).status_code == 404

    restored = client.post(
        f"/multi-profile-opportunities/{opportunity['opportunity_id']}/targets",
        json={
            "profile_id": "profile-demo-001",
            "bookmaker": "Bookmaker Opportunity Demo",
        },
    )
    assert restored.status_code == 201, restored.text
    restored_target = next(
        row
        for row in restored.json()["targets"]
        if row["profile_id"] == "profile-demo-001" and row["workflow_state"] == "Prospecting"
    )
    assert restored_target["target_id"] == target["target_id"]
    assert restored_target["sportsbook_bet"]["sportsbook_bet_id"] != original_id
