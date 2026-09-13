"""PD-QA-020: synthetic HTTP probes with independently asserted stored state."""
# ruff: noqa: F811 — explicitly reused synthetic fixtures

import pytest
from test_account_money_safety import money_client  # noqa: F401
from test_free_bet_atomic_safety import free_client  # noqa: F401

from openforge_api import db, sportsbook


def payload(**changes):
    result = dict(
        event_name="Synthetic Sportsbook",
        bookmaker="Bookmaker A",
        offer_type="Bet & Get",
        bet_type="Single",
        fixture_type="Football",
        status="Placed",
        result="Pending",
        back_stake="10.00",
        back_odds="5.00",
        lay_odds_1="5.20",
        lay_actual="9.00",
        exchange_name="Exchange A",
        match_strategy="Standard",
        date_settled="2026-09-13",
    )
    return {**result, **changes}


def state():
    with db.connect() as c:
        return (
            [dict(r) for r in c.execute("SELECT * FROM sportsbook_bets").fetchall()],
            [dict(r) for r in c.execute("SELECT * FROM sportsbook_bet_audit").fetchall()],
        )


@pytest.mark.parametrize("raw", ["not-money", "NaN", "Infinity", "-Infinity"])
def test_invalid_create_and_update_are_atomic(free_client, raw):
    before = state()
    assert (
        free_client.post(
            "/profiles/money-a/sportsbook-bets", json=payload(back_stake=raw)
        ).status_code
        == 422
    )
    assert state() == before
    made = free_client.post("/profiles/money-a/sportsbook-bets", json=payload()).json()
    before = state()
    assert (
        free_client.put(
            f"/profiles/money-a/sportsbook-bets/{made['sportsbook_bet_id']}",
            json=payload(lay_actual=raw),
        ).status_code
        == 422
    )
    assert state() == before


def test_missing_profile_is_controlled(free_client):
    before = state()
    assert free_client.post("/profiles/missing/sportsbook-bets", json=payload()).status_code == 404
    assert state() == before


def test_archived_and_foreign_references_are_zero_write(free_client):
    before = state()
    assert (
        free_client.post(
            "/profiles/money-a/sportsbook-bets", json=payload(bookmaker="Foreign Bookmaker")
        ).status_code
        == 422
    )
    assert state() == before
    with db.connect() as c:
        c.execute("UPDATE accounts SET lifecycle_status='Archived' WHERE account='Bookmaker A'")
    assert free_client.post("/profiles/money-a/sportsbook-bets", json=payload()).status_code == 409
    assert state() == before
    with db.connect() as c:
        c.execute("UPDATE profiles SET status='Archived' WHERE profile_id='money-a'")
    assert free_client.post("/profiles/money-a/sportsbook-bets", json=payload()).status_code in {
        403,
        409,
    }
    assert state() == before


def test_response_preparation_rolls_back(free_client, monkeypatch):
    def broken(*args, **kwargs):
        raise RuntimeError("Synthetic response preparation failure")

    before = state()
    monkeypatch.setattr(sportsbook, "build_response", broken)
    assert free_client.post("/profiles/money-a/sportsbook-bets", json=payload()).status_code == 500
    assert state() == before


def test_legacy_invalid_is_readable_and_export_controlled(free_client):
    made = free_client.post("/profiles/money-a/sportsbook-bets", json=payload()).json()
    ident = made["sportsbook_bet_id"]
    with db.connect() as c:
        c.execute(
            "UPDATE sportsbook_bets SET back_stake='not-money' WHERE sportsbook_bet_id=?", (ident,)
        )
    before = state()
    read = free_client.get(f"/profiles/money-a/sportsbook-bets/{ident}")
    assert read.status_code == 200
    assert read.json()["back_stake"] == "not-money"
    assert read.json()["calculation_state"] == "review_required"
    assert read.json()["reporting_value"] is None
    assert free_client.get("/profiles/money-a/sportsbook-bets").status_code == 200
    assert free_client.get("/profiles/money-a/tracker-summary-sources").status_code == 200
    assert free_client.get("/profiles/money-a/imports/sportsbook/export.xlsx").status_code == 409
    assert free_client.get("/profiles/money-a/exports/portable-profile.xlsx").status_code == 409
    assert state() == before

    from openforge_api.migration_control_totals import build_module_total

    totals = build_module_total(
        profile_id="money-a",
        profile_code="MONEY-A",
        profile_name="Synthetic",
        module="sportsbook_bets",
        current_values=["2.20", None],
        final_values=["2.20", None],
    )
    assert totals.current_value_total is None
    assert totals.final_value_total is None
    assert totals.missing_current_value_count == 1


@pytest.mark.parametrize(
    "field",
    [
        "back_stake",
        "lay_actual",
        "lay_matched_stake_1",
        "maximum_bonus",
        "maximum_boost_winnings",
        "manual_override_value",
        "bonus_retention_rate",
        "profit_boost_percent",
        "lay_commission_1",
        "back_odds",
        "lay_odds_1",
    ],
)
@pytest.mark.parametrize("raw", ["not-money", "NaN", "Infinity", "-Infinity", None])
def test_supplied_invalid_fields_zero_write(free_client, field, raw):
    before = state()
    assert (
        free_client.post(
            "/profiles/money-a/sportsbook-bets",
            json=payload(**{field: raw}, manual_override_reason="Synthetic reason"),
        ).status_code
        == 422
    )
    assert state() == before


@pytest.mark.parametrize("boundary", ["calculate_sportsbook_current_value", "model_dump_json"])
def test_calculation_and_json_fault_create_update_rollback(free_client, monkeypatch, boundary):
    made = free_client.post("/profiles/money-a/sportsbook-bets", json=payload()).json()
    before = state()
    target = (
        sportsbook
        if boundary == "calculate_sportsbook_current_value"
        else sportsbook.SportsbookBetResponse
    )

    def broken(*args, **kwargs):
        raise RuntimeError("Synthetic preparation fault")

    monkeypatch.setattr(target, boundary, broken)
    assert free_client.post("/profiles/money-a/sportsbook-bets", json=payload()).status_code == 500
    assert (
        free_client.put(
            f"/profiles/money-a/sportsbook-bets/{made['sportsbook_bet_id']}",
            json=payload(back_stake="12.00"),
        ).status_code
        == 500
    )
    assert state() == before


def test_independent_financial_lifecycle(free_client):
    made = free_client.post(
        "/profiles/money-a/sportsbook-bets", json=payload(status="Not Placed", lay_actual="")
    ).json()
    assert made["reference_lay_stake_standard"] == "9.65"
    ident = made["sportsbook_bet_id"]
    for result, expected in [("Back Won", "2.20"), ("Lay Won", "-1.18")]:
        saved = free_client.put(
            f"/profiles/money-a/sportsbook-bets/{ident}",
            json=payload(status="Settled", result=result),
        ).json()
        assert saved["calculated_liability_1"] == "37.80"
        assert saved["final_net_pnl"] == expected
        assert (
            free_client.get(f"/profiles/money-a/sportsbook-bets/{ident}").json()["final_net_pnl"]
            == expected
        )
        assert free_client.get("/profiles/money-a/tracker-summary-sources").status_code == 200
    assert db.get_sportsbook_bet("money-a", ident).lay_actual == "9.00"


def test_draft_absence_zero_and_historical_precision(free_client):
    draft = free_client.post(
        "/profiles/money-a/sportsbook-bets",
        json=payload(
            status="Prospecting", back_stake="", back_odds="", lay_odds_1="", lay_actual=""
        ),
    ).json()
    ident = draft["sportsbook_bet_id"]
    saved = db.update_sportsbook_bet("money-a", ident, {"back_stake": ".50"})
    assert saved.back_stake == "0.50"
    assert saved.lay_actual == ""
    assert (
        free_client.post(
            "/profiles/money-a/sportsbook-bets", json=payload(back_stake="0")
        ).status_code
        == 201
    )
    with db.connect() as c:
        c.execute(
            "UPDATE sportsbook_bets SET back_stake='10.000' WHERE sportsbook_bet_id=?", (ident,)
        )
    assert (
        free_client.get(f"/profiles/money-a/sportsbook-bets/{ident}").json()["back_stake"]
        == "10.000"
    )


@pytest.mark.parametrize(
    "field", ["placedMatchedStake", "matchedStake", "commission", "placedLayOdds"]
)
def test_nested_invalid_fields_zero_write(free_client, field):
    import json

    before = state()
    value = json.dumps([{"id": "outcome2", "layOdds": "5.20", field: "NaN"}])
    assert (
        free_client.post(
            "/profiles/money-a/sportsbook-bets", json=payload(multi_lay_outcomes_json=value)
        ).status_code
        == 422
    )
    assert state() == before
