"""Versioned Normal Multi-Lay cash, separate from reference planning and legacy v1."""

from __future__ import annotations

import json
import re
from collections.abc import Mapping
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

VERSION = "multi-lay-actual-v1"
PENNY = Decimal("0.01")


def _number(value: Any, name: str, *, money: bool = False) -> Decimal:
    if not isinstance(value, str) or not re.fullmatch(r"[0-9]+(?:\.[0-9]+)?", value):
        raise ValueError(f"{name}: enter a complete non-negative decimal value.")
    result = Decimal(value)
    if not result.is_finite() or (money and result != result.quantize(PENNY)):
        raise ValueError(f"{name}: enter an exact penny amount.")
    return result


def _cash(value: Decimal) -> str:
    return format(value.quantize(PENNY, rounding=ROUND_HALF_UP), ".2f")


def execution_from(serialized: str) -> dict[str, Any] | None:
    try:
        entries = json.loads(serialized or "[]")
    except (ValueError, TypeError):
        return None
    if not isinstance(entries, list):
        return None
    return next(
        (e.get("execution") for e in entries if isinstance(e, dict) and e.get("id") == "outcome1"),
        None,
    )


def calculate_actual(
    values: dict[str, Any], legs: list[dict[str, Any]], execution: dict[str, Any]
) -> dict[str, Any]:
    if not isinstance(execution, dict) or execution.get("version") != VERSION:
        raise ValueError("Unsupported actual Multi-Lay version.")
    if set(execution) != {
        "version",
        "revision",
        "exchangeAccountId",
        "market",
        "commission",
        "fills",
        "unmatched",
    }:
        raise ValueError("Actual Multi-Lay requires its complete versioned market and fill fields.")
    if type(execution["revision"]) is not int or execution["revision"] < 0:
        raise ValueError("Actual Multi-Lay revision must be a non-negative integer.")
    for key in ("exchangeAccountId", "market"):
        if (
            not isinstance(execution[key], str)
            or not execution[key].strip()
            or len(execution[key]) > 200
        ):
            raise ValueError(f"Actual Multi-Lay requires {key}.")
    rate = _number(execution["commission"], "Market commission")
    if rate > 1:
        raise ValueError("Market commission must be between zero and one.")
    stake = _number(values["back_stake"], "Back stake", money=True)
    odds = _number(values["back_odds"], "Back odds")
    if stake <= 0 or odds < Decimal("1.01"):
        raise ValueError("Actual back stake and odds are required.")
    ids = [leg["id"] for leg in legs]
    unmatched = execution["unmatched"]
    if not isinstance(unmatched, dict) or set(unmatched) != set(ids):
        raise ValueError("Confirm unmatched stake for every outcome; enter zero only when known.")
    unmatched_total = sum(
        (_number(v, "Unmatched stake", money=True) for v in unmatched.values()), Decimal(0)
    )
    fills = execution["fills"]
    if not isinstance(fills, list) or len(fills) > 200:
        raise ValueError("Actual fills must be a list of at most 200 entries.")
    stakes = dict.fromkeys(ids, Decimal(0))
    liabilities = dict.fromkeys(ids, Decimal(0))
    seen = set()
    for fill in fills:
        if not isinstance(fill, dict) or set(fill) != {"id", "outcomeId", "stake", "odds"}:
            raise ValueError("Every fill needs ID, outcome, matched stake and actual odds.")
        fid = fill["id"]
        if not isinstance(fid, str) or not fid.strip() or len(fid) > 100 or fid in seen:
            raise ValueError("Fill IDs must be unique and non-empty.")
        seen.add(fid)
        outcome = fill["outcomeId"]
        if not isinstance(outcome, str) or outcome not in stakes:
            raise ValueError("Fill refers to an unknown outcome.")
        matched = _number(fill["stake"], "Matched stake", money=True)
        price = _number(fill["odds"], "Actual odds")
        if matched <= 0 or price < Decimal("1.01"):
            raise ValueError("Each fill requires positive matched stake and odds of at least 1.01.")
        stakes[outcome] += matched
        liabilities[outcome] += matched * (price - 1)
    if values["status"] not in {"Placed", "Settled", "Void"}:
        raise ValueError("Actual Multi-Lay requires an explicitly Placed or Settled back bet.")
    scenario_results = ["Lay Won", *[f"Outcome {i + 1} Won" for i in range(len(legs))]]
    settled = values["status"] in {"Settled", "Void"}
    if values["status"] == "Void" and values["result"] != "Void":
        raise ValueError("A Void row requires the whole-bet Void result.")
    if (not settled and values["result"] != "Pending") or (
        settled and values["result"] not in [*scenario_results, "Void"]
    ):
        raise ValueError("Select the actual named outcome before settlement.")
    if settled and (unmatched_total != 0 or not values.get("date_settled", "").strip()):
        raise ValueError("Settlement requires its date and no outstanding unmatched orders.")
    total_stakes = sum(stakes.values(), Decimal(0))
    gross_values = [total_stakes, *[total_stakes - stakes[i] - liabilities[i] for i in ids]]
    scenarios = []
    for index, gross in enumerate(gross_values):
        fee = (max(gross, Decimal(0)) * rate).quantize(PENNY, rounding=ROUND_HALF_UP)
        back = (-stake if index == 0 else stake * (odds - 1)).quantize(
            PENNY, rounding=ROUND_HALF_UP
        )
        total = back + gross.quantize(PENNY, rounding=ROUND_HALF_UP) - fee
        scenarios.append(
            {
                "key": scenario_results[index],
                "label": "None of the named outcomes"
                if index == 0
                else f"{legs[index - 1]['label']} wins",
                "total": _cash(total),
                "exchange_gross": _cash(gross),
                "commission": _cash(fee),
            }
        )
    current = min(Decimal(s["total"]) for s in scenarios)
    final = (
        (
            "0.00"
            if values["result"] == "Void"
            else next(s["total"] for s in scenarios if s["key"] == values["result"])
        )
        if settled
        else None
    )
    return {
        "multi_lay_actual": {
            "scenarios": scenarios,
            "exchange_exposure": _cash(max(Decimal(0), *[-x for x in gross_values])),
            "matched_stake": _cash(total_stakes),
            "unmatched_stake": _cash(unmatched_total),
        },
        "calculation_state": "resolved",
        "calculation_notes": [
            "Actual recorded fills; commission on net positive exchange market result."
        ],
        "scenario_pnl_if_back_wins": scenarios[1]["total"],
        "scenario_pnl_if_lay_wins": scenarios[0]["total"],
        "scenario_pnl_if_outcome_2_wins": scenarios[2]["total"],
        "scenario_pnl_if_outcome_3_wins": scenarios[3]["total"] if len(scenarios) > 3 else None,
        "calculated_liability_1": _cash(liabilities[ids[0]]),
        "projected_current_pnl": None if settled else _cash(current),
        "actual_net_pnl": final,
        "final_net_pnl": final,
        "reporting_value": final if settled else _cash(current),
        "lay_status": "Unmatched orders" if unmatched_total else "Recorded fills",
        "counts_as_open": not settled,
    }


def validate_account(profile_id: str, serialized: str, exchange_name: str) -> None:
    execution = execution_from(serialized)
    if execution is None:
        return
    from openforge_api.db import list_accounts

    account = next(
        (a for a in list_accounts(profile_id) if a.account_id == execution["exchangeAccountId"]),
        None,
    )
    if account is None or account.type != "Exchange":
        raise ValueError("Actual Exchange Account must belong to this Profile.")
    if account.account != exchange_name:
        raise ValueError("Actual Exchange Account must match the row Exchange.")
    if account.lifecycle_status == "Archived" or account.status == "Archived":
        raise ValueError("Actual Exchange Account is archived.")


def guard_update(current: dict[str, Any], updated: dict[str, Any], *, correction: bool) -> str:
    """Called under the existing transaction lock, with retry-safe optimistic revision."""
    from fastapi import HTTPException

    old = execution_from(current["multi_lay_outcomes_json"])
    new = execution_from(updated["multi_lay_outcomes_json"])
    if old is None:
        if new is not None and new["revision"] != 0:
            raise HTTPException(409, "New actual recording must start at revision zero.")
        return str(updated["multi_lay_outcomes_json"])
    if new is None:
        raise HTTPException(409, "Actual recording cannot be discarded; use a reasoned correction.")
    old_body = {k: v for k, v in old.items() if k != "revision"}
    new_body = {k: v for k, v in new.items() if k != "revision"}
    unchanged = old_body == new_body and all(
        current[k] == updated[k]
        for k in ("status", "result", "back_stake", "back_odds", "date_settled")
    )
    if new["revision"] != old["revision"] and not (
        unchanged and new["revision"] == old["revision"] - 1
    ):
        raise HTTPException(409, "Actual Multi-Lay changed elsewhere. Reopen before saving.")
    old_legs = json.loads(current["multi_lay_outcomes_json"])
    new_legs = json.loads(updated["multi_lay_outcomes_json"])

    def projection(legs: list[dict[str, Any]]) -> list[tuple[Any, ...]]:
        return [(e.get("id"), e.get("label"), e.get("layOdds"), e.get("commission")) for e in legs]

    if (
        projection(old_legs) != projection(new_legs)
        or any(
            current[k] != updated[k]
            for k in ("back_stake", "back_odds", "match_strategy", "exchange_name")
        )
        or any(old[k] != new[k] for k in ("exchangeAccountId", "market"))
    ):
        raise HTTPException(
            409, "Recorded Multi-Lay terms are locked; create a separate plan for new terms."
        )
    changed_saved_fill = any(fill not in new["fills"] for fill in old["fills"])
    if not correction and (
        changed_saved_fill
        or old["commission"] != new["commission"]
        or (current["status"] in {"Settled", "Void"} and not unchanged)
    ):
        raise HTTPException(
            409, "Changing recorded fills or settlement requires a reasoned correction."
        )
    new["revision"] = old["revision"] if unchanged else old["revision"] + 1
    new_legs[0]["execution"] = new
    return json.dumps(new_legs, separators=(",", ":"))


def remap_account(serialized: str, identities: Mapping[str, str], *, strict: bool = True) -> str:
    entries = json.loads(serialized or "[]")
    actual = execution_from(serialized)
    if actual is None:
        return serialized
    old_id = actual["exchangeAccountId"]
    new_id = identities.get(old_id)
    if not new_id and strict:
        raise ValueError("Actual Multi-Lay Exchange Account identity cannot be resolved.")
    actual["exchangeAccountId"] = new_id or old_id
    entries[0]["execution"] = actual
    return json.dumps(entries, separators=(",", ":"))
