from fastapi import FastAPI

from openforge_api.config import settings

app = FastAPI(title=settings.app_name)


@app.get("/healthz")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/config-summary")
def config_summary() -> dict[str, str]:
    return {
        "environment": settings.environment,
        "database_url": settings.database_url,
        "backup_directory": settings.backup_directory,
    }
