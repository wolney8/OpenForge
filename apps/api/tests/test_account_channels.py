from __future__ import annotations

import json

import pytest

from openforge_api.account_channels import (
    access_channels_from_json,
    access_channels_from_legacy,
    access_channels_json,
    legacy_channel_projection,
)
from openforge_api.accounts import AccountPayload


@pytest.mark.parametrize(
    ("legacy", "expected"),
    [
        ("Online", ["Online"]),
        ("Mobile", ["Mobile"]),
        ("Retail", ["Retail"]),
        ("In Store", ["Retail"]),
        ("Unknown", ["Unknown"]),
        ("Online, In Store", ["Online", "Retail"]),
        ("Mobile, Online", ["Online", "Mobile"]),
    ],
)
def test_legacy_account_channel_mapping_is_deterministic(
    legacy: str, expected: list[str]
) -> None:
    assert access_channels_from_legacy(legacy) == expected
    assert access_channels_from_json(access_channels_json(expected)) == expected


def test_unknown_cannot_be_combined_with_observed_channels() -> None:
    with pytest.raises(ValueError, match="Unknown cannot be combined"):
        access_channels_json(["Unknown", "Online"])


def test_account_payload_translates_old_client_and_projects_compatibility() -> None:
    values = {
        "account": "Bookmaker A",
        "type": "Bookie",
        "channel": "Online, In Store",
        "status": "Active",
    }
    payload = AccountPayload.model_validate(values)
    assert payload.access_channels == ["Online", "Retail"]
    assert payload.channel == "Online, Retail"

    canonical = AccountPayload.model_validate(
        {**values, "channel": "Unknown", "access_channels": ["Mobile", "Online"]}
    )
    assert canonical.access_channels == ["Online", "Mobile"]
    assert canonical.channel == "Online, Mobile"
    assert json.loads(access_channels_json(canonical.access_channels)) == ["Online", "Mobile"]
    assert legacy_channel_projection([]) == "Unknown"
