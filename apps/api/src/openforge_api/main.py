import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from openforge_api.account_catalogue_source import router as account_catalogue_source_router
from openforge_api.accounts import router as accounts_router
from openforge_api.activity_history import router as activity_history_router
from openforge_api.auth import router as auth_router
from openforge_api.auth_middleware import OwnerAuthenticationMiddleware
from openforge_api.backups import router as backups_router
from openforge_api.balance_snapshots import router as balance_snapshots_router
from openforge_api.bookmaker_catalogue import router as bookmaker_catalogue_router
from openforge_api.calculator_conversions import router as calculator_conversions_router
from openforge_api.calculators import router as calculators_router
from openforge_api.cash_adjustments import router as cash_adjustments_router
from openforge_api.casino_offers import router as casino_offers_router
from openforge_api.common_bet_combos import router as common_bet_combos_router
from openforge_api.config import settings
from openforge_api.database_provider import router as database_provider_router
from openforge_api.db import connect
from openforge_api.each_way_extra_places import router as each_way_extra_places_router
from openforge_api.exchange_settings import router as exchange_settings_router
from openforge_api.founder_import_review import router as founder_import_review_router
from openforge_api.free_bets import router as free_bets_router
from openforge_api.fund_manager_fee_periods import router as fund_manager_fee_periods_router
from openforge_api.fund_manager_lookup_values import router as fund_manager_lookup_values_router
from openforge_api.fund_manager_preferences import router as fund_manager_preferences_router
from openforge_api.global_search import router as global_search_router
from openforge_api.imports import router as imports_router
from openforge_api.lookup_values import router as lookup_values_router
from openforge_api.multi_profile_opportunities import router as multi_profile_opportunities_router
from openforge_api.notifications import router as notifications_router
from openforge_api.profile_lifecycle_middleware import ProfileLifecycleMiddleware
from openforge_api.profile_portable_export import router as profile_portable_export_router
from openforge_api.profile_portable_restore import router as profile_portable_restore_router
from openforge_api.profile_workbook_imports import (
    execution_router as profile_import_executions_router,
)
from openforge_api.profile_workbook_imports import router as profile_workbook_imports_router
from openforge_api.profiles import recovery_router as profile_recovery_router
from openforge_api.profiles import router as profiles_router
from openforge_api.runtime_safety import validate_runtime_contract
from openforge_api.sportsbook import router as sportsbook_router
from openforge_api.tracker_settings import router as tracker_settings_router
from openforge_api.tracker_summary_sources import router as tracker_summary_sources_router
from openforge_api.workbook_template_export import router as workbook_template_export_router

logger = logging.getLogger(__name__)

app = FastAPI(title=settings.app_name)
app.add_middleware(ProfileLifecycleMiddleware)
app.add_middleware(OwnerAuthenticationMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(profiles_router)
app.include_router(profile_recovery_router)
app.include_router(profile_portable_export_router)
app.include_router(profile_portable_restore_router)
app.include_router(workbook_template_export_router)
app.include_router(auth_router)
app.include_router(global_search_router)
app.include_router(account_catalogue_source_router)
app.include_router(accounts_router)
app.include_router(activity_history_router)
app.include_router(balance_snapshots_router)
app.include_router(backups_router)
app.include_router(bookmaker_catalogue_router)
app.include_router(sportsbook_router)
app.include_router(multi_profile_opportunities_router)
app.include_router(notifications_router)
app.include_router(free_bets_router)
app.include_router(founder_import_review_router)
app.include_router(profile_workbook_imports_router)
app.include_router(profile_import_executions_router)
app.include_router(fund_manager_lookup_values_router)
app.include_router(fund_manager_preferences_router)
app.include_router(fund_manager_fee_periods_router)
app.include_router(imports_router)
app.include_router(cash_adjustments_router)
app.include_router(calculators_router)
app.include_router(calculator_conversions_router)
app.include_router(casino_offers_router)
app.include_router(common_bet_combos_router)
app.include_router(database_provider_router)
app.include_router(exchange_settings_router)
app.include_router(each_way_extra_places_router)
app.include_router(tracker_settings_router)
app.include_router(tracker_summary_sources_router)
app.include_router(lookup_values_router)


def _schema_version(connection: object) -> str:
    try:
        migration = connection.execute(  # type: ignore[attr-defined]
            "SELECT migration_id FROM schema_migrations ORDER BY migration_id DESC LIMIT 1"
        ).fetchone()
        if migration is not None:
            return str(migration[0])
    except Exception:
        pass
    try:
        history = connection.execute(  # type: ignore[attr-defined]
            "SELECT 1 FROM financial_activity_history LIMIT 1"
        )
        history.fetchone()
        return "import-history-v1"
    except Exception:
        return "legacy-local"


@app.on_event("startup")
def validate_startup_runtime() -> None:
    identity = validate_runtime_contract(settings)
    logger.info(
        "runtime_ready role=%s source=%s database_engine=%s database_identity=%s "
        "database_fingerprint=%s api=%s frontend=%s environment_source=%s",
        identity.role,
        identity.source_revision,
        identity.database_engine,
        identity.database_identity,
        identity.database_fingerprint,
        identity.api_endpoint,
        identity.frontend_endpoint,
        identity.environment_source,
    )


@app.get("/healthz", response_model=None)
def healthcheck() -> dict[str, str] | JSONResponse:
    if not settings.hosted_persistence_ready:
        return JSONResponse({"status": "unavailable"}, status_code=503)
    try:
        identity = validate_runtime_contract(settings)
        with connect() as connection:
            connection.execute("SELECT 1").fetchone()
            schema_version = _schema_version(connection)
    except Exception:
        return JSONResponse({"status": "unavailable"}, status_code=503)
    return {
        "status": "ok",
        "runtime_role": identity.role,
        "source_revision": identity.source_revision,
        "database_engine": identity.database_engine,
        "database_identity": identity.database_identity,
        "database_fingerprint": identity.database_fingerprint,
        "database_classification": identity.database_classification,
        "schema_version": schema_version,
        "api_endpoint": identity.api_endpoint,
        "frontend_endpoint": identity.frontend_endpoint,
    }


@app.get("/config-summary")
def config_summary() -> dict[str, str]:
    identity = validate_runtime_contract(settings)
    database_mode = settings.database_mode.strip().lower() or "local"
    return {
        "environment": settings.environment,
        "database_mode": database_mode,
        "runtime_adapter": (
            "postgresql" if database_mode in {"neon", "postgres", "postgresql"} else "sqlite"
        ),
        "database_url_scheme": settings.database_url.split(":", 1)[0],
        "neon_configured": str(bool(settings.neon_database_url.strip())).lower(),
        "hosted_persistence_ready": str(settings.hosted_persistence_ready).lower(),
        "backup_directory": settings.backup_directory,
        "account_catalogue_source": settings.account_catalogue_source,
        "hosted_api_mount_prefix": "/api",
        "cors_origin_count": str(len(settings.cors_origins)),
        "cors_origin_regex_configured": str(bool(settings.cors_origin_regex)).lower(),
        "runtime_role": identity.role,
        "source_revision": identity.source_revision,
        "database_identity": identity.database_identity,
        "database_fingerprint": identity.database_fingerprint,
        "database_classification": identity.database_classification,
        "runtime_api_endpoint": identity.api_endpoint,
        "runtime_frontend_endpoint": identity.frontend_endpoint,
        "runtime_environment_source": identity.environment_source,
    }
