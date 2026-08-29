from __future__ import annotations

import json
import re
import shutil
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator

from openforge_api.config import settings
from openforge_api.db import connect

router = APIRouter(prefix="/account-catalogue/source", tags=["account-catalogue"])

EvidenceField = Literal[
    "account_type",
    "brand_name",
    "short_display_name",
    "operating_jurisdictions",
    "operating_subdivisions",
    "operating_channels",
    "legal_operator",
    "operator_group",
    "platform",
    "risk_team",
    "licence_reference",
    "licence_status",
    "canonical_domain",
    "status",
    "foreground_colour",
    "background_colour",
]


def _relative_luminance(hex_colour: str) -> float:
    channels = [int(hex_colour[index : index + 2], 16) / 255 for index in (1, 3, 5)]
    linear = [
        channel / 12.92
        if channel <= 0.04045
        else ((channel + 0.055) / 1.055) ** 2.4
        for channel in channels
    ]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


def _contrast_ratio(foreground: str, background: str) -> float:
    lighter, darker = sorted(
        (_relative_luminance(foreground), _relative_luminance(background)), reverse=True
    )
    return (lighter + 0.05) / (darker + 0.05)


class CatalogueEvidence(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_url: str = Field(min_length=8, max_length=500)
    source_title: str = Field(min_length=1, max_length=200)
    publisher: str = Field(min_length=1, max_length=160)
    checked_at: str = Field(min_length=10, max_length=40)
    supports: list[EvidenceField] = Field(min_length=1)
    notes: str = Field(default="", max_length=500)

    @field_validator("source_url")
    @classmethod
    def validate_source_url(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized.startswith("https://"):
            raise ValueError("evidence source_url must use HTTPS")
        return normalized


class DefaultOperatingContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    jurisdiction: str = Field(default="", max_length=2)
    subdivision: str = Field(default="", max_length=6)
    channels: list[Literal["web", "mobile", "retail"]] = Field(default_factory=list)

    @field_validator("jurisdiction")
    @classmethod
    def validate_jurisdiction(cls, value: str) -> str:
        normalized = value.strip().upper()
        if normalized and not re.fullmatch(r"[A-Z]{2}", normalized):
            raise ValueError("default jurisdiction must use an ISO alpha-2 country code")
        return normalized

    @field_validator("subdivision")
    @classmethod
    def validate_subdivision(cls, value: str) -> str:
        normalized = value.strip().upper()
        if normalized and not re.fullmatch(r"[A-Z]{2}-[A-Z0-9]{1,3}", normalized):
            raise ValueError("default subdivision must use an ISO 3166-2-style code")
        return normalized

    @field_validator("channels")
    @classmethod
    def validate_unique_channels(
        cls, values: list[Literal["web", "mobile", "retail"]]
    ) -> list[Literal["web", "mobile", "retail"]]:
        if len(values) != len(set(values)):
            raise ValueError("default operating channels must not contain duplicates")
        return values

    @model_validator(mode="after")
    def validate_subdivision_country(self) -> "DefaultOperatingContext":
        if self.subdivision and not self.subdivision.startswith(f"{self.jurisdiction}-"):
            raise ValueError("default subdivision must belong to the default jurisdiction")
        return self


class MasterAccountCatalogueRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    catalogue_id: str = Field(min_length=3, max_length=64)
    account_type: Literal["Bookmaker", "Exchange", "Bank"]
    operating_jurisdictions: list[str] = Field(default_factory=list)
    operating_subdivisions: list[str] = Field(default_factory=list)
    operating_channels: list[Literal["web", "mobile", "retail"]] = Field(
        default_factory=list
    )
    brand_name: str = Field(min_length=1, max_length=120)
    short_display_name: str = Field(min_length=1, max_length=32)
    legal_operator: str = Field(default="", max_length=160)
    operator_group: str = Field(default="", max_length=120)
    platform: str = Field(default="", max_length=120)
    risk_team: str = Field(default="", max_length=120)
    licence_reference: str = Field(default="", max_length=120)
    licence_status: str = Field(default="", max_length=120)
    canonical_domain: str = Field(default="", max_length=200)
    status: Literal["Active", "Archived"] = "Active"
    foreground_colour: str
    background_colour: str
    logo_asset_path: str = Field(default="", max_length=300)
    source: str = Field(default="", max_length=300)
    confidence: Literal["Verified", "Likely", "Unverified"] = "Unverified"
    last_verified_date: str = Field(default="", max_length=20)
    introduced_at: str = Field(default="", max_length=40)
    evidence: list[CatalogueEvidence] = Field(default_factory=list)

    @field_validator("catalogue_id")
    @classmethod
    def normalize_catalogue_id(cls, value: str) -> str:
        normalized = value.strip().upper()
        if not all(character.isalnum() or character == "-" for character in normalized):
            raise ValueError("catalogue_id may contain only letters, numbers, and hyphens")
        return normalized

    @field_validator("foreground_colour", "background_colour")
    @classmethod
    def validate_colour(cls, value: str) -> str:
        normalized = value.strip().upper()
        if not re.fullmatch(r"#[0-9A-F]{6}", normalized):
            raise ValueError("colours must use six-digit hex format")
        return normalized

    @field_validator("operating_jurisdictions")
    @classmethod
    def validate_jurisdictions(cls, values: list[str]) -> list[str]:
        normalized = [value.strip().upper() for value in values]
        if any(not re.fullmatch(r"[A-Z]{2}", value) for value in normalized):
            raise ValueError(
                "jurisdictions must use ISO 3166-1 alpha-2 country codes"
            )
        if len(normalized) != len(set(normalized)):
            raise ValueError("operating_jurisdictions must not contain duplicates")
        return normalized

    @field_validator("operating_subdivisions")
    @classmethod
    def validate_subdivisions(cls, values: list[str]) -> list[str]:
        normalized = [value.strip().upper() for value in values]
        if any(not re.fullmatch(r"[A-Z]{2}-[A-Z0-9]{1,3}", value) for value in normalized):
            raise ValueError("subdivisions must use ISO 3166-2-style codes such as US-NJ")
        if len(normalized) != len(set(normalized)):
            raise ValueError("operating_subdivisions must not contain duplicates")
        return normalized

    @field_validator("operating_channels")
    @classmethod
    def validate_unique_channels(
        cls, values: list[Literal["web", "mobile", "retail"]]
    ) -> list[Literal["web", "mobile", "retail"]]:
        if len(values) != len(set(values)):
            raise ValueError("operating_channels must not contain duplicates")
        return values

    @model_validator(mode="after")
    def validate_accessible_colours(self) -> "MasterAccountCatalogueRecord":
        if _contrast_ratio(self.foreground_colour, self.background_colour) < 4.5:
            raise ValueError("account badge colours must meet WCAG AA contrast of 4.5:1")
        if self.confidence == "Verified" and not self.evidence:
            raise ValueError("Verified catalogue records require evidence")
        return self


class MasterAccountCatalogue(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["1.0"]
    catalogue_name: str = Field(min_length=1, max_length=120)
    updated_at: str = Field(min_length=10, max_length=40)
    default_operating_context: DefaultOperatingContext = Field(
        default_factory=DefaultOperatingContext
    )
    records: list[MasterAccountCatalogueRecord]

    @model_validator(mode="after")
    def validate_unique_authorities(self) -> "MasterAccountCatalogue":
        ids = [row.catalogue_id for row in self.records]
        names = [(row.account_type, row.brand_name.casefold()) for row in self.records]
        if len(ids) != len(set(ids)):
            raise ValueError("catalogue_id values must be unique")
        if len(names) != len(set(names)):
            raise ValueError("brand names must be unique within each account type")
        return self


class MasterAccountCataloguePreflight(BaseModel):
    model_config = ConfigDict(extra="forbid")

    catalogue: MasterAccountCatalogue


class MasterAccountCataloguePreflightResult(BaseModel):
    valid: bool
    incoming_record_count: int
    current_record_count: int
    added_catalogue_ids: list[str]
    updated_catalogue_ids: list[str]
    removed_catalogue_ids: list[str]
    requires_explicit_apply: bool


class MasterAccountCatalogueApplyResult(MasterAccountCataloguePreflightResult):
    archived_catalogue_ids: list[str]


class ArchiveCatalogueRecordsPayload(BaseModel):
    catalogue_ids: list[str] = Field(min_length=1, max_length=500)

    @field_validator("catalogue_ids")
    @classmethod
    def normalize_catalogue_ids(cls, values: list[str]) -> list[str]:
        normalized = [value.strip().upper() for value in values if value.strip()]
        if len(normalized) != len(set(normalized)):
            raise ValueError("catalogue_ids must not contain duplicates")
        return normalized


class ArchiveCatalogueRecordsResult(BaseModel):
    archived_catalogue_ids: list[str]
    missing_catalogue_ids: list[str]


def load_master_account_catalogue(path: Path | None = None) -> MasterAccountCatalogue:
    if path is None and settings.database_mode.strip().lower() in {
        "neon",
        "postgres",
        "postgresql",
    }:
        with connect() as connection:
            row = connection.execute(
                """
                SELECT document_json
                FROM account_catalogue_documents
                WHERE document_id = 'master-account-catalogue'
                """
            ).fetchone()
        if row is not None:
            return MasterAccountCatalogue.model_validate_json(row["document_json"])

        seed = load_master_account_catalogue(settings.account_catalogue_source_path)
        _persist_master_account_catalogue(seed)
        return seed

    catalogue_path = path or settings.account_catalogue_source_path
    raw = json.loads(catalogue_path.read_text(encoding="utf-8"))
    catalogue = MasterAccountCatalogue.model_validate(raw)
    if path is not None:
        return catalogue

    # Preserve the introduction date for the latest import even when the source predates this
    # metadata field. The private recovery backup is the authoritative before-image.
    backup_directory = settings.backup_path / "account-catalogue"
    backups = sorted(
        backup_directory.glob(f"{catalogue_path.stem}-*{catalogue_path.suffix}"),
        key=lambda candidate: candidate.stat().st_mtime,
        reverse=True,
    )
    if not backups:
        return catalogue
    try:
        previous = MasterAccountCatalogue.model_validate(
            json.loads(backups[0].read_text(encoding="utf-8"))
        )
    except (OSError, json.JSONDecodeError, ValidationError):
        return catalogue
    previous_ids = {record.catalogue_id for record in previous.records}
    records = [
        record.model_copy(
            update={"introduced_at": catalogue.updated_at}
        )
        if not record.introduced_at and record.catalogue_id not in previous_ids
        else record
        for record in catalogue.records
    ]
    return catalogue.model_copy(update={"records": records})


def _current_timestamp() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def _persist_master_account_catalogue(catalogue: MasterAccountCatalogue) -> None:
    if settings.database_mode.strip().lower() in {"neon", "postgres", "postgresql"}:
        timestamp = _current_timestamp()
        with connect() as connection:
            connection.execute(
                """
                INSERT INTO account_catalogue_documents (
                  document_id, schema_version, catalogue_name, document_json,
                  source_updated_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(document_id) DO UPDATE SET
                  schema_version = excluded.schema_version,
                  catalogue_name = excluded.catalogue_name,
                  document_json = excluded.document_json,
                  source_updated_at = excluded.source_updated_at,
                  updated_at = excluded.updated_at
                """,
                (
                    "master-account-catalogue",
                    catalogue.schema_version,
                    catalogue.catalogue_name,
                    catalogue.model_dump_json(),
                    catalogue.updated_at,
                    timestamp,
                    timestamp,
                ),
            )
        return

    source_path = settings.account_catalogue_source_path
    source_path.parent.mkdir(parents=True, exist_ok=True)

    # Catalogue edits are Fund Manager authority changes. Keep the previous valid
    # source before replacing it so an accidental edit remains locally recoverable.
    if source_path.exists():
        backup_directory = settings.backup_path / "account-catalogue"
        backup_directory.mkdir(parents=True, exist_ok=True)
        backup_stamp = datetime.now(UTC).strftime("%Y%m%d-%H%M%S-%f")
        shutil.copy2(
            source_path,
            backup_directory / f"{source_path.stem}-{backup_stamp}{source_path.suffix}",
        )

    temporary_path = source_path.with_suffix(f"{source_path.suffix}.tmp")
    temporary_path.write_text(
        json.dumps(catalogue.model_dump(mode="json"), indent=2) + "\n",
        encoding="utf-8",
    )
    temporary_path.replace(source_path)


def _load_catalogue_for_request() -> MasterAccountCatalogue:
    try:
        return load_master_account_catalogue()
    except FileNotFoundError as error:
        raise HTTPException(
            status_code=404, detail="Master account catalogue file not found"
        ) from error
    except (json.JSONDecodeError, ValidationError) as error:
        raise HTTPException(
            status_code=422, detail=f"Master account catalogue is invalid: {error}"
        ) from error


@router.get("", response_model=MasterAccountCatalogue)
def get_master_account_catalogue() -> MasterAccountCatalogue:
    return _load_catalogue_for_request()


@router.get("/export.json", response_class=Response)
def export_master_account_catalogue() -> Response:
    """Export the validated source without applying or mutating any provider data."""
    catalogue = _load_catalogue_for_request()
    return Response(
        content=json.dumps(catalogue.model_dump(mode="json"), indent=2) + "\n",
        media_type="application/json",
        headers={
            "Content-Disposition": "attachment; filename=plum-duff-account-catalogue.json"
        },
    )


@router.post("/import/preflight", response_model=MasterAccountCataloguePreflightResult)
def preflight_master_account_catalogue_import(
    payload: MasterAccountCataloguePreflight,
) -> MasterAccountCataloguePreflightResult:
    """Validate a whole-catalogue candidate without mutating the active source.

    The explicit apply/audit workflow is intentionally separate. Stable IDs make deleted or
    changed providers visible before a Fund Manager can decide how to preserve profile history.
    """
    current = _load_catalogue_for_request()
    incoming_by_id = {record.catalogue_id: record for record in payload.catalogue.records}
    current_by_id = {record.catalogue_id: record for record in current.records}
    added = sorted(set(incoming_by_id) - set(current_by_id))
    removed = sorted(set(current_by_id) - set(incoming_by_id))
    updated = sorted(
        catalogue_id
        for catalogue_id in set(incoming_by_id) & set(current_by_id)
        if incoming_by_id[catalogue_id] != current_by_id[catalogue_id]
    )
    return MasterAccountCataloguePreflightResult(
        valid=True,
        incoming_record_count=len(incoming_by_id),
        current_record_count=len(current_by_id),
        added_catalogue_ids=added,
        updated_catalogue_ids=updated,
        removed_catalogue_ids=removed,
        requires_explicit_apply=True,
    )


@router.post("/import/apply", response_model=MasterAccountCatalogueApplyResult)
def apply_master_account_catalogue_import(
    payload: MasterAccountCataloguePreflight,
) -> MasterAccountCatalogueApplyResult:
    current = _load_catalogue_for_request()
    incoming = payload.catalogue
    current_by_id = {record.catalogue_id: record for record in current.records}
    incoming_by_id = {record.catalogue_id: record for record in incoming.records}
    added = sorted(set(incoming_by_id) - set(current_by_id))
    removed = sorted(set(current_by_id) - set(incoming_by_id))
    updated = sorted(
        catalogue_id
        for catalogue_id in set(incoming_by_id) & set(current_by_id)
        if incoming_by_id[catalogue_id] != current_by_id[catalogue_id]
    )

    # Omitted providers are archived rather than deleted so historical Profile links remain valid.
    archived_records = [
        current_by_id[catalogue_id].model_copy(update={"status": "Archived"})
        for catalogue_id in removed
    ]
    introduced_at = _current_timestamp()
    incoming_records = [
        record.model_copy(
            update={
                "introduced_at": (
                    introduced_at
                    if record.catalogue_id in added
                    else current_by_id[record.catalogue_id].introduced_at
                )
            }
        )
        for record in incoming.records
    ]
    try:
        replacement = MasterAccountCatalogue.model_validate(
            {
                **incoming.model_dump(mode="json"),
                "updated_at": _current_timestamp(),
                "records": [
                    *[record.model_dump(mode="json") for record in incoming_records],
                    *[record.model_dump(mode="json") for record in archived_records],
                ],
            }
        )
    except ValidationError as error:
        raise HTTPException(
            status_code=409,
            detail=(
                "Catalogue import conflicts with retained historical providers: "
                f"{error}"
            ),
        ) from error

    _persist_master_account_catalogue(replacement)
    return MasterAccountCatalogueApplyResult(
        valid=True,
        incoming_record_count=len(incoming_by_id),
        current_record_count=len(current_by_id),
        added_catalogue_ids=added,
        updated_catalogue_ids=updated,
        removed_catalogue_ids=removed,
        requires_explicit_apply=False,
        archived_catalogue_ids=removed,
    )


@router.post(
    "/records", response_model=MasterAccountCatalogueRecord, status_code=201
)
def create_master_account_catalogue_record(
    payload: MasterAccountCatalogueRecord,
) -> MasterAccountCatalogueRecord:
    catalogue = _load_catalogue_for_request()
    payload = payload.model_copy(
        update={"introduced_at": payload.introduced_at or _current_timestamp()}
    )
    try:
        updated = MasterAccountCatalogue.model_validate(
            {
                **catalogue.model_dump(mode="json"),
                "updated_at": _current_timestamp(),
                "records": [
                    *[record.model_dump(mode="json") for record in catalogue.records],
                    payload.model_dump(mode="json"),
                ],
            }
        )
    except ValidationError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error

    _persist_master_account_catalogue(updated)
    return payload


@router.post("/records/archive", response_model=ArchiveCatalogueRecordsResult)
def archive_master_account_catalogue_records(
    payload: ArchiveCatalogueRecordsPayload,
) -> ArchiveCatalogueRecordsResult:
    """Archive selected providers atomically; never hard-delete Profile authorities."""
    catalogue = _load_catalogue_for_request()
    requested_ids = set(payload.catalogue_ids)
    current_ids = {record.catalogue_id for record in catalogue.records}
    found_ids = sorted(requested_ids & current_ids)
    missing_ids = sorted(requested_ids - current_ids)
    if missing_ids:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Every selected provider must exist before the archive is applied",
                "catalogue_ids": missing_ids,
            },
        )
    replacement = catalogue.model_copy(
        update={
            "updated_at": _current_timestamp(),
            "records": [
                record.model_copy(update={"status": "Archived"})
                if record.catalogue_id in requested_ids
                else record
                for record in catalogue.records
            ],
        }
    )
    _persist_master_account_catalogue(replacement)
    return ArchiveCatalogueRecordsResult(
        archived_catalogue_ids=found_ids,
        missing_catalogue_ids=missing_ids,
    )


@router.put(
    "/records/{catalogue_id}", response_model=MasterAccountCatalogueRecord
)
def update_master_account_catalogue_record(
    catalogue_id: str, payload: MasterAccountCatalogueRecord
) -> MasterAccountCatalogueRecord:
    normalized_id = catalogue_id.strip().upper()
    if payload.catalogue_id != normalized_id:
        raise HTTPException(
            status_code=422,
            detail="catalogue_id is stable and must match the record being edited",
        )

    catalogue = _load_catalogue_for_request()
    found = False
    records: list[dict[str, object]] = []
    for record in catalogue.records:
        if record.catalogue_id == normalized_id:
            records.append(payload.model_dump(mode="json"))
            found = True
        else:
            records.append(record.model_dump(mode="json"))

    if not found:
        raise HTTPException(status_code=404, detail="Account catalogue record not found")

    try:
        updated = MasterAccountCatalogue.model_validate(
            {
                **catalogue.model_dump(mode="json"),
                "updated_at": _current_timestamp(),
                "records": records,
            }
        )
    except ValidationError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error

    _persist_master_account_catalogue(updated)
    return payload
