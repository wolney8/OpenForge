from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from openforge_api.account_catalogue_source import router as account_catalogue_source_router
from openforge_api.accounts import router as accounts_router
from openforge_api.balance_snapshots import router as balance_snapshots_router
from openforge_api.bookmaker_catalogue import router as bookmaker_catalogue_router
from openforge_api.cash_adjustments import router as cash_adjustments_router
from openforge_api.casino_offers import router as casino_offers_router
from openforge_api.config import settings
from openforge_api.exchange_settings import router as exchange_settings_router
from openforge_api.free_bets import router as free_bets_router
from openforge_api.fund_manager_fee_periods import router as fund_manager_fee_periods_router
from openforge_api.imports import router as imports_router
from openforge_api.lookup_values import router as lookup_values_router
from openforge_api.multi_profile_opportunities import router as multi_profile_opportunities_router
from openforge_api.profiles import router as profiles_router
from openforge_api.sportsbook import router as sportsbook_router
from openforge_api.tracker_settings import router as tracker_settings_router

app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3010", "http://127.0.0.1:3010"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(profiles_router)
app.include_router(account_catalogue_source_router)
app.include_router(accounts_router)
app.include_router(balance_snapshots_router)
app.include_router(bookmaker_catalogue_router)
app.include_router(sportsbook_router)
app.include_router(multi_profile_opportunities_router)
app.include_router(free_bets_router)
app.include_router(fund_manager_fee_periods_router)
app.include_router(imports_router)
app.include_router(cash_adjustments_router)
app.include_router(casino_offers_router)
app.include_router(exchange_settings_router)
app.include_router(tracker_settings_router)
app.include_router(lookup_values_router)


@app.get("/healthz")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/config-summary")
def config_summary() -> dict[str, str]:
    return {
        "environment": settings.environment,
        "database_url": settings.database_url,
        "backup_directory": settings.backup_directory,
        "account_catalogue_source": settings.account_catalogue_source,
    }
