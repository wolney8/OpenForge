from fastapi.testclient import TestClient

from openforge_api.main import app


def payload(**overrides: str) -> dict[str, str]:
    base = {
        "placed_at": "2026-08-24T12:00:00Z",
        "runner": "Synthetic Runner",
        "race": "Synthetic 14:30",
        "bookmaker": "Bookmaker A",
        "mode": "Extra Place",
        "each_way_stake": "10.00",
        "back_odds": "6.00",
        "place_term_numerator": "1",
        "place_term_denominator": "5",
        "win_exchange": "Exchange A",
        "win_lay_odds": "2.30",
        "win_commission": "0",
        "place_exchange": "Exchange A",
        "place_lay_odds": "4.50",
        "place_commission": "0",
        "status": "Placed",
        "result": "Pending",
    }
    return {**base, **overrides}


def test_each_way_extra_place_crud_is_profile_scoped() -> None:
    client = TestClient(app)
    created = client.post(
        "/profiles/profile-demo-001/each-way-extra-places", json=payload()
    )
    assert created.status_code == 201
    row = created.json()
    assert row["win_lay_stake"] == "26.09"
    assert row["extra_place_pnl"] == "30.53"

    other_profile_rows = client.get("/profiles/profile-demo-002/each-way-extra-places").json()
    assert all(item["each_way_extra_place_id"] != row["each_way_extra_place_id"] for item in other_profile_rows)
    listed = client.get("/profiles/profile-demo-001/each-way-extra-places")
    assert any(item["each_way_extra_place_id"] == row["each_way_extra_place_id"] for item in listed.json())

    settled = client.put(
        f"/profiles/profile-demo-001/each-way-extra-places/{row['each_way_extra_place_id']}",
        json=payload(status="Settled", result="Extra Place"),
    )
    assert settled.status_code == 200
    assert settled.json()["final_value"] == "30.53"

    blocked = client.request(
        "DELETE",
        f"/profiles/profile-demo-001/each-way-extra-places/{row['each_way_extra_place_id']}",
        json={},
    )
    assert blocked.status_code == 409

    deleted = client.request(
        "DELETE",
        f"/profiles/profile-demo-001/each-way-extra-places/{row['each_way_extra_place_id']}",
        json={"deletion_reason": "Synthetic regression cleanup"},
    )
    assert deleted.status_code == 204
