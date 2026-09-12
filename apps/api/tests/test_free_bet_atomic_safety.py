"""PD-QA-014: isolated synthetic records, independent HTTP and database assertions."""

import json

import pytest
from test_account_money_safety import money_client  # noqa: F401

from openforge_api import db
from openforge_api.accounts import AccountPayload


@pytest.fixture
def free_client(money_client):  # noqa: F811 — imported shared synthetic fixture
    for name, kind in [("Bookmaker A", "Bookie"), ("Exchange A", "Exchange")]:
        p = AccountPayload(
            account=name,
            type=kind,
            status="Active",
            lifecycle_status="Active",
            current_balance="0.00",
            pending_withdrawal_amount="0.00",
        ).model_dump()
        p["restrictions_json"] = "[]"
        db.create_account("money-a", p)
    db.upsert_profile_exchange_commission("money-a", "Exchange A", "0.02")
    return money_client


def payload(**changes):
    return {
        "event_name": "Synthetic fixture",
        "bookmaker": "Bookmaker A",
        "status": "Placed",
        "result": "Pending",
        "retention_mode": "SNR",
        "free_bet_value": "10.00",
        "back_odds": "5.00",
        "match_strategy": "Standard",
        "lay_odds_1": "5.20",
        "lay_actual": "7.00",
        "lay_matched_stake_1": "7.00",
        "exchange_name": "Exchange A",
        "date_settled": "2026-09-12",
        **changes,
    }


@pytest.mark.parametrize("raw", ["NaN", "Infinity", "-Infinity", "not-money"])
def test_malformed_placed_create_is_zero_write(free_client, raw):
    r = free_client.post("/profiles/money-a/free-bets", json=payload(free_bet_value=raw))
    retained = db.list_free_bets("money-a")
    print(
        {
            "input": raw,
            "http": r.status_code,
            "retained": len(retained),
            "list_read": free_client.get("/profiles/money-a/free-bets").status_code,
            "summary_read": free_client.get(
                "/profiles/money-a/tracker-summary-sources"
            ).status_code,
        }
    )
    assert r.status_code == 422
    assert db.list_free_bets("money-a") == []
    with db.connect() as c:
        assert c.execute("SELECT COUNT(*) FROM free_bet_audit").fetchone()[0] == 0


def test_missing_profile_is_controlled_zero_write(free_client):
    r = free_client.post("/profiles/missing/free-bets", json=payload())
    assert r.status_code == 404
    assert db.list_free_bets("missing") == []


def test_legitimate_foreign_profile_accounts_and_row_are_not_interchangeable(free_client):
    db.create_profile_with_onboarding(
        {
            "profile_id": "money-b",
            "display_name": "Synthetic B",
            "profile_code": "MONEY-B",
            "tracking_start_date": "2026-09-01",
            "current_cash_snapshot": "0.00",
            "enabled_modules": ["sportsbook-bets", "free-bets"],
            "accounts": [],
            "quick_actions": [],
            "exchange_commissions": [],
        }
    )
    with db.connect() as c:
        c.execute("UPDATE profiles SET status='Active' WHERE profile_id='money-b'")
    for name, kind in [("Foreign Bookmaker", "Bookie"), ("Foreign Exchange", "Exchange")]:
        account = AccountPayload(
            account=name, type=kind, status="Active", lifecycle_status="Active"
        ).model_dump()
        account["restrictions_json"] = "[]"
        db.create_account("money-b", account)
    db.upsert_profile_exchange_commission("money-b", "Foreign Exchange", "0.02")
    foreign = free_client.post(
        "/profiles/money-b/free-bets",
        json=payload(bookmaker="Foreign Bookmaker", exchange_name="Foreign Exchange"),
    )
    assert foreign.status_code == 201
    foreign_id = foreign.json()["free_bet_id"]
    assert free_client.get(f"/profiles/money-a/free-bets/{foreign_id}").status_code == 404
    assert (
        free_client.patch(
            f"/profiles/money-a/free-bets/{foreign_id}", json={"free_bet_value": "99.00"}
        ).status_code
        == 404
    )
    assert (
        free_client.post(
            "/profiles/money-a/free-bets",
            json=payload(bookmaker="Foreign Bookmaker", exchange_name="Foreign Exchange"),
        ).status_code
        == 422
    )
    assert db.list_free_bets("money-a") == []
    assert db.get_free_bet("money-b", foreign_id).free_bet_value == "10.00"


@pytest.mark.parametrize(
    "field",
    [
        "free_bet_value",
        "lay_actual",
        "lay_matched_stake_1",
        "manual_override_value",
        "source_award_expected_value",
        "back_odds",
        "lay_odds_1",
        "lay_commission_1",
    ],
)
@pytest.mark.parametrize("raw", ["NaN", "Infinity", "-Infinity", "not-money"])
def test_rejected_update_keeps_original(free_client, field, raw):
    r = free_client.post("/profiles/money-a/free-bets", json=payload())
    assert r.status_code == 201
    ident = r.json()["free_bet_id"]
    before = db.get_free_bet("money-a", ident)
    audits = db.count_free_bet_audit_rows("money-a", ident)
    previous_report = free_client.get("/profiles/money-a/tracker-summary-sources").json()
    r = free_client.put(f"/profiles/money-a/free-bets/{ident}", json=payload(**{field: raw}))
    assert r.status_code == 422
    assert db.get_free_bet("money-a", ident) == before
    assert db.count_free_bet_audit_rows("money-a", ident) == audits
    assert free_client.get(f"/profiles/money-a/free-bets/{ident}").status_code == 200
    assert free_client.get("/profiles/money-a/tracker-summary-sources").json() == previous_report


def test_response_preparation_failure_is_atomic(free_client, monkeypatch):
    from openforge_api import free_bets

    def broken(*args, **kwargs):
        raise RuntimeError("Synthetic response-preparation failure")

    monkeypatch.setattr(free_bets, "build_response", broken)
    r = free_client.post("/profiles/money-a/free-bets", json=payload())
    assert r.status_code == 500
    assert db.list_free_bets("money-a") == []


def test_legacy_invalid_row_is_diagnosed_not_rewritten(free_client):
    r = free_client.post("/profiles/money-a/free-bets", json=payload())
    assert r.status_code == 201
    ident = r.json()["free_bet_id"]
    with db.connect() as c:
        c.execute("UPDATE free_bets SET free_bet_value='NaN' WHERE free_bet_id=?", (ident,))
    r = free_client.get(f"/profiles/money-a/free-bets/{ident}")
    assert r.status_code == 200
    assert r.json()["free_bet_value"] == "NaN"
    assert r.json()["calculation_state"] == "review_required"
    assert r.json()["reporting_value"] is None
    assert free_client.get("/profiles/money-a/free-bets").status_code == 200
    assert free_client.get("/profiles/money-a/tracker-summary-sources").status_code == 200
    assert db.get_free_bet("money-a", ident).free_bet_value == "NaN"
    assert free_client.get("/profiles/money-a/exports/portable-profile.xlsx").status_code == 409


def test_finite_historical_precision_is_readable_without_rewrite(free_client):
    made = free_client.post(
        "/profiles/money-a/free-bets", json=payload(status="Settled", result="Back Won")
    ).json()
    ident = made["free_bet_id"]
    with db.connect() as c:
        c.execute("UPDATE free_bets SET free_bet_value='10.000' WHERE free_bet_id=?", (ident,))
    response = free_client.get(f"/profiles/money-a/free-bets/{ident}")
    assert response.status_code == 200
    assert response.json()["final_net_pnl"] == "10.60"
    assert response.json()["free_bet_value"] == "10.000"
    assert db.get_free_bet("money-a", ident).free_bet_value == "10.000"
    assert (
        free_client.post(
            "/profiles/money-a/free-bets", json=payload(free_bet_value="10.000")
        ).status_code
        == 422
    )


@pytest.mark.parametrize(
    "field",
    [
        "free_bet_value",
        "lay_actual",
        "lay_matched_stake_1",
        "manual_override_value",
        "source_award_expected_value",
        "back_odds",
        "lay_odds_1",
        "lay_commission_1",
    ],
)
@pytest.mark.parametrize("raw", ["NaN", "Infinity", "-Infinity", "not-money", None])
def test_all_supplied_numeric_fields_reject_before_business_writes(free_client, field, raw):
    data = payload(**{field: raw}, manual_override_reason="Synthetic reason")
    response = free_client.post("/profiles/money-a/free-bets", json=data)
    assert response.status_code == 422
    assert db.list_free_bets("money-a") == []
    with db.connect() as connection:
        assert connection.execute("SELECT COUNT(*) FROM free_bet_audit").fetchone()[0] == 0
        assert (
            connection.execute("SELECT COUNT(*) FROM calculator_conversion_targets").fetchone()[0]
            == 0
        )


def test_patch_effective_state_and_omission_blank_zero_policy(free_client):
    made = free_client.post("/profiles/money-a/free-bets", json=payload()).json()
    url = f"/profiles/money-a/free-bets/{made['free_bet_id']}"
    before = db.get_free_bet("money-a", made["free_bet_id"])
    assert free_client.patch(url, json={"user_notes": "Synthetic note"}).status_code == 200
    assert db.get_free_bet("money-a", made["free_bet_id"]).free_bet_value == before.free_bet_value
    for change in [
        {"free_bet_value": ""},
        {"free_bet_value": None},
        {"lay_odds_1": ""},
        {"lay_actual": "1.001"},
        {"lay_actual": "-0.01"},
    ]:
        original = db.get_free_bet("money-a", made["free_bet_id"])
        audits = db.count_free_bet_audit_rows("money-a", made["free_bet_id"])
        assert free_client.patch(url, json=change).status_code == 422
        assert db.get_free_bet("money-a", made["free_bet_id"]) == original
        assert db.count_free_bet_audit_rows("money-a", made["free_bet_id"]) == audits
    assert (
        free_client.patch(
            url,
            json={
                "lay_actual": "0",
                "lay_matched_stake_1": "",
                "lay_odds_1": "",
                "exchange_name": "",
            },
        ).status_code
        == 200
    )
    assert free_client.patch(url, json={"free_bet_value": ".50"}).json()["free_bet_value"] == "0.50"
    assert (
        free_client.put(
            url,
            json={
                "bookmaker": "Bookmaker A",
                "status": "Placed",
                "result": "Pending",
                "retention_mode": "SNR",
            },
        ).status_code
        == 200
    )
    draft = free_client.post(
        "/profiles/money-a/free-bets",
        json=payload(
            status="Prospecting",
            free_bet_value="",
            back_odds="",
            lay_actual="",
            lay_matched_stake_1="",
            lay_odds_1="",
            exchange_name="",
            event_name="",
            match_strategy="",
        ),
    )
    assert draft.status_code == 201
    assert draft.json()["free_bet_value"] == ""


@pytest.mark.parametrize("boundary", ["calculation", "response_json"])
@pytest.mark.parametrize("operation", ["create", "update"])
def test_unexpected_failure_rolls_back_row_and_business_audit(
    free_client, monkeypatch, boundary, operation
):
    from openforge_api import free_bets

    existing = free_client.post("/profiles/money-a/free-bets", json=payload()).json()
    ident = existing["free_bet_id"]
    before = db.get_free_bet("money-a", ident)
    audit_count = db.count_free_bet_audit_rows("money-a", ident)

    def broken(*args, **kwargs):
        raise RuntimeError("Synthetic preparation fault")

    if boundary == "calculation":
        monkeypatch.setattr(free_bets, "calculate_free_bet_current_value", broken)
    else:
        monkeypatch.setattr(free_bets.FreeBetResponse, "model_dump_json", broken)
    if operation == "create":
        response = free_client.post("/profiles/money-a/free-bets", json=payload())
    else:
        response = free_client.patch(
            f"/profiles/money-a/free-bets/{ident}", json={"free_bet_value": "12.00"}
        )
    assert response.status_code == 500
    assert db.list_free_bets("money-a") == [before]
    assert db.count_free_bet_audit_rows("money-a", ident) == audit_count
    with db.connect() as c:
        assert c.execute("SELECT COUNT(*) FROM free_bet_audit").fetchone()[0] == audit_count


@pytest.mark.parametrize(
    "retention,expected_reference,expected_final",
    [("SNR", "7.72", "10.60"), ("SR", "9.65", "20.60")],
)
def test_independent_native_save_reopen_partial_placement_settlement(
    free_client, retention, expected_reference, expected_final
):
    made = free_client.post(
        "/profiles/money-a/free-bets",
        json=payload(
            retention_mode=retention, status="Available", lay_actual="", lay_matched_stake_1=""
        ),
    )
    assert made.status_code == 201, made.text
    assert made.json()["base_reference_lay_stake"] == expected_reference
    ident = made.json()["free_bet_id"]
    url = f"/profiles/money-a/free-bets/{ident}"
    placed = free_client.patch(
        url, json={"status": "Placed", "lay_actual": "7.00", "lay_matched_stake_1": "7.00"}
    )
    assert placed.status_code == 200
    assert placed.json()["lay_actual"] == "7.00"
    settled = free_client.patch(url, json={"status": "Settled", "result": "Back Won"})
    assert settled.status_code == 200
    assert settled.json()["final_net_pnl"] == expected_final
    assert free_client.get(url).json()["final_net_pnl"] == expected_final
    source = free_client.get("/profiles/money-a/tracker-summary-sources")
    assert source.status_code == 200


def test_profile_account_source_denial_is_controlled_zero_write(free_client):
    for changes in [
        {"bookmaker": "Foreign Bookmaker"},
        {"exchange_name": "Foreign Exchange"},
        {"origin_qual_bet_id": "foreign-source"},
    ]:
        assert (
            free_client.post("/profiles/money-a/free-bets", json=payload(**changes)).status_code
            == 422
        )
        assert db.list_free_bets("money-a") == []
    with db.connect() as c:
        c.execute("UPDATE accounts SET lifecycle_status='Archived' WHERE account='Bookmaker A'")
    assert free_client.post("/profiles/money-a/free-bets", json=payload()).status_code == 409
    with db.connect() as c:
        c.execute("UPDATE profiles SET status='Archived' WHERE profile_id='money-a'")
    assert free_client.post("/profiles/money-a/free-bets", json=payload()).status_code in {403, 409}
    assert db.list_free_bets("money-a") == []


@pytest.mark.parametrize("retention,expected", [("SNR", "7.40"), ("SR", "17.40")])
def test_converted_free_bet_preserves_source_and_actual_settlement(
    free_client, retention, expected
):
    from test_calculator_conversions import standard_payload

    data = standard_payload(["money-a"])
    data["calculator"].update(bet_type="free_bet", free_bet_mode=retention)
    data["source"].update(calculator_mode="free_bet")
    data["source"]["canonical_inputs"]["exchange"] = "Exchange A"
    data["targets"][0]["bookmaker"] = "Bookmaker A"
    response = free_client.post("/fund-manager/calculator-conversions/standard", json=data)
    assert response.status_code == 200, response.text
    result = response.json()["results"][0]
    assert result["state"] == "succeeded", result
    ident = result["record_id"]
    url = f"/profiles/money-a/free-bets/{ident}"
    assert free_client.get(url).json()["status"] == "Prospecting"
    settled = free_client.patch(
        url,
        json={
            "status": "Settled",
            "result": "Back Won",
            "lay_actual": "6.00",
            "lay_matched_stake_1": "6.00",
            "date_settled": "2026-09-12",
        },
    )
    assert settled.status_code == 200, settled.text
    assert settled.json()["final_net_pnl"] == expected
    retried = free_client.post("/fund-manager/calculator-conversions/standard", json=data)
    assert retried.json()["results"][0]["state"] == "already_succeeded"
    assert retried.json()["results"][0]["record_id"] == ident
    assert len(db.list_free_bets("money-a")) == 1
    assert "Calculator source:" in db.get_free_bet("money-a", ident).user_notes


@pytest.mark.parametrize("failure", ["invalid", "response"])
def test_staged_import_alternate_writer_rolls_back_all_rows_and_children(
    free_client, monkeypatch, failure
):
    from openforge_api import free_bets
    from openforge_api.free_bets import FreeBetFields

    rows = []
    for index in range(2):
        mapped = FreeBetFields.model_validate(payload()).model_dump()
        if failure == "invalid" and index == 1:
            mapped["free_bet_value"] = "NaN"
        rows.append(
            {
                "source_sheet": "Free Bets",
                "source_record_id": f"synthetic-{index}",
                "source_row": index + 1,
                "source_hash": f"synthetic-hash-{index}",
                "staged_action": "insert",
                "errors_json": "[]",
                "warnings_json": "[]",
                "payload_json": json.dumps(mapped),
                "mapped_payload_json": json.dumps(mapped),
            }
        )
    batch = db.create_import_batch(
        "money-a",
        {
            "source_filename": "synthetic.csv",
            "source_type": "csv",
            "mapping_version": "free-bets-v1",
            "status": "dry_run_ready",
            "row_count": 2,
            "error_count": 0,
            "warning_count": 0,
            "summary_json": "{}",
        },
        rows,
    )
    with db.connect() as c:
        selected = {r[0] for r in c.execute("SELECT import_staged_row_id FROM import_staged_rows")}
    if failure == "response":

        def broken(*args, **kwargs):
            raise RuntimeError("Synthetic imported response failure")

        monkeypatch.setattr(free_bets.FreeBetResponse, "model_dump_json", broken)
    with pytest.raises((ValueError, RuntimeError)):
        db.confirm_free_bet_import_batch(
            profile_id="money-a",
            import_batch_id=batch.import_batch_id,
            backup_snapshot_id="synthetic-backup",
            selected_staged_row_ids=selected,
        )
    assert db.list_free_bets("money-a") == []
    with db.connect() as c:
        assert c.execute("SELECT COUNT(*) FROM free_bet_audit").fetchone()[0] == 0
        assert c.execute("SELECT COUNT(*) FROM import_source_records").fetchone()[0] == 0
        assert c.execute("SELECT status FROM import_batches").fetchone()[0] == "dry_run_ready"
        assert {r[0] for r in c.execute("SELECT staged_action FROM import_staged_rows")} == {
            "insert"
        }


def test_legacy_invalid_settled_row_blocks_fee_total_and_correction_restores_it(free_client):
    from datetime import date
    from decimal import Decimal

    from openforge_api.fee_base_reporting import build_monthly_settled_fee_base

    ids = []
    for retention in ("SNR", "SR"):
        response = free_client.post(
            "/profiles/money-a/free-bets",
            json=payload(retention_mode=retention, status="Settled", result="Back Won"),
        )
        assert response.status_code == 201
        ids.append(response.json()["free_bet_id"])
    kwargs = dict(profile_id="money-a", period_start=date(2026, 9, 1), period_end=date(2026, 9, 30))
    assert build_monthly_settled_fee_base(**kwargs).eligible_period_profit == Decimal("31.20")
    with db.connect() as c:
        c.execute("UPDATE free_bets SET free_bet_value='not-money' WHERE free_bet_id=?", (ids[0],))
    report = build_monthly_settled_fee_base(**kwargs)
    assert report.calculation_state == "blocked"
    assert report.eligible_period_profit is None
    assert report.blockers[0].record_id == ids[0]
    assert free_client.get("/profiles/money-a/free-bets").status_code == 200
    assert db.get_free_bet("money-a", ids[0]).free_bet_value == "not-money"
    assert (
        free_client.patch(
            f"/profiles/money-a/free-bets/{ids[0]}", json={"free_bet_value": "10.00"}
        ).status_code
        == 200
    )
    assert build_monthly_settled_fee_base(**kwargs).eligible_period_profit == Decimal("31.20")


def test_conversion_preparation_failure_has_no_free_bet_or_success_notification(
    free_client, monkeypatch
):
    from test_calculator_conversions import standard_payload

    from openforge_api import free_bets

    data = standard_payload(["money-a"])
    data["calculator"].update(bet_type="free_bet")
    data["source"].update(calculator_mode="free_bet")
    data["source"]["canonical_inputs"]["exchange"] = "Exchange A"
    data["targets"][0]["bookmaker"] = "Bookmaker A"

    def broken(*args, **kwargs):
        raise RuntimeError("Synthetic conversion response preparation")

    monkeypatch.setattr(free_bets.FreeBetResponse, "model_dump_json", broken)
    response = free_client.post("/fund-manager/calculator-conversions/standard", json=data)
    assert response.status_code == 200
    assert response.json()["results"][0]["state"] == "failed"
    assert db.list_free_bets("money-a") == []
    with db.connect() as c:
        assert c.execute("SELECT COUNT(*) FROM free_bet_audit").fetchone()[0] == 0
        target = dict(c.execute("SELECT * FROM calculator_conversion_targets").fetchone())
        assert target["state"] == "Failed"
        assert not target["destination_record_id"]
        assert not target["notification_title"]
        assert not target["notification_link"]
