from __future__ import annotations

import asyncio
import json
import sqlite3
import time
from pathlib import Path

from fastapi.testclient import TestClient

from openforge_api import tracker_summary_sources
from openforge_api.config import settings
from openforge_api.db import (
    connect,
    count_profile_audit_rows,
    list_profile_quick_add_loadout_favourites,
)
from openforge_api.main import app


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'openforge-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")


def configure_profile_catalogue(tmp_path: Path) -> None:
    settings.account_catalogue_source = str(tmp_path / "profile-catalogue.json")
    records = []
    for catalogue_id, account_type, name in (
        ("BOOKMAKER-DEMO-001", "Bookmaker", "Bookmaker A"),
        ("EXCHANGE-DEMO-001", "Exchange", "Exchange A"),
        ("BANK-DEMO-001", "Bank", "Bank A"),
    ):
        records.append(
            {
                "catalogue_id": catalogue_id,
                "account_type": account_type,
                "operating_jurisdictions": ["GB"],
                "operating_subdivisions": [],
                "operating_channels": ["web", "mobile"],
                "brand_name": name,
                "short_display_name": name,
                "operator_group": "Synthetic Group",
                "platform": "Synthetic Platform",
                "foreground_colour": "#FFFFFF",
                "background_colour": "#455A64",
                "source": "Synthetic fixture",
            }
        )
    Path(settings.account_catalogue_source).write_text(
        json.dumps(
            {
                "schema_version": "1.0",
                "catalogue_name": "Synthetic Profile Catalogue",
                "updated_at": "2026-08-28",
                "default_operating_context": {
                    "jurisdiction": "GB",
                    "subdivision": "",
                    "channels": ["web", "mobile"],
                },
                "records": records,
            }
        ),
        encoding="utf-8",
    )


def test_tracker_summary_sources_reuse_signed_off_read_contracts(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    configure_profile_catalogue(tmp_path)
    settings.environment = "local"
    settings.auth_required = False
    client = TestClient(app)
    profile_id = "profile-demo-001"

    response = client.get(f"/profiles/{profile_id}/tracker-summary-sources")

    assert response.status_code == 200
    sources = response.json()
    endpoints = {
        "accounts": "accounts",
        "sportsbook_bets": "sportsbook-bets",
        "free_bets": "free-bets",
        "casino_offers": "casino-offers",
        "cash_adjustments": "cash-adjustments",
        "each_way_extra_places": "each-way-extra-places",
        "balance_snapshots": "balance-snapshots",
        "fee_periods": "fee-periods",
        "tracker_settings": "tracker-settings",
    }
    for key, endpoint in endpoints.items():
        individual = client.get(f"/profiles/{profile_id}/{endpoint}")
        assert individual.status_code == 200
        assert sources[key] == individual.json()


def test_tracker_summary_sources_reads_existing_contracts_concurrently(monkeypatch) -> None:
    reader_names = (
        "list_profile_accounts",
        "list_profile_sportsbook_bets",
        "list_profile_free_bets",
        "list_profile_casino_offers",
        "list_profile_cash_adjustments",
        "list_profile_each_way_extra_places",
        "list_profile_balance_snapshots",
        "list_profile_fee_periods",
        "get_tracker_settings",
    )

    def slow_reader(profile_id: str) -> list[str]:
        assert profile_id == "profile-demo-001"
        time.sleep(0.05)
        return [profile_id]

    for name in reader_names:
        monkeypatch.setattr(tracker_summary_sources, name, slow_reader)

    started = time.perf_counter()
    result = asyncio.run(
        tracker_summary_sources.get_profile_tracker_summary_sources("profile-demo-001")
    )
    elapsed = time.perf_counter() - started

    assert set(result) == {
        "accounts",
        "sportsbook_bets",
        "free_bets",
        "casino_offers",
        "cash_adjustments",
        "each_way_extra_places",
        "balance_snapshots",
        "fee_periods",
        "tracker_settings",
    }
    assert elapsed < 0.25


def profile_onboarding_payload() -> dict[str, object]:
    return {
        "display_name": "Synthetic Profile",
        "profile_code": "PROFILE-001",
        "tracking_start_date": "2026-08-01",
        "management_fee_percent": "0.00",
        "investment_fee_percent": "0.00",
        "active_date_preset": "This Month",
        "iteration_number": 1,
        "starting_bankroll": "100.00",
        "enabled_modules": [
            "sportsbook-bets",
            "free-bets",
            "cash-adjustments",
            "each-way-extra-places",
        ],
        "weekly_extra_place_loss_budget": "15.00",
        "main_bank_catalogue_id": "BANK-DEMO-001",
        "accounts": [
            {
                "catalogue_id": "BOOKMAKER-DEMO-001",
                "status": "Active",
                "opening_balance": "25.00",
                "counts_in_cash_total": True,
            },
            {
                "catalogue_id": "EXCHANGE-DEMO-001",
                "status": "Active",
                "opening_balance": "50.00",
                "counts_in_cash_total": True,
                "commission_rate": "0.02",
            },
            {
                "catalogue_id": "BANK-DEMO-001",
                "status": "Active",
                "opening_balance": "75.00",
                "counts_in_cash_total": True,
            },
        ],
        "preferences": {"reduced_motion": False},
    }


def create_synthetic_quick_action(client: TestClient) -> str:
    response = client.post(
        "/fund-manager/common-bet-combos",
        json={
            "preset_id": "COMBO-FOUNDER-DEMO-001",
            "name": "Synthetic Profile Sportsbook",
            "ledger_type": "Sportsbook",
            "offer_name": "Synthetic recurring offer",
            "quick_add": {
                "enabled": True,
                "display_label": "Synthetic Sportsbook Action",
                "supported_ledgers": ["Sportsbook"],
                "enabled_fields": ["offerName"],
                "defaults": {"offerName": "Synthetic recurring offer"},
            },
        },
    )
    assert response.status_code == 201
    return response.json()["preset_id"]


def test_profiles_routes_return_seeded_profiles(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    list_response = client.get("/profiles")
    assert list_response.status_code == 200
    profiles = list_response.json()
    assert any(profile["profile_id"] == "profile-demo-001" for profile in profiles)

    detail_response = client.get("/profiles/profile-demo-001")
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["display_name"] == "Subscriber Alpha"
    assert detail["profile_code"] == "ALPHA-001"


def test_profile_detail_returns_404_for_unknown_profile(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    response = client.get("/profiles/missing-profile")
    assert response.status_code == 404


def test_profile_metadata_can_be_updated_with_audit(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    response = client.patch(
        "/profiles/profile-demo-001",
        json={
            "display_name": "Synthetic Subscriber One",
            "profile_code": "SYNTH-001",
            "status": "Pending",
            "tracking_start_date": "2026-04-01",
            "management_fee_percent": "35.00",
            "investment_fee_percent": "10.00",
        },
    )

    assert response.status_code == 200
    profile = response.json()
    assert profile["display_name"] == "Synthetic Subscriber One"
    assert profile["profile_code"] == "SYNTH-001"
    assert profile["status"] == "Pending"
    assert profile["tracking_start_date"] == "2026-04-01"
    assert profile["management_fee_percent"] == "35.00"
    assert profile["investment_fee_percent"] == "10.00"
    assert count_profile_audit_rows("profile-demo-001") == 1


def test_archived_profile_remains_readable_but_rejects_operational_writes(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)
    before = client.get("/profiles/profile-demo-001/tracker-summary-sources")

    archived = client.patch(
        "/profiles/profile-demo-001", json={"status": "Archived"}
    )
    read_after_archive = client.get(
        "/profiles/profile-demo-001/tracker-summary-sources"
    )
    blocked_bet = client.post(
        "/profiles/profile-demo-001/sportsbook-bets", json={}
    )
    blocked_settings = client.patch(
        "/profiles/profile-demo-001", json={"display_name": "Should Not Change"}
    )
    restored = client.patch(
        "/profiles/profile-demo-001", json={"status": "Active"}
    )

    assert archived.status_code == 200
    assert read_after_archive.status_code == 200
    assert read_after_archive.json() == before.json()
    assert blocked_bet.status_code == 409
    assert blocked_bet.json()["detail"].startswith("Archived Profiles are read-only")
    assert blocked_settings.status_code == 409
    assert restored.status_code == 200
    assert restored.json()["status"] == "Active"


def test_profile_delete_requires_archive_and_exact_name_then_cascades(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    configure_profile_catalogue(tmp_path)
    client = TestClient(app)
    payload = profile_onboarding_payload()
    created = client.post("/profiles/onboarding", json=payload)
    assert created.status_code == 201
    profile_id = created.json()["profile"]["profile_id"]
    timestamp = "2026-09-02T12:00:00Z"
    import_run_id = "profile-import-synthetic-delete"
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO profile_import_runs (
              import_run_id, profile_id, owner_email, source_filename,
              workbook_checksum, workbook_size_bytes, effective_at,
              mapping_version, status, summary_json, reconciliation_json,
              raw_workbook_retained, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
            """,
            (
                import_run_id,
                profile_id,
                "synthetic@example.invalid",
                "synthetic.xlsx",
                "a" * 64,
                128,
                timestamp,
                "synthetic-v1",
                "REVIEW_REQUIRED",
                "{}",
                "{}",
                timestamp,
                timestamp,
            ),
        )
        connection.execute(
            """
            INSERT INTO profile_import_review_items (
              import_run_id, item_id, profile_id, import_id, source_fingerprint,
              source_sheet, source_row, source_record_id, category, item_json,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                import_run_id,
                "review-item-1",
                profile_id,
                "Synthetic:1",
                "fingerprint-1",
                "Synthetic",
                1,
                "SYN-1",
                "synthetic_review",
                "{}",
                timestamp,
                timestamp,
            ),
        )
        connection.execute(
            """
            INSERT INTO profile_import_review_decisions (
              import_run_id, item_id, profile_id, workbook_checksum,
              mapping_version, source_fingerprint, decision_json, actor_email,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                import_run_id,
                "review-item-1",
                profile_id,
                "a" * 64,
                "synthetic-v1",
                "fingerprint-1",
                "{}",
                "synthetic@example.invalid",
                timestamp,
                timestamp,
            ),
        )

    second_payload = profile_onboarding_payload()
    second_payload.update(
        display_name="Unaffected Profile", profile_code="PROFILE-002"
    )
    unaffected = client.post("/profiles/onboarding", json=second_payload)
    assert unaffected.status_code == 201
    unaffected_id = unaffected.json()["profile"]["profile_id"]

    active_delete = client.request(
        "DELETE",
        f"/profiles/{profile_id}",
        json={"confirmation_name": "Synthetic Profile"},
    )
    assert active_delete.status_code == 409

    assert client.patch(
        f"/profiles/{profile_id}", json={"status": "Archived"}
    ).status_code == 200
    wrong_name = client.request(
        "DELETE",
        f"/profiles/{profile_id}",
        json={"confirmation_name": "Wrong Profile"},
    )
    assert wrong_name.status_code == 422

    deleted = client.request(
        "DELETE",
        f"/profiles/{profile_id}",
        json={"confirmation_name": "Synthetic Profile"},
    )
    assert deleted.status_code == 200
    result = deleted.json()
    assert result["deleted"] is True
    assert result["deletion_audit_id"].startswith("profile-deletion-")
    assert result["deleted_record_counts"]["profile_accounts"] == 3
    assert result["deleted_record_counts"]["imports_and_provenance"] == 3
    assert client.get(f"/profiles/{profile_id}").status_code == 404
    assert client.get(f"/profiles/{unaffected_id}").status_code == 200

    with connect() as connection:
        deletion_audit = connection.execute(
            "SELECT * FROM profile_deletion_audit WHERE profile_id = ?",
            (profile_id,),
        ).fetchone()
        assert deletion_audit is not None
        assert deletion_audit["display_name"] == "Synthetic Profile"
        assert deletion_audit["profile_code"] == "PROFILE-001"
        assert deletion_audit["deleted_by"] == "local-fund-manager"
        assert json.loads(deletion_audit["import_identity_json"]) == [
            {
                "import_run_id": import_run_id,
                "mapping_version": "synthetic-v1",
                "workbook_checksum": "a" * 64,
            }
        ]
        tables = connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        ).fetchall()
        profile_owned_tables = []
        for table in tables:
            table_name = str(table["name"])
            foreign_keys = connection.execute(
                f'PRAGMA foreign_key_list("{table_name}")'
            ).fetchall()
            if any(str(row["table"]) == "profiles" for row in foreign_keys):
                profile_owned_tables.append(table_name)
                assert all(
                    str(row["on_delete"]).upper() == "CASCADE"
                    for row in foreign_keys
                    if str(row["table"]) == "profiles"
                )
        assert profile_owned_tables
        for table_name in profile_owned_tables:
            columns = {
                str(row["name"])
                for row in connection.execute(
                    f'PRAGMA table_info("{table_name}")'
                ).fetchall()
            }
            profile_columns = columns.intersection(
                {"profile_id", "source_profile_id", "target_profile_id"}
            )
            for column in profile_columns:
                count = connection.execute(
                    f'SELECT COUNT(*) AS count FROM "{table_name}" WHERE "{column}" = ?',
                    (profile_id,),
                ).fetchone()["count"]
                assert count == 0, f"orphaned {table_name}.{column}"


def test_profile_fees_cannot_exceed_one_hundred_percent(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    response = client.patch(
        "/profiles/profile-demo-001",
        json={"management_fee_percent": "80", "investment_fee_percent": "30"},
    )

    assert response.status_code == 422
    assert "cannot exceed 100%" in response.json()["detail"]


def test_profile_code_must_be_unique_and_tracking_start_cannot_be_future(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    duplicate_response = client.patch(
        "/profiles/profile-demo-001",
        json={"profile_code": "BRAVO-002"},
    )
    future_response = client.patch(
        "/profiles/profile-demo-001",
        json={"tracking_start_date": "2999-01-01"},
    )

    assert duplicate_response.status_code == 422
    assert duplicate_response.json()["detail"] == "Profile code must be unique"
    assert future_response.status_code == 422
    assert "cannot be in the future" in str(future_response.json()["detail"])


def test_profile_onboarding_creates_settings_and_catalogue_accounts_atomically(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    configure_profile_catalogue(tmp_path)
    client = TestClient(app)
    quick_action_id = create_synthetic_quick_action(client)
    payload = profile_onboarding_payload()
    payload["quick_actions"] = [
        {
            "preset_id": quick_action_id,
            "ledger_type": "Sportsbook",
            "favourite_order": 1,
        }
    ]

    response = client.post("/profiles/onboarding", json=payload)

    assert response.status_code == 201
    created = response.json()
    profile_id = created["profile"]["profile_id"]
    assert created["selected_account_count"] == 3
    assert created["selected_quick_action_count"] == 1
    assert created["profile"]["current_cash_snapshot"] == "150.00"
    assert created["onboarding"]["starting_bankroll"] == "100.00"
    assert created["onboarding"]["main_bank_catalogue_id"] == "BANK-DEMO-001"
    assert "casino-offers" not in created["onboarding"]["enabled_modules"]

    accounts = client.get(f"/profiles/{profile_id}/accounts").json()
    assert {account["catalogue_id"] for account in accounts} == {
        "BOOKMAKER-DEMO-001",
        "EXCHANGE-DEMO-001",
        "BANK-DEMO-001",
    }
    assert all(account["profile_id"] == profile_id for account in accounts)
    commissions = client.get(f"/profiles/{profile_id}/exchange-commissions").json()
    assert [(row["exchange_name"], row["commission_rate"]) for row in commissions] == [
        ("Exchange A", "0.02")
    ]
    favourites = list_profile_quick_add_loadout_favourites(profile_id)
    assert [(row.preset_id, row.ledger_type, row.favourite_order) for row in favourites] == [
        (quick_action_id, "Sportsbook", 1)
    ]
    assert count_profile_audit_rows(profile_id) == 1


def test_profile_onboarding_defaults_both_fee_percentages_to_twenty_five(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    configure_profile_catalogue(tmp_path)
    client = TestClient(app)
    payload = profile_onboarding_payload()
    payload.pop("management_fee_percent")
    payload.pop("investment_fee_percent")

    response = client.post("/profiles/onboarding", json=payload)

    assert response.status_code == 201
    assert response.json()["profile"]["management_fee_percent"] == "25.00"
    assert response.json()["profile"]["investment_fee_percent"] == "25.00"


def test_profile_onboarding_accepts_zero_exchange_commission_and_blank_optional_commissions(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    configure_profile_catalogue(tmp_path)
    client = TestClient(app)
    payload = profile_onboarding_payload()
    for account in payload["accounts"]:
        account["commission_rate"] = ""
    exchange = next(
        account
        for account in payload["accounts"]
        if account["catalogue_id"] == "EXCHANGE-DEMO-001"
    )
    exchange["commission_rate"] = "0.00"

    response = client.post("/profiles/onboarding", json=payload)

    assert response.status_code == 201
    profile_id = response.json()["profile"]["profile_id"]
    commissions = client.get(f"/profiles/{profile_id}/exchange-commissions").json()
    assert [(row["exchange_name"], row["commission_rate"]) for row in commissions] == [
        ("Exchange A", "0.00")
    ]


def test_profile_onboarding_rejects_duplicate_code_without_partial_writes(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    configure_profile_catalogue(tmp_path)
    client = TestClient(app)
    payload = profile_onboarding_payload()

    first = client.post("/profiles/onboarding", json=payload)
    second = client.post("/profiles/onboarding", json=payload)

    assert first.status_code == 201
    assert second.status_code == 422
    connection = sqlite3.connect(settings.database_path)
    profile_count = connection.execute(
        "SELECT COUNT(*) FROM profiles WHERE profile_code = 'PROFILE-001'"
    ).fetchone()[0]
    profile_account_count = connection.execute(
        "SELECT COUNT(*) FROM accounts WHERE profile_id = ?",
        (first.json()["profile"]["profile_id"],),
    ).fetchone()[0]
    connection.close()
    assert profile_count == 1
    assert profile_account_count == 3


def test_profile_onboarding_requires_exchange_and_commission_without_partial_write(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    configure_profile_catalogue(tmp_path)
    client = TestClient(app)

    no_exchange = profile_onboarding_payload()
    no_exchange["accounts"] = [
        account
        for account in no_exchange["accounts"]
        if account["catalogue_id"] != "EXCHANGE-DEMO-001"
    ]
    missing_exchange = client.post("/profiles/onboarding", json=no_exchange)
    assert missing_exchange.status_code == 422
    assert missing_exchange.json()["detail"] == "Select at least one Exchange for this Profile"

    no_commission = profile_onboarding_payload()
    exchange = next(
        account
        for account in no_commission["accounts"]
        if account["catalogue_id"] == "EXCHANGE-DEMO-001"
    )
    exchange.pop("commission_rate")
    missing_commission = client.post("/profiles/onboarding", json=no_commission)
    assert missing_commission.status_code == 422
    assert missing_commission.json()["detail"]["catalogue_ids"] == [
        "EXCHANGE-DEMO-001"
    ]

    with connect() as connection:
        profile_count = connection.execute(
            "SELECT COUNT(*) FROM profiles WHERE profile_code = 'PROFILE-001'"
        ).fetchone()[0]
        commission_count = connection.execute(
            """
            SELECT COUNT(*)
            FROM profile_exchange_commissions
            WHERE profile_id IN (
              SELECT profile_id FROM profiles WHERE profile_code = 'PROFILE-001'
            )
            """
        ).fetchone()[0]
    assert profile_count == 0
    assert commission_count == 0


def test_profile_onboarding_import_path_creates_target_without_duplicate_setup(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    configure_profile_catalogue(tmp_path)
    client = TestClient(app)
    payload = profile_onboarding_payload()
    payload.update(
        setup_path="import",
        accounts=[],
        main_bank_catalogue_id="",
        quick_actions=[],
    )

    response = client.post("/profiles/onboarding", json=payload)

    assert response.status_code == 201, response.text
    created = response.json()
    profile_id = created["profile"]["profile_id"]
    assert created["profile"]["display_name"] == "Synthetic Profile"
    assert created["selected_account_count"] == 0
    assert created["selected_quick_action_count"] == 0
    assert client.get(f"/profiles/{profile_id}/accounts").json() == []
    assert client.get(f"/profiles/{profile_id}/onboarding").status_code == 200


def test_profile_onboarding_can_be_reused_for_isolated_profiles(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    configure_profile_catalogue(tmp_path)
    client = TestClient(app)
    first_payload = profile_onboarding_payload()
    second_payload = profile_onboarding_payload()
    second_payload.update(
        display_name="Synthetic Profile Two",
        profile_code="PROFILE-002",
        starting_bankroll="200.00",
    )

    first = client.post("/profiles/onboarding", json=first_payload)
    second = client.post("/profiles/onboarding", json=second_payload)

    assert first.status_code == 201
    assert second.status_code == 201
    first_profile_id = first.json()["profile"]["profile_id"]
    second_profile_id = second.json()["profile"]["profile_id"]
    assert first_profile_id != second_profile_id
    assert first.json()["onboarding"]["starting_bankroll"] == "100.00"
    assert second.json()["onboarding"]["starting_bankroll"] == "200.00"
    first_accounts = client.get(f"/profiles/{first_profile_id}/accounts").json()
    second_accounts = client.get(f"/profiles/{second_profile_id}/accounts").json()
    assert len(first_accounts) == 3
    assert len(second_accounts) == 3
    assert {row["profile_id"] for row in first_accounts} == {first_profile_id}
    assert {row["profile_id"] for row in second_accounts} == {second_profile_id}


def test_profile_onboarding_rejects_unknown_catalogue_provider(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    configure_profile_catalogue(tmp_path)
    payload = profile_onboarding_payload()
    payload["accounts"] = [
        {
            "catalogue_id": "BOOKMAKER-MISSING-001",
            "status": "Active",
            "opening_balance": "10.00",
        }
    ]
    payload["main_bank_catalogue_id"] = ""

    response = TestClient(app).post("/profiles/onboarding", json=payload)

    assert response.status_code == 422
    assert "active global catalogue providers" in response.json()["detail"]["message"]


def test_profile_onboarding_rejects_provider_outside_operating_jurisdiction(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    configure_profile_catalogue(tmp_path)
    catalogue_path = Path(settings.account_catalogue_source)
    catalogue = json.loads(catalogue_path.read_text(encoding="utf-8"))
    catalogue["records"][0]["operating_jurisdictions"] = ["IE"]
    catalogue_path.write_text(json.dumps(catalogue), encoding="utf-8")
    payload = profile_onboarding_payload()
    payload["accounts"] = [payload["accounts"][0]]
    payload["main_bank_catalogue_id"] = ""

    response = TestClient(app).post("/profiles/onboarding", json=payload)

    assert response.status_code == 422
    assert response.json()["detail"]["operating_jurisdiction"] == "GB"
    assert response.json()["detail"]["catalogue_ids"] == ["BOOKMAKER-DEMO-001"]


def test_profile_onboarding_rejects_unknown_quick_action_without_partial_write(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    configure_profile_catalogue(tmp_path)
    payload = profile_onboarding_payload()
    payload["quick_actions"] = [
        {
            "preset_id": "COMBO-MISSING-001",
            "ledger_type": "Sportsbook",
            "favourite_order": 1,
        }
    ]

    response = TestClient(app).post("/profiles/onboarding", json=payload)

    assert response.status_code == 422
    assert "active global actions" in response.json()["detail"]["message"]
    connection = sqlite3.connect(settings.database_path)
    count = connection.execute(
        "SELECT COUNT(*) FROM profiles WHERE profile_code = 'PROFILE-001'"
    ).fetchone()[0]
    connection.close()
    assert count == 0


def test_disabled_optional_module_blocks_new_rows_but_keeps_history_route(
    tmp_path: Path,
) -> None:
    configure_temp_database(tmp_path)
    configure_profile_catalogue(tmp_path)
    client = TestClient(app)
    payload = profile_onboarding_payload()
    payload["enabled_modules"] = [
        "sportsbook-bets",
        "free-bets",
        "cash-adjustments",
    ]
    created = client.post("/profiles/onboarding", json=payload)
    assert created.status_code == 201
    profile_id = created.json()["profile"]["profile_id"]

    create_response = client.post(
        f"/profiles/{profile_id}/each-way-extra-places",
        json={},
    )
    history_response = client.get(
        f"/profiles/{profile_id}/each-way-extra-places"
    )

    assert create_response.status_code == 403
    assert create_response.json()["detail"] == "Extra Places is disabled for this Profile"
    assert history_response.status_code == 200
