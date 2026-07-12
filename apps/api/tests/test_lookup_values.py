from __future__ import annotations

from pathlib import Path
from zipfile import ZipFile

from fastapi.testclient import TestClient

from openforge_api.config import settings
from openforge_api.db import read_workbook_named_range_values
from openforge_api.main import app


def configure_temp_database(tmp_path: Path) -> None:
    settings.database_url = f"sqlite:///{tmp_path / 'openforge-test.sqlite3'}"
    settings.backup_directory = str(tmp_path / "backups")


def test_read_workbook_named_range_values_extracts_offer_name_list(tmp_path: Path) -> None:
    workbook_path = tmp_path / "offer-name-list.xlsx"
    with ZipFile(workbook_path, "w") as workbook_archive:
        workbook_archive.writestr(
            "[Content_Types].xml",
            """<?xml version="1.0" encoding="UTF-8"?>
            <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
              <Default
                Extension="rels"
                ContentType="application/vnd.openxmlformats-package.relationships+xml"
              />
              <Default Extension="xml" ContentType="application/xml"/>
            </Types>
            """,
        )
        workbook_archive.writestr(
            "xl/workbook.xml",
            """<?xml version="1.0" encoding="UTF-8"?>
            <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
              xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
              <sheets>
                <sheet name="Settings" sheetId="1" r:id="rId1"/>
              </sheets>
              <definedNames>
                <definedName name="OfferNameList">Settings!$AH$3:$AH$6</definedName>
              </definedNames>
            </workbook>
            """,
        )
        workbook_archive.writestr(
            "xl/_rels/workbook.xml.rels",
            """<?xml version="1.0" encoding="UTF-8"?>
            <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
              <Relationship
                Id="rId1"
                Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"
                Target="worksheets/sheet1.xml"
              />
            </Relationships>
            """,
        )
        workbook_archive.writestr(
            "xl/sharedStrings.xml",
            """<?xml version="1.0" encoding="UTF-8"?>
            <sst
              xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
              count="3"
              uniqueCount="3"
            >
              <si><t>Daily Reload</t></si>
              <si><t>Weekly Reload</t></si>
              <si><t>One-off</t></si>
            </sst>
            """,
        )
        workbook_archive.writestr(
            "xl/worksheets/sheet1.xml",
            """<?xml version="1.0" encoding="UTF-8"?>
            <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
              <sheetData>
                <row r="3"><c r="AH3" t="s"><v>0</v></c></row>
                <row r="4"><c r="AH4" t="s"><v>1</v></c></row>
                <row r="5"><c r="AH5" t="inlineStr"><is><t></t></is></c></row>
                <row r="6"><c r="AH6" t="s"><v>2</v></c></row>
              </sheetData>
            </worksheet>
            """,
        )

    assert read_workbook_named_range_values(workbook_path, "OfferNameList") == [
        "Daily Reload",
        "Weekly Reload",
        "One-off",
    ]


def test_lookup_values_are_profile_scoped_and_mutable(tmp_path: Path) -> None:
    configure_temp_database(tmp_path)
    client = TestClient(app)

    seeded = client.get("/profiles/profile-demo-001/lookup-values")
    assert seeded.status_code == 200
    assert seeded.json()
    assert any(row["lookup_type"] == "offer_name" for row in seeded.json())
    assert any(row["lookup_type"] == "casino_offer_name" for row in seeded.json())

    create_response = client.post(
        "/profiles/profile-demo-001/lookup-values",
        json={"lookup_type": "casino_offer_name", "option_value": "Friday free spins"},
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["profile_id"] == "profile-demo-001"
    assert created["lookup_type"] == "casino_offer_name"
    assert created["option_value"] == "Friday free spins"

    profile_one_rows = client.get("/profiles/profile-demo-001/lookup-values")
    assert profile_one_rows.status_code == 200
    assert any(
        row["lookup_value_id"] == created["lookup_value_id"]
        for row in profile_one_rows.json()
    )

    profile_two_rows = client.get("/profiles/profile-demo-002/lookup-values")
    assert profile_two_rows.status_code == 200
    assert all(
        row["lookup_value_id"] != created["lookup_value_id"]
        for row in profile_two_rows.json()
    )

    update_response = client.put(
        f"/profiles/profile-demo-001/lookup-values/{created['lookup_value_id']}",
        json={"lookup_type": "casino_offer_name", "option_value": "Friday free spins reload"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["option_value"] == "Friday free spins reload"

    wrong_profile = client.put(
        f"/profiles/profile-demo-002/lookup-values/{created['lookup_value_id']}",
        json={"lookup_type": "casino_offer_name", "option_value": "Wrong Profile"},
    )
    assert wrong_profile.status_code == 404

    delete_response = client.delete(
        f"/profiles/profile-demo-001/lookup-values/{created['lookup_value_id']}"
    )
    assert delete_response.status_code == 204

    after_delete = client.get("/profiles/profile-demo-001/lookup-values")
    assert after_delete.status_code == 200
    assert all(
        row["lookup_value_id"] != created["lookup_value_id"]
        for row in after_delete.json()
    )
