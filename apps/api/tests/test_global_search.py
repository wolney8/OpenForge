from apps.api.tests.synthetic_setup import seed_synthetic_profile
from fastapi.testclient import TestClient

from openforge_api.db import update_profile_metadata
from openforge_api.main import app


def test_global_search_excludes_archived_profiles_from_ordinary_results() -> None:
    active_id = "profile-search-active"
    archived_id = "profile-search-archived"
    seed_synthetic_profile(
        active_id,
        display_name="Synthetic Search Active",
        profile_code="SEARCH-ACTIVE",
    )
    seed_synthetic_profile(
        archived_id,
        display_name="Synthetic Search Archived",
        profile_code="SEARCH-ARCHIVED",
    )
    update_profile_metadata(archived_id, status="Archived")

    response = TestClient(app).get("/search?query=Synthetic Search")

    assert response.status_code == 200
    result_ids = {item["result_id"] for item in response.json()}
    assert f"profile-{active_id}" in result_ids
    assert f"profile-{archived_id}" not in result_ids
