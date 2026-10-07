from __future__ import annotations

import json
from decimal import Decimal
from io import BytesIO
from xml.sax.saxutils import quoteattr
from zipfile import ZIP_DEFLATED, ZipFile

import pytest
from test_account_money_safety import money_client  # noqa: F401
from test_free_bet_atomic_safety import free_client  # noqa: F401

from openforge_api.sportsbook_promotions import (
    calculate_offer_position,
    reward_face_value,
    validate_promotion_json,
    wagering_target,
)


def promotion(**changes: object) -> dict[str, object]:
    value: dict[str, object] = {
        "schema_version": "sportsbook-promotion-v1",
        "reward_type": "BonusFunds",
        "reward_calculation": "PercentOfLosingStake",
        "refund_percent": "50",
        "reward_cap": "50",
        "reward_face_value": "50",
        "reward_status": "Locked",
        "bonus_retention_percent": "70",
        "wagering_required": True,
        "wagering_multiplier": "2",
        "wagering_basis": "Reward",
        "wagering_funding_source": "RewardBalance",
        "minimum_wagering_odds": "1.60",
        "qualifying_scope": "SpecificFixture",
        "qualifying_requirement": "Synthetic Fixture A",
    }
    return {**value, **changes}


def trigger(**changes: object) -> dict[str, object]:
    value: dict[str, object] = {
        "promotion_json": json.dumps(promotion()),
        "back_stake": "100",
        "bonus_retention_rate": "70",
        "status": "Settled",
        "reporting_value": "-20.19",
        "scenario_pnl_if_lay_wins": "-20.19",
    }
    return {**value, **changes}


def wagering(**changes: object) -> dict[str, object]:
    value: dict[str, object] = {
        "bet_role": "Wagering",
        "status": "Placed",
        "back_stake": "40",
        "back_odds": "1.80",
        "wagering_contribution": "",
        "reporting_value": None,
    }
    return {**value, **changes}


def test_cb503_position_keeps_cash_reward_and_projection_distinct() -> None:
    result = calculate_offer_position(trigger(), [])
    assert result.cash_pnl_now == Decimal("-20.19")
    assert result.locked_reward_face_value == Decimal("50.00")
    assert result.estimated_convertible_value == Decimal("35.00")
    assert result.projected_final_offer_pnl == Decimal("14.81")
    assert result.wagering_target == Decimal("100.00")
    assert result.wagering_remaining == Decimal("100.00")


def test_wagering_defaults_to_eligible_stake_and_supports_partial_override() -> None:
    result = calculate_offer_position(
        trigger(),
        [wagering(), wagering(back_stake="60", wagering_contribution="25")],
    )
    assert result.wagering_completed == Decimal("65.00")
    assert result.wagering_remaining == Decimal("35.00")
    assert result.reward_status == "Wagering"


def test_ineligible_odds_do_not_contribute_and_release_replaces_projection() -> None:
    partial = calculate_offer_position(trigger(), [wagering(back_odds="1.59")])
    assert partial.wagering_completed == Decimal("0.00")
    released = calculate_offer_position(trigger(), [wagering(back_stake="100")])
    assert released.reward_status == "Released"
    assert released.locked_reward_face_value == Decimal("0.00")
    assert released.estimated_convertible_value == Decimal("0.00")
    assert released.projected_final_offer_pnl == Decimal("-20.19")


def test_realised_wagering_conversion_replaces_estimate_without_double_counting() -> None:
    result = calculate_offer_position(
        trigger(),
        [
            wagering(
                back_stake="100",
                status="Settled",
                reporting_value="35.00",
            )
        ],
    )
    assert result.reward_status == "Released"
    assert result.cash_pnl_now == Decimal("14.81")
    assert result.locked_reward_face_value == Decimal("0.00")
    assert result.estimated_convertible_value == Decimal("0.00")
    assert result.projected_final_offer_pnl == Decimal("14.81")


@pytest.mark.parametrize(
    ("basis", "base", "multiplier", "expected"),
    [
        ("Reward", "", "3", "150.00"),
        ("Deposit", "100", "2", "200.00"),
        ("DepositPlusReward", "150", "2", "300.00"),
    ],
)
def test_wagering_bases_are_explicit(basis: str, base: str, multiplier: str, expected: str) -> None:
    data = promotion(
        wagering_basis=basis,
        wagering_base_amount=base,
        wagering_multiplier=multiplier,
    )
    assert wagering_target(data, Decimal("50")) == Decimal(expected)


def test_fixed_and_arbitrary_wagering_targets_are_preserved() -> None:
    assert wagering_target(
        promotion(wagering_target_override="87.50", wagering_multiplier="2.75"),
        Decimal("50"),
    ) == Decimal("87.50")
    assert wagering_target(promotion(wagering_multiplier="2.75"), Decimal("50")) == Decimal(
        "137.50"
    )


@pytest.mark.parametrize(
    "reward_type",
    ["Cash", "BonusFunds", "SiteCredit", "FreeBetSNR", "FreeBetSR", "Unknown"],
)
def test_supported_reward_types_round_trip(reward_type: str) -> None:
    serialized = validate_promotion_json(json.dumps(promotion(reward_type=reward_type)))
    assert json.loads(serialized)["reward_type"] == reward_type


def test_percentage_refund_is_capped() -> None:
    assert reward_face_value(promotion(reward_face_value=""), Decimal("100")) == Decimal("50.00")
    assert reward_face_value(
        promotion(reward_face_value="", reward_cap="30"), Decimal("100")
    ) == Decimal("30.00")


def test_sportsbook_promotion_link_persists_and_position_is_profile_scoped(  # noqa: F811
    free_client,  # noqa: F811
) -> None:
    from test_sportsbook_atomic_safety import payload

    group = "OFG-DEMO-CB503"
    commission = free_client.put(
        "/profiles/money-a/exchange-commissions",
        json={"exchange_name": "Exchange A", "commission_rate": "0"},
    )
    assert commission.status_code == 200, commission.text
    trigger_payload = payload(
        sportsbook_bet_id="SB-DEMO-TRIGGER",
        offer_type="Refund",
        status="Settled",
        result="Lay Won",
        back_stake="100",
        back_odds="4.5",
        lay_odds_1="5.2",
        lay_actual="79.81",
        lay_commission_1="0",
        bonus_trigger="Lay Wins",
        maximum_bonus="50",
        bonus_retention_rate="70",
        offer_group_id=group,
        bet_role="Trigger",
        promotion_json=json.dumps(promotion()),
    )
    made = free_client.post("/profiles/money-a/sportsbook-bets", json=trigger_payload)
    assert made.status_code == 201, made.text
    assert made.json()["scenario_pnl_if_back_wins"] == "14.80"
    assert made.json()["scenario_pnl_if_lay_wins"] == "-20.19"
    linked = free_client.post(
        "/profiles/money-a/sportsbook-bets",
        json=payload(
            sportsbook_bet_id="SB-DEMO-WAGER",
            status="Placed",
            back_stake="40",
            back_odds="1.8",
            lay_odds_1="1.9",
            lay_actual="38",
            offer_group_id=group,
            bet_role="Wagering",
            wagering_contribution="",
        ),
    )
    assert linked.status_code == 201, linked.text
    position = free_client.get(f"/profiles/money-a/sportsbook-bets/promotion-position/{group}")
    assert position.status_code == 200
    assert position.json()["wagering_completed"] == "40.00"
    assert position.json()["wagering_remaining"] == "60.00"
    assert (
        free_client.get(f"/profiles/money-b/sportsbook-bets/promotion-position/{group}").status_code
        == 404
    )


def test_linked_import_without_promotion_details_remains_reviewable(  # noqa: F811
    free_client,  # noqa: F811
) -> None:
    from test_sportsbook_atomic_safety import payload

    made = free_client.post(
        "/profiles/money-a/sportsbook-bets",
        json=payload(
            sportsbook_bet_id="SB-REVIEW-TRIGGER",
            offer_type="Refund",
            offer_group_id="OFG-REVIEW",
            bet_role="Trigger",
        ),
    )
    assert made.status_code == 201, made.text
    position = free_client.get("/profiles/money-a/sportsbook-bets/promotion-position/OFG-REVIEW")
    assert position.status_code == 200
    assert position.json()["review_required"] is True
    assert position.json()["review_message"] == "Promotion details required"


def test_non_standalone_bet_requires_group(free_client) -> None:  # noqa: F811
    from test_sportsbook_atomic_safety import payload

    response = free_client.post(
        "/profiles/money-a/sportsbook-bets", json=payload(bet_role="Wagering")
    )
    assert response.status_code == 422


def test_sportsbook_import_maps_link_fields_without_offer_group_sheet() -> None:
    from openforge_api.imports import map_sportsbook_import_fields

    mapped, errors = map_sportsbook_import_fields(
        {
            "QualBetID": "DEMO-TRIGGER-001",
            "EventName": "Synthetic Fixture A",
            "Bookmaker": "Bookmaker A",
            "OfferType": "Refund If Loses",
            "Status": "Prospecting",
            "Result": "Pending",
            "BackStake": "100",
            "MatchStrategy": "Standard",
            "Offer Group ID": "OFG-DEMO-001",
            "BetRole": "Trigger",
            "WageringContribution (£)": "",
        }
    )
    assert errors == []
    assert mapped["offer_group_id"] == "OFG-DEMO-001"
    assert mapped["bet_role"] == "Trigger"
    assert mapped["promotion_json"] is None


def test_missing_promotion_metadata_is_reviewable_not_rejected() -> None:
    from openforge_api.imports import ImportRowPayload, stage_import_rows

    staged = stage_import_rows(
        profile_id="profile-synthetic-promotion-review",
        mapping_version="sportsbook-v1",
        rows=[
            ImportRowPayload(
                sheet="Sportsbook Bets",
                source_record_id="SB-SYNTHETIC-REVIEW",
                fields={
                    "QualBetID": "SB-SYNTHETIC-REVIEW",
                    "EventName": "Synthetic Fixture",
                    "Bookmaker": "Bookmaker A",
                    "Status": "Prospecting",
                    "Result": "Pending",
                    "BackStake": "10",
                    "BackOdds": "2",
                    "MatchStrategy": "No Lay",
                    "OfferGroupID": "OFG-SYNTHETIC-REVIEW",
                    "BetRole": "Trigger",
                },
            )
        ],
    )
    assert staged[0]["errors"] == []
    assert [warning["code"] for warning in staged[0]["warnings"]] == [
        "promotion_details_required"
    ]


def _multi_sheet_workbook(
    ledgers: list[tuple[str, tuple[str, ...], list[dict[str, object]]]],
) -> bytes:
    from openforge_api.xlsx_export import build_ledger_export

    output = BytesIO()
    with ZipFile(output, "w", ZIP_DEFLATED) as target:
        sheets: list[str] = []
        relationships: list[str] = []
        for index, (name, headers, rows) in enumerate(ledgers, start=1):
            with ZipFile(
                BytesIO(
                    build_ledger_export(
                        rows,
                        headers=headers,
                        sheet_name=name,
                        table_name=f"SyntheticPromotion{index}",
                    )
                )
            ) as source:
                sheets.append(
                    f'<sheet name={quoteattr(name)} sheetId="{index}" r:id="rId{index}"/>'
                )
                relationships.append(
                    f'<Relationship Id="rId{index}" Target="worksheets/sheet{index}.xml" '
                    'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/>'
                )
                target.writestr(
                    f"xl/worksheets/sheet{index}.xml",
                    source.read("xl/worksheets/sheet1.xml"),
                )
                target.writestr(
                    f"xl/tables/table{index}.xml",
                    source.read("xl/tables/table1.xml").replace(
                        b'id="1" name=', f'id="{index}" name='.encode()
                    ),
                )
                target.writestr(
                    f"xl/worksheets/_rels/sheet{index}.xml.rels",
                    source.read("xl/worksheets/_rels/sheet1.xml.rels").replace(
                        b"table1.xml", f"table{index}.xml".encode()
                    ),
                )
        target.writestr(
            "xl/workbook.xml",
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            f"<sheets>{''.join(sheets)}</sheets></workbook>",
        )
        target.writestr(
            "xl/_rels/workbook.xml.rels",
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            f"{''.join(relationships)}</Relationships>",
        )
    return output.getvalue()


def test_legacy_and_current_workbook_promotion_fields_round_trip() -> None:
    from openforge_api.imports import map_sportsbook_import_fields
    from openforge_api.xlsx_export import (
        SPORTSBOOK_EXPORT_HEADERS,
        build_free_bet_export,
        build_ledger_export,
        build_sportsbook_export,
    )
    from openforge_api.xlsx_import import parse_free_bet_xlsx, parse_sportsbook_xlsx

    legacy_headers = tuple(
        header
        for header in SPORTSBOOK_EXPORT_HEADERS
        if header
        not in {
            "OfferGroupID",
            "BetRole",
            "WageringContribution (£)",
            "PromotionDetailsJson",
        }
    )
    legacy = build_ledger_export(
        [
            {
                "QualBetID": "LEGACY-001",
                "EventName": "Synthetic Legacy",
                "Bookmaker": "Bookmaker A",
                "Status": "Prospecting",
                "Result": "Pending",
                "BackStake": "10",
                "BackOdds": "2",
                "MatchStrategy": "No Lay",
            }
        ],
        headers=legacy_headers,
        sheet_name="Sportsbook Bets",
        table_name="SyntheticLegacySportsbook",
    )
    legacy_row = parse_sportsbook_xlsx(legacy).rows[0]
    legacy_mapped, legacy_errors = map_sportsbook_import_fields(legacy_row.fields)
    assert legacy_errors == []
    assert legacy_mapped["offer_group_id"] == ""
    assert legacy_mapped["bet_role"] == "Standalone"

    details = json.dumps(promotion())
    current = build_sportsbook_export(
        [
            {
                "QualBetID": "CURRENT-001",
                "EventName": "Synthetic Current",
                "Bookmaker": "Bookmaker A",
                "Status": "Prospecting",
                "Result": "Pending",
                "BackStake": "100",
                "BackOdds": "4.5",
                "MatchStrategy": "No Lay",
                "OfferGroupID": "OFG-SYNTHETIC-001",
                "BetRole": "Trigger",
                "WageringContribution (£)": "25",
                "PromotionDetailsJson": details,
            }
        ]
    )
    current_row = parse_sportsbook_xlsx(current).rows[0]
    current_mapped, current_errors = map_sportsbook_import_fields(current_row.fields)
    assert current_errors == []
    assert current_mapped["offer_group_id"] == "OFG-SYNTHETIC-001"
    assert current_mapped["bet_role"] == "Trigger"
    assert current_mapped["wagering_contribution"] == "25"
    assert json.loads(str(current_mapped["promotion_json"])) == promotion()

    free_bet = build_free_bet_export(
        [
            {
                "FreeBetID": "FB-SYNTHETIC-001",
                "EventName": "Synthetic Reward",
                "Bookmaker": "Bookmaker A",
                "FreeBetValue": "10",
                "OfferGroupID": "OFG-SYNTHETIC-001",
            }
        ]
    )
    assert parse_free_bet_xlsx(free_bet).rows[0].fields["OfferGroupID"] == "OFG-SYNTHETIC-001"


def test_optional_offer_groups_sheet_enriches_by_header_without_becoming_required() -> None:
    from openforge_api.imports import enrich_sportsbook_xlsx_rows
    from openforge_api.xlsx_export import SPORTSBOOK_EXPORT_HEADERS
    from openforge_api.xlsx_import import parse_sportsbook_xlsx

    offer_headers = (
        "OfferGroupID",
        "OfferName",
        "RewardType",
        "RewardCalculation",
        "RewardRatePct",
        "RewardCap (£)",
        "RewardAwardedValue (£)",
        "RewardStatus",
        "WageringMultiplier",
        "WageringBasis",
        "WageringFundingSource",
        "WageringMinOdds",
        "QualifyingScope",
        "QualifyingRequirementRef",
    )
    workbook = _multi_sheet_workbook(
        [
            (
                "Sportsbook Bets",
                SPORTSBOOK_EXPORT_HEADERS,
                [
                    {
                        "QualBetID": "CURRENT-ENRICH-001",
                        "EventName": "Synthetic Fixture A",
                        "Bookmaker": "Bookmaker A",
                        "BackStake": "100",
                        "OfferGroupID": "OFG-ENRICH-001",
                        "BetRole": "Trigger",
                    }
                ],
            ),
            (
                "Offer Groups",
                offer_headers,
                [
                    {
                        "OfferGroupID": "OFG-ENRICH-001",
                        "OfferName": "Synthetic Refund",
                        "RewardType": "BonusFunds",
                        "RewardCalculation": "PercentOfLosingStake",
                        "RewardRatePct": "50",
                        "RewardCap (£)": "50",
                        "RewardAwardedValue (£)": "50",
                        "RewardStatus": "Awarded",
                        "WageringMultiplier": "2",
                        "WageringBasis": "Reward",
                        "WageringFundingSource": "RewardBalance",
                        "WageringMinOdds": "1.6",
                        "QualifyingScope": "SpecificFixture",
                        "QualifyingRequirementRef": "Synthetic Fixture A",
                    }
                ],
            ),
        ]
    )
    parsed = parse_sportsbook_xlsx(workbook)
    enriched = enrich_sportsbook_xlsx_rows(workbook, parsed.rows)
    assert json.loads(str(enriched[0]["PromotionDetailsJson"]))["reward_cap"] == "50"


def test_optional_promotion_enrichment_is_header_driven_and_validated() -> None:
    from openforge_api.imports import map_sportsbook_import_fields

    details = json.dumps(promotion())
    mapped, errors = map_sportsbook_import_fields(
        {
            "EventName": "Synthetic Fixture A",
            "Bookmaker": "Bookmaker A",
            "OfferType": "Refund If Loses",
            "Status": "Prospecting",
            "Result": "Pending",
            "BackStake": "100",
            "MatchStrategy": "Standard",
            "OfferGroupID": "OFG-DEMO-001",
            "BetRole": "Trigger",
            "PromotionDetailsJson": details,
        }
    )
    assert errors == []
    assert json.loads(str(mapped["promotion_json"]))["reward_cap"] == "50"


def test_offer_group_headers_enrich_valid_metadata_and_reject_shifted_values() -> None:
    from openforge_api.imports import promotion_details_from_offer_group

    valid, review = promotion_details_from_offer_group(
        {
            "RewardType": "BonusFunds",
            "RewardCalculation": "PercentOfLosingStake",
            "RewardRatePct": "50",
            "RewardCap (£)": "50",
            "RewardAwardedValue (£)": "50",
            "RewardStatus": "Awarded",
            "DepositAmount (£)": "100",
            "WageringMultiplier": "2",
            "WageringBasis": "Reward",
            "WageringFundingSource": "RewardBalance",
            "WageringMinOdds": "1.6",
            "QualifyingScope": "SpecificFixture",
            "QualifyingRequirementRef": "Synthetic Fixture A",
        }
    )
    assert review is None
    assert json.loads(str(valid))["wagering_multiplier"] == "2"

    invalid, review = promotion_details_from_offer_group(
        {
            "RewardType": "Unknown",
            "RewardCalculation": "PercentOfLosingStake",
            "RewardStatus": "Awarded",
            "WageringMultiplier": "2",
            "WageringBasis": "Reward",
            "WageringFundingSource": "RewardBalance",
            "QualifyingMinOdds": "SpecificFixture",
            "QualifyingScope": "Synthetic Fixture A",
        }
    )
    assert invalid is None
    assert "QualifyingScope" in str(review) or "QualifyingMinOdds" in str(review)


def test_wagering_role_uses_normal_bet_economics(free_client) -> None:  # noqa: F811
    from test_sportsbook_atomic_safety import payload

    made = free_client.post(
        "/profiles/money-a/sportsbook-bets",
        json=payload(
            sportsbook_bet_id="SB-WAGER-NORMAL-ECONOMICS",
            offer_type="Refund",
            offer_group_id="OFG-NORMAL-ECONOMICS",
            bet_role="Wagering",
            status="Placed",
            back_stake="40",
            back_odds="1.80",
            lay_odds_1="1.90",
            lay_actual="37.89",
            maximum_bonus="",
            bonus_trigger="",
        ),
    )
    assert made.status_code == 201, made.text
    assert made.json()["calculation_state"] == "resolved"
    assert made.json()["scenario_pnl_if_outcome_2_wins"] is None
