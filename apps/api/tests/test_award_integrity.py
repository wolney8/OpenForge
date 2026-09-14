"""PD-QA-017 synthetic HTTP and independently persisted-state evidence."""

# ruff: noqa: F811
from decimal import Decimal
from unittest.mock import patch

import pytest
from test_account_money_safety import money_client  # noqa: F401
from test_free_bet_atomic_safety import free_client  # noqa: F401
from test_sportsbook_atomic_safety import payload as source_payload

from openforge_api import db, free_bets


def source(client):
    response = client.post(
        "/profiles/money-a/sportsbook-bets", json=source_payload(status="Settled", result="Lay Won")
    )
    assert response.status_code == 201, response.text
    return response.json()["sportsbook_bet_id"]


def child(mode="SNR", value="5.00"):
    return dict(
        event_name="Synthetic award",
        bookmaker="Bookmaker A",
        offer_text="Demo award",
        offer_type="Bet & Get",
        bet_type="Single",
        fixture_type="Football",
        status="Available",
        result="Pending",
        retention_mode=mode,
        free_bet_value=value,
        back_odds="",
        lay_odds_1="",
        lay_actual="",
        exchange_name="",
        match_strategy="Standard",
    )


def request(op="award-test-001", children=None):
    return dict(
        operation_id=op,
        children=children or [child(), child("SR")],
        expected_award_value="10.00",
        variance_reason="",
    )


def persisted():
    with db.connect() as c:
        return {
            table: [dict(r) for r in c.execute("SELECT * FROM " + table).fetchall()]
            for table in ["sportsbook_bets", "free_bets", "free_bet_audit", "sportsbook_bet_audit"]
        }


def test_qualifying_source_activity_protected_before_award_claim(free_client):
    sid = source(free_client)
    before = persisted()
    assert free_client.delete(f"/profiles/money-a/sportsbook-bets/{sid}").status_code == 409
    assert persisted() == before


def test_legacy_independent_post_retry_cannot_mint_fifteen(free_client):
    sid = source(free_client)
    for attempt in range(2):
        for index in range(2):
            p = {
                **child("SNR" if index == 0 else "SR"),
                "origin_qual_bet_id": sid,
                "source_award_group_id": f"legacy-{attempt}",
                "source_award_split_index": index + 1,
                "source_award_split_total": 2,
            }
            if attempt == 0 and index == 1:
                with patch.object(
                    free_bets,
                    "prepare_write_response",
                    side_effect=RuntimeError("second-child failure"),
                ):
                    free_client.post("/profiles/money-a/free-bets", json=p)
            else:
                free_client.post("/profiles/money-a/free-bets", json=p)
    total = sum(Decimal(r.free_bet_value) for r in db.list_free_bets("money-a"))
    assert total <= Decimal("10.00"), f"Intended10 became{total}"


def test_linked_source_delete_denied(free_client):
    sid = source(free_client)
    # Direct fixture models legacy records, not proof of the genuine award path.
    with db.connect() as c:
        c.execute(
            "INSERT INTO free_bets (free_bet_id,profile_id,event_name,offer_text,bookmaker,"
            "status,result,retention_mode,free_bet_value,back_odds,match_strategy,lay_odds_1,"
            "lay_actual,lay_matched_stake_1,lay_commission_1,exchange_name,expiry_datetime,"
            "date_settled,origin_qual_bet_id,offer_group_id,user_notes,manual_override_value,"
            "manual_override_reason,created_at,updated_at) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                "FB-LEGACY",
                "money-a",
                "Synthetic",
                "Award",
                "Bookmaker A",
                "Available",
                "Pending",
                "SNR",
                "5.00",
                "",
                "Standard",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                sid,
                "",
                "",
                "",
                "",
                "2026-09-14",
                "2026-09-14",
            ),
        )
    before = persisted()
    assert free_client.delete(f"/profiles/money-a/sportsbook-bets/{sid}").status_code == 409
    assert persisted() == before


def test_atomic_split_failure_retry_replay_and_removed_child(free_client):
    sid = source(free_client)
    url = f"/profiles/money-a/sportsbook-bets/{sid}/free-bet-awards"
    original = free_bets.prepare_write_response
    calls = 0

    def second_failure(*args, **kwargs):
        nonlocal calls
        calls += 1
        if calls == 2:
            raise RuntimeError("second-child failure")
        return original(*args, **kwargs)

    before = persisted()
    with patch.object(free_bets, "prepare_write_response", side_effect=second_failure):
        assert free_client.post(url, json=request()).status_code == 500
    after = persisted()
    assert after["free_bets"] == before["free_bets"]
    assert after["free_bet_audit"] == before["free_bet_audit"]
    assert after["sportsbook_bets"] == before["sportsbook_bets"]
    saved = free_client.post(url, json=request())
    assert saved.status_code in {200, 201}, saved.text
    result = saved.json()
    assert len(result["free_bet_ids"]) == 2
    assert sum(Decimal(r.free_bet_value) for r in db.list_free_bets("money-a")) == Decimal("10")
    before = persisted()
    assert free_client.post(url, json=request()).json()["free_bet_ids"] == result["free_bet_ids"]
    assert persisted() == before
    assert free_client.post(url, json=request(children=[child(value="10.00")])).status_code == 409
    ident = result["free_bet_ids"][0]
    assert free_client.delete(f"/profiles/money-a/free-bets/{ident}").status_code == 204
    assert (
        free_client.get(f"/profiles/money-a/sportsbook-bets/{sid}").json()["final_net_pnl"]
        == "-1.18"
    )
    replay = free_client.post(url, json=request()).json()
    assert replay["free_bet_ids"] == result["free_bet_ids"]
    assert ident in replay["removed_free_bet_ids"]
    assert len(db.list_free_bets("money-a")) == 1
    assert free_client.post(
        url, json=request("award-separate-002", [child(value="10.00")])
    ).status_code in {200, 201}
    assert len(db.list_free_bets("money-a")) == 2


def test_single_and_protected_activity_financials(free_client):
    sid = source(free_client)
    url = f"/profiles/money-a/sportsbook-bets/{sid}/free-bet-awards"
    r = free_client.post(url, json=request())
    assert r.status_code in {200, 201}, r.text
    ids = r.json()["free_bet_ids"]
    for mode, ident, expected in zip(["SNR", "SR"], ids, ["5.30", "10.30"]):
        p = free_client.patch(
            f"/profiles/money-a/free-bets/{ident}",
            json={
                "status": "Settled",
                "result": "Back Won",
                "free_bet_value": "5.00",
                "back_odds": "5.00",
                "lay_odds_1": "5.20",
                "lay_actual": "3.50",
                "exchange_name": "Exchange A",
                "date_settled": "2026-09-14",
            },
        )
        assert p.status_code == 200, p.text
        assert p.json()["final_net_pnl"] == expected
        before = persisted()
        assert free_client.delete(f"/profiles/money-a/free-bets/{ident}").status_code == 409
        assert free_client.delete(f"/profiles/money-a/sportsbook-bets/{sid}").status_code == 409
        assert persisted() == before
    # Whole offer result includes source -1.18, not children's15.60 alone.
    assert Decimal("-1.18") + Decimal("5.30") + Decimal("10.30") == Decimal("14.42")


def test_unused_ui_removal_not_blocked_by_source_placement():
    from pathlib import Path

    text = (
        Path(__file__).parents[2] / "web/components/sportsbook-workflow-first-shell.tsx"
    ).read_text()
    block = text.split("function getLinkedFreeBetRemovalBlockReason")[1].split(
        "async function removeLinkedFreeBet"
    )[0]
    assert "sourceBackPlacementRecorded" not in block


@pytest.mark.parametrize(
    "field,value",
    [
        ("origin_qual_bet_id", ""),
        ("source_award_group_id", ""),
        ("offer_group_id", "different"),
        ("source_award_split_total", 1),
    ],
)
def test_child_identity_cannot_bypass_removal(free_client, field, value):
    sid = source(free_client)
    response = free_client.post(
        f"/profiles/money-a/sportsbook-bets/{sid}/free-bet-awards", json=request()
    )
    ident = response.json()["free_bet_ids"][0]
    before = persisted()
    assert (
        free_client.patch(f"/profiles/money-a/free-bets/{ident}", json={field: value}).status_code
        == 409
    )
    assert persisted() == before


def test_protected_history_survives_current_state_reset(free_client):
    sid = source(free_client)
    ident = free_client.post(
        f"/profiles/money-a/sportsbook-bets/{sid}/free-bet-awards", json=request()
    ).json()["free_bet_ids"][0]
    assert (
        free_client.patch(
            f"/profiles/money-a/free-bets/{ident}",
            json={
                "status": "Placed",
                "back_odds": "5.00",
                "lay_odds_1": "5.20",
                "exchange_name": "Exchange A",
                "lay_actual": "3.50",
            },
        ).status_code
        == 200
    )
    assert (
        free_client.patch(
            f"/profiles/money-a/free-bets/{ident}",
            json={
                "status": "Available",
                "result": "Pending",
                "lay_actual": "",
                "lay_matched_stake_1": "",
            },
        ).status_code
        == 200
    )
    before = persisted()
    assert free_client.delete(f"/profiles/money-a/free-bets/{ident}").status_code == 409
    assert persisted() == before


@pytest.mark.parametrize(
    "children",
    [
        [],
        [child(value="NaN")],
        [child(value="0.00")],
        [child(value="not-money")],
        [{**child(), "bookmaker": "Foreign"}],
    ],
)
def test_invalid_children_no_intent_or_business_write(free_client, children):
    sid = source(free_client)
    before = persisted()
    payload = request()
    payload["children"] = children
    assert (
        free_client.post(
            f"/profiles/money-a/sportsbook-bets/{sid}/free-bet-awards", json=payload
        ).status_code
        == 422
    )
    assert persisted() == before


def test_legacy_group_review_and_no_recovery(free_client):
    sid = source(free_client)
    # Fixture only: bypass new boundary to represent retained legacy partial data.
    from openforge_api.free_bets import FreeBetPayload

    legacy = FreeBetPayload(
        **{
            **child(),
            "origin_qual_bet_id": sid,
            "source_award_group_id": "legacy-group",
            "offer_group_id": "legacy-group",
            "source_award_split_index": 1,
            "source_award_split_total": 2,
        }
    ).model_dump()
    with db.connect() as c, db.reuse_mutation_connection(c):
        row = db.create_free_bet("money-a", legacy, transaction=c)
    observed = free_client.get(f"/profiles/money-a/free-bets/{row.free_bet_id}").json()
    assert observed["award_review_required"] is True
    before = persisted()
    assert (
        free_client.post(
            f"/profiles/money-a/sportsbook-bets/{sid}/free-bet-awards", json=request("legacy-group")
        ).status_code
        == 409
    )
    assert (
        free_client.post(
            f"/profiles/money-a/sportsbook-bets/{sid}/free-bet-awards",
            json=request("new-full-group"),
        ).status_code
        == 409
    )
    assert persisted() == before
