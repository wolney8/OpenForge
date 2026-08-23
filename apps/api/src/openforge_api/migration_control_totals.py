from __future__ import annotations

from datetime import date
from decimal import Decimal, InvalidOperation

from pydantic import BaseModel

from openforge_api.cash_adjustments import build_response as build_cash_adjustment_response
from openforge_api.casino_offers import build_response as build_casino_offer_response
from openforge_api.db import (
    get_profile_tracker_settings,
    list_cash_adjustments,
    list_casino_offers,
    list_free_bets,
    list_profiles,
    list_sportsbook_bets,
)
from openforge_api.free_bets import build_response as build_free_bet_response
from openforge_api.sportsbook import build_response as build_sportsbook_bet_response


class MigrationModuleControlTotal(BaseModel):
    profile_id: str
    profile_code: str
    profile_name: str
    module: str
    row_count: int
    current_value_total: str | None = None
    final_value_total: str | None = None
    signed_amount_total: str | None = None
    missing_current_value_count: int = 0
    missing_final_value_count: int = 0
    invalid_money_value_count: int = 0


class MigrationControlTotalsResponse(BaseModel):
    migration_boundary: str
    profile_count: int
    module_count: int
    total_row_count: int
    current_value_grand_total: str
    final_value_grand_total: str
    signed_amount_grand_total: str
    missing_current_value_count: int
    missing_final_value_count: int
    invalid_money_value_count: int
    warnings: list[str]
    module_totals: list[MigrationModuleControlTotal]


def parse_money(value: str | None) -> Decimal | None:
    if value is None:
        return None
    stripped = str(value).strip()
    if not stripped:
        return None
    try:
        return Decimal(stripped)
    except InvalidOperation:
        return None


def format_money(value: Decimal) -> str:
    return f"{value:.2f}"


def build_module_total(
    *,
    profile_id: str,
    profile_code: str,
    profile_name: str,
    module: str,
    current_values: list[str | None],
    final_values: list[str | None],
    signed_values: list[str | None] | None = None,
) -> MigrationModuleControlTotal:
    current_total = Decimal("0")
    final_total = Decimal("0")
    signed_total = Decimal("0")
    missing_current = 0
    missing_final = 0
    invalid_values = 0

    for value in current_values:
        parsed = parse_money(value)
        if parsed is None:
            missing_current += 1
        else:
            current_total += parsed

    for value in final_values:
        parsed = parse_money(value)
        if parsed is None:
            missing_final += 1
        else:
            final_total += parsed

    for value in signed_values or []:
        parsed = parse_money(value)
        if parsed is None:
            invalid_values += 1
        else:
            signed_total += parsed

    return MigrationModuleControlTotal(
        profile_id=profile_id,
        profile_code=profile_code,
        profile_name=profile_name,
        module=module,
        row_count=max(len(current_values), len(final_values), len(signed_values or [])),
        current_value_total=format_money(current_total) if current_values else None,
        final_value_total=format_money(final_total) if final_values else None,
        signed_amount_total=format_money(signed_total) if signed_values is not None else None,
        missing_current_value_count=missing_current,
        missing_final_value_count=missing_final,
        invalid_money_value_count=invalid_values,
    )


def build_migration_control_totals() -> MigrationControlTotalsResponse:
    module_totals: list[MigrationModuleControlTotal] = []
    warnings: list[str] = [
        (
            "Control totals are local SQLite preview values only; no PostgreSQL data is read "
            "or written."
        ),
        "Blank current/final values are counted as missing and are not silently treated as money.",
    ]

    profiles = list_profiles()
    for profile in profiles:
        profile_id = profile.profile_id
        profile_code = profile.profile_code
        profile_name = profile.display_name
        tracker_settings = get_profile_tracker_settings(profile_id)

        sportsbook_rows = [
            build_sportsbook_bet_response(profile_id, row, as_of_date=date.today())
            for row in list_sportsbook_bets(profile_id)
        ]
        module_totals.append(
            build_module_total(
                profile_id=profile_id,
                profile_code=profile_code,
                profile_name=profile_name,
                module="sportsbook_bets",
                current_values=[row.projected_current_pnl for row in sportsbook_rows],
                final_values=[row.final_net_pnl for row in sportsbook_rows],
            )
        )

        free_bet_rows = [
            build_free_bet_response(row, tracker_settings=tracker_settings)
            for row in list_free_bets(profile_id)
        ]
        module_totals.append(
            build_module_total(
                profile_id=profile_id,
                profile_code=profile_code,
                profile_name=profile_name,
                module="free_bets",
                current_values=[row.projected_current_pnl for row in free_bet_rows],
                final_values=[row.final_net_pnl for row in free_bet_rows],
            )
        )

        casino_rows = [
            build_casino_offer_response(row) for row in list_casino_offers(profile_id)
        ]
        module_totals.append(
            build_module_total(
                profile_id=profile_id,
                profile_code=profile_code,
                profile_name=profile_name,
                module="casino_offers",
                current_values=[row.resolved_net_pnl for row in casino_rows],
                final_values=[row.final_net_pnl for row in casino_rows],
            )
        )

        cash_adjustment_rows = [
            build_cash_adjustment_response(row) for row in list_cash_adjustments(profile_id)
        ]
        module_totals.append(
            build_module_total(
                profile_id=profile_id,
                profile_code=profile_code,
                profile_name=profile_name,
                module="cash_adjustments",
                current_values=[],
                final_values=[],
                signed_values=[row.signed_amount for row in cash_adjustment_rows],
            )
        )

    current_grand_total = Decimal("0")
    final_grand_total = Decimal("0")
    signed_grand_total = Decimal("0")
    for module_total in module_totals:
        current_grand_total += parse_money(module_total.current_value_total) or Decimal("0")
        final_grand_total += parse_money(module_total.final_value_total) or Decimal("0")
        signed_grand_total += parse_money(module_total.signed_amount_total) or Decimal("0")

    return MigrationControlTotalsResponse(
        migration_boundary="control-totals-preview-no-data-write",
        profile_count=len(profiles),
        module_count=len(module_totals),
        total_row_count=sum(module_total.row_count for module_total in module_totals),
        current_value_grand_total=format_money(current_grand_total),
        final_value_grand_total=format_money(final_grand_total),
        signed_amount_grand_total=format_money(signed_grand_total),
        missing_current_value_count=sum(
            module_total.missing_current_value_count for module_total in module_totals
        ),
        missing_final_value_count=sum(
            module_total.missing_final_value_count for module_total in module_totals
        ),
        invalid_money_value_count=sum(
            module_total.invalid_money_value_count for module_total in module_totals
        ),
        warnings=warnings,
        module_totals=module_totals,
    )
