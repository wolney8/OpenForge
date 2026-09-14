"""Independent exact literals; real isolated HTTP/database boundary, no production oracle."""
import json
from unittest.mock import patch

import pytest

from test_account_money_safety import money_client  # noqa: F401
from test_free_bet_atomic_safety import free_client, payload  # noqa: F401
from openforge_api import db
from test_sportsbook_atomic_safety import payload as sportsbook_payload


EXPECTED = {
    "Standard": ("7.18", "22.98", "7.02", "7.04"),
    "Underlay": ("6.25", "20.00", "10.00", "6.13"),
    "Overlay": ("10.20", "32.64", "-2.64", "10.00"),
    "Custom": ("9.00", "28.80", "1.20", "8.82"),
}


def plan(strategy="Underlay", commission="0.02", reviewed=None, **extra):
    return json.dumps({
        "schema_version": "lay-plan-v1", "calculation_contract_version": "snr-outcome-target-v1",
        "backing_basis": "SNR", "back_stake": "10.00", "back_odds": "4.00", "lay_odds": "4.20",
        "selected_strategy": strategy, "custom_lay_stake": "9.00" if strategy == "Custom" else "",
        "exchange_name": "Exchange A", "commission_units": "ratio", "commission": commission,
        "commission_origin": "override", "reviewed_planned_lay_stake": reviewed or EXPECTED[strategy][0],
        **extra})


def body(strategy="Underlay", **extra):
    return payload(status="Available", back_odds="4.00", lay_odds_1="4.20",
                   match_strategy=strategy, lay_actual="", lay_matched_stake_1="",
                   lay_plan_json=plan(strategy), **extra)


@pytest.mark.parametrize("strategy", EXPECTED)
def test_native_versioned_reference_persists_without_actual_placement(free_client, strategy):
    response = free_client.post("/profiles/money-a/free-bets", json=body(strategy))
    assert response.status_code == 201, response.text
    row = response.json()
    raw = db.get_free_bet("money-a", row["free_bet_id"])
    assert raw.lay_actual == raw.lay_matched_stake_1 == raw.lay_commission_1 == ""
    assert json.loads(raw.lay_plan_json)["reviewed_planned_lay_stake"] == EXPECTED[strategy][0]
    reopened = free_client.get(f"/profiles/money-a/free-bets/{row['free_bet_id']}").json()
    assert (reopened["calculated_liability_1"], reopened["scenario_pnl_if_back_wins"], reopened["scenario_pnl_if_lay_wins"]) == EXPECTED[strategy][1:]
    assert reopened["underlay_reference_lay_stake"] == "6.25"
    assert reopened["overlay_reference_lay_stake"] == "10.20"


def test_normal_plan_uses_same_service_without_populating_actuals(free_client):
    p = json.loads(plan("Standard", reviewed="9.57"))
    p.update(backing_basis="Normal", calculation_contract_version="workbook-reference-v1")
    # Normal equalisation: 10*4/(4.2-.02) = 9.569... -> 9.57.
    values = sportsbook_payload(status="Prospecting", back_odds="4.00", lay_odds_1="4.20",
        lay_actual="", lay_matched_stake_1="", lay_plan_json=json.dumps(p))
    response = free_client.post("/profiles/money-a/sportsbook-bets", json=values)
    assert response.status_code == 201, response.text
    row = response.json()
    assert row["lay_actual"] == row["lay_matched_stake_1"] == ""
    raw = db.get_sportsbook_bet("money-a", row["sportsbook_bet_id"])
    assert json.loads(raw.lay_plan_json)["reviewed_planned_lay_stake"] == "9.57"


@pytest.mark.parametrize("strategy", EXPECTED)
def test_corrected_conversion_preserves_plan_source_and_retry(tmp_path, strategy):
    from test_calculator_conversions import configure_temp_database, authenticated_client, add_account, standard_payload
    configure_temp_database(tmp_path)
    client = authenticated_client()
    add_account(client, "profile-demo-001", "Bet365", "Bookie")
    add_account(client, "profile-demo-001", "Smarkets", "Exchange")
    values = standard_payload(["profile-demo-001"])
    values["calculator"].update(bet_type="free_bet", free_bet_mode="SNR", strategy=strategy,
        back_stake="10.00", back_odds="4.00", lay_odds="4.20", exchange_commission="0.02",
        manual_lay_stake="9.00" if strategy == "Custom" else "")
    values["source"]["calculator_mode"] = "free_bet"
    values["source"]["canonical_inputs"] = {**values["calculator"], "exchange":"Smarkets"}
    first = client.post("/fund-manager/calculator-conversions/standard", json=values)
    assert first.status_code == 200, first.text
    target = first.json()["results"][0]
    assert target["state"] == "succeeded", target
    url = f"/profiles/profile-demo-001/free-bets/{target['record_id']}"
    row = client.get(url).json()
    saved = json.loads(row["lay_plan_json"])
    assert saved["selected_strategy"] == strategy
    assert saved["reviewed_planned_lay_stake"] == EXPECTED[strategy][0]
    assert saved["source_identity"] and saved["source_checksum"]
    assert row["lay_actual"] == row["lay_matched_stake_1"] == ""
    retry = client.post("/fund-manager/calculator-conversions/standard", json=values)
    assert retry.json()["results"][0]["record_id"] == target["record_id"]
    assert len(db.list_free_bets("profile-demo-001")) == 1


def test_actuals_override_plan_and_do_not_follow_profile_defaults(free_client):
    created = free_client.post("/profiles/money-a/free-bets", json=body()).json()
    identifier = created["free_bet_id"]
    url = f"/profiles/money-a/free-bets/{identifier}"
    values = body()
    values.update(lay_plan_json=created["lay_plan_json"], status="Settled", result="Back Won",
                  lay_actual="6.00", lay_matched_stake_1="6.00", lay_commission_1="0.02")
    response = free_client.put(url, json=values)
    assert response.status_code == 200, response.text
    assert response.json()["calculated_liability_1"] == "19.20"
    assert response.json()["final_net_pnl"] == "10.80"
    assert response.json()["scenario_pnl_if_lay_wins"] == "5.88"
    raw = db.get_free_bet("money-a", identifier)
    assert raw.lay_commission_1 == "0.02"
    p = json.loads(raw.lay_plan_json)
    p.update(selected_strategy="Custom", custom_lay_stake="9.00", reviewed_planned_lay_stake="9.00")
    values.update(match_strategy="Custom", lay_plan_json=json.dumps(p))
    response = free_client.put(url, json=values)
    assert response.status_code == 200, response.text
    assert response.json()["final_net_pnl"] == "10.80"
    assert response.json()["scenario_pnl_if_lay_wins"] == "5.88"
    assert free_client.put("/profiles/money-a/exchange-commissions", json={"exchange_name":"Exchange A", "commission_rate":"0.05"}).status_code == 200
    assert free_client.get(url).json()["final_net_pnl"] == "10.80"


@pytest.mark.parametrize("commission,stake", [("0", "7.14"), ("0.05", "7.23"), ("0.02125", "7.18")])
def test_commission_override_and_zero_survive_reopen(free_client, commission, stake):
    # Standard F*(B-1)/(4.2-c); independent HALF_UP penny placement.
    values = body("Standard")
    values["lay_plan_json"] = plan("Standard", commission, stake)
    response = free_client.post("/profiles/money-a/free-bets", json=values)
    assert response.status_code == 201, response.text
    url = f"/profiles/money-a/free-bets/{response.json()['free_bet_id']}"
    reopened = free_client.get(url).json()
    assert reopened["lay_commission_1"] == commission
    assert json.loads(reopened["lay_plan_json"])["reviewed_planned_lay_stake"] == stake


@pytest.mark.parametrize("extra", [{"schema_version":"unknown"}, {"commission":"NaN"},
                                  {"reviewed_planned_lay_stake":"99.00"}, {"exchange_account_id":"foreign-account"},
                                  {"back_odds":"5.00"}, {"commission_units":"percent"}])
def test_invalid_or_conflicting_plan_creates_no_business_row(free_client, extra):
    values = body()
    values["lay_plan_json"] = plan(**extra)
    before = len(db.list_free_bets("money-a"))
    response = free_client.post("/profiles/money-a/free-bets", json=values)
    assert response.status_code == 422, response.text
    assert len(db.list_free_bets("money-a")) == before


def test_preparation_failure_rolls_back_plan_record_and_audit(free_client):
    before = len(db.list_free_bets("money-a"))
    with patch("openforge_api.free_bets.prepare_write_response", side_effect=RuntimeError("synthetic preparation failure")):
        response = free_client.post("/profiles/money-a/free-bets", json=body())
    assert response.status_code == 500
    assert len(db.list_free_bets("money-a")) == before


def test_portable_plan_round_trip_remaps_exchange_identity(free_client):
    import base64
    from openforge_api.profile_portable_export import build_profile_portable_export
    from openforge_api.profile_portable_restore import (
        PortableRestoreAnalysisPayload, analyse_portable_restore, execute_portable_restore,
        parse_profile_portable_export)
    created = free_client.post("/profiles/money-a/free-bets", json=body()).json()
    original = json.loads(created["lay_plan_json"])
    exported = build_profile_portable_export("money-a")
    parsed = parse_profile_portable_export(exported.content)
    assert json.loads(parsed.sheets["Free Bets"][0]["lay_plan_json"]) == original
    analysis = analyse_portable_restore(payload=PortableRestoreAnalysisPayload(
        source_filename="synthetic-plans.xlsx", content_base64=base64.b64encode(exported.content).decode(),
        target_display_name="Synthetic restored plans", target_profile_code="RESTORED-PLAN"),
        owner_email="money-owner@example.invalid")
    assert analysis["status"] == "READY", analysis
    result = execute_portable_restore(restore_run_id=analysis["restore_run_id"],
        owner_email="money-owner@example.invalid", actor_email="money-owner@example.invalid")
    assert result["status"] == "COMPLETE", result
    rows = db.list_free_bets(result["target_profile_id"])
    assert len(rows) == 1
    restored = json.loads(rows[0].lay_plan_json)
    assert restored["exchange_account_id"] != original["exchange_account_id"]
    assert restored["reviewed_planned_lay_stake"] == "6.25"
    assert restored["selected_strategy"] == "Underlay"
    assert rows[0].lay_actual == ""


def test_additive_old_schema_upgrade_leaves_historical_actuals_unchanged(free_client):
    # This fixture alone owns this disposable database. Removing the new nullable
    # columns here models the prior schema; no service/operational target is used.
    created = free_client.post("/profiles/money-a/free-bets", json=payload()).json()
    identifier = created["free_bet_id"]
    before = db.get_free_bet("money-a", identifier)
    with db.connect() as c:
        c.execute("ALTER TABLE free_bets DROP COLUMN lay_plan_json")
        c.execute("ALTER TABLE sportsbook_bets DROP COLUMN lay_plan_json")
        db.initialize_database(c)
        db.initialize_database(c)
    after = db.get_free_bet("money-a", identifier)
    assert after.lay_plan_json is None
    assert (after.lay_actual, after.lay_matched_stake_1, after.updated_at) == (
        before.lay_actual, before.lay_matched_stake_1, before.updated_at)
    assert free_client.get(f"/profiles/money-a/free-bets/{identifier}").status_code == 200


def test_plan_revision_rejects_stale_save_and_clear_is_explicit(free_client):
    created = free_client.post("/profiles/money-a/free-bets", json=body()).json()
    url = f"/profiles/money-a/free-bets/{created['free_bet_id']}"
    values = body("Overlay")
    values["lay_plan_json"] = plan("Overlay", revision=0)
    response = free_client.put(url, json=values)
    assert response.status_code == 200, response.text
    before = db.get_free_bet("money-a", created["free_bet_id"])
    assert json.loads(before.lay_plan_json)["revision"] == 1
    stale = free_client.put(url, json=body("Custom"))
    assert stale.status_code == 409
    assert db.get_free_bet("money-a", created["free_bet_id"]) == before
    values["lay_plan_json"] = None
    assert free_client.put(url, json=values).status_code == 200
    assert db.get_free_bet("money-a", created["free_bet_id"]).lay_plan_json is None
