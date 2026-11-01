from __future__ import annotations

import asyncio
import json
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

from apps.api.tests.synthetic_setup import seed_synthetic_betting_context
from fastapi.testclient import TestClient

from openforge_api import oddsmatcher
from openforge_api.config import SOURCE_ROOT, settings
from openforge_api.db import (
    connect,
    get_sportsbook_bet,
    list_accounts,
    update_oddsmatcher_preferences_json,
    update_sportsbook_bet,
    upsert_profile_exchange_commission,
)
from openforge_api.main import app


def provider_event(*, event_id: str = "event-001") -> dict:
    return {
        "id": event_id,
        "sport_key": "soccer_epl",
        "sport_title": "Premier League",
        "commence_time": "2026-10-24T15:00:00Z",
        "home_team": "Demo City",
        "away_team": "Demo United",
        "bookmakers": [
            {
                "key": "bookmaker_a",
                "title": "Bookmaker A",
                "last_update": "2026-10-23T12:00:00Z",
                "link": "https://example.invalid/bookmaker/event-001",
                "markets": [
                    {
                        "key": "h2h",
                        "last_update": "2026-10-23T12:00:00Z",
                        "outcomes": [
                            {"name": "Demo City", "price": 4.5},
                            {"name": "Draw", "price": 3.2},
                            {"name": "Demo United", "price": 1.9},
                        ],
                    }
                ],
            },
            {
                "key": "smarkets",
                "title": "Smarkets",
                "last_update": "2026-10-23T12:00:05Z",
                "link": "https://example.invalid/exchange/event-001",
                "markets": [
                    {
                        "key": "h2h",
                        "last_update": "2026-10-23T12:00:05Z",
                        "outcomes": [
                            {"name": "Demo City", "price": 4.6},
                            {"name": "Draw", "price": 3.25},
                            {"name": "Demo United", "price": 1.92},
                        ],
                    },
                    {
                        "key": "h2h_lay",
                        "last_update": "2026-10-23T12:00:05Z",
                        "outcomes": [
                            {"name": "Demo City", "price": 4.7},
                            {"name": "Draw", "price": 3.3},
                            {"name": "Demo United", "price": 1.95},
                            {"name": "Unmapped", "price": 2.0},
                        ],
                    },
                ],
            },
        ],
    }


def cache_fixture() -> oddsmatcher.ProviderCache:
    values, excluded, count, bookmakers, exchanges = oddsmatcher.normalize_provider_events(
        {
            "soccer_epl": [provider_event()],
            "soccer_efl_champ": [],
            "soccer_uefa_champs_league": [],
        }
    )
    return oddsmatcher.ProviderCache(
        fetched_at=datetime.now(UTC),
        opportunities=values,
        excluded=excluded,
        event_count=count,
        bookmaker_keys=bookmakers,
        exchange_keys=exchanges,
        provider_credits_used=4,
        provider_credits_remaining=496,
        provider_last_refresh_cost=3,
    )


def configure_database(tmp_path: Path) -> TestClient:
    settings.database_url = f"sqlite:///{tmp_path / 'oddsmatcher.sqlite3'}"
    settings.the_odds_api_snapshot_directory = str(tmp_path / "oddsmatcher-snapshots")
    seed_synthetic_betting_context()
    with connect() as connection:
        connection.execute(
            """
            UPDATE accounts SET stake_access='Normal', promo_access='Full'
            WHERE profile_id='profile-demo-001' AND account IN ('Bookmaker A', 'Smarkets')
            """
        )
    upsert_profile_exchange_commission("profile-demo-001", "Smarkets", "0.02")
    oddsmatcher.reset_runtime_state_for_tests()
    oddsmatcher._cache = cache_fixture()
    return TestClient(app)


def test_normalisation_keeps_exact_home_draw_away_and_unknown_liquidity() -> None:
    cache = cache_fixture()
    assert cache.event_count == 1
    assert [row.selection_key for row in cache.opportunities] == ["HOME", "DRAW", "AWAY"]
    assert cache.bookmaker_keys == {"bookmaker_a"}
    assert cache.exchange_keys == {"smarkets"}
    assert any("does not map exactly" in row.reason for row in cache.excluded)


def test_profile_response_ranks_and_uses_authoritative_commission(tmp_path: Path) -> None:
    client = configure_database(tmp_path)
    response = client.get("/profiles/profile-demo-001/oddsmatcher")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["event_count"] == 1
    assert body["exchange_count"] == 1
    assert len(body["opportunities"]) == 3
    first = body["opportunities"][0]
    assert first["display_rating"] == "97.44"
    assert first["exchange_commission"] == "0.02"
    assert first["commission_origin"] == "profile-account"
    assert first["liquidity_state"] == "UNKNOWN"
    assert first["can_create_prospecting_draft"] is True
    assert first["standard_lay_stake"]


def test_smarkets_offer_is_snapshotted_in_prospecting_draft(tmp_path: Path) -> None:
    client = configure_database(tmp_path)
    smarkets = next(
        row for row in list_accounts("profile-demo-001")
        if row.type == "Exchange" and row.account == "Smarkets"
    )
    today = date.today()
    offer_payload = {
        "account_id": smarkets.account_id,
        "commission_rate": "0.00",
        "effective_start": (today - timedelta(days=1)).isoformat(),
        "effective_end": (today + timedelta(days=1)).isoformat(),
        "source_label": "Smarkets synthetic 0% offer",
        "owner_note": "Synthetic acceptance fixture",
        "status": "Active",
    }
    created_offer = client.post(
        "/profiles/profile-demo-001/exchange-commissions/offers", json=offer_payload
    )
    assert created_offer.status_code == 201, created_offer.text
    opportunity = client.get(
        "/profiles/profile-demo-001/oddsmatcher"
    ).json()["opportunities"][0]
    assert opportunity["exchange_commission"] == "0.00"
    assert opportunity["commission_origin"] == "commission-offer"
    created = client.post(
        "/profiles/profile-demo-001/oddsmatcher/prospecting-drafts",
        json={
            "opportunity_id": opportunity["opportunity_id"],
            "retry_token": "smarkets-zero-snapshot",
            "back_stake": "10",
            "back_odds": opportunity["back"]["odds"],
            "lay_odds": opportunity["lay"]["odds"],
            "exchange_commission": opportunity["exchange_commission"],
            "strategy": "Standard",
        },
    )
    assert created.status_code == 201, created.text
    row = created.json()["sportsbook_bet"]
    assert row["lay_commission_1"] == "0.00"
    offer_id = created_offer.json()["offer_id"]
    ended = client.put(
        f"/profiles/profile-demo-001/exchange-commissions/offers/{offer_id}",
        json={**offer_payload, "status": "Ended"},
    )
    assert ended.status_code == 200, ended.text
    stored = get_sportsbook_bet("profile-demo-001", row["sportsbook_bet_id"])
    assert stored is not None
    assert json.loads(stored.lay_plan_json)["commission"] == "0.00"
    update_sportsbook_bet(
        "profile-demo-001",
        row["sportsbook_bet_id"],
        {
            **stored.__dict__,
            "status": "Placed",
            "lay_actual": "9.71",
            "lay_matched_stake_1": "9.71",
            "lay_commission_1": "0.00",
        },
    )
    placed = get_sportsbook_bet("profile-demo-001", row["sportsbook_bet_id"])
    assert placed is not None
    assert placed.lay_commission_1 == "0.00"


def test_global_response_exposes_all_quotes_without_profile_assumptions(tmp_path: Path) -> None:
    client = configure_database(tmp_path)
    response = client.get("/oddsmatcher")
    assert response.status_code == 200, response.text
    rows = response.json()["opportunities"]
    assert len(rows) == 3
    assert all(row["exchange_commission"] is None for row in rows)
    assert all(row["commission_origin"] == "unavailable" for row in rows)
    assert all(row["standard_lay_stake"] is None for row in rows)
    assert all(row["can_create_prospecting_draft"] is False for row in rows)
    assert all("Choose a Profile" in row["back_eligibility"]["reason"] for row in rows)


def test_preference_commission_fills_missing_profile_commission(tmp_path: Path) -> None:
    client = configure_database(tmp_path)
    with connect() as connection:
        connection.execute(
            "DELETE FROM profile_exchange_commissions WHERE profile_id = ?",
            ("profile-demo-001",),
        )
    update_oddsmatcher_preferences_json(json.dumps({
        "version": 1,
        "default_back_stake": "10.00",
        "exchange_commission_overrides": {"smarkets": "0.03"},
        "excluded_bookmaker_identities": [],
        "excluded_exchange_identities": [],
        "show_arbs_default": False,
        "default_advanced": False,
        "saved_filters": [],
    }))
    row = client.get("/profiles/profile-demo-001/oddsmatcher").json()["opportunities"][0]
    assert row["exchange_commission"] == "0.03"
    assert row["commission_origin"] == "oddsmatcher-default"
    assert row["can_create_prospecting_draft"] is True


def test_ineligible_profile_cannot_reuse_another_profiles_accounts(tmp_path: Path) -> None:
    client = configure_database(tmp_path)
    response = client.get("/profiles/profile-demo-002/oddsmatcher")
    assert response.status_code == 200
    assert all(
        row["can_create_prospecting_draft"] is False for row in response.json()["opportunities"]
    )
    draft = client.post(
        "/profiles/profile-demo-002/oddsmatcher/prospecting-drafts",
        json={
            "opportunity_id": "soccer_epl:event-001:h2h:HOME",
            "retry_token": "retry-profile-two",
            "back_stake": "10",
            "back_odds": "4.5",
            "lay_odds": "4.7",
            "exchange_commission": "0.02",
            "strategy": "Standard",
        },
    )
    assert draft.status_code == 409


def test_retired_exchange_is_unavailable_while_matchbook_identity_stays_independent(
    tmp_path: Path,
) -> None:
    client = configure_database(tmp_path)
    synthetic_catalogue = json.loads(
        (SOURCE_ROOT / "tests/fixtures/openforge-api-master-catalogue.synthetic.json").read_text()
    )
    production_catalogue = json.loads(
        (SOURCE_ROOT / "data/reference/master-account-catalogue.json").read_text()
    )
    synthetic_catalogue["records"].append(
        next(
            row
            for row in production_catalogue["records"]
            if row["catalogue_id"] == "EXCHANGE-BETDAQ"
        )
    )
    catalogue_path = tmp_path / "oddsmatcher-catalogue-with-retired-betdaq.json"
    catalogue_path.write_text(json.dumps(synthetic_catalogue))
    settings.account_catalogue_source = str(catalogue_path)

    with connect() as connection:
        connection.execute(
            "UPDATE accounts SET account='BETDAQ', catalogue_id='EXCHANGE-BETDAQ' "
            "WHERE profile_id='profile-demo-001' AND account='Smarkets' AND type='Exchange'"
        )
    event = provider_event(event_id="betdaq-retired-event")
    event["bookmakers"][1]["key"] = "betdaq"
    event["bookmakers"][1]["title"] = "BETDAQ"
    values, excluded, count, bookmakers, exchanges = oddsmatcher.normalize_provider_events(
        {
            "soccer_epl": [event],
            "soccer_efl_champ": [],
            "soccer_uefa_champs_league": [],
        }
    )
    oddsmatcher._cache = oddsmatcher.ProviderCache(
        fetched_at=datetime.now(UTC),
        opportunities=values,
        excluded=excluded,
        event_count=count,
        bookmaker_keys=bookmakers,
        exchange_keys=exchanges,
        provider_credits_used=4,
        provider_credits_remaining=496,
        provider_last_refresh_cost=3,
    )

    rows = client.get("/profiles/profile-demo-001/oddsmatcher").json()["opportunities"]
    assert rows
    assert all(row["lay"]["account_name"] == "BETDAQ" for row in rows)
    assert all(row["lay_eligibility"]["state"] == "unavailable" for row in rows)
    assert all("RETIRED" in row["lay_eligibility"]["reason"] for row in rows)
    assert all(row["can_create_prospecting_draft"] is False for row in rows)

    accounts = client.get("/profiles/profile-demo-001/accounts").json()
    assert any(
        row["account"] == "BETDAQ" and row["catalogue_eligible_for_new_activity"] is False
        for row in accounts
    )
    assert any(
        row["account"] == "Matchbook"
        and row["catalogue_eligible_for_new_activity"] is True
        for row in accounts
    )


def test_prospecting_draft_is_idempotent_and_preserves_unknown_liquidity(tmp_path: Path) -> None:
    client = configure_database(tmp_path)
    balances_before = {
        row.account_id: (row.current_balance, row.pending_withdrawal_amount)
        for row in list_accounts("profile-demo-001")
    }
    payload = {
        "opportunity_id": "soccer_epl:event-001:h2h:HOME",
        "retry_token": "explicit-action-001",
        "back_stake": "10",
        "back_odds": "4.5",
        "lay_odds": "4.7",
        "exchange_commission": "0.02",
        "strategy": "Standard",
    }
    first = client.post("/profiles/profile-demo-001/oddsmatcher/prospecting-drafts", json=payload)
    second = client.post("/profiles/profile-demo-001/oddsmatcher/prospecting-drafts", json=payload)
    assert first.status_code == second.status_code == 201
    assert first.json()["created"] is True
    assert second.json()["created"] is False
    first_row = first.json()["sportsbook_bet"]
    second_row = second.json()["sportsbook_bet"]
    assert first_row["sportsbook_bet_id"] == second_row["sportsbook_bet_id"]
    assert first_row["status"] == "Prospecting"
    assert first_row["lay_actual"] == ""
    stored = get_sportsbook_bet("profile-demo-001", first_row["sportsbook_bet_id"])
    assert stored is not None
    source = json.loads(stored.lay_plan_json)["oddsmatcher_source"]
    assert source["source"] == "ODDSMATCHER"
    assert source["liquidity_state"] == "UNKNOWN"
    assert source["event_id"] == "event-001"
    assert "liquidity is unknown" in stored.user_notes
    assert {
        row.account_id: (row.current_balance, row.pending_withdrawal_amount)
        for row in list_accounts("profile-demo-001")
    } == balances_before


def test_duplicate_runtime_refreshes_coalesce(monkeypatch) -> None:
    oddsmatcher.reset_runtime_state_for_tests()
    calls = 0

    async def fetch() -> oddsmatcher.ProviderCache:
        nonlocal calls
        calls += 1
        await asyncio.sleep(0.02)
        return cache_fixture()

    monkeypatch.setattr(oddsmatcher, "_fetch_provider", fetch)

    async def exercise() -> None:
        left, right = await asyncio.gather(
            oddsmatcher.refresh_provider_cache(), oddsmatcher.refresh_provider_cache()
        )
        assert left[0] is right[0]

    asyncio.run(exercise())
    assert calls == 1


def test_provider_failure_retains_last_good_as_stale(monkeypatch) -> None:
    oddsmatcher.reset_runtime_state_for_tests()
    oddsmatcher._cache = cache_fixture()

    async def fail() -> oddsmatcher.ProviderCache:
        import httpx

        raise httpx.HTTPError("synthetic outage")

    monkeypatch.setattr(oddsmatcher, "_fetch_provider", fail)
    cache, warning = asyncio.run(oddsmatcher.refresh_provider_cache())
    assert cache is oddsmatcher._cache
    assert warning == "Refresh failed. Showing the last successful data as stale."


def test_provider_headers_are_authoritative_and_no_local_daily_cap_remains(
    monkeypatch, tmp_path: Path
) -> None:
    oddsmatcher.reset_runtime_state_for_tests()
    original_key = settings.the_odds_api_key
    original_snapshots = settings.the_odds_api_snapshot_directory
    settings.the_odds_api_key = "configured-but-not-transmitted"
    settings.the_odds_api_snapshot_directory = str(tmp_path / "snapshots")
    actual_client = oddsmatcher.httpx.AsyncClient
    calls = 0

    def handler(request):
        nonlocal calls
        calls += 1
        payload = [provider_event()] if request.url.path.endswith("soccer_epl/odds") else []
        return oddsmatcher.httpx.Response(
            200,
            request=request,
            headers={
                "x-requests-used": str(46 + calls),
                "x-requests-remaining": str(454 - calls),
                "x-requests-last": "1",
            },
            json=payload,
        )

    transport = oddsmatcher.httpx.MockTransport(handler)
    monkeypatch.setattr(
        oddsmatcher.httpx,
        "AsyncClient",
        lambda **kwargs: actual_client(transport=transport, **kwargs),
    )
    try:
        result = asyncio.run(oddsmatcher._fetch_provider())
        assert calls == 3
        assert result.provider_credits_used == 49
        assert result.provider_credits_remaining == 451
        assert result.provider_last_refresh_cost == 3
        snapshots = list((tmp_path / "snapshots").glob("*.json"))
        assert len(snapshots) == 1
        saved = snapshots[0].read_text(encoding="utf-8")
        assert "configured-but-not-transmitted" not in saved
        assert "soccer_epl:event-001:h2h:HOME" in saved
    finally:
        settings.the_odds_api_key = original_key
        settings.the_odds_api_snapshot_directory = original_snapshots
        oddsmatcher.reset_runtime_state_for_tests()


def test_provider_quota_exhaustion_keeps_last_good_and_blocks_truthfully() -> None:
    oddsmatcher.reset_runtime_state_for_tests()
    oddsmatcher._cache = cache_fixture()

    async def fail() -> oddsmatcher.ProviderCache:
        raise oddsmatcher.ProviderQuotaExhausted(used=500, remaining=0, last_cost=1)

    original = oddsmatcher._fetch_provider
    oddsmatcher._fetch_provider = fail
    try:
        cache, warning = asyncio.run(oddsmatcher.refresh_provider_cache())
    finally:
        oddsmatcher._fetch_provider = original
    assert cache.provider_credits_used == 500
    assert cache.provider_credits_remaining == 0
    assert cache.provider_quota_exhausted is True
    assert oddsmatcher._response(None, cache, warning).provider_quota_exhausted is True
    assert warning == "Provider quota exhausted. Showing the last successful data as stale."


def test_saved_snapshots_list_newest_first_and_replay_is_non_actionable(tmp_path: Path) -> None:
    client = configure_database(tmp_path)
    older = cache_fixture()
    older.fetched_at = datetime(2026, 10, 25, 12, tzinfo=UTC)
    newer = cache_fixture()
    newer.fetched_at = datetime(2026, 10, 26, 20, 35, tzinfo=UTC)
    older_snapshot = oddsmatcher._save_snapshot(older)
    newer_snapshot = oddsmatcher._save_snapshot(newer)

    listing = client.get("/oddsmatcher/snapshots")
    assert listing.status_code == 200
    assert [row["snapshot_id"] for row in listing.json()] == [
        newer_snapshot.snapshot_id,
        older_snapshot.snapshot_id,
    ]

    replay = client.get(
        f"/oddsmatcher/snapshots/{newer_snapshot.snapshot_id}?profile_id=profile-demo-001"
    )
    assert replay.status_code == 200
    body = replay.json()
    assert body["data_source"] == "replay"
    assert body["replay_snapshot_id"] == newer_snapshot.snapshot_id
    assert body["state"] == "stale"
    assert body["opportunities"]
    assert all(row["can_create_prospecting_draft"] is False for row in body["opportunities"])
    assert all(row["back"]["link"] is None for row in body["opportunities"])
    assert all(row["lay"]["link"] is None for row in body["opportunities"])
    assert oddsmatcher._cache is not None
