from __future__ import annotations

import hashlib
from dataclasses import replace
from pathlib import Path
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

import openforge_api.founder_import_review as review_module
from openforge_api.founder_import_review import (
    ReviewDecisionPayload,
    _with_decisions,
    _write_decisions,
    build_review_items_from_dry_run,
    build_review_workspace,
)


def metadata() -> dict[str, object]:
    return {
        "workbook_checksum": "a" * 64,
        "mapping_version": "synthetic-v1",
        "original_partial_count": 1,
    }


def review_item(fingerprint: str = "b" * 64) -> dict[str, object]:
    return {
        "item_id": "review-1234567890abcdef",
        "import_id": "import-123",
        "source_fingerprint": fingerprint,
        "category": "sportsbook_partial",
        "context": {"pnl": "4.25"},
    }


def test_compatible_decision_is_reapplied_without_source_mutation(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("OPENFORGE_FOUNDER_IMPORT_REVIEW_DIRECTORY", str(tmp_path))
    decision = {
        "item_id": "review-1234567890abcdef",
        "import_id": "import-123",
        "source_fingerprint": "b" * 64,
        "issue_type": "advanced_lay",
        "action": "historical_imported_calculation",
        "status": "REVIEWED_ACCEPTED",
    }
    _write_decisions("a" * 64, "synthetic-v1", {decision["item_id"]: decision})

    items, reconciliation = _with_decisions(metadata(), [review_item()])

    assert items[0]["review_status"] == "REVIEWED_ACCEPTED"
    assert reconciliation["resolved_partial_count"] == 1
    assert reconciliation["remaining_partial_count"] == 0
    assert reconciliation["real_import_performed"] is False


def test_changed_source_fingerprint_never_reuses_prior_decision(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("OPENFORGE_FOUNDER_IMPORT_REVIEW_DIRECTORY", str(tmp_path))
    decision = {
        "item_id": "review-1234567890abcdef",
        "source_fingerprint": "b" * 64,
        "status": "REVIEWED_ACCEPTED",
    }
    _write_decisions("a" * 64, "synthetic-v1", {decision["item_id"]: decision})

    items, reconciliation = _with_decisions(metadata(), [review_item("c" * 64)])

    assert items[0]["review_status"] == "UNREVIEWED"
    assert reconciliation["stale_decision_count"] == 1
    assert reconciliation["import_ready"] is False


def test_destructive_or_ambiguous_decisions_require_a_reason() -> None:
    base = {
        "item_id": "review-1234567890abcdef",
        "source_fingerprint": "b" * 64,
        "action": "exclude",
    }
    with pytest.raises(ValidationError, match="review note or reason"):
        ReviewDecisionPayload.model_validate(base)

    accepted = ReviewDecisionPayload.model_validate({**base, "note": "Duplicate source row"})
    assert accepted.note == "Duplicate source row"


def test_automatic_historical_extra_place_is_not_a_review_item(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    empty = SimpleNamespace(rows=[])
    sports = SimpleNamespace(
        rows=[
            SimpleNamespace(
                source_row=2,
                source_record_id="DEMO-EP-001",
                fields={
                    "OfferType": "EP",
                    "Status": "Settled",
                    "FinalNetPnL": "2.50",
                },
            )
        ]
    )
    monkeypatch.setattr("openforge_api.founder_import_review.parse_account_xlsx", lambda _: empty)
    monkeypatch.setattr(
        "openforge_api.founder_import_review.parse_sportsbook_xlsx", lambda _: sports
    )
    monkeypatch.setattr(
        review_module,
        "LEDGERS",
        tuple(
            replace(
                definition,
                parser=(
                    lambda _, is_sportsbook=definition.key == "sportsbook": (
                        sports if is_sportsbook else empty
                    )
                ),
            )
            for definition in review_module.LEDGERS
        ),
    )
    result = {
        "metadata": {
            "source_filename": "synthetic.xlsx",
            "effective_at": "2026-09-04T00:00:00+00:00",
            "sha256": "a" * 64,
            "mapping_version": "founder-snapshot-v6",
        },
        "accounts": {"resolutions": [], "validation_rows": []},
        "ledgers": {
            "sportsbook": {"validation_rows": []},
            "free_bets": {"validation_rows": []},
            "casino": {"validation_rows": []},
            "cash_adjustments": {"validation_rows": []},
        },
        "extra_places": {
            "rows": [
                {
                    "source_row": 2,
                    "classification": "historical_importable",
                    "missing_fields": ["place_terms"],
                }
            ]
        },
        "readiness": {
            "partial_rows_requiring_mapping_decisions": 0,
            "provider_conflicts": 0,
            "historical_ep_rows_requiring_review": 0,
        },
    }

    metadata_result, items = build_review_items_from_dry_run(result, b"synthetic")

    assert items == []
    assert metadata_result["historical_ep_count"] == 0


def test_current_private_review_is_read_only_and_complete_when_available(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    root = Path(__file__).resolve().parents[3]
    workbook = root / "data/private/imports/founder/WO_MB_Tracker_May2026.xlsx"
    review_directory = root / "data/private/imports/founder/dry-run-2026-08-29-1605"
    if not workbook.exists() or not review_directory.exists():
        pytest.skip("Private founder dry-run artifacts are intentionally not committed")
    monkeypatch.setenv("OPENFORGE_FOUNDER_WORKBOOK_PATH", str(workbook))
    monkeypatch.setenv("OPENFORGE_FOUNDER_IMPORT_REVIEW_DIRECTORY", str(review_directory))
    before = hashlib.sha256(workbook.read_bytes()).hexdigest()

    workspace = build_review_workspace()

    assert len(workspace["items"]) == 117
    assert workspace["metadata"]["original_partial_count"] == 114
    assert workspace["metadata"]["provider_conflict_count"] == 1
    assert workspace["metadata"]["historical_ep_count"] == 2
    assert workspace["reconciliation"]["real_import_performed"] is False
    assert hashlib.sha256(workbook.read_bytes()).hexdigest() == before
