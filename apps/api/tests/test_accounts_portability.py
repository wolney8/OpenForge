"""CP055 Accounts-only meaning, authority and retry acceptance."""

import base64
import hashlib
from pathlib import Path

from fastapi.testclient import TestClient
from test_xlsx_import import configure_temp_database

from openforge_api.config import settings
from openforge_api.imports import resolve_account_catalogue_record
from openforge_api.main import app
from openforge_api.xlsx_export import build_account_export
from openforge_api.xlsx_import import parse_account_xlsx


def dry(client, profile, content):
    response = client.post(
        f"/profiles/{profile}/imports/xlsx/dry-run",
        json={
            "source_filename": "synthetic-accounts.xlsx",
            "ledger": "accounts",
            "content_base64": base64.b64encode(content).decode(),
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def confirm(client, profile, batch):
    return client.post(
        f"/profiles/{profile}/imports/{batch['import_batch_id']}/confirm-accounts",
        json={
            "confirmed": True,
            "selected_staged_row_ids": [
                r["import_staged_row_id"] for r in batch["rows"] if r["staged_action"] == "insert"
            ],
        },
    )


def test_account_export_retains_access_provider_commission_and_fresh_profile_identity(
    tmp_path: Path,
):
    configure_temp_database(tmp_path)
    client = TestClient(app)
    catalogue_before = hashlib.sha256(
        settings.account_catalogue_source_path.read_bytes()
    ).hexdigest()
    added = client.post(
        "/profiles/profile-demo-001/accounts",
        json={
            "account": "Bet365",
            "type": "Bookie",
            "status": "Active",
            "lifecycle_status": "Active",
            "signup_offer_status": "Yes",
            "channel": "Online",
            "current_balance": "",
            "pending_withdrawal_amount": "0",
            "stake_access": "Limited",
            "promo_access": "Restricted",
            "restrictions": ["Withdrawal Restricted"],
            "restriction_details": {
                "fixed_maximum_stake": "2.50",
                "stake_restriction_type": "fixed_maximum",
                "available_promotion_types": ["Boosts"],
            },
            "access_evidence_note": "Synthetic exact evidence",
            "access_source": "owner_review",
            "access_observed_at": "2026-09-26T10:00:00Z",
            "notes": "Synthetic private Account note",
        },
    )
    assert added.status_code == 201, added.text
    original = added.json()
    from openforge_api.db import get_profile_exchange_commission, upsert_profile_exchange_commission

    upsert_profile_exchange_commission("profile-demo-001", "Smarkets", "0.02")
    exported = client.get("/profiles/profile-demo-001/imports/accounts/export.xlsx")
    assert exported.status_code == 200
    source = next(
        r for r in parse_account_xlsx(exported.content).rows if r.fields["Account"] == "Bet365"
    )
    assert source.fields["Stake Access"] == "Limited"
    assert source.fields["CatalogueID"] == original["catalogue_id"]
    assert source.fields["Restrictions"] == "Withdrawal Restricted"
    # Selected Profile export becomes an isolated new Profile's source, never its native ID.
    response = client.post(
        "/profiles/onboarding",
        json={
            "setup_path": "import",
            "display_name": "Synthetic Accounts target",
            "profile_code": "ACCOUNTS-TARGET",
            "profile_relationship": "Personal",
            "management_fee_percent": "0",
            "investment_fee_percent": "0",
            "accounts": [],
            "quick_actions": [],
            "tracking_start_date": "2026-09-01",
            "enabled_modules": ["sportsbook-bets", "free-bets", "cash-adjustments"],
        },
    )
    assert response.status_code == 201, response.text
    target = response.json()["profile"]["profile_id"]
    batch = dry(client, target, exported.content)
    assert batch["error_count"] == 0, batch
    result = confirm(client, target, batch)
    assert result.status_code == 200, result.text
    records = client.get(f"/profiles/{target}/accounts").json()
    copied = next(r for r in records if r["account"] == "Bet365")
    assert copied["account_id"] != original["account_id"]
    for key in [
        "catalogue_id",
        "stake_access",
        "promo_access",
        "restrictions",
        "restriction_details",
        "access_evidence_note",
        "access_source",
        "access_observed_at",
        "current_balance",
        "pending_withdrawal_amount",
        "notes",
        "signup_offer_status",
    ]:
        assert copied[key] == original[key], key
    assert get_profile_exchange_commission(target, "Smarkets") == "0.02"
    retry = dry(client, target, exported.content)
    assert retry["summary"].get("insert", 0) == 0
    assert retry["summary"]["no_op"] == len(records)
    assert (
        client.get("/profiles/profile-demo-001/accounts/" + original["account_id"]).json()
        == original
    )
    assert (
        hashlib.sha256(settings.account_catalogue_source_path.read_bytes()).hexdigest()
        == catalogue_before
    )


def test_provider_matching_requires_exact_name_or_approved_alias(tmp_path):
    configure_temp_database(tmp_path)
    assert resolve_account_catalogue_record("Bet365", "Bookie") is not None
    assert resolve_account_catalogue_record("Bet-3 65", "Bookie") is None


def test_all_duplicate_provider_destinations_block_before_writes(tmp_path):
    configure_temp_database(tmp_path)
    client = TestClient(app)
    fields = {
        "Account": "Bet365",
        "Type": "Bookie",
        "Status": "Active",
        "Channel": "Online",
        "CurrentBalance": "",
    }
    batch = dry(
        client,
        "profile-demo-001",
        build_account_export([{"AccountID": id, **fields} for id in ["SYN-A", "SYN-B"]]),
    )
    assert len(batch["rows"]) == 2
    assert all(r["staged_action"] == "blocked" for r in batch["rows"])
    assert all(
        any(e["code"] == "account_destination_conflict" for e in r["errors"]) for r in batch["rows"]
    )
    assert (
        client.post(
            f"/profiles/profile-demo-001/imports/{batch['import_batch_id']}/confirm-accounts",
            json={
                "confirmed": True,
                "selected_staged_row_ids": [r["import_staged_row_id"] for r in batch["rows"]],
            },
        ).status_code
        == 409
    )


def test_changed_account_after_review_rejects_stale_update(tmp_path):
    from test_xlsx_import import synthetic_account_export

    from openforge_api.db import get_account, update_account

    configure_temp_database(tmp_path)
    client = TestClient(app)
    first = dry(client, "profile-demo-001", synthetic_account_export())
    saved = confirm(client, "profile-demo-001", first)
    assert saved.status_code == 200
    account_id = saved.json()["imported_account_ids"][0]
    review = dry(client, "profile-demo-001", synthetic_account_export(current_balance="130.55"))
    current = get_account("profile-demo-001", account_id)
    update_account(
        "profile-demo-001",
        account_id,
        {**current.__dict__, "notes": "Synthetic concurrent owner change"},
    )
    result = client.post(
        f"/profiles/profile-demo-001/imports/{review['import_batch_id']}/confirm-accounts",
        json={
            "confirmed": True,
            "selected_staged_row_ids": [review["rows"][0]["import_staged_row_id"]],
        },
    )
    assert result.status_code == 409 and "changed after review" in result.text
    assert get_account("profile-demo-001", account_id).current_balance == "125.40"
    assert get_account("profile-demo-001", account_id).notes == "Synthetic concurrent owner change"


def test_new_export_refuses_wrong_provider_identity_and_preserves_missing_commission(tmp_path):
    from openforge_api.imports import map_account_import_fields

    configure_temp_database(tmp_path)
    fields = {
        "Account": "Bet365",
        "Type": "Bookie",
        "Counts In Cash Total": True,
        "Status": "Active",
        "CurrentBalance": "",
        "CatalogueID": "EXCHANGE-DEMO-001",
    }
    _, errors, _ = map_account_import_fields(fields)
    assert any(e["code"] == "account_catalogue_match_required" for e in errors)
    fields.update(Account="Smarkets", Type="Exchange", CatalogueID="", CommissionRate="")
    mapped, errors, _ = map_account_import_fields(fields)
    assert not errors
    assert mapped["commission_rate"] is None and mapped["current_balance"] == ""
    fields["CommissionRate"] = "NaN"
    _, errors, _ = map_account_import_fields(fields)
    assert any(e["code"] == "invalid_account_commission" for e in errors)


def test_missing_source_commission_does_not_silently_replace_configured_rate(tmp_path):
    from openforge_api.db import get_profile_exchange_commission

    configure_temp_database(tmp_path)
    client = TestClient(app)
    # A fresh Profile prevents a seeded provider relationship from deciding the test.
    payload = {
        "setup_path": "import",
        "display_name": "Synthetic rate review",
        "profile_code": "RATE-REVIEW",
        "profile_relationship": "Personal",
        "management_fee_percent": "0",
        "investment_fee_percent": "0",
        "tracking_start_date": "2026-09-01",
        "enabled_modules": ["sportsbook-bets", "free-bets", "cash-adjustments"],
        "accounts": [],
        "quick_actions": [],
    }
    response = client.post("/profiles/onboarding", json=payload)
    assert response.status_code == 201, response.text
    target = response.json()["profile"]["profile_id"]
    fields = {
        "AccountID": "SYN-RATE",
        "Channel": "Online",
        "Counts In Cash Total": True,
        "Account": "Smarkets",
        "Type": "Exchange",
        "Status": "Active",
        "CommissionRate": "0.02",
        "CurrentBalance": "",
    }
    assert (
        confirm(client, target, dry(client, target, build_account_export([fields]))).status_code
        == 200
    )
    review = dry(client, target, build_account_export([{**fields, "CommissionRate": ""}]))
    assert review["rows"][0]["staged_action"] == "blocked"
    assert any(
        e["code"] == "account_commission_review_required" for e in review["rows"][0]["errors"]
    )
    assert get_profile_exchange_commission(target, "Smarkets") == "0.02"
