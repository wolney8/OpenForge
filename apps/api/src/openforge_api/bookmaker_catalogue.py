from __future__ import annotations

import re
import sqlite3
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field, field_validator, model_validator

from openforge_api.db import (
    BookmakerCatalogueRecord,
    create_bookmaker_catalogue_entry,
    get_bookmaker_display_settings,
    get_profile,
    list_bookmaker_catalogue,
    update_bookmaker_catalogue_entry,
    update_global_bookmaker_display_mode,
    update_profile_bookmaker_display_mode,
)

router = APIRouter(tags=["bookmaker-catalogue"])

CatalogueStatus = Literal["Active", "Archived"]
Confidence = Literal["Verified", "Likely", "Unverified"]
DisplayMode = Literal["Name", "Brand badge", "Logo"]
ProfileDisplayMode = Literal["Inherit", "Name", "Brand badge", "Logo"]


def _relative_luminance(hex_colour: str) -> float:
    channels = [int(hex_colour[index : index + 2], 16) / 255 for index in (1, 3, 5)]
    linear = [
        channel / 12.92
        if channel <= 0.04045
        else ((channel + 0.055) / 1.055) ** 2.4
        for channel in channels
    ]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


def contrast_ratio(foreground: str, background: str) -> float:
    lighter, darker = sorted(
        (_relative_luminance(foreground), _relative_luminance(background)), reverse=True
    )
    return (lighter + 0.05) / (darker + 0.05)


class BookmakerCataloguePayload(BaseModel):
    bookmaker_id: str | None = Field(default=None, max_length=64)
    brand_name: str = Field(min_length=1, max_length=120)
    short_display_name: str = Field(min_length=1, max_length=32)
    legal_operator: str = Field(default="", max_length=160)
    operator_group: str = Field(default="", max_length=120)
    platform: str = Field(default="", max_length=120)
    risk_team: str = Field(default="", max_length=120)
    licence_reference: str = Field(default="", max_length=120)
    licence_status: str = Field(default="", max_length=120)
    canonical_domain: str = Field(default="", max_length=200)
    status: CatalogueStatus = "Active"
    foreground_colour: str = "#FFFFFF"
    background_colour: str = "#455A64"
    logo_asset_path: str = Field(default="", max_length=300)
    source: str = Field(default="", max_length=300)
    confidence: Confidence = "Unverified"
    last_verified_date: str = Field(default="", max_length=20)

    @field_validator(
        "brand_name",
        "short_display_name",
        "legal_operator",
        "operator_group",
        "platform",
        "risk_team",
        "licence_reference",
        "licence_status",
        "canonical_domain",
        "logo_asset_path",
        "source",
        "last_verified_date",
    )
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("foreground_colour", "background_colour")
    @classmethod
    def validate_hex_colour(cls, value: str) -> str:
        normalized = value.strip().upper()
        if not re.fullmatch(r"#[0-9A-F]{6}", normalized):
            raise ValueError("colour must use six-digit hex format, for example #FFFFFF")
        return normalized

    @field_validator("logo_asset_path")
    @classmethod
    def validate_local_logo(cls, value: str) -> str:
        if not value:
            return value
        if not value.startswith("/") or ".." in value or value.startswith("//"):
            raise ValueError("logo_asset_path must be an approved local public path")
        return value

    @model_validator(mode="after")
    def validate_accessible_colours(self) -> "BookmakerCataloguePayload":
        if contrast_ratio(self.foreground_colour, self.background_colour) < 4.5:
            raise ValueError("bookmaker badge colours must meet WCAG AA contrast of 4.5:1")
        return self


class BookmakerCatalogueResponse(BookmakerCataloguePayload):
    bookmaker_id: str
    created_at: str
    updated_at: str


class GlobalDisplaySettingsPayload(BaseModel):
    mode: DisplayMode


class GlobalDisplaySettingsResponse(BaseModel):
    global_mode: DisplayMode


class ProfileDisplaySettingsPayload(BaseModel):
    mode: ProfileDisplayMode


class BookmakerDisplaySettingsResponse(BaseModel):
    global_mode: DisplayMode
    profile_override: ProfileDisplayMode
    resolved_mode: DisplayMode


def serialize_catalogue(record: BookmakerCatalogueRecord) -> BookmakerCatalogueResponse:
    return BookmakerCatalogueResponse.model_validate(record.__dict__)


@router.get("/bookmaker-catalogue", response_model=list[BookmakerCatalogueResponse])
def list_catalogue(
    include_archived: bool = Query(default=True),
) -> list[BookmakerCatalogueResponse]:
    return [
        serialize_catalogue(row)
        for row in list_bookmaker_catalogue(include_archived=include_archived)
    ]


@router.post("/bookmaker-catalogue", response_model=BookmakerCatalogueResponse, status_code=201)
def create_catalogue_entry(payload: BookmakerCataloguePayload) -> BookmakerCatalogueResponse:
    try:
        created = create_bookmaker_catalogue_entry(payload.model_dump())
    except sqlite3.IntegrityError as error:
        raise HTTPException(
            status_code=409, detail="Bookmaker brand name already exists"
        ) from error
    return serialize_catalogue(created)


@router.put(
    "/bookmaker-catalogue/{bookmaker_id}", response_model=BookmakerCatalogueResponse
)
def update_catalogue_entry(
    bookmaker_id: str, payload: BookmakerCataloguePayload
) -> BookmakerCatalogueResponse:
    try:
        updated = update_bookmaker_catalogue_entry(bookmaker_id, payload.model_dump())
    except sqlite3.IntegrityError as error:
        raise HTTPException(
            status_code=409, detail="Bookmaker brand name already exists"
        ) from error
    if updated is None:
        raise HTTPException(status_code=404, detail="Bookmaker catalogue entry not found")
    return serialize_catalogue(updated)


@router.get(
    "/profiles/{profile_id}/bookmaker-display-settings",
    response_model=BookmakerDisplaySettingsResponse,
)
def get_display_settings(profile_id: str) -> BookmakerDisplaySettingsResponse:
    if get_profile(profile_id) is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return BookmakerDisplaySettingsResponse.model_validate(
        get_bookmaker_display_settings(profile_id).__dict__
    )


@router.put(
    "/bookmaker-display-settings",
    response_model=GlobalDisplaySettingsResponse,
)
def save_global_display_settings(
    payload: GlobalDisplaySettingsPayload,
) -> GlobalDisplaySettingsResponse:
    update_global_bookmaker_display_mode(payload.mode)
    return GlobalDisplaySettingsResponse(global_mode=payload.mode)


@router.put(
    "/profiles/{profile_id}/bookmaker-display-settings",
    response_model=BookmakerDisplaySettingsResponse,
)
def save_profile_display_settings(
    profile_id: str, payload: ProfileDisplaySettingsPayload
) -> BookmakerDisplaySettingsResponse:
    if get_profile(profile_id) is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    update_profile_bookmaker_display_mode(profile_id, payload.mode)
    return BookmakerDisplaySettingsResponse.model_validate(
        get_bookmaker_display_settings(profile_id).__dict__
    )
