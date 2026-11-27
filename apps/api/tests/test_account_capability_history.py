"""Disposable Account capability history and correction boundaries."""

import json
from uuid import uuid4

from test_calculator_conversions import authenticated_client, configure_temp_database

from openforge_api.account_capability_migration import apply_to_connection, inspect
from openforge_api.db import connect


def _profile(client, code, *, balance=""):
    response = client.post(
        "/profiles/onboarding",
        json={
            "profile_relationship": "Managed subscriber",
            "display_name": "Synthetic capability review",
            "profile_code": code,
            "setup_path": "import",
            "tracking_start_date": "2026-09-01",
            "management_fee_percent": "0.00",
            "investment_fee_percent": "0.00",
            "enabled_modules": ["sportsbook-bets", "free-bets", "cash-adjustments"],
            "accounts": [],
            "quick_actions": [],
        },
    )
    assert response.status_code == 201, response.text
    profile_id = response.json()["profile"]["profile_id"]
    account = client.post(
        f"/profiles/{profile_id}/accounts",
        json={
            "account": "Bookmaker A",
            "type": "Bookie",
            "status": "Active",
            "lifecycle_status": "Active",
            "current_balance": balance,
            "channel": "Online",
            "restrictions": [],
        },
    )
    assert account.status_code == 201, account.text
    return profile_id, account.json()["account_id"]


def _entry(revision, **changes):
    return {
        "operation_id": str(uuid4()),
        "expected_revision": revision,
        "capability": "GeneralSportsbookPromotions",
        "scope_kind": "general",
        "entry_kind": "observation",
        "state": "Restricted",
        "interpretation": "suspected",
        "confidence": "unverified",
        "evidence_type": "OfferNotVisible",
        "evidence_note": "Synthetic offer list did not show a promotion",
        "observed_at": "2026-11-10",
        "observed_precision": "approximate",
        "effective_precision": "unknown",
        **changes,
    }


def test_capability_history_is_append_only_idempotent_and_profile_scoped(tmp_path):
    configure_temp_database(tmp_path)
    client = authenticated_client()
    first_profile, account_id = _profile(client, "CAP-001")
    other_profile, _ = _profile(client, "CAP-002")
    with connect() as connection:
        assert not inspect(connection)["installed"]
        apply_to_connection(connection)
    url = f"/profiles/{first_profile}/accounts/{account_id}/capability-history"
    initial = client.get(url)
    assert initial.status_code == 200 and initial.json()["summary"]["revision"] == 0
    first = _entry(0)
    saved = client.post(url, json=first)
    assert saved.status_code == 201, saved.text
    first_id = saved.json()["entry"]["observation_id"]
    assert client.post(url, json=first).json()["entry"]["observation_id"] == first_id
    assert client.post(url, json={**first, "state": "Working"}).status_code == 409
    assert client.post(url, json=_entry(0)).status_code == 409
    assert (
        client.get(
            f"/profiles/{other_profile}/accounts/{account_id}/capability-history"
        ).status_code
        == 404
    )

    offer = _entry(
        1,
        scope_kind="offer",
        scope_ref="Demo Offer A",
        state="Working",
        interpretation="confirmed",
        confidence="verified",
        evidence_type="AcceptedOffer",
        observed_at="2026-11-15",
        observed_precision="day",
    )
    assert client.post(url, json=offer).status_code == 201
    view = client.get(url).json()
    assert view["summary"]["revision"] == 2
    assert len(view["summary"]["capabilities"]) == 2
    assert any(
        c["scope_kind"] == "general" and c["state"] == "Needs review"
        for c in view["summary"]["capabilities"]
    )
    correction = _entry(
        2,
        entry_kind="correction",
        correction_of=first_id,
        correction_reason="Original observation was misread",
        state="WorkingWithLimits",
        interpretation="confirmed",
        confidence="verified",
        evidence_type="ManualReview",
        observed_at="2026-11-09",
        observed_precision="day",
    )
    assert client.post(url, json=correction).status_code == 201
    view = client.get(url).json()
    assert len(view["entries"]) == 3
    assert view["summary"]["revision"] == 3
    assert (
        client.post(
            url,
            json=_entry(
                3,
                entry_kind="review_no_test",
                evidence_type="NoOpportunityToTest",
                observed_at=None,
                observed_precision="unknown",
                next_review_action="set",
                next_review_on="2026-12-15",
            ),
        ).status_code
        == 201
    )
    summary = client.get(url).json()["summary"]
    assert summary["last_reviewed_at"] and summary["next_review_on"] == "2026-12-15"
    assert summary["review_status"] == "Scheduled"
    assert summary["last_verified_at"]


def test_portable_capability_history_preserves_links(tmp_path):
    from test_profile_portable_restore import portable_payload

    from openforge_api.profile_portable_export import build_profile_portable_export
    from openforge_api.profile_portable_restore import (
        analyse_portable_restore,
        execute_portable_restore,
        parse_profile_portable_export,
    )

    configure_temp_database(tmp_path)
    client = authenticated_client()
    profile_id, account_id = _profile(client, "CAP-PORT", balance="125.00")
    with connect() as connection:
        apply_to_connection(connection)
    url = f"/profiles/{profile_id}/accounts/{account_id}/capability-history"
    first = client.post(url, json=_entry(0))
    assert first.status_code == 201, first.text
    target = first.json()["entry"]["observation_id"]
    corrected = client.post(
        url,
        json=_entry(
            1,
            entry_kind="correction",
            correction_of=target,
            correction_reason="Synthetic correction",
            state="Working",
            interpretation="confirmed",
            confidence="verified",
            evidence_type="ManualReview",
            observed_at="2026-11-12",
            observed_precision="day",
        ),
    )
    assert corrected.status_code == 201, corrected.text
    backup = build_profile_portable_export(profile_id)
    parsed = parse_profile_portable_export(backup.content)
    rows = parsed.sheets["Capability History"]
    assert len(rows) == 2
    assert rows[1]["correction_of"] == rows[0]["observation_id"]
    assert parsed.sheets["Account Audit"]
    analysis = analyse_portable_restore(
        payload=portable_payload(backup.content), owner_email="demo@example.invalid"
    )
    assert analysis["status"] == "READY", analysis
    restored = execute_portable_restore(
        restore_run_id=analysis["restore_run_id"],
        owner_email="demo@example.invalid",
        actor_email="demo@example.invalid",
    )
    assert restored["status"] == "COMPLETE", restored
    target = restored["target_profile_id"]
    with connect() as connection:
        entries = connection.execute(
            "SELECT * FROM account_capability_observations WHERE profile_id=? ORDER BY revision",
            (target,),
        ).fetchall()
        audit = connection.execute(
            "SELECT * FROM account_audit WHERE profile_id=?", (target,)
        ).fetchall()
    assert len(entries) == 2 and entries[0]["account_id"] == entries[1]["account_id"]
    assert entries[1]["correction_of"] == entries[0]["observation_id"]
    assert entries[0]["observation_id"] != rows[0]["observation_id"]
    assert audit
    with connect() as connection:
        source_balance = connection.execute(
            "SELECT current_balance FROM accounts WHERE profile_id=? AND account_id=?",
            (profile_id, account_id),
        ).fetchone()[0]
        restored_balance = connection.execute(
            "SELECT current_balance FROM accounts WHERE profile_id=? AND account_id=?",
            (target, entries[0]["account_id"]),
        ).fetchone()[0]
    assert source_balance == restored_balance == "125.00"
    for item in audit:
        payload = json.loads(item["payload_json"])
        if "account_id" in payload:
            assert payload["account_id"] == entries[0]["account_id"]
        if "profile_id" in payload:
            assert payload["profile_id"] == target


def test_older_portable_backup_has_explicit_missing_history(tmp_path, monkeypatch):
    from test_profile_portable_restore import portable_payload

    import openforge_api.profile_portable_export as export_module
    from openforge_api.profile_portable_restore import (
        analyse_portable_restore,
        parse_profile_portable_export,
    )

    configure_temp_database(tmp_path)
    client = authenticated_client()
    profile_id, _account_id = _profile(client, "CAP-OLD")
    old_sheets = tuple(
        spec
        for spec in export_module.SHEET_SPECS
        if spec.name not in {"Account Audit", "Capability History"}
    )
    monkeypatch.setattr(export_module, "SHEET_SPECS", old_sheets)
    monkeypatch.setattr(
        export_module,
        "PORTABLE_PAYLOAD_SPECS",
        (*old_sheets, export_module.REVIEW_DECISIONS_SPEC, export_module.RECONCILIATION_SPEC),
    )
    monkeypatch.setattr(
        export_module, "EXPORT_FORMAT_VERSION", export_module.LEGACY_EXPORT_FORMAT_VERSION
    )
    old_backup = export_module.build_profile_portable_export(profile_id)
    parsed = parse_profile_portable_export(old_backup.content)
    assert parsed.manifest["export_format_version"] == export_module.LEGACY_EXPORT_FORMAT_VERSION
    assert parsed.sheets["Capability History"] == ()
    assert parsed.sheets["Account Audit"] == ()
    analysis = analyse_portable_restore(
        payload=portable_payload(old_backup.content), owner_email="demo@example.invalid"
    )
    assert (
        "no Account audit or capability observation history"
        in analysis["missing_history_limitation"]
    )


def test_backdated_evidence_correction_chain_and_review_outcomes(tmp_path):
    configure_temp_database(tmp_path)
    client = authenticated_client()
    profile_id, account_id = _profile(client, "CAP-CHAIN")
    with connect() as connection:
        apply_to_connection(connection)
    url = f"/profiles/{profile_id}/accounts/{account_id}/capability-history"
    recent = client.post(
        url,
        json=_entry(
            0,
            observed_at="2026-11-20",
            observed_precision="day",
            effective_from="2026-11-19",
            effective_precision="day",
            state="HeavilyRestricted",
            interpretation="confirmed",
            confidence="verified",
        ),
    )
    assert recent.status_code == 201, recent.text
    old = client.post(
        url,
        json=_entry(
            1,
            observed_at="2026-11-10",
            observed_precision="day",
            effective_from="2026-11-09",
            effective_precision="day",
            state="Working",
            interpretation="confirmed",
            confidence="verified",
        ),
    )
    assert old.status_code == 201, old.text
    summary = client.get(url).json()["summary"]
    assert summary["capabilities"][0]["state"] == "HeavilyRestricted"
    corrected = client.post(
        url,
        json=_entry(
            2,
            entry_kind="correction",
            correction_of=old.json()["entry"]["observation_id"],
            correction_reason="Recorded scope was incorrect",
            observed_at="2026-11-11",
            observed_precision="day",
            state="WorkingWithLimits",
            interpretation="confirmed",
            confidence="verified",
        ),
    )
    assert corrected.status_code == 201, corrected.text
    assert client.get(url).json()["summary"]["capabilities"][0]["state"] == "HeavilyRestricted"
    retracted = client.post(
        url,
        json=_entry(
            3,
            entry_kind="retraction",
            correction_of=corrected.json()["entry"]["observation_id"],
            correction_reason="Evidence was assigned to the wrong date",
            observed_at=None,
            observed_precision="unknown",
        ),
    )
    assert retracted.status_code == 201, retracted.text
    assert client.get(url).json()["summary"]["capabilities"][0]["state"] == "HeavilyRestricted"
    assert (
        client.post(
            url,
            json=_entry(
                4,
                entry_kind="review_no_change",
                observed_at=None,
                observed_precision="unknown",
                evidence_type="ManualReview",
            ),
        ).status_code
        == 201
    )
    assert (
        client.post(
            url,
            json=_entry(
                5,
                entry_kind="review_no_test",
                observed_at=None,
                observed_precision="unknown",
                evidence_type="NoOpportunityToTest",
            ),
        ).status_code
        == 201
    )
    view = client.get(url).json()
    assert view["summary"]["last_reviewed_at"]
    assert view["summary"]["last_verified_at"]
    assert view["summary"]["last_reviewed_at"] >= view["summary"]["last_verified_at"]
    assert len(view["entries"]) == 6
