from __future__ import annotations

import json
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from openforge_api.calculations.casino_offer_values import (
    CasinoOfferCalculationInput,
    calculate_casino_offer_values,
    calculate_casino_offers_for_profile,
)


def load_fixture_cases() -> list[dict[str, object]]:
    fixture_path = (
        Path(__file__).resolve().parents[3] / "tests" / "fixtures" / "casino-offer-fixtures.json"
    )
    return json.loads(fixture_path.read_text())


def as_decimal(value: str | None) -> Decimal | None:
    if value is None:
        return None
    return Decimal(value)


def test_casino_offer_fixture_cases() -> None:
    as_of_datetime = datetime.fromisoformat("2026-07-13T12:00:00")

    for case in load_fixture_cases():
        result = calculate_casino_offer_values(
            CasinoOfferCalculationInput(**case["input"]),
            as_of_datetime=as_of_datetime,
        )
        expected = case["expected"]
        assert result.resolved_net_pnl == as_decimal(expected["resolved_net_pnl"])
        assert result.week_label == expected["week_label"]
        assert result.calculation_state == expected["calculation_state"]
        assert result.counts_as_open is expected["counts_as_open"]
        assert result.is_overdue is expected["is_overdue"]


def test_casino_offer_profile_filtering() -> None:
    results = calculate_casino_offers_for_profile(
        "profile-demo-001",
        [
            CasinoOfferCalculationInput(
                profile_id="profile-demo-001",
                record_id="CO-A",
                date_started="2026-07-10 00:00:00",
                date_settling="2026-07-10 00:00:00",
                expiry_datetime="",
                status="Settled",
                calc_net_pnl="1.00",
                final_net_pnl="",
            ),
            CasinoOfferCalculationInput(
                profile_id="profile-demo-002",
                record_id="CO-B",
                date_started="2026-07-10 00:00:00",
                date_settling="2026-07-10 00:00:00",
                expiry_datetime="",
                status="Settled",
                calc_net_pnl="2.00",
                final_net_pnl="",
            ),
        ],
        as_of_datetime=datetime.fromisoformat("2026-07-13T12:00:00"),
    )

    assert [result.record_id for result in results] == ["CO-A"]


def test_prospecting_casino_offer_without_values_resolves_as_zero_placeholder() -> None:
    result = calculate_casino_offer_values(
        CasinoOfferCalculationInput(
            profile_id="profile-demo-001",
            record_id="CO-PROSPECT",
            date_started="2026-07-13 00:00:00",
            date_settling="",
            expiry_datetime="",
            status="Prospecting",
            calc_net_pnl="",
            final_net_pnl="",
        ),
        as_of_datetime=datetime.fromisoformat("2026-07-13T12:00:00"),
    )

    assert result.resolved_net_pnl == Decimal("0.00")
    assert result.calculation_state == "resolved"
    assert result.counts_as_open is True
    assert (
        "Prospecting casino row has no bankroll value yet; current and final "
        "values stay at 0.00 until the campaign is active."
        in result.calculation_notes
    )
