from __future__ import annotations

import asyncio
import hashlib
import json
import re
from dataclasses import dataclass, replace
from datetime import UTC, date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any, Literal, cast

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from openforge_api.calculators import MatchedBettingPayload, _calculate
from openforge_api.config import settings
from openforge_api.db import (
    create_sportsbook_bet,
    get_oddsmatcher_preferences_json,
    get_profile,
    get_profile_exchange_commission_map,
    get_sportsbook_bet,
    list_accounts,
    resolve_profile_exchange_commission,
)
from openforge_api.fund_manager_preferences import OddsMatcherPreferences
from openforge_api.lay_plan import LayPlan, OddsMatcherSourceSnapshot
from openforge_api.sportsbook import SportsbookBetResponse, prepare_write_response

router = APIRouter(prefix="/profiles/{profile_id}/oddsmatcher", tags=["oddsmatcher"])
global_router = APIRouter(prefix="/oddsmatcher", tags=["oddsmatcher"])

PROVIDER_NAME = "The Odds API"
PROVIDER_BASE_URL = "https://api.the-odds-api.com/v4"
COMPETITIONS = {
    "soccer_epl": "Premier League",
    "soccer_efl_champ": "Championship",
    "soccer_uefa_champs_league": "UEFA Champions League",
}
EXCHANGE_PROVIDER_KEYS = frozenset({"betfair_ex_uk", "matchbook", "smarkets"})
BLOCKED_LIFECYCLES = frozenset(
    {"not signed up", "pending sign up", "suspended", "closed", "archived"}
)
BLOCKED_STATUSES = frozenset(
    {"not signed up", "blocked", "not using", "closed", "inactive", "suspended", "archived"}
)
BLOCKED_RESTRICTIONS = frozenset({"kyc blocked", "login restricted", "risk blocked", "casino only"})
STALE_AFTER_SECONDS = 300


class ProviderQuote(BaseModel):
    provider_key: str
    provider_name: str
    account_name: str
    odds: Decimal
    observed_at: str
    link: str | None = None


class NormalizedOpportunity(BaseModel):
    opportunity_id: str
    provider: Literal["The Odds API"] = "The Odds API"
    competition_key: str
    competition: str
    event_id: str
    event_name: str
    starts_at: str
    selection_key: Literal["HOME", "DRAW", "AWAY"]
    selection: str
    market_key: Literal["h2h"] = "h2h"
    market: Literal["Match Odds / 1X2"] = "Match Odds / 1X2"
    back_quotes: list[ProviderQuote]
    lay_quotes: list[ProviderQuote]


class EligibilityResponse(BaseModel):
    state: Literal["eligible", "warning", "unavailable"]
    reason: str
    account_id: str | None = None


class OpportunityResponse(BaseModel):
    opportunity_id: str
    provider: str
    competition_key: str
    competition: str
    event_id: str
    event_name: str
    starts_at: str
    selection_key: Literal["HOME", "DRAW", "AWAY"]
    selection: str
    market_key: str
    market: str
    back: ProviderQuote
    lay: ProviderQuote
    display_rating: str
    commission_aware_rating: str | None
    exchange_commission: str | None
    commission_origin: Literal[
        "profile-account", "commission-offer", "oddsmatcher-default", "unavailable"
    ]
    standard_lay_stake: str | None
    liability: str | None
    pnl_if_back_wins: str | None
    pnl_if_lay_wins: str | None
    conservative_result: str | None
    liquidity_state: Literal["UNKNOWN"] = "UNKNOWN"
    freshness: Literal["fresh", "stale"]
    age_seconds: int
    back_eligibility: EligibilityResponse
    lay_eligibility: EligibilityResponse
    can_create_prospecting_draft: bool


class ExcludedQuoteResponse(BaseModel):
    competition: str
    event_id: str
    provider_key: str
    market_key: str
    reason: str


class OddsMatcherResponse(BaseModel):
    provider: str = PROVIDER_NAME
    fetched_at: str | None
    state: Literal["empty", "fresh", "stale"]
    warning: str | None = None
    manual_refresh_only: bool = True
    data_source: Literal["live", "replay"] = "live"
    replay_snapshot_id: str | None = None
    replay_captured_at: str | None = None
    competitions: list[str]
    event_count: int
    bookmaker_count: int
    exchange_count: int
    provider_credits_used: int | None
    provider_credits_remaining: int | None
    provider_last_refresh_cost: int | None
    provider_quota_exhausted: bool = False
    opportunities: list[OpportunityResponse]
    excluded: list[ExcludedQuoteResponse]


class DraftPayload(BaseModel):
    opportunity_id: str = Field(min_length=1, max_length=200)
    retry_token: str = Field(min_length=8, max_length=120)
    back_stake: str = Field(min_length=1, max_length=40)
    back_odds: str = Field(min_length=1, max_length=40)
    lay_odds: str = Field(min_length=1, max_length=40)
    exchange_commission: str = Field(min_length=1, max_length=40)
    strategy: Literal["Standard", "Underlay", "Overlay", "Custom"] = "Standard"
    custom_lay_stake: str = Field(default="", max_length=40)

    @field_validator("back_stake", "back_odds", "lay_odds", "exchange_commission")
    @classmethod
    def decimal_text(cls, value: str) -> str:
        try:
            parsed = Decimal(value)
        except Exception as error:
            raise ValueError("Enter a complete decimal value.") from error
        if not parsed.is_finite() or parsed < 0:
            raise ValueError("Enter a non-negative finite decimal value.")
        return value


class DraftResponse(BaseModel):
    created: bool
    sportsbook_bet: SportsbookBetResponse


@dataclass
class ProviderCache:
    fetched_at: datetime
    opportunities: list[NormalizedOpportunity]
    excluded: list[ExcludedQuoteResponse]
    event_count: int
    bookmaker_keys: set[str]
    exchange_keys: set[str]
    provider_credits_used: int | None
    provider_credits_remaining: int | None
    provider_last_refresh_cost: int | None = None
    provider_quota_exhausted: bool = False


class SavedSnapshot(BaseModel):
    schema_version: Literal["oddsmatcher-normalized-snapshot-v1"] = (
        "oddsmatcher-normalized-snapshot-v1"
    )
    snapshot_id: str
    captured_at: datetime
    provider: Literal["The Odds API"] = "The Odds API"
    competitions: dict[str, str]
    event_count: int
    bookmaker_keys: list[str]
    exchange_keys: list[str]
    provider_credits_used: int | None
    provider_credits_remaining: int | None
    provider_last_refresh_cost: int | None
    opportunities: list[NormalizedOpportunity]
    excluded: list[ExcludedQuoteResponse]


class SavedSnapshotSummary(BaseModel):
    snapshot_id: str
    captured_at: str
    provider: str
    competitions: list[str]
    event_count: int
    bookmaker_count: int
    exchange_count: int


class ProviderQuotaExhausted(Exception):
    def __init__(
        self,
        *,
        used: int | None,
        remaining: int | None,
        last_cost: int | None,
    ) -> None:
        super().__init__("Provider quota exhausted")
        self.used = used
        self.remaining = remaining
        self.last_cost = last_cost


_cache: ProviderCache | None = None
_refresh_task: asyncio.Task[ProviderCache] | None = None
_refresh_lock = asyncio.Lock()


def _account_name(provider_key: str, provider_title: str, *, exchange: bool) -> str:
    if exchange:
        return {
            "betfair_ex_uk": "Betfair Exchange",
            "matchbook": "Matchbook",
            "smarkets": "Smarkets",
        }.get(provider_key, provider_title)
    return provider_title.removesuffix(" (UK)")


def _safe_link(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    return value if value.startswith(("https://", "http://")) else None


def _selection_key(name: str, home: str, away: str) -> Literal["HOME", "DRAW", "AWAY"] | None:
    if name == home:
        return "HOME"
    if name == away:
        return "AWAY"
    if name.casefold() == "draw":
        return "DRAW"
    return None


def _quote(
    bookmaker: dict[str, Any],
    market: dict[str, Any],
    outcome: dict[str, Any],
    *,
    exchange: bool,
) -> ProviderQuote:
    return ProviderQuote(
        provider_key=str(bookmaker["key"]),
        provider_name=str(bookmaker["title"]),
        account_name=_account_name(
            str(bookmaker["key"]), str(bookmaker["title"]), exchange=exchange
        ),
        odds=Decimal(str(outcome["price"])),
        observed_at=str(market.get("last_update") or bookmaker.get("last_update") or ""),
        link=_safe_link(outcome.get("link") or market.get("link") or bookmaker.get("link")),
    )


def normalize_provider_events(
    payloads: dict[str, list[dict[str, Any]]],
) -> tuple[
    list[NormalizedOpportunity],
    list[ExcludedQuoteResponse],
    int,
    set[str],
    set[str],
]:
    opportunities: list[NormalizedOpportunity] = []
    excluded: list[ExcludedQuoteResponse] = []
    bookmaker_keys: set[str] = set()
    exchange_keys: set[str] = set()
    event_count = 0
    for competition_key, events in payloads.items():
        competition = COMPETITIONS[competition_key]
        for event in events:
            event_count += 1
            event_id = str(event.get("id", ""))
            home = str(event.get("home_team", ""))
            away = str(event.get("away_team", ""))
            grouped: dict[str, dict[str, list[ProviderQuote]]] = {
                "HOME": {"back": [], "lay": []},
                "DRAW": {"back": [], "lay": []},
                "AWAY": {"back": [], "lay": []},
            }
            for bookmaker in event.get("bookmakers", []):
                provider_key = str(bookmaker.get("key", ""))
                markets = {str(item.get("key", "")): item for item in bookmaker.get("markets", [])}
                is_exchange = "h2h_lay" in markets
                if is_exchange:
                    exchange_keys.add(provider_key)
                    market = markets["h2h_lay"]
                    for outcome in market.get("outcomes", []):
                        selection_key = _selection_key(str(outcome.get("name", "")), home, away)
                        if selection_key is None:
                            excluded.append(
                                ExcludedQuoteResponse(
                                    competition=competition,
                                    event_id=event_id,
                                    provider_key=provider_key,
                                    market_key="h2h_lay",
                                    reason="Selection does not map exactly to HOME, DRAW or AWAY.",
                                )
                            )
                            continue
                        grouped[selection_key]["lay"].append(
                            _quote(bookmaker, market, outcome, exchange=True)
                        )
                    continue
                market = markets.get("h2h")
                if not market:
                    continue
                bookmaker_keys.add(provider_key)
                for outcome in market.get("outcomes", []):
                    selection_key = _selection_key(str(outcome.get("name", "")), home, away)
                    if selection_key is None:
                        excluded.append(
                            ExcludedQuoteResponse(
                                competition=competition,
                                event_id=event_id,
                                provider_key=provider_key,
                                market_key="h2h",
                                reason="Selection does not map exactly to HOME, DRAW or AWAY.",
                            )
                        )
                        continue
                    grouped[selection_key]["back"].append(
                        _quote(bookmaker, market, outcome, exchange=False)
                    )
            for raw_key, quotes in grouped.items():
                key = cast(Literal["HOME", "DRAW", "AWAY"], raw_key)
                if not quotes["back"] or not quotes["lay"]:
                    excluded.append(
                        ExcludedQuoteResponse(
                            competition=competition,
                            event_id=event_id,
                            provider_key=PROVIDER_NAME,
                            market_key="h2h",
                            reason=(
                                f"{key} does not have both an exact bookmaker back "
                                "and exchange lay quote."
                            ),
                        )
                    )
                    continue
                selection = home if key == "HOME" else away if key == "AWAY" else "Draw"
                opportunities.append(
                    NormalizedOpportunity(
                        opportunity_id=f"{competition_key}:{event_id}:h2h:{key}",
                        competition_key=competition_key,
                        competition=competition,
                        event_id=event_id,
                        event_name=f"{home} v {away}",
                        starts_at=str(event.get("commence_time", "")),
                        selection_key=key,
                        selection=selection,
                        back_quotes=quotes["back"],
                        lay_quotes=quotes["lay"],
                    )
                )
    return opportunities, excluded, event_count, bookmaker_keys, exchange_keys


def _headers_int(headers: httpx.Headers, name: str) -> int | None:
    value = headers.get(name)
    try:
        return int(value) if value is not None else None
    except ValueError:
        return None


_SNAPSHOT_ID = re.compile(r"^[0-9]{8}T[0-9]{6}(?:[0-9]{6})?Z-[0-9a-f]{12}$")


def _snapshot_payload(cache: ProviderCache) -> SavedSnapshot:
    captured = cache.fetched_at.astimezone(UTC)
    digest_source = "|".join(
        [captured.isoformat(), *(row.opportunity_id for row in cache.opportunities)]
    )
    digest = hashlib.sha256(digest_source.encode()).hexdigest()[:12]
    snapshot_id = f"{captured.strftime('%Y%m%dT%H%M%S%fZ')}-{digest}"
    return SavedSnapshot(
        snapshot_id=snapshot_id,
        captured_at=captured,
        competitions=dict(COMPETITIONS),
        event_count=cache.event_count,
        bookmaker_keys=sorted(cache.bookmaker_keys),
        exchange_keys=sorted(cache.exchange_keys),
        provider_credits_used=cache.provider_credits_used,
        provider_credits_remaining=cache.provider_credits_remaining,
        provider_last_refresh_cost=cache.provider_last_refresh_cost,
        opportunities=cache.opportunities,
        excluded=cache.excluded,
    )


def _save_snapshot(cache: ProviderCache) -> SavedSnapshot:
    snapshot = _snapshot_payload(cache)
    directory = settings.the_odds_api_snapshot_directory_path
    try:
        directory.mkdir(parents=True, exist_ok=True)
        target = directory / f"{snapshot.snapshot_id}.json"
        temporary = directory / f".{snapshot.snapshot_id}.tmp"
        temporary.write_text(
            snapshot.model_dump_json(indent=2) + "\n",
            encoding="utf-8",
        )
        temporary.replace(target)
    except OSError as error:
        raise HTTPException(
            status_code=503,
            detail="Live odds were received, but the private replay snapshot could not be saved.",
        ) from error
    return snapshot


def _read_snapshot(path: Path) -> SavedSnapshot:
    try:
        return SavedSnapshot.model_validate_json(path.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError) as error:
        raise HTTPException(
            status_code=422,
            detail="The saved Oddsmatcher snapshot is invalid and cannot be replayed.",
        ) from error


def _snapshot_path(snapshot_id: str) -> Path:
    if not _SNAPSHOT_ID.fullmatch(snapshot_id):
        raise HTTPException(status_code=404, detail="Saved snapshot not found")
    path = settings.the_odds_api_snapshot_directory_path / f"{snapshot_id}.json"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Saved snapshot not found")
    return path


def _cache_from_snapshot(snapshot: SavedSnapshot) -> ProviderCache:
    return ProviderCache(
        fetched_at=snapshot.captured_at,
        opportunities=snapshot.opportunities,
        excluded=snapshot.excluded,
        event_count=snapshot.event_count,
        bookmaker_keys=set(snapshot.bookmaker_keys),
        exchange_keys=set(snapshot.exchange_keys),
        provider_credits_used=snapshot.provider_credits_used,
        provider_credits_remaining=snapshot.provider_credits_remaining,
        provider_last_refresh_cost=snapshot.provider_last_refresh_cost,
    )


def list_saved_snapshots() -> list[SavedSnapshotSummary]:
    directory = settings.the_odds_api_snapshot_directory_path
    if not directory.is_dir():
        return []
    summaries: list[SavedSnapshotSummary] = []
    for path in directory.glob("*.json"):
        try:
            snapshot = SavedSnapshot.model_validate_json(path.read_text(encoding="utf-8"))
        except (OSError, ValueError, TypeError):
            continue
        summaries.append(
            SavedSnapshotSummary(
                snapshot_id=snapshot.snapshot_id,
                captured_at=snapshot.captured_at.astimezone(UTC).isoformat(),
                provider=snapshot.provider,
                competitions=list(snapshot.competitions.values()),
                event_count=snapshot.event_count,
                bookmaker_count=len(snapshot.bookmaker_keys),
                exchange_count=len(snapshot.exchange_keys),
            )
        )
    return sorted(summaries, key=lambda item: item.captured_at, reverse=True)


async def _fetch_provider() -> ProviderCache:
    key = settings.the_odds_api_key.strip()
    if not key:
        raise HTTPException(status_code=503, detail="The Odds API is not configured on the server.")
    payloads: dict[str, list[dict[str, Any]]] = {}
    used_header: int | None = None
    remaining_header: int | None = None
    refresh_cost = 0
    async with httpx.AsyncClient(timeout=20) as client:
        for competition_key in COMPETITIONS:
            response = await client.get(
                f"{PROVIDER_BASE_URL}/sports/{competition_key}/odds",
                params={
                    "apiKey": key,
                    "regions": "uk",
                    "markets": "h2h",
                    "oddsFormat": "decimal",
                    "includeLinks": "true",
                },
            )
            last_cost = _headers_int(response.headers, "x-requests-last")
            if last_cost is not None:
                refresh_cost += last_cost
            used_header = _headers_int(response.headers, "x-requests-used")
            remaining_header = _headers_int(response.headers, "x-requests-remaining")
            if response.status_code == 429:
                raise ProviderQuotaExhausted(
                    used=used_header,
                    remaining=remaining_header,
                    last_cost=last_cost,
                )
            response.raise_for_status()
            data = response.json()
            if not isinstance(data, list):
                raise httpx.HTTPError("Provider returned an unexpected event payload.")
            payloads[competition_key] = data
    opportunities, excluded, count, bookmakers, exchanges = normalize_provider_events(payloads)
    cache = ProviderCache(
        fetched_at=datetime.now(UTC),
        opportunities=opportunities,
        excluded=excluded,
        event_count=count,
        bookmaker_keys=bookmakers,
        exchange_keys=exchanges,
        provider_credits_used=used_header,
        provider_credits_remaining=remaining_header,
        provider_last_refresh_cost=refresh_cost or None,
        provider_quota_exhausted=False,
    )
    _save_snapshot(cache)
    return cache


async def refresh_provider_cache() -> tuple[ProviderCache, str | None]:
    global _cache, _refresh_task
    async with _refresh_lock:
        if _refresh_task is None or _refresh_task.done():
            _refresh_task = asyncio.create_task(_fetch_provider())
        task = _refresh_task
    try:
        result = await task
    except ProviderQuotaExhausted as error:
        if _cache is None:
            raise HTTPException(status_code=429, detail="Provider quota exhausted.") from error
        _cache = replace(
            _cache,
            provider_credits_used=error.used,
            provider_credits_remaining=error.remaining,
            provider_last_refresh_cost=error.last_cost,
            provider_quota_exhausted=True,
        )
        return _cache, "Provider quota exhausted. Showing the last successful data as stale."
    except (httpx.HTTPError, HTTPException) as error:
        if _cache is None:
            if isinstance(error, HTTPException):
                raise error
            raise HTTPException(
                status_code=502, detail="The odds provider refresh failed."
            ) from error
        return _cache, "Refresh failed. Showing the last successful data as stale."
    _cache = result
    return result, None


def _restrictions(account: object) -> set[str]:
    try:
        values = json.loads(str(getattr(account, "restrictions_json", "[]")))
    except json.JSONDecodeError:
        values = []
    return {str(value).strip().casefold() for value in values if str(value).strip()}


def _eligibility(account: object | None, *, provider: str, bookmaker: bool) -> EligibilityResponse:
    if account is None:
        return EligibilityResponse(
            state="unavailable", reason=f"No {provider} Account belongs to this Profile."
        )
    lifecycle = str(getattr(account, "lifecycle_status", "")).casefold()
    status = str(getattr(account, "status", "")).casefold()
    restrictions = _restrictions(account)
    if lifecycle in BLOCKED_LIFECYCLES or status in BLOCKED_STATUSES:
        return EligibilityResponse(
            state="unavailable",
            reason=f"{provider} is unavailable under this Profile's Account lifecycle.",
            account_id=str(getattr(account, "account_id")),
        )
    if (
        str(getattr(account, "stake_access", "Not Checked")) == "Blocked"
        or restrictions & BLOCKED_RESTRICTIONS
    ):
        return EligibilityResponse(
            state="unavailable",
            reason=f"{provider} is blocked by this Profile's recorded Account restrictions.",
            account_id=str(getattr(account, "account_id")),
        )
    if bookmaker and (
        str(getattr(account, "promo_access", "Not Checked")) in {"None", "Restricted"}
        or "bonus restricted" in restrictions
        or status in {"gubbed", "bonus restricted", "promo restricted"}
    ):
        return EligibilityResponse(
            state="unavailable",
            reason=f"{provider} is recorded as promotion-ineligible for this Profile.",
            account_id=str(getattr(account, "account_id")),
        )
    if str(getattr(account, "stake_access", "Not Checked")) in {
        "Limited",
        "Severely Limited",
        "Not Checked",
    }:
        return EligibilityResponse(
            state="warning",
            reason=f"Confirm {provider} stake access before using this price.",
            account_id=str(getattr(account, "account_id")),
        )
    return EligibilityResponse(
        state="eligible",
        reason=f"{provider} has no recorded blocker for this Profile.",
        account_id=str(getattr(account, "account_id")),
    )


def _resolved_opportunities(
    profile_id: str | None, cache: ProviderCache, *, replay: bool = False
) -> list[OpportunityResponse]:
    accounts = list_accounts(profile_id) if profile_id else []
    account_index = {
        (str(account.type), str(account.account).casefold()): account for account in accounts
    }
    try:
        preferences = OddsMatcherPreferences.model_validate_json(
            get_oddsmatcher_preferences_json()
        )
    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail="Stored Oddsmatcher preferences are invalid and require review.",
        ) from error
    now = datetime.now(UTC)
    rows: list[OpportunityResponse] = []
    for source in cache.opportunities:
        back_candidates: list[tuple[ProviderQuote, EligibilityResponse]] = []
        for quote in source.back_quotes:
            account = account_index.get(("Bookie", quote.account_name.casefold()))
            back_candidates.append(
                (
                    quote,
                    _eligibility(account, provider=quote.account_name, bookmaker=True)
                    if profile_id
                    else EligibilityResponse(
                        state="warning",
                        reason="Choose a Profile to check bookmaker Account eligibility.",
                        account_id=None,
                    ),
                )
            )
        lay_candidates: list[tuple[ProviderQuote, EligibilityResponse]] = []
        for quote in source.lay_quotes:
            account = account_index.get(("Exchange", quote.account_name.casefold()))
            lay_candidates.append(
                (
                    quote,
                    _eligibility(account, provider=quote.account_name, bookmaker=False)
                    if profile_id
                    else EligibilityResponse(
                        state="warning",
                        reason=(
                            "Choose a Profile to apply exchange commission and "
                            "Account eligibility."
                        ),
                        account_id=None,
                    ),
                )
            )
        eligible_backs = [item for item in back_candidates if item[1].state != "unavailable"]
        eligible_lays = [item for item in lay_candidates if item[1].state != "unavailable"]
        back, back_state = max(eligible_backs or back_candidates, key=lambda item: item[0].odds)
        lay, lay_state = min(eligible_lays or lay_candidates, key=lambda item: item[0].odds)
        resolution = resolve_profile_exchange_commission(
            profile_id,
            lay.account_name,
            effective_date=date.today().isoformat(),
        ) if profile_id else None
        profile_commission = (
            resolution.commission_rate
            if resolution and resolution.source != "unavailable"
            else None
        )
        default_commission = (
            preferences.exchange_commission_overrides.get(lay.provider_key)
        )
        if profile_commission is not None:
            commission = profile_commission
            commission_origin: Literal[
                "profile-account", "commission-offer", "oddsmatcher-default", "unavailable"
            ] = (
                "commission-offer"
                if resolution and resolution.source == "commission_offer"
                else "profile-account"
            )
        elif default_commission is not None:
            commission = default_commission
            commission_origin = "oddsmatcher-default"
        else:
            commission = None
            commission_origin = "unavailable"
        calculation = None
        if (
            back_state.state != "unavailable"
            and lay_state.state != "unavailable"
            and commission is not None
        ):
            try:
                calculation = _calculate(
                    MatchedBettingPayload(
                        bet_type="qualifying",
                        strategy="Standard",
                        back_stake="10",
                        back_odds=str(back.odds),
                        lay_odds=str(lay.odds),
                        exchange_commission=commission,
                    )
                )
            except (ValueError, ArithmeticError):
                calculation = None
        observed_values = [value for value in (back.observed_at, lay.observed_at) if value]
        parsed = []
        for value in observed_values:
            try:
                parsed.append(datetime.fromisoformat(value.replace("Z", "+00:00")))
            except ValueError:
                pass
        oldest = min(parsed) if parsed else cache.fetched_at
        age = max(0, int((now - oldest).total_seconds()))
        display_rating = (back.odds / lay.odds) * Decimal("100")
        commission_rating = None
        if calculation is not None:
            commission_rating = (
                (Decimal("10") + Decimal(calculation.matched_result)) / Decimal("10")
            ) * Decimal("100")
        presented_back = back.model_copy(update={"link": None}) if replay else back
        presented_lay = lay.model_copy(update={"link": None}) if replay else lay
        rows.append(
            OpportunityResponse(
                opportunity_id=source.opportunity_id,
                provider=source.provider,
                competition_key=source.competition_key,
                competition=source.competition,
                event_id=source.event_id,
                event_name=source.event_name,
                starts_at=source.starts_at,
                selection_key=source.selection_key,
                selection=source.selection,
                market_key=source.market_key,
                market=source.market,
                back=presented_back,
                lay=presented_lay,
                display_rating=f"{display_rating:.2f}",
                commission_aware_rating=(
                    f"{commission_rating:.2f}" if commission_rating is not None else None
                ),
                exchange_commission=commission,
                commission_origin=commission_origin,
                standard_lay_stake=(calculation.selected_lay_stake if calculation else None),
                liability=(calculation.liability if calculation else None),
                pnl_if_back_wins=(calculation.pnl_if_back_wins if calculation else None),
                pnl_if_lay_wins=(calculation.pnl_if_lay_wins if calculation else None),
                conservative_result=(calculation.matched_result if calculation else None),
                freshness="stale" if replay or age > STALE_AFTER_SECONDS else "fresh",
                age_seconds=age,
                back_eligibility=back_state,
                lay_eligibility=lay_state,
                can_create_prospecting_draft=(
                    not replay
                    and profile_id is not None
                    and calculation is not None
                    and back_state.state == "eligible"
                    and lay_state.state == "eligible"
                ),
            )
        )
    return sorted(
        rows,
        key=lambda row: (
            -Decimal(row.display_rating),
            row.starts_at,
            row.opportunity_id,
        ),
    )


def _response(
    profile_id: str | None,
    cache: ProviderCache | None,
    warning: str | None = None,
    *,
    replay_snapshot_id: str | None = None,
) -> OddsMatcherResponse:
    if profile_id is not None and get_profile(profile_id) is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    if cache is None:
        return OddsMatcherResponse(
            fetched_at=None,
            state="empty",
            data_source="live",
            competitions=list(COMPETITIONS.values()),
            event_count=0,
            bookmaker_count=0,
            exchange_count=0,
            provider_credits_used=None,
            provider_credits_remaining=None,
            provider_last_refresh_cost=None,
            provider_quota_exhausted=False,
            opportunities=[],
            excluded=[],
        )
    replay = replay_snapshot_id is not None
    stale = replay or (
        warning is not None
        or (datetime.now(UTC) - cache.fetched_at).total_seconds() > STALE_AFTER_SECONDS
    )
    return OddsMatcherResponse(
        fetched_at=cache.fetched_at.isoformat(),
        state="stale" if stale else "fresh",
        warning=warning,
        data_source="replay" if replay else "live",
        replay_snapshot_id=replay_snapshot_id,
        replay_captured_at=cache.fetched_at.isoformat() if replay else None,
        competitions=list(COMPETITIONS.values()),
        event_count=cache.event_count,
        bookmaker_count=len(cache.bookmaker_keys),
        exchange_count=len(cache.exchange_keys),
        provider_credits_used=cache.provider_credits_used,
        provider_credits_remaining=cache.provider_credits_remaining,
        provider_last_refresh_cost=cache.provider_last_refresh_cost,
        provider_quota_exhausted=(False if replay else cache.provider_quota_exhausted),
        opportunities=_resolved_opportunities(profile_id, cache, replay=replay),
        excluded=cache.excluded,
    )


@router.get("", response_model=OddsMatcherResponse)
def get_oddsmatcher(profile_id: str) -> OddsMatcherResponse:
    return _response(profile_id, _cache)


@router.post("/refresh", response_model=OddsMatcherResponse)
async def refresh_oddsmatcher(profile_id: str) -> OddsMatcherResponse:
    if get_profile(profile_id) is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    cache, warning = await refresh_provider_cache()
    return _response(profile_id, cache, warning)


@global_router.get("", response_model=OddsMatcherResponse)
def get_global_oddsmatcher(profile_id: str | None = None) -> OddsMatcherResponse:
    return _response(profile_id, _cache)


@global_router.get("/snapshots", response_model=list[SavedSnapshotSummary])
def get_saved_oddsmatcher_snapshots() -> list[SavedSnapshotSummary]:
    return list_saved_snapshots()


@global_router.get("/snapshots/{snapshot_id}", response_model=OddsMatcherResponse)
def get_saved_oddsmatcher_snapshot(
    snapshot_id: str, profile_id: str | None = None
) -> OddsMatcherResponse:
    snapshot = _read_snapshot(_snapshot_path(snapshot_id))
    return _response(
        profile_id,
        _cache_from_snapshot(snapshot),
        replay_snapshot_id=snapshot.snapshot_id,
    )


@global_router.post("/refresh", response_model=OddsMatcherResponse)
async def refresh_global_oddsmatcher(profile_id: str | None = None) -> OddsMatcherResponse:
    if profile_id is not None and get_profile(profile_id) is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    cache, warning = await refresh_provider_cache()
    return _response(profile_id, cache, warning)


def _find_opportunity(profile_id: str, opportunity_id: str) -> OpportunityResponse:
    if _cache is None:
        raise HTTPException(status_code=409, detail="Refresh Oddsmatcher before creating a draft.")
    row = next(
        (
            item
            for item in _resolved_opportunities(profile_id, _cache)
            if item.opportunity_id == opportunity_id
        ),
        None,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Opportunity is no longer available.")
    if not row.can_create_prospecting_draft:
        raise HTTPException(
            status_code=409,
            detail=(
                "Profile Account eligibility must be resolved before creating this draft."
            ),
        )
    return row


@router.post("/prospecting-drafts", response_model=DraftResponse, status_code=201)
def create_prospecting_draft(profile_id: str, payload: DraftPayload) -> DraftResponse:
    opportunity = _find_opportunity(profile_id, payload.opportunity_id)
    existing_id = (
        "ODD-"
        + hashlib.sha256(f"{profile_id}:{payload.retry_token}".encode()).hexdigest()[:24].upper()
    )
    existing = get_sportsbook_bet(profile_id, existing_id)
    if existing is not None:
        return DraftResponse(
            created=False,
            sportsbook_bet=prepare_write_response(
                existing, get_profile_exchange_commission_map(profile_id)
            ),
        )
    preview = _calculate(
        MatchedBettingPayload(
            bet_type="qualifying",
            strategy=payload.strategy,
            back_stake=payload.back_stake,
            back_odds=payload.back_odds,
            lay_odds=payload.lay_odds,
            exchange_commission=payload.exchange_commission,
            manual_lay_stake=payload.custom_lay_stake,
        )
    )
    snapshot = OddsMatcherSourceSnapshot(
        provider=opportunity.provider,
        event_id=opportunity.event_id,
        competition_key=opportunity.competition_key,
        selection_key=opportunity.selection_key,
        back_provider_key=opportunity.back.provider_key,
        lay_provider_key=opportunity.lay.provider_key,
        back_quote_timestamp=opportunity.back.observed_at,
        lay_quote_timestamp=opportunity.lay.observed_at,
        retry_token=payload.retry_token,
    )
    checksum = hashlib.sha256(snapshot.model_dump_json().encode()).hexdigest()
    plan = LayPlan(
        calculation_contract_version="workbook-reference-v1",
        backing_basis="Normal",
        back_stake=payload.back_stake,
        back_odds=payload.back_odds,
        lay_odds=payload.lay_odds,
        selected_strategy=payload.strategy,
        custom_lay_stake=payload.custom_lay_stake,
        exchange_name=opportunity.lay.account_name,
        exchange_account_id=opportunity.lay_eligibility.account_id or "",
        commission=payload.exchange_commission,
        commission_origin="override",
        reviewed_planned_lay_stake=preview.selected_lay_stake,
        source_identity=opportunity.opportunity_id,
        source_checksum=checksum,
        oddsmatcher_source=snapshot,
    )
    values = {
        "sportsbook_bet_id": existing_id,
        "event_name": opportunity.event_name,
        "offer_text": "Oddsmatcher Prospecting draft — liquidity unknown",
        "bookmaker": opportunity.back.account_name,
        "offer_type": "Normal",
        "bet_type": "Single",
        "offer_name": "Oddsmatcher Match Odds",
        "fixture_type": "Football",
        "market": "Match Odds / 1X2",
        "status": "Prospecting",
        "result": "Pending",
        "back_stake": payload.back_stake,
        "back_odds": payload.back_odds,
        "bonus_retention_rate": "70",
        "match_strategy": payload.strategy,
        "lay_odds_1": payload.lay_odds,
        "lay_actual": "",
        "lay_matched_stake_1": "",
        "lay_commission_1": payload.exchange_commission,
        "exchange_name": opportunity.lay.account_name,
        "date_settled": opportunity.starts_at,
        "user_notes": (
            "Source: ODDSMATCHER. Prospecting only; no bet is recorded as placed. "
            "Exchange liquidity is unknown and must be checked before placement."
        ),
        "lay_plan_json": plan.model_dump_json(),
    }
    prepared: list[SportsbookBetResponse] = []
    try:
        create_sportsbook_bet(
            profile_id,
            values,
            prepare_response=lambda row, commissions: prepared.append(
                prepare_write_response(row, commissions)
            ),
        )
    except Exception:
        # A concurrent retry may win the deterministic-ID insert. Only suppress
        # the write error when that exact idempotent result can now be read back.
        concurrent = get_sportsbook_bet(profile_id, existing_id)
        if concurrent is None:
            raise
        return DraftResponse(
            created=False,
            sportsbook_bet=prepare_write_response(
                concurrent, get_profile_exchange_commission_map(profile_id)
            ),
        )
    return DraftResponse(created=True, sportsbook_bet=prepared[0])


def reset_runtime_state_for_tests() -> None:
    global _cache, _refresh_task
    _cache = None
    _refresh_task = None
