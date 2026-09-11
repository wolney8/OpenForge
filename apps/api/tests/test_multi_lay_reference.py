from decimal import Decimal

import pytest

from openforge_api.calculations.multi_lay_reference import (
    MultiLayLegInput,
    calculate_multi_lay_reference,
)

LEGS = (
    MultiLayLegInput("Outcome A", Decimal("2.5"), Decimal("0.05")),
    MultiLayLegInput("Outcome B", Decimal("3"), Decimal("0.05")),
)

Fixture = tuple[str, str, str, str, list[str], list[str], str]

CASES: list[Fixture] = [
    ("normal", "0", "standard", "1", ["16.33", "13.56"], ["18.39", "18.38", "18.39"], "10.94"),
    ("normal", "0", "underlay", "1", ["5.75", "4.78"], ["0.00", "25.91", "25.90"], "3.85"),
    ("normal", "0", "overlay", "1", ["42.19", "35.04"], ["63.37", "0.00", "0.00"], "28.25"),
    ("free_bet_snr", "0", "standard", "1", ["12.24", "10.17"], ["21.29", "21.30", "21.29"], "8.19"),
    ("free_bet_snr", "0", "underlay", "1", ["0.00", "0.00"], ["0.00", "30.00", "30.00"], "0.00"),
    ("free_bet_snr", "0", "overlay", "1", ["42.19", "35.04"], ["73.37", "0.00", "0.00"], "28.25"),
    ("free_bet_snr", "0", "custom", "1.1", ["13.47", "11.19"], ["23.43", "20.42", "20.42"], "9.02"),
    ("money_back", "10", "standard", "1", ["13.47", "11.19"], ["20.43", "20.42", "20.42"], "9.02"),
    ("money_back", "10", "underlay", "1", ["1.73", "1.43"], ["0.00", "28.76", "28.78"], "1.17"),
    ("money_back", "10", "overlay", "1", ["42.19", "35.04"], ["70.37", "0.00", "0.00"], "28.25"),
    ("money_back", "10", "custom", "1.1", ["14.82", "12.31"], ["22.77", "19.46", "19.46"], "9.92"),
    ("normal", "0", "custom", "1.1", ["17.96", "14.92"], ["21.23", "17.23", "17.22"], "12.02"),
]


@pytest.mark.parametrize(
    ("backing_type", "refund", "strategy", "multiplier", "stakes", "totals", "exposure"),
    CASES,
)
def test_independent_two_outcome_reference_fixtures(
    backing_type: str,
    refund: str,
    strategy: str,
    multiplier: str,
    stakes: list[str],
    totals: list[str],
    exposure: str,
) -> None:
    result = calculate_multi_lay_reference(
        backing_type=backing_type,  # type: ignore[arg-type]
        back_stake=Decimal("10"),
        back_odds=Decimal("4"),
        profit_boost_percent=Decimal("0"),
        refund_amount=Decimal(refund),
        retention_percent=Decimal("70"),
        strategy=strategy,  # type: ignore[arg-type]
        custom_multiplier=Decimal(multiplier),
        legs=LEGS,
    )
    assert [f"{leg.lay_stake:.2f}" for leg in result.legs] == stakes
    assert [f"{scenario.total:.2f}" for scenario in result.scenarios] == totals
    assert f"{result.maximum_exchange_exposure:.2f}" == exposure


def test_profit_boost_and_differing_commissions_are_applied_before_penny_placement() -> None:
    boosted = calculate_multi_lay_reference(
        backing_type="normal",
        back_stake=Decimal("10"),
        back_odds=Decimal("4"),
        profit_boost_percent=Decimal("10"),
        refund_amount=Decimal("0"),
        retention_percent=Decimal("70"),
        strategy="standard",
        custom_multiplier=Decimal("1"),
        legs=LEGS,
    )
    assert boosted.effective_back_odds == Decimal("4.3000")
    assert [leg.lay_stake for leg in boosted.legs] == [Decimal("17.55"), Decimal("14.58")]
    assert [scenario.total for scenario in boosted.scenarios] == [
        Decimal("20.52"),
        Decimal("20.52"),
        Decimal("20.51"),
    ]

    varied = calculate_multi_lay_reference(
        backing_type="normal",
        back_stake=Decimal("10"),
        back_odds=Decimal("4"),
        profit_boost_percent=Decimal("0"),
        refund_amount=Decimal("0"),
        retention_percent=Decimal("70"),
        strategy="custom",
        custom_multiplier=Decimal("1.1"),
        legs=(
            MultiLayLegInput("A", Decimal("2.5"), Decimal("0.02")),
            MultiLayLegInput("B", Decimal("3"), Decimal("0.05")),
            MultiLayLegInput("C", Decimal("6"), Decimal("0.10")),
        ),
    )
    assert [leg.lay_stake for leg in varied.legs] == [
        Decimal("17.74"),
        Decimal("14.92"),
        Decimal("7.46"),
    ]
    assert [scenario.total for scenario in varied.scenarios] == [
        Decimal("28.27"),
        Decimal("24.27"),
        Decimal("24.26"),
        Decimal("24.26"),
    ]


def test_leg_count_and_infeasible_inputs_fail_closed() -> None:
    common = dict(
        backing_type="normal",
        back_stake=Decimal("10"),
        back_odds=Decimal("4"),
        profit_boost_percent=Decimal("0"),
        refund_amount=Decimal("0"),
        retention_percent=Decimal("70"),
        strategy="standard",
        custom_multiplier=Decimal("1"),
    )
    with pytest.raises(ValueError, match="between 2 and 20"):
        calculate_multi_lay_reference(**common, legs=LEGS[:1])
    with pytest.raises(ValueError, match="below 100"):
        calculate_multi_lay_reference(
            **common,
            legs=(MultiLayLegInput("A", Decimal("2"), Decimal("1")), LEGS[1]),
        )
    with pytest.raises(ValueError, match="exceeds the available backing basis"):
        calculate_multi_lay_reference(
            **{**common, "backing_type": "money_back", "refund_amount": Decimal("100")},
            legs=LEGS,
        )
