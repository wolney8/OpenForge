from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from openforge_api.config import settings
from openforge_api.sportsbook import router as sportsbook_router

app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3010", "http://127.0.0.1:3010"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(sportsbook_router)


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
