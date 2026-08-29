from openforge_api.account_catalogue_source import MasterAccountCatalogue
from openforge_api.founder_workbook_dry_run import (
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
