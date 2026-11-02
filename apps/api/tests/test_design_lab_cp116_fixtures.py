"""Lab-only CP-116 fixed values must stay reconciled with the governed engine."""
from __future__ import annotations

import json
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from openforge_api.calculations.free_bet_current_value import (
    FreeBetCalculationInput,
    calculate_free_bet_current_value,
)

FIXTURES = Path(__file__).resolve().parents[3] / "tests" / "fixtures"


def test_free_bet_journey_values_use_existing_award_and_calculation_authorities() -> None:
    journey = json.loads((FIXTURES / "design-lab-cp116-financial-journeys.json").read_text())["free_bet"]
    bridge = json.loads((FIXTURES / "sportsbook-free-bet-award-bridge-fixtures.json").read_text())
    source = next(case for case in bridge["cases"] if case["case_id"] == journey["source_case"])
    assert source["expected"]["allowed"] is True
    assert source["expected"]["created_free_bet_status"] == "Available"
    assert source["expected_award_value"] == journey["face_value"]
    split_source = next(case for case in bridge["cases"] if case["case_id"] == journey["split_source_case"])
    assert split_source["expected"]["created_free_bet_count"] == 2
    assert [row["free_bet_value"] for row in split_source["split_rows"]] == ["3.00", "2.00"]
    existing = json.loads((FIXTURES / "free-bet-current-value-fixtures.json").read_text())
    case = next(case for case in existing["cases"] if case["case_id"] == journey["calculation_case"])
    assert case["inputs"]["free_bet_value"] == journey["face_value"]
    assert case["inputs"]["retention_mode"] == journey["retention_mode"]
    assert case["inputs"]["back_odds"] == journey["back_odds"]
    assert case["inputs"]["lay_odds_1"] == journey["lay_odds"]
    assert case["inputs"]["lay_commission_1"] == journey["commission"]
    for mode, prefix, stake_key in [("SNR", "", "planned_lay_stake"), ("SR", "sr_", "sr_planned_lay_stake")]:
        common = dict(profile_id=journey["profile_id"], record_id="LAB-FB-CP116-1", retention_mode=mode, free_bet_value=journey["face_value"], back_odds=journey["back_odds"], match_strategy="Standard", lay_odds_1=journey["lay_odds"], lay_commission_1=journey["commission"], lay_actual=journey[stake_key], lay_matched_stake_1=journey[stake_key], date_settled="2026-07-26")
        for status, result, key in [
            ("Placed", "Pending", prefix + "placed_projected_current_pnl"),
            ("Settled", "Back Won", prefix + "settled_back_won_final_pnl"),
            ("Settled", "Lay Won", prefix + "settled_lay_won_final_pnl"),
            ("Settled", "Void", "settled_void_final_pnl"),
        ]:
            calculated = calculate_free_bet_current_value(FreeBetCalculationInput(status=status, result=result, **common), as_of_datetime=datetime(2026, 7, 1, 12))
            amount = calculated.projected_current_pnl if status == "Placed" else calculated.final_net_pnl
            assert amount == Decimal(journey[key])
