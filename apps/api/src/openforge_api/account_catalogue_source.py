from __future__ import annotations

import json
import re
import shutil
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator

from openforge_api.config import settings

router = APIRouter(prefix="/account-catalogue/source", tags=["account-catalogue"])

EvidenceField = Literal[
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


def load_master_account_catalogue(path: Path | None = None) -> MasterAccountCatalogue:
    catalogue_path = path or settings.account_catalogue_source_path
    raw = json.loads(catalogue_path.read_text(encoding="utf-8"))
    return MasterAccountCatalogue.model_validate(raw)


def _current_timestamp() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def _persist_master_account_catalogue(catalogue: MasterAccountCatalogue) -> None:
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


@router.post(
    "/records", response_model=MasterAccountCatalogueRecord, status_code=201
)
def create_master_account_catalogue_record(
    payload: MasterAccountCatalogueRecord,
) -> MasterAccountCatalogueRecord:
    catalogue = _load_catalogue_for_request()
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
