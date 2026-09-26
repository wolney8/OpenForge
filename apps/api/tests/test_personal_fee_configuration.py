"""Personal zero-fee configuration, independent of lifecycle/access/commission."""

from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from test_fund_manager_fee_period_workflow import (
    configure_temp_database,
    fee_period_payload,
    settled_sportsbook_payload,
)

from apps.api.tests.synthetic_setup import seed_synthetic_account
from openforge_api.db import connect
from openforge_api.main import app


@pytest.mark.parametrize("personal_result", ["100.00", "-20.00", "0.00"])
def test_personal_and_managed_fees_keep_scope_and_historical_rates(tmp_path, personal_result):
    configure_temp_database(tmp_path)
    # The managed 40/0 arrangement is the existing synthetic FEE fixture, not an
    # assumed subscriber rate. Personal configuration is the owner's requested 0/0.
    with connect() as connection:
        connection.execute(
            "UPDATE profiles SET profile_relationship='Personal', management_fee_percent='0.00', investment_fee_percent='0.00' WHERE profile_id='profile-demo-001'"
        )
        connection.execute(
            "UPDATE profiles SET profile_relationship='Managed subscriber', management_fee_percent='40.00', investment_fee_percent='0.00' WHERE profile_id='profile-demo-002'"
        )
    seed_synthetic_account(profile_id="profile-demo-002", name="Bookmaker A", account_type="Bookie")
    client = TestClient(app)
    periods = []
    for profile_id, result, fee in [
        ("profile-demo-001", personal_result, "0.00"),
        ("profile-demo-002", "200.00", "80.00"),
    ]:
        row = client.post(
            f"/profiles/{profile_id}/sportsbook-bets",
            json=settled_sportsbook_payload(final_value=result, record_id=f"{profile_id}-settled"),
        )
        assert row.status_code == 201
        assert row.json()["final_net_pnl"] == result
        period_id = f"{profile_id}-personal-readiness"
        created = client.post(
            f"/profiles/{profile_id}/fee-periods", json=fee_period_payload(period_id=period_id)
        )
        assert created.status_code == 201
        confirmed = client.post(
            f"/profiles/{profile_id}/fee-periods/{period_id}/crystallise",
            json={"actor_id": "fund-manager-local", "confirmation": True},
        )
        assert confirmed.status_code == 200
        period = confirmed.json()
        assert period["current_revision"]["total_fee_due"] == fee
        assert period["fee_outstanding_amount"] == fee
        assert period["fee_withdrawn_amount"] == "0.00"
        periods.append(period)
    assert sum(Decimal(p["current_revision"]["total_fee_due"]) for p in periods) == Decimal("80.00")
    assert (
        client.get(
            "/profiles/profile-demo-001/fee-periods/profile-demo-002-personal-readiness"
        ).status_code
        == 404
    )
    # A later arrangement cannot silently rewrite a crystallised historical revision.
    with connect() as connection:
        connection.execute(
            "UPDATE profiles SET management_fee_percent='25.00' WHERE profile_id='profile-demo-001'"
        )
    reopened = client.get(
        "/profiles/profile-demo-001/fee-periods/profile-demo-001-personal-readiness"
    ).json()
    assert reopened["current_revision"] == periods[0]["current_revision"]
