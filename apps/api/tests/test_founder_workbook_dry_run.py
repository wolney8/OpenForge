from datetime import date
from decimal import Decimal
from types import SimpleNamespace

from openforge_api.account_catalogue_source import MasterAccountCatalogue
from openforge_api.founder_workbook_dry_run import (
    LedgerDefinition,
    _ledger_report,
    _period_reconciliation,
    missing_extra_place_fields,
    normalize_legacy_account_fields,
    resolve_provider,
    stable_import_key,
)


def synthetic_catalogue() -> MasterAccountCatalogue:
    return MasterAccountCatalogue.model_validate(
        {
            "schema_version": "1.0",
            "catalogue_name": "Synthetic catalogue",
            "updated_at": "2026-08-29T00:00:00Z",
            "records": [
                {
                    "catalogue_id": "BOOKMAKER-DEMO",
                    "account_type": "Bookmaker",
                    "brand_name": "Demo Bet",
                    "short_display_name": "DemoBet",
                    "foreground_colour": "#FFFFFF",
                    "background_colour": "#111111",
                }
            ],
        }
    )


def test_provider_resolution_is_explicit_and_type_scoped() -> None:
    catalogue = synthetic_catalogue()

    exact = resolve_provider("Demo Bet", "Bookie", catalogue)
    normalized = resolve_provider("Demo-Bet", "Bookie", catalogue)
    missing = resolve_provider("Unknown Provider", "Bookie", catalogue)

    assert (exact.classification, exact.catalogue_id) == (
        "EXACT",
        "BOOKMAKER-DEMO",
    )
    assert (normalized.classification, normalized.catalogue_id) == (
        "NORMALIZED",
        "BOOKMAKER-DEMO",
    )
    assert missing.classification == "MISSING"
    assert resolve_provider("Demo Bet", "Bank", catalogue).classification == "MISSING"


def test_stable_import_key_is_repeatable_and_changes_with_source_data() -> None:
    first = stable_import_key("Sportsbook Bets", 2, "DEMO-001", {"Stake": "5.00"})
    repeated = stable_import_key("Sportsbook Bets", 2, "DEMO-001", {"Stake": "5.00"})
    changed = stable_import_key("Sportsbook Bets", 2, "DEMO-001", {"Stake": "6.00"})

    assert first == repeated
    assert changed != first


def test_legacy_account_values_are_normalized_without_erasing_source_semantics() -> None:
    normalized, transformations = normalize_legacy_account_fields(
        {"Status": "Restricted", "Channel": "App Only"}
    )

    assert normalized == {"Status": "Bonus Restricted", "Channel": "Mobile"}
    assert transformations == [
        "Status Restricted -> Bonus Restricted",
        "Channel App Only -> Mobile",
    ]


def test_extra_place_completeness_never_invents_missing_terms() -> None:
    assert missing_extra_place_fields({"PlaceTerms": "1/5"}) == [
        "bookmaker_places",
        "exchange_places",
        "place_lay_odds",
        "finishing_position",
    ]


def test_future_open_rows_keep_current_value_and_do_not_become_exceptions() -> None:
    parsed = SimpleNamespace(
        table_name="Synthetic_Free_Bets",
        table_reference="A1:G5",
        headers=("FreeBetID", "DateSettling", "Status", "NetPnL", "Liability1"),
        rows=[
            SimpleNamespace(
                source_row=2,
                source_record_id="FB-FUTURE-OPEN",
                outside_table_range=False,
                fields={
                    "DateSettling": "2026-09-06T18:10:00",
                    "Status": "Placed",
                    "NetPnL": "-2.00",
                    "Liability1": "12.50",
                    "MatchStrategy": "Underlay",
                },
            ),
            SimpleNamespace(
                source_row=3,
                source_record_id="FB-SETTLED",
                outside_table_range=False,
                fields={
                    "DateSettling": "2026-07-19T18:00:00",
                    "Status": "Settled",
                    "NetPnL": "5.00",
                    "Liability1": "9.00",
                    "MatchStrategy": "Standard",
                },
            ),
            SimpleNamespace(
                source_row=4,
                source_record_id="FB-FUTURE-SETTLED",
                outside_table_range=False,
                fields={
                    "DateSettling": "2026-12-05T18:00:00",
                    "Status": "Settled",
                    "NetPnL": "3.00",
                    "Liability1": "7.00",
                    "MatchStrategy": "Overlay",
                },
            ),
            SimpleNamespace(
                source_row=5,
                source_record_id="FB-MALFORMED-DATE",
                outside_table_range=False,
                fields={
                    "DateSettling": "not-a-date",
                    "Status": "Available",
                    "NetPnL": "-1.00",
                    "Liability1": "2.50",
                    "MatchStrategy": "Standard",
                },
            ),
        ],
    )
    definition = LedgerDefinition(
        key="free_bets",
        sheet_name="Free Bets",
        mapping_version="test-v1",
        parser=lambda _content: parsed,
        mapper=lambda _fields: ({}, []),
        settled_statuses=frozenset({"settled"}),
        open_statuses=frozenset({"available", "placed"}),
        formal_report_statuses=frozenset({"placed", "settled"}),
        pnl_fields=("FinalNetPnL", "NetPnL"),
        report_date_fields=("DateSettling",),
        settlement_date_fields=("DateSettling",),
        liability_fields=("Liability1",),
    )

    report = _ledger_report(b"synthetic", definition, effective_date=date(2026, 8, 29))

    assert report["summary"] == {
        "source_rows": 4,
        "mapped": 3,
        "partial": 1,
        "rejected": 0,
        "duplicates": 0,
        "accounted_rows": 4,
        "open": 2,
        "settled": 2,
        "other_state": 0,
        "source_pnl_total": "5.00",
        "reportable_pnl_total": "6.00",
        "realised_settled_pnl": "8.00",
        "open_current_worst_case_pnl": "-3.00",
        "open_exposure": "15.00",
        "future_settling_open": 1,
        "future_settling_open_current_pnl": "-2.00",
        "future_settled_review": 1,
    }
    rows = {row["source_record_id"]: row for row in report["validation_rows"]}
    assert rows["FB-FUTURE-OPEN"]["migration_state"] == "mapped"
    assert rows["FB-FUTURE-OPEN"]["errors"] == []
    assert rows["FB-FUTURE-OPEN"]["date_quality"] == "valid_future_open"
    assert rows["FB-FUTURE-OPEN"]["current_worst_case_pnl"] == "-2.00"
    assert rows["FB-FUTURE-OPEN"]["realised_pnl"] == ""
    assert rows["FB-FUTURE-SETTLED"]["date_quality"] == "future_settled_review"
    assert rows["FB-FUTURE-SETTLED"]["migration_state"] == "mapped"
    assert rows["FB-MALFORMED-DATE"]["migration_state"] == "partial"
    assert rows["FB-MALFORMED-DATE"]["errors"][0]["code"] == "invalid_source_date"
    assert report["strategy_counts"] == {"Overlay": 1, "Standard": 2, "Underlay": 1}
    assert [entry["source_record_id"] for entry in report["dated_pnl"]] == [
        "FB-FUTURE-OPEN",
        "FB-SETTLED",
        "FB-FUTURE-SETTLED",
    ]


def test_reconciliation_uses_workbook_week_rollups_without_snapshot_cutoff() -> None:
    sportsbook_rows = [
        {
            "date": "2026-08-29T12:00:00",
            "pnl": Decimal("10.00"),
            "financial_state": "realised",
        },
        {
            "date": "2026-08-30T12:00:00",
            "pnl": Decimal("-1.00"),
            "financial_state": "open_current",
        },
        {
            "date": "2026-08-31T18:00:00",
            "pnl": Decimal("6.97"),
            "financial_state": "open_current",
        },
        {
            "date": "2026-09-06T18:10:00",
            "pnl": Decimal("-2.00"),
            "financial_state": "open_current",
        },
        {
            "date": "2026-12-05T18:00:00",
            "pnl": Decimal("3.00"),
            "financial_state": "realised",
        },
    ]
    ledgers = {
        "sportsbook": {"dated_pnl": sportsbook_rows},
        "free_bets": {"dated_pnl": []},
        "casino": {"dated_pnl": []},
    }
    reports = {
        "week": {"rows": [["2026-08-24", "9.00", "0", "0", "9.00"]]},
        "month": {"rows": [["2026-08-01", "13.97", "0", "0", "13.97"]]},
        "year": {"rows": [["2026", "16.97", "0", "0", "16.97"]]},
    }

    result = _period_reconciliation(ledgers, reports, "2026-08-29T16:05:00+01:00")

    assert result["week"]["plum_duff_from_mapped_rows"]["total"] == "9.00"
    assert result["month"]["plum_duff_from_mapped_rows"]["total"] == "13.97"
    assert result["month"]["financial_views"]["open_current_worst_case_pnl"]["total"] == "3.97"
    assert result["year"]["plum_duff_from_mapped_rows"]["total"] == "16.97"
    assert result["year"]["financial_views"]["realised_settled_pnl"]["total"] == "13.00"
    assert result["year"]["difference"] == "0.00"
