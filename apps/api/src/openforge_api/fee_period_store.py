from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import Any
from uuid import uuid4

from openforge_api.calculations.fund_manager_fees import (
    FeePeriodCalculationInput,
    calculate_fee_correction,
    calculate_fee_period,
    decide_fee_period_reopen,
)
from openforge_api.db import (
    connect,
    get_cash_adjustment,
    get_profile,
    utc_now,
    write_cash_adjustment_audit_entry,
)


@dataclass(frozen=True)
class FeePeriodRevisionRecord:
    fee_revision_id: str
    profile_id: str
    fee_period_id: str
    revision_number: int
    reporting_basis: str
    fee_base_source_version: str
    fee_base_breakdown_json: str
    eligible_period_profit: str
    opening_loss_carryforward: str
    closing_loss_carryforward: str
    fee_base: str
    management_fee_percent: str
    investment_fee_percent: str
    management_fee_amount: str
    investment_fee_amount: str
    total_fee_due: str
    fee_package_id: str
    fee_package_version: int | None
    change_reason: str
    created_by: str
    created_at: str


@dataclass(frozen=True)
class FeeWithdrawalLinkRecord:
    fee_withdrawal_link_id: str
    profile_id: str
    fee_period_id: str
    fee_revision_id: str
    cash_adjustment_id: str
    component: str
    amount: str
    created_by: str
    created_at: str


@dataclass(frozen=True)
class FeeCorrectionRecord:
    fee_correction_id: str
    profile_id: str
    source_fee_period_id: str
    target_fee_period_id: str | None
    adjustment_type: str
    amount: str
    reason: str
    state: str
    created_by: str
    created_at: str
    applied_at: str | None


@dataclass(frozen=True)
class FeePeriodRecord:
    fee_period_id: str
    profile_id: str
    period_start: str
    period_end: str
    state: str
    current_revision_number: int
    crystallised_at: str | None
    crystallised_by: str | None
    reopened_at: str | None
    reopened_by: str | None
    created_at: str
    updated_at: str
    current_revision: FeePeriodRevisionRecord
    withdrawal_links: tuple[FeeWithdrawalLinkRecord, ...]
    corrections: tuple[FeeCorrectionRecord, ...]
    fee_withdrawn_amount: str
    fee_outstanding_amount: str


def money(value: Decimal) -> str:
    return f"{value:.2f}"


def map_revision(row: sqlite3.Row) -> FeePeriodRevisionRecord:
    return FeePeriodRevisionRecord(**dict(row))


def map_withdrawal_link(row: sqlite3.Row) -> FeeWithdrawalLinkRecord:
    return FeeWithdrawalLinkRecord(**dict(row))


def map_correction(row: sqlite3.Row) -> FeeCorrectionRecord:
    return FeeCorrectionRecord(**dict(row))


def get_fee_period_row(
    connection: sqlite3.Connection, profile_id: str, fee_period_id: str
) -> sqlite3.Row | None:
    return connection.execute(
        "SELECT * FROM fee_periods WHERE profile_id = ? AND fee_period_id = ?",
        (profile_id, fee_period_id),
    ).fetchone()


def build_period_record(
    connection: sqlite3.Connection, period_row: sqlite3.Row
) -> FeePeriodRecord:
    profile_id = str(period_row["profile_id"])
    fee_period_id = str(period_row["fee_period_id"])
    revision_row = connection.execute(
        """
        SELECT * FROM fee_period_revisions
        WHERE profile_id = ? AND fee_period_id = ? AND revision_number = ?
        """,
        (profile_id, fee_period_id, period_row["current_revision_number"]),
    ).fetchone()
    if revision_row is None:
        raise RuntimeError("Fee period has no current revision")
    withdrawal_rows = connection.execute(
        """
        SELECT * FROM fee_withdrawal_links
        WHERE profile_id = ? AND fee_period_id = ?
        ORDER BY created_at, fee_withdrawal_link_id
        """,
        (profile_id, fee_period_id),
    ).fetchall()
    correction_rows = connection.execute(
        """
        SELECT * FROM fee_corrections
        WHERE profile_id = ? AND source_fee_period_id = ?
        ORDER BY created_at, fee_correction_id
        """,
        (profile_id, fee_period_id),
    ).fetchall()
    revision = map_revision(revision_row)
    links = tuple(map_withdrawal_link(row) for row in withdrawal_rows)
    withdrawn = sum((Decimal(link.amount) for link in links), Decimal("0"))
    outstanding = max(Decimal(revision.total_fee_due) - withdrawn, Decimal("0"))
    return FeePeriodRecord(
        **dict(period_row),
        current_revision=revision,
        withdrawal_links=links,
        corrections=tuple(map_correction(row) for row in correction_rows),
        fee_withdrawn_amount=money(withdrawn),
        fee_outstanding_amount=money(outstanding),
    )


def list_fee_periods(profile_id: str) -> list[FeePeriodRecord]:
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT * FROM fee_periods
            WHERE profile_id = ?
            ORDER BY period_start DESC, fee_period_id DESC
            """,
            (profile_id,),
        ).fetchall()
        return [build_period_record(connection, row) for row in rows]


def get_fee_period(profile_id: str, fee_period_id: str) -> FeePeriodRecord | None:
    with connect() as connection:
        row = get_fee_period_row(connection, profile_id, fee_period_id)
        return None if row is None else build_period_record(connection, row)


def list_fee_period_revisions(
    profile_id: str, fee_period_id: str
) -> list[FeePeriodRevisionRecord] | None:
    with connect() as connection:
        if get_fee_period_row(connection, profile_id, fee_period_id) is None:
            return None
        rows = connection.execute(
            """
            SELECT * FROM fee_period_revisions
            WHERE profile_id = ? AND fee_period_id = ?
            ORDER BY revision_number ASC
            """,
            (profile_id, fee_period_id),
        ).fetchall()
        return [map_revision(row) for row in rows]


def resolve_opening_loss_carryforward(profile_id: str, period_start: str) -> str:
    with connect() as connection:
        previous = connection.execute(
            """
            SELECT * FROM fee_periods
            WHERE profile_id = ? AND period_start < ?
            ORDER BY period_start DESC
            LIMIT 1
            """,
            (profile_id, period_start),
        ).fetchone()
        if previous is None:
            return "0.00"
        requested_start = date.fromisoformat(period_start)
        expected_previous_end = requested_start - timedelta(days=1)
        expected_previous_start = expected_previous_end.replace(day=1).isoformat()
        if str(previous["period_start"]) != expected_previous_start:
            raise ValueError("previous_fee_period_missing")
        if previous["state"] != "crystallised":
            raise ValueError("prior_fee_period_not_crystallised")
        period = build_period_record(connection, previous)
        return period.current_revision.closing_loss_carryforward


def calculate_revision_values(
    *,
    profile_id: str,
    eligible_period_profit: str,
    opening_loss_carryforward: str,
    management_fee_percent: str,
    investment_fee_percent: str,
) -> dict[str, str]:
    calculation = calculate_fee_period(
        FeePeriodCalculationInput(
            profile_id=profile_id,
            eligible_period_profit=eligible_period_profit,
            opening_loss_carryforward=opening_loss_carryforward,
            management_fee_percent=management_fee_percent,
            investment_fee_percent=investment_fee_percent,
        )
    )
    if calculation.calculation_state != "resolved":
        raise ValueError(calculation.error_code or "fee_calculation_blocked")
    return {
        "eligible_period_profit": money(Decimal(eligible_period_profit)),
        "opening_loss_carryforward": money(Decimal(opening_loss_carryforward)),
        "closing_loss_carryforward": money(calculation.closing_loss_carryforward or Decimal("0")),
        "fee_base": money(calculation.fee_base or Decimal("0")),
        "management_fee_amount": money(
            calculation.management_fee_amount or Decimal("0")
        ),
        "investment_fee_amount": money(
            calculation.investment_fee_amount or Decimal("0")
        ),
        "total_fee_due": money(calculation.total_fee_due or Decimal("0")),
    }


def insert_revision(
    connection: sqlite3.Connection,
    *,
    profile_id: str,
    fee_period_id: str,
    revision_number: int,
    reporting_basis: str,
    fee_base_source_version: str,
    fee_base_breakdown_json: str,
    management_fee_percent: str,
    investment_fee_percent: str,
    fee_package_id: str,
    fee_package_version: int | None,
    change_reason: str,
    created_by: str,
    values: dict[str, str],
) -> None:
    connection.execute(
        """
        INSERT INTO fee_period_revisions (
          fee_revision_id, profile_id, fee_period_id, revision_number,
          reporting_basis, fee_base_source_version, fee_base_breakdown_json,
          eligible_period_profit, opening_loss_carryforward,
          closing_loss_carryforward, fee_base, management_fee_percent,
          investment_fee_percent, management_fee_amount, investment_fee_amount,
          total_fee_due, fee_package_id, fee_package_version, change_reason,
          created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            f"fee-revision-{uuid4().hex}",
            profile_id,
            fee_period_id,
            revision_number,
            reporting_basis,
            fee_base_source_version,
            fee_base_breakdown_json,
            values["eligible_period_profit"],
            values["opening_loss_carryforward"],
            values["closing_loss_carryforward"],
            values["fee_base"],
            management_fee_percent,
            investment_fee_percent,
            values["management_fee_amount"],
            values["investment_fee_amount"],
            values["total_fee_due"],
            fee_package_id,
            fee_package_version,
            change_reason,
            created_by,
            utc_now(),
        ),
    )


def create_fee_period(profile_id: str, payload: dict[str, Any]) -> FeePeriodRecord:
    profile = get_profile(profile_id)
    if profile is None:
        raise LookupError("profile_not_found")
    management_percent = profile.management_fee_percent
    investment_percent = profile.investment_fee_percent
    values = calculate_revision_values(
        profile_id=profile_id,
        eligible_period_profit=str(payload["eligible_period_profit"]),
        opening_loss_carryforward=str(payload["opening_loss_carryforward"]),
        management_fee_percent=management_percent,
        investment_fee_percent=investment_percent,
    )
    fee_period_id = str(payload.get("fee_period_id") or f"fee-period-{uuid4().hex}")
    timestamp = utc_now()
    try:
        with connect() as connection:
            connection.execute(
                """
                INSERT INTO fee_periods (
                  fee_period_id, profile_id, period_start, period_end, state,
                  current_revision_number, created_at, updated_at
                ) VALUES (?, ?, ?, ?, 'ready_to_crystallise', 1, ?, ?)
                """,
                (
                    fee_period_id,
                    profile_id,
                    payload["period_start"],
                    payload["period_end"],
                    timestamp,
                    timestamp,
                ),
            )
            insert_revision(
                connection,
                profile_id=profile_id,
                fee_period_id=fee_period_id,
                revision_number=1,
                reporting_basis=str(payload["reporting_basis"]),
                fee_base_source_version=str(payload["fee_base_source_version"]),
                fee_base_breakdown_json=str(payload["fee_base_breakdown_json"]),
                management_fee_percent=management_percent,
                investment_fee_percent=investment_percent,
                fee_package_id=str(payload.get("fee_package_id") or ""),
                fee_package_version=payload.get("fee_package_version"),
                change_reason="Initial month-end calculation",
                created_by=str(payload["actor_id"]),
                values=values,
            )
    except sqlite3.IntegrityError as error:
        raise ValueError("fee_period_already_exists") from error
    created = get_fee_period(profile_id, fee_period_id)
    if created is None:
        raise RuntimeError("Created fee period was not found")
    return created


def crystallise_fee_period(
    profile_id: str, fee_period_id: str, *, actor_id: str
) -> FeePeriodRecord | None:
    with connect() as connection:
        row = get_fee_period_row(connection, profile_id, fee_period_id)
        if row is None:
            return None
        if row["state"] != "ready_to_crystallise":
            raise ValueError("ready_to_crystallise_period_required")
        timestamp = utc_now()
        connection.execute(
            """
            UPDATE fee_periods
            SET state = 'crystallised', crystallised_at = ?, crystallised_by = ?,
                updated_at = ?
            WHERE profile_id = ? AND fee_period_id = ?
            """,
            (timestamp, actor_id, timestamp, profile_id, fee_period_id),
        )
    return get_fee_period(profile_id, fee_period_id)


def reopen_fee_period(
    profile_id: str, fee_period_id: str, payload: dict[str, Any]
) -> FeePeriodRecord | None:
    with connect() as connection:
        row = get_fee_period_row(connection, profile_id, fee_period_id)
        if row is None:
            return None
        later_period = connection.execute(
            """
            SELECT fee_period_id FROM fee_periods
            WHERE profile_id = ? AND period_start > ?
            LIMIT 1
            """,
            (profile_id, row["period_start"]),
        ).fetchone()
        if later_period is not None:
            raise ValueError("later_fee_period_exists")
        period = build_period_record(connection, row)
        decision = decide_fee_period_reopen(
            period_state=period.state,
            fee_withdrawn_amount=period.fee_withdrawn_amount,
            actor_role="fund_manager",
            reopen_reason=str(payload["reason"]),
            current_revision_number=period.current_revision_number,
        )
        if not decision.reopen_allowed or decision.next_revision_number is None:
            raise ValueError(decision.error_code or "fee_period_reopen_blocked")
        revision = period.current_revision
        values = calculate_revision_values(
            profile_id=profile_id,
            eligible_period_profit=str(payload["eligible_period_profit"]),
            opening_loss_carryforward=str(payload["opening_loss_carryforward"]),
            management_fee_percent=revision.management_fee_percent,
            investment_fee_percent=revision.investment_fee_percent,
        )
        insert_revision(
            connection,
            profile_id=profile_id,
            fee_period_id=fee_period_id,
            revision_number=decision.next_revision_number,
            reporting_basis=revision.reporting_basis,
            fee_base_source_version=str(payload["fee_base_source_version"]),
            fee_base_breakdown_json=str(payload["fee_base_breakdown_json"]),
            management_fee_percent=revision.management_fee_percent,
            investment_fee_percent=revision.investment_fee_percent,
            fee_package_id=revision.fee_package_id,
            fee_package_version=revision.fee_package_version,
            change_reason=str(payload["reason"]),
            created_by=str(payload["actor_id"]),
            values=values,
        )
        timestamp = utc_now()
        connection.execute(
            """
            UPDATE fee_periods
            SET state = 'ready_to_crystallise', current_revision_number = ?,
                crystallised_at = NULL, crystallised_by = NULL,
                reopened_at = ?, reopened_by = ?, updated_at = ?
            WHERE profile_id = ? AND fee_period_id = ?
            """,
            (
                decision.next_revision_number,
                timestamp,
                payload["actor_id"],
                timestamp,
                profile_id,
                fee_period_id,
            ),
        )
    return get_fee_period(profile_id, fee_period_id)


def create_fee_correction(
    profile_id: str, fee_period_id: str, payload: dict[str, Any]
) -> FeeCorrectionRecord | None:
    with connect() as connection:
        row = get_fee_period_row(connection, profile_id, fee_period_id)
        if row is None:
            return None
        target_fee_period_id = payload.get("target_fee_period_id")
        if target_fee_period_id and get_fee_period_row(
            connection, profile_id, str(target_fee_period_id)
        ) is None:
            raise ValueError("target_fee_period_not_found_for_profile")
        period = build_period_record(connection, row)
        if period.state != "crystallised" or Decimal(period.fee_withdrawn_amount) <= 0:
            raise ValueError("withdrawn_crystallised_period_required")
        result = calculate_fee_correction(
            original_fee_due=period.current_revision.total_fee_due,
            corrected_fee_due=str(payload["corrected_fee_due"]),
            profile_closing=bool(payload["profile_closing"]),
        )
        if result.adjustment_type == "none":
            raise ValueError("fee_correction_difference_required")
        correction_id = f"fee-correction-{uuid4().hex}"
        state = "refund_due" if result.outstanding_refund_due > 0 else "pending"
        connection.execute(
            """
            INSERT INTO fee_corrections (
              fee_correction_id, profile_id, source_fee_period_id,
              target_fee_period_id, adjustment_type, amount, reason, state,
              created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                correction_id,
                profile_id,
                fee_period_id,
                target_fee_period_id,
                result.adjustment_type,
                money(result.adjustment_amount),
                payload["reason"],
                state,
                payload["actor_id"],
                utc_now(),
            ),
        )
        correction_row = connection.execute(
            "SELECT * FROM fee_corrections WHERE fee_correction_id = ?",
            (correction_id,),
        ).fetchone()
        if correction_row is None:
            raise RuntimeError("Created fee correction was not found")
        return map_correction(correction_row)


def link_fee_withdrawal(
    profile_id: str, fee_period_id: str, payload: dict[str, Any]
) -> FeeWithdrawalLinkRecord | None:
    adjustment = get_cash_adjustment(profile_id, str(payload["cash_adjustment_id"]))
    if adjustment is None:
        raise ValueError("cash_adjustment_not_found_for_profile")
    expected_subtype = {
        "management": "Management Fee Withdrawal",
        "investment": "Investment Fee Withdrawal",
    }[str(payload["component"])]
    if adjustment.direction != "Out" or adjustment.adjustment_type != expected_subtype:
        raise ValueError("matching_received_fee_withdrawal_required")

    with connect() as connection:
        row = get_fee_period_row(connection, profile_id, fee_period_id)
        if row is None:
            return None
        period = build_period_record(connection, row)
        if period.state != "crystallised":
            raise ValueError("crystallised_period_required")
        component_due = Decimal(
            period.current_revision.management_fee_amount
            if payload["component"] == "management"
            else period.current_revision.investment_fee_amount
        )
        component_withdrawn = sum(
            (
                Decimal(link.amount)
                for link in period.withdrawal_links
                if link.component == payload["component"]
            ),
            Decimal("0"),
        )
        amount = Decimal(adjustment.amount)
        if amount <= 0 or amount > component_due - component_withdrawn:
            raise ValueError("fee_withdrawal_exceeds_component_outstanding")
        link_id = f"fee-withdrawal-link-{uuid4().hex}"
        try:
            connection.execute(
                """
                INSERT INTO fee_withdrawal_links (
                  fee_withdrawal_link_id, profile_id, fee_period_id,
                  fee_revision_id, cash_adjustment_id, component, amount,
                  created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    link_id,
                    profile_id,
                    fee_period_id,
                    period.current_revision.fee_revision_id,
                    adjustment.cash_adjustment_id,
                    payload["component"],
                    adjustment.amount,
                    payload["actor_id"],
                    utc_now(),
                ),
            )
        except sqlite3.IntegrityError as error:
            raise ValueError("cash_adjustment_already_linked") from error
        link_row = connection.execute(
            "SELECT * FROM fee_withdrawal_links WHERE fee_withdrawal_link_id = ?",
            (link_id,),
        ).fetchone()
        if link_row is None:
            raise RuntimeError("Created fee withdrawal link was not found")
        return map_withdrawal_link(link_row)


def mark_fee_withdrawn(
    profile_id: str, fee_period_id: str, payload: dict[str, Any]
) -> FeePeriodRecord | None:
    requested = {
        "management": Decimal(str(payload["management_amount"])),
        "investment": Decimal(str(payload["investment_amount"])),
    }
    if all(amount == 0 for amount in requested.values()):
        raise ValueError("fee_withdrawal_amount_required")

    with connect() as connection:
        row = get_fee_period_row(connection, profile_id, fee_period_id)
        if row is None:
            return None
        period = build_period_record(connection, row)
        if period.state != "crystallised":
            raise ValueError("crystallised_period_required")

        due_by_component = {
            "management": Decimal(period.current_revision.management_fee_amount),
            "investment": Decimal(period.current_revision.investment_fee_amount),
        }
        withdrawn_by_component = {
            component: sum(
                (
                    Decimal(link.amount)
                    for link in period.withdrawal_links
                    if link.component == component
                ),
                Decimal("0"),
            )
            for component in requested
        }
        for component, amount in requested.items():
            component_outstanding = (
                due_by_component[component] - withdrawn_by_component[component]
            )
            if amount < 0 or amount > component_outstanding:
                raise ValueError("fee_withdrawal_exceeds_component_outstanding")

        timestamp = utc_now()
        period_label = f"{period.period_start} to {period.period_end}"
        for component, amount in requested.items():
            if amount == 0:
                continue
            adjustment_id = f"CA-{uuid4().hex[:8].upper()}"
            adjustment_type = (
                "Management Fee Withdrawal"
                if component == "management"
                else "Investment Fee Withdrawal"
            )
            adjustment = {
                "cash_adjustment_id": adjustment_id,
                "profile_id": profile_id,
                "adjustment_date": str(payload["adjustment_date"]),
                "direction": "Out",
                "amount": money(amount),
                "adjustment_type": adjustment_type,
                "affects_investment": 0,
                "affects_cash_snapshot": 1,
                "linked_account": str(payload["linked_account"]),
                "description": f"{adjustment_type} for fee period {period_label}",
                "created_at": timestamp,
                "updated_at": timestamp,
            }
            connection.execute(
                """
                INSERT INTO cash_adjustments (
                  cash_adjustment_id, profile_id, adjustment_date, direction,
                  amount, adjustment_type, affects_investment,
                  affects_cash_snapshot, linked_account, description,
                  created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                tuple(adjustment.values()),
            )
            write_cash_adjustment_audit_entry(
                connection=connection,
                cash_adjustment_id=adjustment_id,
                profile_id=profile_id,
                action="created",
                payload=adjustment,
            )
            connection.execute(
                """
                INSERT INTO fee_withdrawal_links (
                  fee_withdrawal_link_id, profile_id, fee_period_id,
                  fee_revision_id, cash_adjustment_id, component, amount,
                  created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    f"fee-withdrawal-link-{uuid4().hex}",
                    profile_id,
                    fee_period_id,
                    period.current_revision.fee_revision_id,
                    adjustment_id,
                    component,
                    money(amount),
                    payload["actor_id"],
                    timestamp,
                ),
            )

        updated_row = get_fee_period_row(connection, profile_id, fee_period_id)
        if updated_row is None:
            raise RuntimeError("Updated fee period was not found")
        return build_period_record(connection, updated_row)
