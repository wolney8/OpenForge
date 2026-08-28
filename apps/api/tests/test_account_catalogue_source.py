from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

from openforge_api.account_catalogue_source import MasterAccountCatalogue
from openforge_api.config import settings
from openforge_api.main import app


def catalogue_payload() -> dict[str, Any]:
    return {
        "schema_version": "1.0",
        "catalogue_name": "Synthetic Master Catalogue",
        "updated_at": "2026-07-16",
        "default_operating_context": {
            "jurisdiction": "GB",
            "subdivision": "",
            "channels": ["web", "mobile"],
        },
        "records": [
            {
                "catalogue_id": "EXCHANGE-DEMO-001",
                "account_type": "Exchange",
                "operating_jurisdictions": ["gb"],
                "operating_subdivisions": [],
                "operating_channels": ["web", "mobile"],
                "brand_name": "Exchange A",
                "short_display_name": "Exchange A",
                "foreground_colour": "#FFFFFF",
                "background_colour": "#455A64",
                "source": "Synthetic fixture",
            },
            {
                "catalogue_id": "BANK-DEMO-001",
                "account_type": "Bank",
                "operating_jurisdictions": ["GB"],
                "operating_subdivisions": [],
                "operating_channels": ["web"],
                "brand_name": "Bank A",
                "short_display_name": "Bank A",
                "foreground_colour": "#FFFFFF",
                "background_colour": "#455A64",
                "source": "Synthetic fixture",
            },
        ],
    }


def test_master_account_catalogue_is_read_from_configured_json(
    tmp_path: Path, monkeypatch
) -> None:
    source_path = tmp_path / "master-account-catalogue.json"
    source_path.write_text(json.dumps(catalogue_payload()), encoding="utf-8")
    monkeypatch.setattr(settings, "account_catalogue_source", str(source_path))

    response = TestClient(app).get("/account-catalogue/source")

    assert response.status_code == 200
    assert [row["account_type"] for row in response.json()["records"]] == [
        "Exchange",
        "Bank",
    ]
    assert response.json()["records"][0]["operating_jurisdictions"] == ["GB"]
    assert response.json()["default_operating_context"] == {
        "jurisdiction": "GB",
        "subdivision": "",
        "channels": ["web", "mobile"],
    }


def test_master_account_catalogue_export_and_preflight_do_not_mutate_source(
    tmp_path: Path, monkeypatch
) -> None:
    source_path = tmp_path / "master-account-catalogue.json"
    source_payload = catalogue_payload()
    source_path.write_text(json.dumps(source_payload), encoding="utf-8")
    monkeypatch.setattr(settings, "account_catalogue_source", str(source_path))
    client = TestClient(app)

    export_response = client.get("/account-catalogue/source/export.json")
    assert export_response.status_code == 200
    assert export_response.headers["content-type"].startswith("application/json")
    # Export is the validated, canonical representation. The raw source remains
    # untouched until a separately approved apply workflow exists.
    assert json.loads(export_response.text) == MasterAccountCatalogue.model_validate(
        source_payload
    ).model_dump(mode="json")

    candidate = catalogue_payload()
    candidate["records"] = [candidate["records"][0]]
    preflight_response = client.post(
        "/account-catalogue/source/import/preflight", json={"catalogue": candidate}
    )

    assert preflight_response.status_code == 200
    assert preflight_response.json()["valid"] is True
    assert preflight_response.json()["removed_catalogue_ids"] == ["BANK-DEMO-001"]
    assert preflight_response.json()["requires_explicit_apply"] is True
    assert json.loads(source_path.read_text(encoding="utf-8")) == source_payload


def test_master_account_catalogue_apply_is_atomic_and_archives_omissions(
    tmp_path: Path, monkeypatch
) -> None:
    source_path = tmp_path / "master-account-catalogue.json"
    backup_path = tmp_path / "backups"
    source_path.write_text(json.dumps(catalogue_payload()), encoding="utf-8")
    monkeypatch.setattr(settings, "account_catalogue_source", str(source_path))
    monkeypatch.setattr(settings, "backup_directory", str(backup_path))
    client = TestClient(app)
    candidate = catalogue_payload()
    candidate["records"] = [
        {**candidate["records"][0], "short_display_name": "Exchange A Updated"},
        {
            **candidate["records"][1],
            "catalogue_id": "BOOKMAKER-DEMO-001",
            "account_type": "Bookmaker",
            "brand_name": "Bookmaker A",
            "short_display_name": "Bookmaker A",
        },
    ]

    response = client.post(
        "/account-catalogue/source/import/apply", json={"catalogue": candidate}
    )

    assert response.status_code == 200
    assert response.json()["added_catalogue_ids"] == ["BOOKMAKER-DEMO-001"]
    assert response.json()["updated_catalogue_ids"] == ["EXCHANGE-DEMO-001"]
    assert response.json()["archived_catalogue_ids"] == ["BANK-DEMO-001"]
    saved = json.loads(source_path.read_text(encoding="utf-8"))
    saved_by_id = {row["catalogue_id"]: row for row in saved["records"]}
    assert saved_by_id["EXCHANGE-DEMO-001"]["short_display_name"] == "Exchange A Updated"
    assert saved_by_id["BANK-DEMO-001"]["status"] == "Archived"
    assert len(list((backup_path / "account-catalogue").glob("*.json"))) == 1


def test_master_account_catalogue_apply_conflict_rolls_back_without_backup(
    tmp_path: Path, monkeypatch
) -> None:
    source_path = tmp_path / "master-account-catalogue.json"
    backup_path = tmp_path / "backups"
    original = json.dumps(catalogue_payload())
    source_path.write_text(original, encoding="utf-8")
    monkeypatch.setattr(settings, "account_catalogue_source", str(source_path))
    monkeypatch.setattr(settings, "backup_directory", str(backup_path))
    candidate = catalogue_payload()
    candidate["records"] = [
        {
            **candidate["records"][0],
            "catalogue_id": "EXCHANGE-RENAMED-001",
        },
        candidate["records"][1],
    ]

    response = TestClient(app).post(
        "/account-catalogue/source/import/apply", json={"catalogue": candidate}
    )

    assert response.status_code == 409
    assert "retained historical providers" in response.json()["detail"]
    assert source_path.read_text(encoding="utf-8") == original
    assert not backup_path.exists()


def test_master_account_catalogue_invalid_import_never_mutates_source(
    tmp_path: Path, monkeypatch
) -> None:
    source_path = tmp_path / "master-account-catalogue.json"
    original = json.dumps(catalogue_payload())
    source_path.write_text(original, encoding="utf-8")
    monkeypatch.setattr(settings, "account_catalogue_source", str(source_path))
    client = TestClient(app)

    malformed_response = client.post(
        "/account-catalogue/source/import/apply",
        content="{not-json",
        headers={"Content-Type": "application/json"},
    )
    schema_response = client.post(
        "/account-catalogue/source/import/apply",
        json={"catalogue": {"schema_version": "1.0", "records": [{}]}},
    )

    assert malformed_response.status_code == 422
    assert schema_response.status_code == 422
    assert source_path.read_text(encoding="utf-8") == original


def test_master_account_catalogue_rejects_duplicate_ids(
    tmp_path: Path, monkeypatch
) -> None:
    payload = catalogue_payload()
    records = payload["records"]
    assert isinstance(records, list)
    records[1]["catalogue_id"] = "EXCHANGE-DEMO-001"
    source_path = tmp_path / "invalid-master-account-catalogue.json"
    source_path.write_text(json.dumps(payload), encoding="utf-8")
    monkeypatch.setattr(settings, "account_catalogue_source", str(source_path))

    response = TestClient(app).get("/account-catalogue/source")

    assert response.status_code == 422
    assert "catalogue_id values must be unique" in response.json()["detail"]


def test_verified_master_account_requires_evidence(tmp_path: Path, monkeypatch) -> None:
    payload = catalogue_payload()
    payload["records"][0]["confidence"] = "Verified"
    source_path = tmp_path / "unsupported-verified-catalogue.json"
    source_path.write_text(json.dumps(payload), encoding="utf-8")
    monkeypatch.setattr(settings, "account_catalogue_source", str(source_path))

    response = TestClient(app).get("/account-catalogue/source")

    assert response.status_code == 422
    assert "Verified catalogue records require evidence" in response.json()["detail"]


def test_catalogue_evidence_can_support_provider_identity_and_brand_theme(
    tmp_path: Path, monkeypatch
) -> None:
    payload = catalogue_payload()
    payload["records"][0]["confidence"] = "Verified"
    payload["records"][0]["evidence"] = [
        {
            "source_url": "https://example.invalid/provider",
            "source_title": "Synthetic provider source",
            "publisher": "Synthetic Publisher",
            "checked_at": "2026-08-28",
            "supports": [
                "account_type",
                "brand_name",
                "short_display_name",
                "foreground_colour",
                "background_colour",
            ],
            "notes": "Synthetic evidence only.",
        }
    ]
    source_path = tmp_path / "identity-evidence-catalogue.json"
    source_path.write_text(json.dumps(payload), encoding="utf-8")
    monkeypatch.setattr(settings, "account_catalogue_source", str(source_path))

    response = TestClient(app).get("/account-catalogue/source")

    assert response.status_code == 200
    assert response.json()["records"][0]["confidence"] == "Verified"


def test_fund_manager_can_add_and_edit_master_account_record(
    tmp_path: Path, monkeypatch
) -> None:
    source_path = tmp_path / "master-account-catalogue.json"
    backup_path = tmp_path / "backups"
    source_path.write_text(json.dumps(catalogue_payload()), encoding="utf-8")
    monkeypatch.setattr(settings, "account_catalogue_source", str(source_path))
    monkeypatch.setattr(settings, "backup_directory", str(backup_path))
    client = TestClient(app)
    new_record = {
        "catalogue_id": "BOOKMAKER-DEMO-001",
        "account_type": "Bookmaker",
        "operating_jurisdictions": ["GB"],
        "operating_subdivisions": [],
        "operating_channels": ["web", "mobile"],
        "brand_name": "Bookmaker A",
        "short_display_name": "Bookmaker A",
        "legal_operator": "Demo Operator Limited",
        "operator_group": "Demo Group",
        "platform": "Demo Platform",
        "risk_team": "Demo Risk",
        "licence_reference": "DEMO-LICENCE-001",
        "licence_status": "Active",
        "canonical_domain": "https://example.invalid",
        "status": "Active",
        "foreground_colour": "#FFFFFF",
        "background_colour": "#455A64",
        "logo_asset_path": "",
        "source": "Synthetic Fund Manager entry",
        "confidence": "Unverified",
        "last_verified_date": "",
        "evidence": [],
    }

    create_response = client.post("/account-catalogue/source/records", json=new_record)

    assert create_response.status_code == 201
    assert create_response.json()["brand_name"] == "Bookmaker A"
    assert len(json.loads(source_path.read_text(encoding="utf-8"))["records"]) == 3
    assert len(list((backup_path / "account-catalogue").glob("*.json"))) == 1

    edited_record = {**new_record, "short_display_name": "Bookie A", "status": "Archived"}
    update_response = client.put(
        "/account-catalogue/source/records/BOOKMAKER-DEMO-001",
        json=edited_record,
    )

    assert update_response.status_code == 200
    assert update_response.json()["short_display_name"] == "Bookie A"
    saved = json.loads(source_path.read_text(encoding="utf-8"))
    saved_record = next(
        row for row in saved["records"] if row["catalogue_id"] == "BOOKMAKER-DEMO-001"
    )
    assert saved_record["status"] == "Archived"
    assert len(list((backup_path / "account-catalogue").glob("*.json"))) == 2


def test_duplicate_master_account_add_is_blocked_without_mutating_source(
    tmp_path: Path, monkeypatch
) -> None:
    source_path = tmp_path / "master-account-catalogue.json"
    backup_path = tmp_path / "backups"
    original = json.dumps(catalogue_payload())
    source_path.write_text(original, encoding="utf-8")
    monkeypatch.setattr(settings, "account_catalogue_source", str(source_path))
    monkeypatch.setattr(settings, "backup_directory", str(backup_path))
    duplicate = catalogue_payload()["records"][0]

    response = TestClient(app).post(
        "/account-catalogue/source/records", json=duplicate
    )

    assert response.status_code == 409
    assert json.loads(source_path.read_text(encoding="utf-8")) == json.loads(original)
    assert not backup_path.exists()


def test_master_account_id_cannot_change_during_edit(
    tmp_path: Path, monkeypatch
) -> None:
    source_path = tmp_path / "master-account-catalogue.json"
    source_path.write_text(json.dumps(catalogue_payload()), encoding="utf-8")
    monkeypatch.setattr(settings, "account_catalogue_source", str(source_path))
    payload = {**catalogue_payload()["records"][0], "catalogue_id": "EXCHANGE-CHANGED"}

    response = TestClient(app).put(
        "/account-catalogue/source/records/EXCHANGE-DEMO-001", json=payload
    )

    assert response.status_code == 422
    assert "catalogue_id is stable" in response.json()["detail"]
