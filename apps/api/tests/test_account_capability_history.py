"""Disposable Account capability history and correction boundaries."""

import json
import sqlite3
from uuid import uuid4

import pytest
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


def test_disposable_migration_backup_and_transactional_recovery(tmp_path, monkeypatch):
    import openforge_api.account_capability_migration as migration

    configure_temp_database(tmp_path)
    client = authenticated_client()
    _profile(client, "CAP-MIGRATION", balance="125.00")
    backup_path = tmp_path / "protected-synthetic-backup.sqlite"
    with connect() as source, sqlite3.connect(backup_path) as backup:
        source.commit()
        source.backup(backup)
        accounts_before = source.execute("SELECT COUNT(*) FROM accounts").fetchone()[0]
        audit_before = source.execute("SELECT COUNT(*) FROM account_audit").fetchone()[0]
        assert not inspect(source)["installed"]
        monkeypatch.setattr(migration, "SCHEMA", migration.SCHEMA + "INVALID SQL;")
        with pytest.raises(sqlite3.OperationalError):
            migration.apply_to_connection(source)
        assert not inspect(source)["installed"]
        monkeypatch.undo()
        apply_to_connection(source)
        assert inspect(source) == {"installed": True, "rows": 0}
        assert source.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        assert source.execute("PRAGMA foreign_key_check").fetchall() == []
        assert source.execute("SELECT COUNT(*) FROM accounts").fetchone()[0] == accounts_before
        assert source.execute("SELECT COUNT(*) FROM account_audit").fetchone()[0] == audit_before
        with pytest.raises(RuntimeError, match="already installed"):
            apply_to_connection(source)
    with sqlite3.connect(f"file:{backup_path}?mode=ro", uri=True) as backup:
        assert backup.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        assert backup.execute("PRAGMA foreign_key_check").fetchall() == []
        assert not inspect(backup)["installed"]
        assert backup.execute("SELECT COUNT(*) FROM accounts").fetchone()[0] == accounts_before


@pytest.mark.parametrize("kind", ["review_no_test", "review_no_change"])
def test_corrected_review_keeps_review_meaning_and_schedule(tmp_path, kind):
    configure_temp_database(tmp_path)
    client = authenticated_client()
    profile_id, account_id = _profile(client, f"CAP-{kind.upper().replace('_', '-')}")
    with connect() as connection:
        apply_to_connection(connection)
    url = f"/profiles/{profile_id}/accounts/{account_id}/capability-history"
    original = client.post(url, json=_entry(0, entry_kind=kind, observed_at=None,
        observed_precision="unknown", interpretation="confirmed", confidence="verified",
        next_review_action="set", next_review_on="2026-12-15"))
    assert original.status_code == 201, original.text
    corrected = client.post(url, json=_entry(1, entry_kind="correction",
        correction_of=original.json()["entry"]["observation_id"],
        correction_reason="Clarified the review note", observed_at=None,
        observed_precision="unknown", interpretation="confirmed", confidence="verified",
        evidence_note="Clarified review only"))
    assert corrected.status_code == 201, corrected.text
    summary = client.get(url).json()["summary"]
    assert summary["capabilities"] == []
    assert summary["last_verified_at"] is None
    assert summary["last_reviewed_at"] == corrected.json()["entry"]["recorded_at"]
    assert summary["next_review_on"] == "2026-12-15"
    retracted = client.post(url, json=_entry(2, entry_kind="retraction",
        correction_of=corrected.json()["entry"]["observation_id"],
        correction_reason="Review was entered for the wrong Account",
        observed_at=None, observed_precision="unknown"))
    assert retracted.status_code == 201, retracted.text
    summary = client.get(url).json()["summary"]
    assert summary["last_reviewed_at"] is None
    assert summary["last_verified_at"] is None
    assert summary["capabilities"] == []
    assert summary["next_review_on"] == "2026-12-15"
    cleared = client.post(url, json=_entry(3, entry_kind="review_no_test",
        observed_at=None, observed_precision="unknown", next_review_action="clear"))
    assert cleared.status_code == 201, cleared.text
    assert client.get(url).json()["summary"]["next_review_on"] is None


def test_retracting_latest_review_restores_prior_review_recency(tmp_path):
    configure_temp_database(tmp_path)
    client = authenticated_client()
    profile_id, account_id = _profile(client, "CAP-REVIEW-LATEST")
    with connect() as connection:
        apply_to_connection(connection)
    url = f"/profiles/{profile_id}/accounts/{account_id}/capability-history"
    prior = client.post(url, json=_entry(0, entry_kind="review_no_change",
        observed_at=None, observed_precision="unknown"))
    assert prior.status_code == 201, prior.text
    latest = client.post(url, json=_entry(1, entry_kind="review_no_test",
        observed_at=None, observed_precision="unknown"))
    assert latest.status_code == 201, latest.text
    withdrawn = client.post(url, json=_entry(2, entry_kind="retraction",
        correction_of=latest.json()["entry"]["observation_id"],
        correction_reason="Review belonged to another Account",
        observed_at=None, observed_precision="unknown"))
    assert withdrawn.status_code == 201, withdrawn.text
    summary = client.get(url).json()["summary"]
    assert summary["last_reviewed_at"] == prior.json()["entry"]["recorded_at"]
    assert summary["last_verified_at"] is None


@pytest.mark.parametrize("first,second", [
    ({"observed_at":"2026-11-20","observed_precision":"day","effective_from":"2026-11-19","effective_precision":"day"},
     {"observed_at":"2026-11-20","observed_precision":"day","effective_from":"2026-11-21","effective_precision":"day"}),
    ({"observed_at":None,"observed_precision":"unknown","effective_from":"2026-11-19","effective_precision":"day"},
     {"observed_at":None,"observed_precision":"unknown","effective_from":"2026-11-21","effective_precision":"day"}),
    ({"observed_at":"2026-07-20T19:30:00+01:00","observed_precision":"exact","effective_from":None,"effective_precision":"unknown"},
     {"observed_at":"2026-07-20T18:54:00Z","observed_precision":"exact","effective_from":None,"effective_precision":"unknown"}),
])
def test_capability_chronology_uses_effective_instants(tmp_path, first, second):
    configure_temp_database(tmp_path)
    client = authenticated_client()
    profile_id, account_id = _profile(client, "CAP-CHRONO")
    with connect() as connection:
        apply_to_connection(connection)
    url = f"/profiles/{profile_id}/accounts/{account_id}/capability-history"
    one = client.post(url, json=_entry(0, state="Working", interpretation="confirmed",
        confidence="verified", **first))
    assert one.status_code == 201, one.text
    two = client.post(url, json=_entry(1, state="HeavilyRestricted", interpretation="confirmed",
        confidence="verified", **second))
    assert two.status_code == 201, two.text
    summary = client.get(url).json()["summary"]
    assert summary["capabilities"][0]["state"] == "HeavilyRestricted"
    assert not summary["capabilities"][0]["conflicting"]


def test_day_precision_does_not_claim_order_within_that_day(tmp_path):
    configure_temp_database(tmp_path)
    client = authenticated_client()
    profile_id, account_id = _profile(client, "CAP-DAY-PRECISION")
    with connect() as connection:
        apply_to_connection(connection)
    url = f"/profiles/{profile_id}/accounts/{account_id}/capability-history"
    day = client.post(url, json=_entry(0, state="Working", interpretation="confirmed",
        observed_at=None, observed_precision="unknown",
        effective_from="2026-07-20", effective_precision="day"))
    assert day.status_code == 201, day.text
    exact = client.post(url, json=_entry(1, state="HeavilyRestricted",
        interpretation="confirmed", observed_at=None, observed_precision="unknown",
        effective_from="2026-07-20T19:30:00+01:00", effective_precision="exact"))
    assert exact.status_code == 201, exact.text
    result = client.get(url).json()["summary"]["capabilities"][0]
    assert result["conflicting"]
    assert result["state"] == "Needs review"


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
    archived = client.delete(f"/profiles/{first_profile}/accounts/{account_id}")
    assert archived.status_code == 200, archived.text
    history_after_archive = client.get(url)
    assert history_after_archive.status_code == 200
    assert history_after_archive.json()["summary"]["revision"] == 4
    assert client.post(url, json=_entry(4)).status_code == 409


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
    review = client.post(url, json=_entry(2, entry_kind="review_no_test",
        observed_at=None, observed_precision="unknown", evidence_type="NoOpportunityToTest",
        next_review_action="set", next_review_on="2026-12-15"))
    assert review.status_code == 201, review.text
    review_correction = client.post(url, json=_entry(3, entry_kind="correction",
        correction_of=review.json()["entry"]["observation_id"],
        correction_reason="Clarified review note", observed_at=None,
        observed_precision="unknown", evidence_type="NoOpportunityToTest",
        evidence_note="No suitable synthetic offer was available"))
    assert review_correction.status_code == 201, review_correction.text
    mistaken = client.post(url, json=_entry(4, entry_kind="review_no_change",
        observed_at=None, observed_precision="unknown", evidence_type="ManualReview"))
    assert mistaken.status_code == 201, mistaken.text
    retracted = client.post(url, json=_entry(5, entry_kind="retraction",
        correction_of=mistaken.json()["entry"]["observation_id"],
        correction_reason="Review assigned to the wrong Account",
        observed_at=None, observed_precision="unknown"))
    assert retracted.status_code == 201, retracted.text
    source_summary = client.get(url).json()["summary"]
    backup = build_profile_portable_export(profile_id)
    parsed = parse_profile_portable_export(backup.content)
    rows = parsed.sheets["Capability History"]
    assert len(rows) == 6
    assert rows[1]["correction_of"] == rows[0]["observation_id"]
    assert rows[3]["correction_of"] == rows[2]["observation_id"]
    assert rows[5]["correction_of"] == rows[4]["observation_id"]
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
    assert len(entries) == 6 and len({entry["account_id"] for entry in entries}) == 1
    assert entries[1]["correction_of"] == entries[0]["observation_id"]
    assert entries[3]["correction_of"] == entries[2]["observation_id"]
    assert entries[5]["correction_of"] == entries[4]["observation_id"]
    assert entries[0]["observation_id"] != rows[0]["observation_id"]
    assert audit
    restored_summary = client.get(
        f"/profiles/{target}/accounts/{entries[0]['account_id']}/capability-history"
    ).json()["summary"]
    assert restored_summary["next_review_on"] == source_summary["next_review_on"]
    assert restored_summary["last_reviewed_at"] == source_summary["last_reviewed_at"]
    assert restored_summary["last_verified_at"] == source_summary["last_verified_at"]
    assert (
        restored_summary["capabilities"][0]["state"]
        == source_summary["capabilities"][0]["state"]
    )
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
