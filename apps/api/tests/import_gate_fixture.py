"""Small synthetic XLSX used by the actual import-review browser regression."""

from base64 import b64encode
from io import BytesIO
from xml.sax.saxutils import quoteattr
from zipfile import ZIP_DEFLATED, ZipFile

from openforge_api.xlsx_export import (
    ACCOUNT_EXPORT_HEADERS,
    CASH_ADJUSTMENT_EXPORT_HEADERS,
    CASINO_OFFER_EXPORT_HEADERS,
    FREE_BET_EXPORT_HEADERS,
    SPORTSBOOK_EXPORT_HEADERS,
    build_ledger_export,
)


def build_fixture() -> bytes:
    groups = [
        (
            "Accounts",
            ACCOUNT_EXPORT_HEADERS + ("Stake Access", "Promo Access"),
            [
                dict(
                    AccountID="SYNTHETIC-A",
                    Account="Bet365",
                    Type="Bookie",
                    Status="Restricted",
                    Channel="App Only",
                    CurrentBalance="",
                    **{
                        "Counts In Cash Total": True,
                        "Stake Access": "Unknown",
                        "Promo Access": "Unknown",
                    },
                ),
            ],
        ),
        (
            "Sportsbook Bets",
            SPORTSBOOK_EXPORT_HEADERS,
            [
                dict(
                    QualBetID="SYNTHETIC-VOID",
                    Bookmaker="Bet365",
                    EventName="Synthetic Void",
                    Status="Free Bet Awarded",
                    Result="Void",
                    BackStake="12",
                    BackOdds="",
                    MatchStrategy="No Lay",
                    FinalNetPnL="0",
                ),
                dict(
                    QualBetID="SYNTHETIC-ODDS",
                    Bookmaker="Bet365",
                    EventName="Synthetic high odds",
                    Status="Settled",
                    Result="Lose",
                    BackStake="12",
                    BackOdds="2.5000002E7",
                    MatchStrategy="No Lay",
                    DateSettling="2026-08-01",
                    FinalNetPnL="-12",
                ),
            ],
        ),
        ("Free Bets", FREE_BET_EXPORT_HEADERS, []),
        (
            "Casino Offers",
            CASINO_OFFER_EXPORT_HEADERS,
            [
                dict(
                    CasinoOfferID="SYNTHETIC-C",
                    DateStarted="2026-08-01",
                    Bookmaker="Bet365",
                    OfferName="Synthetic final",
                    OfferType="Free Spins",
                    Status="Settled",
                    Result="Win",
                    FinalNetPnL="4.50",
                ),
            ],
        ),
        ("Cash Adjustments", CASH_ADJUSTMENT_EXPORT_HEADERS, []),
    ]
    out = BytesIO()
    with ZipFile(out, "w", ZIP_DEFLATED) as target:
        sheets, relations = [], []
        for i, (name, headers, rows) in enumerate(groups, 1):
            source = ZipFile(
                BytesIO(
                    build_ledger_export(
                        rows, headers=headers, sheet_name=name, table_name=f"Synthetic{i}"
                    )
                )
            )
            sheets.append(f'<sheet name={quoteattr(name)} sheetId="{i}" r:id="rId{i}"/>')
            relations.append(
                f'<Relationship Id="rId{i}" Target="worksheets/sheet{i}.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/>'
            )
            sheet = source.read("xl/worksheets/sheet1.xml").decode()
            sheet = sheet.replace(
                't="inlineStr"><is><t>2.5000002E7</t></is>', 't="n"><v>2.5000002E7</v>'
            )
            target.writestr(f"xl/worksheets/sheet{i}.xml", sheet)
            target.writestr(
                f"xl/tables/table{i}.xml",
                source.read("xl/tables/table1.xml").replace(
                    b'id="1" name=', f'id="{i}" name='.encode()
                ),
            )
            target.writestr(
                f"xl/worksheets/_rels/sheet{i}.xml.rels",
                source.read("xl/worksheets/_rels/sheet1.xml.rels").replace(
                    b"table1.xml", f"table{i}.xml".encode()
                ),
            )
        target.writestr(
            "xl/workbook.xml",
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
            + "".join(sheets)
            + "</sheets></workbook>",
        )
        target.writestr(
            "xl/_rels/workbook.xml.rels",
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            + "".join(relations)
            + "</Relationships>",
        )
    return out.getvalue()


if __name__ == "__main__":
    print(b64encode(build_fixture()).decode())
