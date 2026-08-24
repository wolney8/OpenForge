from decimal import Decimal

from openforge_api.calculations.each_way_extra_place import EachWayCalculationInput, calculate_each_way_extra_place


def test_mbb_extra_place_reference_example() -> None:
    result = calculate_each_way_extra_place(EachWayCalculationInput(
        mode="Extra Place", each_way_stake="10", back_odds="6", place_term_denominator="5",
        win_lay_odds="2.3", place_lay_odds="4.5",
    ))
    assert result.calculation_state == "resolved"
    assert result.place_back_odds == Decimal("2.0")
    assert result.win_lay_stake == Decimal("26.09")
    assert result.place_lay_stake == Decimal("4.44")
    assert result.first_place_pnl == Decimal("10.54")
    assert result.standard_place_pnl == Decimal("10.55")
    assert result.extra_place_pnl == Decimal("30.53")
    assert result.unplaced_pnl == Decimal("10.53")
    assert result.first_place_bookie_win_pnl == Decimal("50.00")
    assert result.first_place_bookie_place_pnl == Decimal("10.00")
    assert result.first_place_exchange_win_pnl == Decimal("-33.92")
    assert result.first_place_exchange_place_pnl == Decimal("-15.54")
    assert result.first_place_bookie_pnl + result.first_place_exchange_pnl == result.first_place_pnl
    assert result.standard_place_bookie_pnl + result.standard_place_exchange_pnl == result.standard_place_pnl
    assert result.extra_place_bookie_pnl + result.extra_place_exchange_pnl == result.extra_place_pnl
    assert result.unplaced_bookie_pnl + result.unplaced_exchange_pnl == result.unplaced_pnl


def test_extra_place_settlement_and_void() -> None:
    payload = dict(mode="Extra Place", each_way_stake="10", back_odds="6", place_term_denominator="5", win_lay_odds="2.3", place_lay_odds="4.5")
    assert calculate_each_way_extra_place(EachWayCalculationInput(**payload, result="Extra Place")).final_value == Decimal("30.53")
    assert calculate_each_way_extra_place(EachWayCalculationInput(**payload, result="Void/NR")).final_value == Decimal("0.00")


def test_each_way_current_value_excludes_extra_place_only_branch() -> None:
    result = calculate_each_way_extra_place(EachWayCalculationInput(
        mode="Each Way", each_way_stake="10", back_odds="6", place_term_denominator="5",
        win_lay_odds="2.3", place_lay_odds="4.5",
    ))
    assert result.current_value == min(result.first_place_pnl, result.standard_place_pnl, result.unplaced_pnl)


def test_historical_actual_legs_remain_authoritative() -> None:
    result = calculate_each_way_extra_place(EachWayCalculationInput(
        mode="Extra Place", each_way_stake="5", back_odds="26", place_term_denominator="5",
        win_lay_odds="29", place_lay_odds="7.962", actual_win_lay_stake="4.48", actual_place_lay_stake="3.75",
        result="Extra Place",
    ))
    assert result.final_value == Decimal("28.23")
