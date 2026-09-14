"""C04-C07 contract-blocker reproduction; passing probes establish a parity FAIL.

Legacy behaviour is retained, not used as the new calculator's expected answer.
All data is isolated synthetic data from the existing atomic-safety fixture.
"""
import pytest
from test_free_bet_atomic_safety import free_client, payload  # noqa: F401
from test_account_money_safety import money_client  # noqa: F401

from openforge_api import db


@pytest.mark.parametrize("strategy,legacy,required", [
    ("Underlay", "6.66", "6.25"), ("Overlay", "9.33", "10.20"),
])
def test_no_faithful_new_snr_plan_without_a_versioned_plan_field(free_client, strategy, legacy, required):
    response = free_client.post("/profiles/money-a/free-bets", json=payload(
        status="Available", back_odds="4.00", lay_odds_1="4.20",
        match_strategy=strategy, lay_actual="", lay_matched_stake_1=""))
    assert response.status_code == 201, response.text
    record_id = response.json()["free_bet_id"]
    reopened = free_client.get(f"/profiles/money-a/free-bets/{record_id}").json()
    key = strategy.lower() + "_reference_lay_stake"
    assert reopened[key] == legacy
    assert reopened[key] != required  # Independent acceptance target, not production oracle.
    raw = db.get_free_bet("money-a", record_id)
    assert raw.lay_actual == raw.lay_matched_stake_1 == ""
    with db.connect() as connection:
        fields = {r["name"] for r in connection.execute("PRAGMA table_info(free_bets)")}
    assert "planned_lay_stake" not in fields
    assert "reference_contract_version" not in fields


def test_supplied_row_commission_is_not_preserved_by_legacy_contract(free_client):
    response = free_client.post("/profiles/money-a/free-bets", json=payload(
        status="Available", back_odds="4.00", lay_odds_1="4.20",
        lay_commission_1="0.05", lay_actual="", lay_matched_stake_1=""))
    assert response.status_code == 201
    record_id = response.json()["free_bet_id"]
    assert db.get_free_bet("money-a", record_id).lay_commission_1 == ""
    reopened = free_client.get(f"/profiles/money-a/free-bets/{record_id}").json()
    assert reopened["lay_commission_1"] == "0.02"
    assert reopened["lay_commission_1"] != "0.05"
