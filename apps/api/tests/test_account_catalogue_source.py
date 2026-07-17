from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

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
