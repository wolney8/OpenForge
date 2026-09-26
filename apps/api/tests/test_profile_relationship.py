"""CP-055 independent economic relationship, compatibility and portable fixtures."""

import sqlite3
from dataclasses import replace
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from test_profile_portable_restore import portable_payload
from test_profiles import (
    configure_profile_catalogue,
    configure_temp_database,
    profile_onboarding_payload,
)

from openforge_api import profile_portable_export as export
from openforge_api.db import connect, get_profile, initialize_database, update_profile_metadata
from openforge_api.main import app
from openforge_api.profile_portable_restore import (
    analyse_portable_restore,
    execute_portable_restore,
    parse_profile_portable_export,
)


@pytest.mark.parametrize(
    "relationship,management,investment",
    [("Personal", "0.00", "0.00"), ("Managed subscriber", "40.00", "0.00")],
)
def test_creation_reopen_restore_and_retry(tmp_path: Path, relationship, management, investment):
    configure_temp_database(tmp_path)
    configure_profile_catalogue(tmp_path)
    payload = profile_onboarding_payload()
    payload.update(
        setup_path="import",
        accounts=[],
        quick_actions=[],
        main_bank_catalogue_id="",
        profile_relationship=relationship,
        management_fee_percent=management,
        investment_fee_percent=investment,
    )
    client = TestClient(app)
    response = client.post("/profiles/onboarding", json=payload)
    assert response.status_code == 201, response.text
    profile = response.json()["profile"]
    pid = profile["profile_id"]
    assert profile["profile_relationship"] == relationship
    assert client.get(f"/profiles/{pid}").json()["management_fee_percent"] == management
    backup = export.build_profile_portable_export(pid)
    parsed = parse_profile_portable_export(backup.content)
    assert parsed.sheets["Profile"][0]["profile_relationship"] == relationship
    analysis = analyse_portable_restore(
        payload=portable_payload(backup.content), owner_email="owner@example.invalid"
    )
    assert analysis["status"] == "READY", analysis
    completed = execute_portable_restore(
        restore_run_id=analysis["restore_run_id"],
        owner_email="owner@example.invalid",
        actor_email="owner@example.invalid",
    )
    assert completed["status"] == "COMPLETE", completed
    restored = get_profile(completed["target_profile_id"])
    assert restored and restored.profile_id != pid and restored.profile_relationship == relationship
    assert restored.management_fee_percent == management
    retry = execute_portable_restore(
        restore_run_id=analysis["restore_run_id"],
        owner_email="owner@example.invalid",
        actor_email="owner@example.invalid",
    )
    assert retry["target_profile_id"] == restored.profile_id
    assert get_profile("profile-demo-001").profile_relationship == ""


@pytest.mark.parametrize(
    "changes",
    [
        {"profile_relationship": "Personal", "management_fee_percent": "25"},
        {"profile_relationship": "Administrator"},
        {"profile_relationship": None},
        {"management_fee_percent": None},
    ],
)
def test_invalid_relationship_or_terms_reject_without_creation(tmp_path, changes):
    configure_temp_database(tmp_path)
    configure_profile_catalogue(tmp_path)
    payload = profile_onboarding_payload()
    payload.update(changes)
    client = TestClient(app)
    before = client.get("/profiles").json()
    assert client.post("/profiles/onboarding", json=payload).status_code == 422
    assert client.get("/profiles").json() == before


def test_relationship_changes_are_audited_and_personal_fee_guard_applies(tmp_path):
    configure_temp_database(tmp_path)
    p = update_profile_metadata(
        "profile-demo-001",
        profile_relationship="Personal",
        management_fee_percent="0.00",
        investment_fee_percent="0.00",
    )
    assert p.profile_relationship == "Personal"
    with pytest.raises(ValueError, match="Personal Profiles"):
        update_profile_metadata(p.profile_id, management_fee_percent="1")
    with pytest.raises(ValueError, match="both agreed"):
        update_profile_metadata(p.profile_id, profile_relationship="Managed subscriber")
    assert get_profile("profile-demo-002").profile_relationship == ""
    with connect() as c:
        rows = c.execute(
            "SELECT payload_json FROM profile_audit WHERE profile_id=?", (p.profile_id,)
        ).fetchall()
    assert any("profile_relationship" in row["payload_json"] for row in rows)


def test_old_sqlite_relationship_migration_is_additive_and_retry_safe():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    initialize_database(c)
    c.execute("ALTER TABLE profiles DROP COLUMN profile_relationship")
    c.execute(
        "INSERT INTO profiles VALUES "
        "('legacy','Synthetic legacy','LEGACY','Active','2026-01-01','25','25','17.23')"
    )
    before = tuple(c.execute("SELECT * FROM profiles").fetchone())
    initialize_database(c)
    initialize_database(c)
    after = c.execute("SELECT * FROM profiles").fetchone()
    assert tuple(after)[:-1] == before and after["profile_relationship"] == ""


def test_old_portable_backup_keeps_original_checksum_and_unclassified_relationship(
    tmp_path, monkeypatch
):
    configure_temp_database(tmp_path)
    configure_profile_catalogue(tmp_path)
    old_specs = tuple(
        replace(spec, columns=tuple(c for c in spec.columns if c != "profile_relationship"))
        if spec.name == "Profile"
        else spec
        for spec in export.SHEET_SPECS
    )
    monkeypatch.setattr(export, "SHEET_SPECS", old_specs)
    backup = export.build_profile_portable_export("profile-demo-001")
    parsed = parse_profile_portable_export(backup.content)
    assert parsed.sheets["Profile"][0]["profile_relationship"] == ""
