from __future__ import annotations

import json
from collections.abc import Iterable

ACCESS_CHANNEL_ORDER = ("Online", "Mobile", "Retail", "Unknown")
ACCESS_CHANNELS = frozenset(ACCESS_CHANNEL_ORDER)


def normalize_access_channels(values: Iterable[str]) -> list[str]:
    normalized = {str(value).strip().title() for value in values if str(value).strip()}
    unknown = normalized - ACCESS_CHANNELS
    if unknown:
        raise ValueError(
            "access channels must use Online, Mobile, Retail, or Unknown"
        )
    if "Unknown" in normalized and len(normalized) > 1:
        raise ValueError("Unknown cannot be combined with an operating channel")
    return [value for value in ACCESS_CHANNEL_ORDER if value in normalized]


def access_channels_from_legacy(value: str) -> list[str]:
    parts = [item.strip() for item in str(value or "").split(",") if item.strip()]
    aliases = {"In Store": "Retail"}
    return normalize_access_channels(aliases.get(item.title(), item) for item in parts)


def access_channels_from_json(value: str) -> list[str]:
    try:
        parsed = json.loads(value or "[]")
    except json.JSONDecodeError as error:
        raise ValueError("access_channels_json must contain valid JSON") from error
    if not isinstance(parsed, list) or any(not isinstance(item, str) for item in parsed):
        raise ValueError("access_channels_json must contain a list of strings")
    return normalize_access_channels(parsed)


def access_channels_json(values: Iterable[str]) -> str:
    return json.dumps(normalize_access_channels(values), separators=(",", ":"))


def legacy_channel_projection(values: Iterable[str]) -> str:
    channels = normalize_access_channels(values)
    return ", ".join(channels) if channels else "Unknown"
