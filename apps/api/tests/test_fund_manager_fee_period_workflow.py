from __future__ import annotations

import json
import sqlite3
from calendar import monthrange
from datetime import date
from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.main import app


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'openforge-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")


def settled_sportsbook_payload(
    *,
    final_value: str = "100.00",
    record_id: str = "FEE-SB-001",
    settled_on: str = "2025-01-15",
) -> dict[str, object]:
    return {
        "sportsbook_bet_id": record_id,
        "event_name": "Synthetic settled fee-base row",
        "bookmaker": "Bookmaker A",
        "status": "Settled",
        "result": "Back Won",
        "back_stake": "10.00",
        "back_odds": "2.00",
        "match_strategy": "No Lay",
        "date_settled": settled_on,
        "manual_override_value": final_value,
        "manual_override_reason": "Deterministic fee-period workflow fixture",
    }


def seed_settled_fee_profit(
    client: TestClient,
    *,
    final_value: str = "100.00",
    record_id: str = "FEE-SB-001",
    settled_on: str = "2025-01-15",
) -> None:
    response = client.post(
        "/profiles/profile-demo-001/sportsbook-bets",
        json=settled_sportsbook_payload(
            final_value=final_value,
            record_id=record_id,
            settled_on=settled_on,
        ),
    )
    assert response.status_code == 201


def update_settled_fee_profit(client: TestClient, *, final_value: str) -> None:
    response = client.put(
        "/profiles/profile-demo-001/sportsbook-bets/FEE-SB-001",
        json=settled_sportsbook_payload(final_value=final_value),
    )
    assert response.status_code == 200


def fee_period_payload(*, period_id: str = "fee-period-demo-2025-01") -> dict[str, object]:
    return {
        "fee_period_id": period_id,
        "period_start": "2025-01-01",
        "period_end": "2025-01-31",
        "reporting_basis": "settled_final",
        "fee_package_id": "DEMO-PACKAGE-001",
        "fee_package_version": 1,
        "actor_id": "fund-manager-local",
    }


def create_and_crystallise(client: TestClient) -> dict[str, object]:
    seed_settled_fee_profit(client)
    created = client.post(
        "/profiles/profile-demo-001/fee-periods",
        json=fee_period_payload(),
    )
    assert created.status_code == 201
    confirmed = client.post(
        "/profiles/profile-demo-001/fee-periods/fee-period-demo-2025-01/crystallise",
        json={"actor_id": "fund-manager-local", "confirmation": True},
    )
    assert confirmed.status_code == 200
    return confirmed.json()


def test_fee_period_create_confirm_and_profile_isolation(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    seed_settled_fee_profit(client)

    response = client.post(
        "/profiles/profile-demo-001/fee-periods",
        json=fee_period_payload(),
    )
    assert response.status_code == 201
    period = response.json()
    assert period["state"] == "ready_to_crystallise"
    assert period["current_revision"]["management_fee_amount"] == "40.00"
    assert period["current_revision"]["investment_fee_amount"] == "0.00"
    assert period["current_revision"]["total_fee_due"] == "40.00"
    assert period["current_revision"]["fee_base_source_version"] == (
        "monthly-settled-final-v1"
    )
    fee_base_audit = json.loads(period["current_revision"]["fee_base_breakdown_json"])
    assert fee_base_audit["included_rows"][0]["record_id"] == "FEE-SB-001"
    assert fee_base_audit["module_totals"]["sportsbook"] == "100.00"
    assert period["fee_outstanding_amount"] == "40.00"

    other_profile = client.get(
        "/profiles/profile-demo-002/fee-periods/fee-period-demo-2025-01"
    )
    assert other_profile.status_code == 404
    assert client.get("/profiles/profile-demo-002/fee-periods").json() == []

    confirmed = client.post(
        "/profiles/profile-demo-001/fee-periods/fee-period-demo-2025-01/crystallise",
        json={"actor_id": "fund-manager-local", "confirmation": True},
    )
    assert confirmed.status_code == 200
    assert confirmed.json()["state"] == "crystallised"
    assert confirmed.json()["crystallised_by"] == "fund-manager-local"


def test_fee_period_preview_derives_profit_and_rejects_caller_money_inputs(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    seed_settled_fee_profit(client)

    preview = client.post(
        "/profiles/profile-demo-001/fee-periods/preview",
        json=fee_period_payload(period_id="preview-only"),
    )
    assert preview.status_code == 200
    assert preview.json()["calculation_state"] == "resolved"
    assert preview.json()["sportsbook_total"] == "100.00"
    assert preview.json()["eligible_period_profit"] == "100.00"
    assert preview.json()["total_fee_due"] == "40.00"
    assert preview.json()["included_record_ids"] == ["FEE-SB-001"]

    unsafe = fee_period_payload(period_id="caller-money-override")
    unsafe["eligible_period_profit"] = "9999.00"
    unsafe["opening_loss_carryforward"] = "0.00"
    rejected = client.post("/profiles/profile-demo-001/fee-periods", json=unsafe)
    assert rejected.status_code == 422
    assert {row["loc"][-1] for row in rejected.json()["detail"]} == {
        "eligible_period_profit",
        "opening_loss_carryforward",
    }


def test_fee_period_carries_prior_crystallised_monthly_loss(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    seed_settled_fee_profit(client, final_value="-50.00")

    january = client.post(
        "/profiles/profile-demo-001/fee-periods",
        json=fee_period_payload(period_id="fee-period-2025-01-loss"),
    )
    assert january.status_code == 201
    assert january.json()["current_revision"]["closing_loss_carryforward"] == "50.00"
    confirmed = client.post(
        "/profiles/profile-demo-001/fee-periods/fee-period-2025-01-loss/crystallise",
        json={"actor_id": "fund-manager-local", "confirmation": True},
    )
    assert confirmed.status_code == 200

    seed_settled_fee_profit(
        client,
        final_value="80.00",
        record_id="FEE-SB-002",
        settled_on="2025-02-15",
    )
    february_payload = fee_period_payload(period_id="fee-period-2025-02")
    february_payload["period_start"] = "2025-02-01"
    february_payload["period_end"] = "2025-02-28"
    february = client.post(
        "/profiles/profile-demo-001/fee-periods",
        json=february_payload,
    )
    assert february.status_code == 201
    revision = february.json()["current_revision"]
    assert revision["eligible_period_profit"] == "80.00"
    assert revision["opening_loss_carryforward"] == "50.00"
    assert revision["fee_base"] == "30.00"
    assert revision["total_fee_due"] == "12.00"


def test_fee_period_requires_complete_month_and_unique_profile_period(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    seed_settled_fee_profit(client)

    partial_month = fee_period_payload()
    partial_month["period_end"] = "2026-06-29"
    invalid = client.post(
        "/profiles/profile-demo-001/fee-periods",
        json=partial_month,
    )
    assert invalid.status_code == 422
    assert "complete calendar month" in str(invalid.json())

    open_month = fee_period_payload(period_id="open-month")
    today = date.today()
    open_month["period_start"] = today.replace(day=1).isoformat()
    open_month["period_end"] = today.replace(
        day=monthrange(today.year, today.month)[1]
    ).isoformat()
    rejected_open_month = client.post(
        "/profiles/profile-demo-001/fee-periods",
        json=open_month,
    )
    assert rejected_open_month.status_code == 422
    assert "completed calendar month" in str(rejected_open_month.json())

    unsafe_override = fee_period_payload(period_id="unsafe-percentage-override")
    unsafe_override["management_fee_percent"] = "1.00"
    rejected_override = client.post(
        "/profiles/profile-demo-001/fee-periods",
        json=unsafe_override,
    )
    assert rejected_override.status_code == 422
    assert rejected_override.json()["detail"][0]["type"] == "extra_forbidden"

    assert client.post(
        "/profiles/profile-demo-001/fee-periods", json=fee_period_payload()
    ).status_code == 201
    duplicate_payload = fee_period_payload(period_id="different-id-same-month")
    duplicate = client.post(
        "/profiles/profile-demo-001/fee-periods", json=duplicate_payload
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "fee_period_already_exists"


def test_pre_withdrawal_reopen_retains_original_revision(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    create_and_crystallise(client)
    update_settled_fee_profit(client, final_value="80.00")

    reopened = client.post(
        "/profiles/profile-demo-001/fee-periods/fee-period-demo-2025-01/reopen",
        json={
            "actor_id": "fund-manager-local",
            "reason": "Synthetic late settlement correction",
        },
    )
    assert reopened.status_code == 200
    period = reopened.json()
    assert period["state"] == "ready_to_crystallise"
    assert period["current_revision_number"] == 2
    assert period["current_revision"]["total_fee_due"] == "32.00"
    assert period["current_revision"]["management_fee_percent"] == "40.00"
    assert period["current_revision"]["investment_fee_percent"] == "0.00"

    connection = sqlite3.connect(settings.database_path)
    revisions = connection.execute(
        """
        SELECT revision_number, total_fee_due
        FROM fee_period_revisions
        WHERE fee_period_id = ?
        ORDER BY revision_number
        """,
        ("fee-period-demo-2025-01",),
    ).fetchall()
    connection.close()
    assert revisions == [(1, "40.00"), (2, "32.00")]

    revision_response = client.get(
        "/profiles/profile-demo-001/fee-periods/fee-period-demo-2025-01/revisions"
    )
    assert revision_response.status_code == 200
    assert [row["revision_number"] for row in revision_response.json()] == [1, 2]
    assert revision_response.json()[1]["change_reason"] == (
        "Synthetic late settlement correction"
    )


def test_crystallise_blocks_a_stale_ready_review(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    seed_settled_fee_profit(client)
    created = client.post(
        "/profiles/profile-demo-001/fee-periods",
        json=fee_period_payload(),
    )
    assert created.status_code == 201

    update_settled_fee_profit(client, final_value="80.00")
    stale = client.post(
        "/profiles/profile-demo-001/fee-periods/fee-period-demo-2025-01/crystallise",
        json={"actor_id": "fund-manager-local", "confirmation": True},
    )
    assert stale.status_code == 409
    assert stale.json()["detail"]["code"] == "fee_period_review_stale"


def test_fee_withdrawal_link_blocks_reopen_and_creates_future_correction(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    create_and_crystallise(client)

    adjustment = client.post(
        "/profiles/profile-demo-001/cash-adjustments",
        json={
            "cash_adjustment_id": "DEMO-FEE-WITHDRAWAL-001",
            "adjustment_date": "2026-07-02 09:00:00",
            "direction": "Out",
            "amount": "10.00",
            "adjustment_type": "Management Fee Withdrawal",
            "affects_investment": True,
            "affects_cash_snapshot": True,
            "linked_account": "Demo Bank",
            "description": "Synthetic management fee withdrawal",
        },
    )
    assert adjustment.status_code == 201

    linked = client.post(
        "/profiles/profile-demo-001/fee-periods/fee-period-demo-2025-01/withdrawal-links",
        json={
            "actor_id": "fund-manager-local",
            "cash_adjustment_id": "DEMO-FEE-WITHDRAWAL-001",
            "component": "management",
        },
    )
    assert linked.status_code == 201
    assert linked.json()["amount"] == "10.00"

    period = client.get(
        "/profiles/profile-demo-001/fee-periods/fee-period-demo-2025-01"
    ).json()
    assert period["fee_withdrawn_amount"] == "10.00"
    assert period["fee_outstanding_amount"] == "30.00"

    reopened = client.post(
        "/profiles/profile-demo-001/fee-periods/fee-period-demo-2025-01/reopen",
        json={
            "actor_id": "fund-manager-local",
            "reason": "Must become a future correction",
        },
    )
    assert reopened.status_code == 422
    assert reopened.json()["detail"] == "withdrawn_period_is_immutable"

    correction = client.post(
        "/profiles/profile-demo-001/fee-periods/fee-period-demo-2025-01/corrections",
        json={
            "actor_id": "fund-manager-local",
            "reason": "Synthetic overcharge correction",
            "corrected_fee_due": "25.00",
            "profile_closing": False,
        },
    )
    assert correction.status_code == 201
    assert correction.json()["adjustment_type"] == "fee_credit"
    assert correction.json()["amount"] == "15.00"
    assert correction.json()["state"] == "pending"


def test_fee_withdrawal_requires_matching_profile_subtype_and_component(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    create_and_crystallise(client)

    wrong_adjustment = client.post(
        "/profiles/profile-demo-001/cash-adjustments",
        json={
            "cash_adjustment_id": "DEMO-WITHDRAWAL-WRONG-TYPE",
            "adjustment_date": "2026-07-02 09:00:00",
            "direction": "Out",
            "amount": "10.00",
            "adjustment_type": "Withdrawal",
            "affects_investment": True,
            "affects_cash_snapshot": True,
            "linked_account": "Demo Bank",
            "description": "Ordinary withdrawal",
        },
    )
    assert wrong_adjustment.status_code == 201
    rejected = client.post(
        "/profiles/profile-demo-001/fee-periods/fee-period-demo-2025-01/withdrawal-links",
        json={
            "actor_id": "fund-manager-local",
            "cash_adjustment_id": "DEMO-WITHDRAWAL-WRONG-TYPE",
            "component": "management",
        },
    )
    assert rejected.status_code == 422
    assert rejected.json()["detail"] == "matching_received_fee_withdrawal_required"

    cross_profile = client.post(
        "/profiles/profile-demo-002/fee-periods/fee-period-demo-2025-01/withdrawal-links",
        json={
            "actor_id": "fund-manager-local",
            "cash_adjustment_id": "DEMO-WITHDRAWAL-WRONG-TYPE",
            "component": "management",
        },
    )
    assert cross_profile.status_code == 422
    assert cross_profile.json()["detail"] == "cash_adjustment_not_found_for_profile"


def test_mark_as_withdrawn_atomically_creates_component_adjustments_and_links(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    profile = client.patch(
        "/profiles/profile-demo-001",
        json={
            "management_fee_percent": "35.00",
            "investment_fee_percent": "5.00",
        },
    )
    assert profile.status_code == 200
    create_and_crystallise(client)

    withdrawn = client.post(
        "/profiles/profile-demo-001/fee-periods/fee-period-demo-2025-01/mark-withdrawn",
        json={
            "actor_id": "fund-manager-local",
            "adjustment_date": "2026-07-18",
            "linked_account": "Demo Bank",
            "management_amount": "20.00",
            "investment_amount": "5.00",
        },
    )

    assert withdrawn.status_code == 200
    period = withdrawn.json()
    assert period["fee_withdrawn_amount"] == "25.00"
    assert period["fee_outstanding_amount"] == "15.00"
    assert {link["component"] for link in period["withdrawal_links"]} == {
        "management",
        "investment",
    }
    adjustments = client.get(
        "/profiles/profile-demo-001/cash-adjustments"
    ).json()
    fee_adjustments = [
        row for row in adjustments if row["cash_adjustment_id"] in {
            link["cash_adjustment_id"] for link in period["withdrawal_links"]
        }
    ]
    assert len(fee_adjustments) == 2
    assert all(row["direction"] == "Out" for row in fee_adjustments)
    assert all(row["affects_cash_snapshot"] is True for row in fee_adjustments)
    assert all(row["affects_investment"] is False for row in fee_adjustments)

    management_adjustment = next(
        row
        for row in fee_adjustments
        if row["adjustment_type"] == "Management Fee Withdrawal"
    )
    update_rejected = client.put(
        f"/profiles/profile-demo-001/cash-adjustments/{management_adjustment['cash_adjustment_id']}",
        json={
            "adjustment_date": management_adjustment["adjustment_date"],
            "direction": "Out",
            "amount": "19.00",
            "adjustment_type": "Management Fee Withdrawal",
            "affects_investment": False,
            "affects_cash_snapshot": True,
            "linked_account": "Demo Bank",
            "description": "Unsafe direct edit",
        },
    )
    assert update_rejected.status_code == 409
    assert update_rejected.json()["detail"] == "fee_withdrawal_adjustment_locked"

    delete_rejected = client.delete(
        f"/profiles/profile-demo-001/cash-adjustments/{management_adjustment['cash_adjustment_id']}"
    )
    assert delete_rejected.status_code == 409
    assert delete_rejected.json()["detail"] == "fee_withdrawal_adjustment_locked"


def test_mark_as_withdrawn_rejects_component_overdraw_without_partial_writes(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    create_and_crystallise(client)
    existing_adjustment_ids = {
        row["cash_adjustment_id"]
        for row in client.get("/profiles/profile-demo-001/cash-adjustments").json()
    }

    rejected = client.post(
        "/profiles/profile-demo-001/fee-periods/fee-period-demo-2025-01/mark-withdrawn",
        json={
            "actor_id": "fund-manager-local",
            "adjustment_date": "2026-07-18",
            "linked_account": "Demo Bank",
            "management_amount": "40.01",
            "investment_amount": "0.00",
        },
    )

    assert rejected.status_code == 422
    assert rejected.json()["detail"] == "fee_withdrawal_exceeds_component_outstanding"
    current_adjustment_ids = {
        row["cash_adjustment_id"]
        for row in client.get("/profiles/profile-demo-001/cash-adjustments").json()
    }
    assert current_adjustment_ids == existing_adjustment_ids
    period = client.get(
        "/profiles/profile-demo-001/fee-periods/fee-period-demo-2025-01"
    ).json()
    assert period["withdrawal_links"] == []
    assert period["fee_withdrawn_amount"] == "0.00"
