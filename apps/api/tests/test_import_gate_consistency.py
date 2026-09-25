"""Synthetic regression fixtures for the full-source import gate (no private data)."""

from datetime import date
from decimal import Decimal
from xml.etree import ElementTree as ET

import pytest

from openforge_api.calculations.sportsbook_current_value import (
    SportsbookCalculationInput,
    calculate_sportsbook_current_value,
)
from openforge_api.imports import (
    ImportRowPayload,
    map_casino_offer_import_fields,
    stage_import_rows,
)
from openforge_api.xlsx_import import NS, read_cell_value


@pytest.mark.parametrize(
    ("kind", "raw", "expected"),
    [
        ("n", "2.5000002E7", "25000002"),
        ("", "1.234E-3", "0.001234"),
        ("str", "2.5E7", "2.5E7"),
        ("n", "3.50", "3.50"),
        ("n", "1E999999999", "1E999999999"),
    ],
)
def test_numeric_excel_representation_is_not_manual_text(kind, raw, expected):
    cell = ET.fromstring(f'<c xmlns="{NS["main"]}" t="{kind}"><v>{raw}</v></c>')
    assert read_cell_value(cell, shared_strings=[], date_style_indexes=set()) == expected


def test_terminal_void_does_not_need_historical_placement_odds():
    row = SportsbookCalculationInput(
        profile_id="SYNTHETIC-P",
        record_id="SYNTHETIC-VOID",
        status="Free Bet Awarded",
        result="Void",
        offer_type="Bet & Get",
        match_strategy="No Lay",
        back_stake="12",
        back_odds="",
    )
    result = calculate_sportsbook_current_value(row, as_of_date=date(2026, 9, 1))
    assert result.reporting_value == result.final_net_pnl == result.actual_net_pnl == Decimal("0")
    assert result.reference_lay_stake_standard is None
    assert result.projected_current_pnl is None
    assert not result.counts_as_open


def test_missing_commission_does_not_become_zero_or_cached_result():
    result = calculate_sportsbook_current_value(
        SportsbookCalculationInput(
            profile_id="SYNTHETIC-P",
            record_id="SYNTHETIC-UNKNOWN",
            status="Settled",
            result="Lay Won",
            offer_type="Bet & Get",
            match_strategy="Standard",
            back_stake="15",
            back_odds="2",
            lay_odds_1="2.1",
            lay_actual="14.5",
        ),
        as_of_date=date(2026, 9, 1),
    )
    assert result.reporting_value is None
    assert result.calculation_state == "incomplete"


def test_sportsbook_cached_final_is_not_a_manual_override():
    fields = dict(
        EventName="Synthetic event",
        Bookmaker="Bookmaker A",
        Status="Settled",
        Result="Lose",
        BackStake="12",
        BackOdds="3",
        MatchStrategy="No Lay",
        FinalNetPnL="-12",
    )
    row = ImportRowPayload(
        sheet="Sportsbook Bets", source_row=2, source_record_id="SYNTHETIC-SB", fields=fields
    )
    staged = stage_import_rows(
        profile_id="SYNTHETIC-P",
        rows=[row],
        mapping_version="sportsbook-v1",
        source_lookup=lambda *_: None,
    )
    assert staged[0]["errors"] == []
    assert staged[0]["mapped_fields"]["manual_override_value"] == ""
    fields["ManualOverrideValue"] = "-11"
    staged = stage_import_rows(
        profile_id="SYNTHETIC-P",
        rows=[row.model_copy(update={"fields": fields})],
        mapping_version="sportsbook-v1",
        source_lookup=lambda *_: None,
    )
    assert any("reason" in x["message"].lower() for x in staged[0]["errors"])


def test_casino_reason_gate_is_in_shared_mapper():
    fields = dict(
        Bookmaker="Bookmaker A",
        OfferName="Synthetic offer",
        OfferType="Cashback",
        Status="Settled",
        Result="Completed",
        FinalNetPnL="4.50",
        UserNotes="",
    )
    _, errors = map_casino_offer_import_fields(fields)
    assert any(x["code"] == "override_reason_required" for x in errors)
    fields["UserNotes"] = "Recorded final after completed wagering"
    _, errors = map_casino_offer_import_fields(fields)
    assert not any(x["code"] == "override_reason_required" for x in errors)


def test_account_legacy_mapping_preserves_unknown_and_unique_provider(monkeypatch):
    from apps.api.tests.test_founder_workbook_dry_run import synthetic_catalogue

    from openforge_api.imports import map_account_import_fields, resolve_account_catalogue_record

    catalogue = synthetic_catalogue()
    monkeypatch.setattr("openforge_api.imports.load_master_account_catalogue", lambda: catalogue)
    assert resolve_account_catalogue_record("Demo-Bet", "Bookie") == catalogue.records[0]
    fields = dict(
        Account="Demo-Bet",
        Type="Bookie",
        Status="Restricted",
        Channel="App Only",
        CurrentBalance="",
        **{"Stake Access": "Unknown", "Counts In Cash Total": True},
    )
    mapped, errors, warnings = map_account_import_fields(fields)
    assert mapped["status"] == "Bonus Restricted"
    assert mapped["channel"] == "Mobile"
    assert mapped["current_balance"] == ""
    assert any(e["code"] == "invalid_stake_access" for e in errors)
    assert fields["Status"] == "Restricted"
    fields["Stake Access"] = "Not Checked"
    staged = stage_import_rows(
        profile_id="SYNTHETIC-P",
        rows=[
            ImportRowPayload(
                sheet="Accounts", source_row=2, source_record_id="SYNTHETIC-A", fields=fields
            )
        ],
        mapping_version="accounts-v1",
        source_lookup=lambda *_: None,
    )
    assert staged[0]["errors"] == []
    catalogue.records.append(
        catalogue.records[0].model_copy(
            update={
                "catalogue_id": "SECOND",
                "brand_name": "Demo--Bet",
                "short_display_name": "Demo--Bet",
            }
        )
    )
    assert resolve_account_catalogue_record("Demo-Bet", "Bookie") is None


def test_resolved_provider_does_not_hide_account_field_errors(monkeypatch):
    from dataclasses import replace
    from types import SimpleNamespace

    import openforge_api.founder_import_review as review

    row = SimpleNamespace(
        source_row=4,
        source_record_id="SYNTHETIC-ACCOUNT",
        fields={"Account": "Bookmaker A", "Stake Access": "Unknown", "Promo Access": "Unknown"},
    )
    monkeypatch.setattr(review, "parse_account_xlsx", lambda _: SimpleNamespace(rows=[row]))
    monkeypatch.setattr(review, "parse_sportsbook_xlsx", lambda _: SimpleNamespace(rows=[]))
    monkeypatch.setattr(
        review,
        "LEDGERS",
        tuple(replace(d, parser=lambda _: SimpleNamespace(rows=[])) for d in review.LEDGERS),
    )
    result = dict(
        metadata=dict(
            source_filename="synthetic.xlsx",
            effective_at="2026-09-01",
            sha256="a" * 64,
            mapping_version="synthetic-v1",
        ),
        accounts=dict(
            resolutions=[],
            validation_rows=[
                dict(
                    source_row=4,
                    import_key="synthetic-account",
                    errors=[
                        dict(
                            code="invalid_stake_access", message="Unsupported stake access: Unknown"
                        ),
                        dict(
                            code="invalid_promo_access", message="Unsupported promo access: Unknown"
                        ),
                    ],
                )
            ],
        ),
        ledgers={d.key: {"validation_rows": []} for d in review.LEDGERS},
        extra_places={"rows": []},
        readiness=dict(
            partial_rows_requiring_mapping_decisions=0,
            provider_conflicts=0,
            historical_ep_rows_requiring_review=0,
        ),
    )
    metadata, items = review.build_review_items_from_dry_run(result, b"synthetic")
    assert len(items) == 1
    assert items[0]["category"] == "accounts_partial"
    assert len(items[0]["issue_types"]) == 2
    receipt = review.apply_review_decisions(metadata, items, {})["reconciliation"]
    assert not receipt["import_ready"]
    assert receipt["remaining_partial_count"] == 1


def test_sportsbook_actual_exchange_gap_is_visible_to_both_importers():
    from openforge_api.imports import map_sportsbook_import_fields

    fields = dict(
        EventName="Synthetic event",
        Bookmaker="Bookmaker A",
        Status="Settled",
        Result="Lay Won",
        BackStake="15",
        BackOdds="2",
        MatchStrategy="Standard",
        LayOdds1="2.1",
        LayStake1="14.5",
        Exchange="",
    )
    _, errors = map_sportsbook_import_fields(fields)
    assert any(e["code"] == "actual_lay_exchange_required" for e in errors)
    staged = stage_import_rows(
        profile_id="SYNTHETIC-P",
        rows=[
            ImportRowPayload(
                sheet="Sportsbook Bets",
                source_row=2,
                source_record_id="SYNTHETIC-UNKNOWN",
                fields=fields,
            )
        ],
        mapping_version="sportsbook-v1",
        source_lookup=lambda *_: None,
    )
    assert any(e["code"] == "actual_lay_exchange_required" for e in staged[0]["errors"])


@pytest.mark.parametrize(
    "reason,state", [("", "review_required"), ("Audited correction", "resolved")]
)
def test_terminal_void_retains_override_audit_requirement(reason, state):
    result = calculate_sportsbook_current_value(
        SportsbookCalculationInput(
            profile_id="SYNTHETIC-P",
            record_id="SYNTHETIC-VOID",
            status="Free Bet Awarded",
            result="Void",
            offer_type="Bet & Get",
            match_strategy="No Lay",
            back_stake="12",
            back_odds="",
            manual_override_value="-2",
            manual_override_reason=reason,
        ),
        as_of_date=date(2026, 9, 1),
    )
    assert result.calculation_state == state
    assert result.reporting_value == Decimal("-2")
    assert result.actual_net_pnl == Decimal("0")


def test_casino_review_reason_uses_existing_notes_column():
    from openforge_api.profile_workbook_cutover import _apply_decision

    payload = dict(final_net_pnl="4.50", user_notes="Original note")
    item = {
        "decision": {
            "action": "provide_override_reason",
            "override_fields": {"manual_override_reason": "Verified final proceeds"},
        }
    }
    result = _apply_decision(payload, {}, item)
    assert result == dict(final_net_pnl="4.50", user_notes="Original note\nVerified final proceeds")
    assert "manual_override_reason" not in result


def test_casino_missing_date_is_not_mislabelled_as_missing_offer():
    from openforge_api.founder_import_review import _issue_types

    fields = dict(Bookmaker="Bookmaker A", OfferName="Synthetic offer", OfferType="Free Spins",
                  DateStarted="", Status="Settled", Result="Win", FinalNetPnL="4.50")
    _, errors = map_casino_offer_import_fields(fields)
    assert any("date_started:" in error["message"] for error in errors)
    assert _issue_types(errors, fields, "casino") == ["override_missing_reason"]


@pytest.mark.parametrize("mode", ["neon", "postgres", "postgresql"])
def test_hosted_ledger_confirmation_never_attempts_local_backup(monkeypatch, mode):
    from fastapi import HTTPException

    from openforge_api import imports

    monkeypatch.setattr(imports.settings, "database_mode", mode)
    def prohibited_backup(**kwargs):
        pytest.fail("Hosted per-ledger confirmation must not begin local backup or writes")
    monkeypatch.setattr(imports, "create_verified_local_backup", prohibited_backup)
    with pytest.raises(HTTPException) as error:
        imports._verified_ledger_import_backup("SYNTHETIC-BATCH")
    assert error.value.status_code == 409
    assert "no records were imported" in error.value.detail
