"""Independent market-netting fixtures; never use the reference planner as oracle."""

import copy

import pytest

from openforge_api.multi_lay_actual import calculate_actual


def execution():
    return {
        "version": "multi-lay-actual-v1",
        "revision": 0,
        "exchangeAccountId": "exchange-a",
        "market": "Match winner",
        "commission": "0.05",
        "fills": [
            {"id": "f1", "outcomeId": "outcome1", "stake": "6", "odds": "2.5"},
            {"id": "f2", "outcomeId": "outcome1", "stake": "4", "odds": "3"},
            {"id": "f3", "outcomeId": "outcome2", "stake": "8", "odds": "4"},
        ],
        "unmatched": {"outcome1": "0", "outcome2": "0"},
    }


def values(**changes):
    return {
        "back_stake": "10",
        "back_odds": "4",
        "status": "Placed",
        "result": "Pending",
        "date_settled": "2026-09-25T12:00",
        **changes,
    }


LEGS = [{"id": "outcome1", "label": "A"}, {"id": "outcome2", "label": "B"}]


def test_different_odds_net_market_once_and_preserve_reference_separation():
    result = calculate_actual(values(), LEGS, execution())
    assert [r["total"] for r in result["multi_lay_actual"]["scenarios"]] == [
        "7.10",
        "21.00",
        "16.00",
    ]
    assert result["multi_lay_actual"]["exchange_exposure"] == "14.00"
    assert result["multi_lay_actual"]["matched_stake"] == "18.00"
    assert result["projected_current_pnl"] == "7.10"
    assert result["final_net_pnl"] is None


@pytest.mark.parametrize(
    "outcome,total",
    [("Outcome 1 Won", "21.00"), ("Outcome 2 Won", "16.00"), ("Lay Won", "7.10"), ("Void", "0.00")],
)
def test_actual_settlement(outcome, total):
    result = calculate_actual(values(status="Settled", result=outcome), LEGS, execution())
    assert result["reporting_value"] == result["actual_net_pnl"] == result["final_net_pnl"] == total


def test_no_fills_does_not_invent_placements_and_unmatched_does_not_earn():
    data = execution()
    data["fills"] = []
    data["unmatched"]["outcome1"] = "12.34"
    result = calculate_actual(values(), LEGS, data)
    assert result["projected_current_pnl"] == "-10.00"
    assert result["multi_lay_actual"]["exchange_exposure"] == "0.00"
    assert result["multi_lay_actual"]["unmatched_stake"] == "12.34"


@pytest.mark.parametrize(
    "field,value",
    [
        ("stake", "NaN"),
        ("stake", "-1"),
        ("stake", "1.001"),
        ("stake", "0"),
        ("odds", ""),
        ("odds", "1"),
        ("odds", "2oops"),
        ("outcomeId", "other"),
    ],
)
def test_bad_fills_fail_closed(field, value):
    data = execution()
    data["fills"][0][field] = value
    with pytest.raises(ValueError):
        calculate_actual(values(), LEGS, data)


def test_duplicate_ids_missing_commission_and_unmatched_settlement_fail():
    for mutate in [
        lambda d: d["fills"].append(copy.deepcopy(d["fills"][0])),
        lambda d: d.update(commission=""),
        lambda d: d["unmatched"].pop("outcome1"),
        lambda d: d["unmatched"].update(outcome1="1"),
    ]:
        data = execution()
        mutate(data)
        with pytest.raises(ValueError):
            calculate_actual(values(status="Settled", result="Outcome 2 Won"), LEGS, data)


def test_api_plan_actual_reopen_settlement_history_and_isolation(tmp_path, monkeypatch):
    import json

    from test_calculator_conversions import (
        add_account,
        authenticated_client,
        configure_temp_database,
    )

    configure_temp_database(tmp_path)
    client = authenticated_client()
    onboarding = client.post(
        "/profiles/onboarding",
        json={
            "display_name": "Synthetic Actual MultiLay",
            "profile_code": "ACTUAL-001",
            "setup_path": "import",
            "tracking_start_date": "2026-09-01",
            "enabled_modules": ["sportsbook-bets", "free-bets", "cash-adjustments"],
            "accounts": [],
            "quick_actions": [],
        },
    )
    assert onboarding.status_code == 201, onboarding.text
    profile = onboarding.json()["profile"]["profile_id"]
    add_account(client, profile, "Bet365", "Bookie")
    add_account(client, profile, "Smarkets", "Exchange")
    account = next(
        a for a in client.get(f"/profiles/{profile}/accounts").json() if a["type"] == "Exchange"
    )
    legs = [
        {
            "id": "outcome1",
            "label": "A",
            "layOdds": "2.5",
            "commission": "0.05",
            "calculationVersion": "multi-lay-v2",
            "backingType": "normal",
        },
        {"id": "outcome2", "label": "B", "layOdds": "3", "commission": "0.02"},
    ]
    payload = dict(
        event_name="Synthetic operational Multi-Lay",
        bookmaker="Bet365",
        offer_type="Bet & Get",
        bet_type="Single",
        fixture_type="Football",
        match_strategy="Multilay",
        status="Prospecting",
        result="Pending",
        back_stake="10",
        back_odds="4",
        lay_odds_1="2.5",
        exchange_name="Smarkets",
        multi_lay_outcome_1_name="A",
        multi_lay_outcomes_json=json.dumps(legs),
        date_settled="2026-09-25T12:00",
    )
    base = f"/profiles/{profile}/sportsbook-bets"
    response = client.post(base, json=payload)
    assert response.status_code == 201, response.text
    row = response.json()
    url = f"{base}/{row['sportsbook_bet_id']}"
    actual = execution()
    actual["exchangeAccountId"] = account["account_id"]
    legs[0]["execution"] = actual
    payload.update(status="Placed", multi_lay_outcomes_json=json.dumps(legs))
    response = client.put(url, json=payload)
    assert response.status_code == 200, response.text
    saved = response.json()
    assert saved["reporting_value"] == "7.10"
    assert client.get(url).json()["multi_lay_actual"]["exchange_exposure"] == "14.00"
    assert client.put(url, json=payload).status_code == 200
    # Saved fills cannot be silently overwritten by an ordinary edit.
    changed = copy.deepcopy(legs)
    changed[0]["execution"]["fills"][0]["stake"] = "7"
    assert (
        client.put(
            url, json={**payload, "multi_lay_outcomes_json": json.dumps(changed)}
        ).status_code
        == 409
    )
    # Same-name Account from another Profile cannot be substituted.
    add_account(client, "profile-demo-002", "Smarkets", "Exchange")
    other = client.get("/profiles/profile-demo-002/accounts").json()[0]
    foreign = copy.deepcopy(legs)
    foreign[0]["execution"]["exchangeAccountId"] = other["account_id"]
    assert (
        client.put(
            url, json={**payload, "multi_lay_outcomes_json": json.dumps(foreign)}
        ).status_code
        == 422
    )
    client.put(
        f"/profiles/{profile}/exchange-commissions",
        json={"exchange_name": "Smarkets", "commission_rate": "0.10"},
    )
    assert client.get(url).json()["reporting_value"] == "7.10"
    # Failure after SQL update but before commit must preserve cash and History.
    import openforge_api.sportsbook as sportsbook_module

    failed = copy.deepcopy(legs)
    failed[0]["execution"]["fills"].append(
        {"id": "f4", "outcomeId": "outcome1", "stake": "1", "odds": "5"}
    )
    before_history = client.get(
        f"/profiles/{profile}/financial-history/sportsbook/{row['sportsbook_bet_id']}"
    ).json()

    def fail_prepare(*args, **kwargs):
        raise RuntimeError("Injected response preparation failure")

    with monkeypatch.context() as patch:
        patch.setattr(sportsbook_module, "prepare_write_response", fail_prepare)
        with pytest.raises(RuntimeError, match="Injected"):
            client.put(url, json={**payload, "multi_lay_outcomes_json": json.dumps(failed)})
    assert client.get(url).json()["reporting_value"] == "7.10"
    assert (
        client.get(
            f"/profiles/{profile}/financial-history/sportsbook/{row['sportsbook_bet_id']}"
        ).json()
        == before_history
    )
    response = client.put(url, json={**saved, "status": "Settled", "result": "Outcome 2 Won"})
    assert response.status_code == 200, response.text
    assert response.json()["reporting_value"] == "16.00"
    assert client.get(url.replace(profile, "profile-demo-002")).status_code == 404
    assert client.put(url, json=payload).status_code == 409
    from openforge_api.db import connect

    with connect() as connection:
        events = connection.execute(
            "SELECT operation FROM financial_activity_history WHERE activity_id=?",
            (row["sportsbook_bet_id"],),
        ).fetchall()
        assert "placement_recorded" in [e["operation"] for e in events]
        assert "settled" in [e["operation"] for e in events]
    # Explicit correction changes current meaning once, without deleting old snapshots.
    settled = client.get(url).json()
    corrected = client.put(
        url,
        json={
            **settled,
            "result": "Outcome 1 Won",
            "multi_lay_correction_reason": "Corrected recorded winning outcome",
        },
    )
    assert corrected.status_code == 200, corrected.text
    assert corrected.json()["reporting_value"] == "21.00"
    retry = client.put(
        url,
        json={
            **settled,
            "result": "Outcome 1 Won",
            "multi_lay_correction_reason": "Corrected recorded winning outcome",
        },
    )
    assert retry.status_code == 200, retry.text
    history = client.get(
        f"/profiles/{profile}/financial-history/sportsbook/{row['sportsbook_bet_id']}"
    ).json()
    assert len([e for e in history if e["operation"] == "corrected"]) == 1
    assert any(
        e["after_snapshot"]["result"] == "Outcome 2 Won"
        and e["after_snapshot"]["multi_lay_actual_value"] == "16.00"
        for e in history
    )
    assert (
        next(e for e in history if e["operation"] == "corrected")["after_snapshot"][
            "multi_lay_actual_value"
        ]
        == "21.00"
    )
    # Export/restore uses real XLSX and both structural/financial parity gates.
    from test_profile_portable_restore import portable_payload

    from openforge_api.profile_portable_export import build_profile_portable_export
    from openforge_api.profile_portable_restore import (
        analyse_portable_restore,
        execute_portable_restore,
    )

    export = build_profile_portable_export(profile)
    analysis = analyse_portable_restore(
        payload=portable_payload(export.content), owner_email="owner@example.invalid"
    )
    assert analysis["status"] == "READY", analysis
    import openforge_api.profile_portable_restore as restore_module

    original_reconcile = restore_module._restore_reconciliation

    def checked_reconciliation(**kwargs):
        gates = original_reconcile(**kwargs)
        assert gates[0]["status"] == "PASS", gates[0]
        assert gates[1]["status"] == "OPERATIONAL HEALTH: PASSED", gates[1]
        assert gates[2]["status"] == "PASS", gates[2]
        return gates

    monkeypatch.setattr(restore_module, "_restore_reconciliation", checked_reconciliation)
    restore = execute_portable_restore(
        restore_run_id=analysis["restore_run_id"],
        owner_email="owner@example.invalid",
        actor_email="owner@example.invalid",
    )
    assert restore["status"] == "COMPLETE", restore
    restored = client.get(f"/profiles/{restore['target_profile_id']}/sportsbook-bets").json()
    assert len(restored) == 1 and restored[0]["reporting_value"] == "21.00"
    restored_execution = json.loads(restored[0]["multi_lay_outcomes_json"])[0]["execution"]
    assert restored_execution["exchangeAccountId"] != account["account_id"]
    assert restored_execution["fills"] == actual["fills"]


def test_twentieth_named_outcome_and_zero_commission():
    legs = [{"id": f"outcome{i}", "label": f"Outcome {i}"} for i in range(1, 21)]
    data = execution()
    data.update(commission="0", fills=[], unmatched={leg["id"]: "0" for leg in legs})
    result = calculate_actual(values(status="Settled", result="Outcome 20 Won"), legs, data)
    assert result["final_net_pnl"] == "30.00"
    assert len(result["multi_lay_actual"]["scenarios"]) == 21


def test_existing_void_status_is_supported_without_changing_cash_meaning():
    assert (
        calculate_actual(values(status="Void", result="Void"), LEGS, execution())["final_net_pnl"]
        == "0.00"
    )
