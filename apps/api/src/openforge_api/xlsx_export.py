# ruff: noqa: E501 - OOXML relationship and content-type values are intentionally literal.

from __future__ import annotations

from io import BytesIO
from xml.sax.saxutils import escape, quoteattr
from zipfile import ZIP_DEFLATED, ZipFile

SPORTSBOOK_EXPORT_HEADERS = (
    "QualBetID",
    "DateSettling",
    "EventName",
    "Market",
    "Offer",
    "Bookmaker",
    "OfferType",
    "BetType",
    "OfferName",
    "FixtureType",
    "Status",
    "Result",
    "BackStake",
    "BackOdds",
    "MatchStrategy",
    "LayOdds1",
    "Exchange",
    "Lay (Actual)",
    "LayMatchedStake1",
    "UserNotes",
    "ManualOverrideValue",
    "ManualOverrideReason",
    "BonusTrigger",
    "MaximumBonus",
    "BonusRetentionRate",
    "MultiLayOutcome1Name",
    "MultiLayOutcomesJson",
    "CurrentProjectedValue",
    "SettledFinalValue",
    "ReportingValue",
)

FREE_BET_EXPORT_HEADERS = (
    "FreeBetID",
    "DateSettling",
    "ExpiryDateTime",
    "EventName",
    "Offer",
    "Bookmaker",
    "OfferType",
    "BetType",
    "OfferName",
    "FixtureType",
    "Status",
    "Result",
    "FreeBetRetentionMode",
    "FreeBetValue",
    "BackOdds",
    "MatchStrategy",
    "LayOdds1",
    "Exchange",
    "Lay (Actual)",
    "LayMatchedStake1",
    "FinalNetPnL",
    "ManualOverrideReason",
    "OriginQualBetID",
    "OfferGroupID",
    "UserNotes",
    "CurrentProjectedValue",
    "SettledFinalValue",
    "ReportingValue",
)

CASINO_OFFER_EXPORT_HEADERS = (
    "CasinoOfferID",
    "OfferGroupID",
    "DateStarted",
    "DateSettling",
    "ExpiryDateTime",
    "Bookmaker",
    "OfferType",
    "OfferName",
    "Game",
    "CashStake",
    "CreditAmount",
    "BonusAmount",
    "WagerMultiplier",
    "WagerTarget",
    "Required Spins",
    "SpinStake",
    "Free Spins Awarded",
    "Free Spins Value",
    "Status",
    "Result",
    "CalcNetPnL",
    "FinalNetPnL",
    "ResolvedNetPnL",
    "UserNotes",
)

CASH_ADJUSTMENT_EXPORT_HEADERS = (
    "AdjustmentID",
    "AdjustmentDate",
    "Direction",
    "Amount",
    "AdjustmentType",
    "AffectsInvestment",
    "AffectsCashSnapshot",
    "LinkedAccount",
    "Description",
    "SignedAmount",
    "WeekLabel",
)

ACCOUNT_EXPORT_HEADERS = (
    "AccountID",
    "Account",
    "Type",
    "Counts In Cash Total",
    "Channel",
    "Status",
    "CurrentBalance",
    "PendingWithdrawalAmount",
    "LastBalanceUpdate",
    "LastPromoUsed",
    "Group",
    "Platform",
    "RiskTeam",
    "SignUpDate",
    "Notes",
)


def column_name(index: int) -> str:
    result = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        result = chr(65 + remainder) + result
    return result


def inline_cell(reference: str, value: object) -> str:
    text = "" if value is None else str(value)
    preserve = ' xml:space="preserve"' if text != text.strip() else ""
    return f'<c r="{reference}" t="inlineStr"><is><t{preserve}>{escape(text)}</t></is></c>'


def build_sportsbook_export(rows: list[dict[str, object]]) -> bytes:
    return build_ledger_export(
        rows,
        headers=SPORTSBOOK_EXPORT_HEADERS,
        sheet_name="Sportsbook Bets",
        table_name="PlumDuffSportsbookExport",
    )


def build_free_bet_export(rows: list[dict[str, object]]) -> bytes:
    return build_ledger_export(
        rows,
        headers=FREE_BET_EXPORT_HEADERS,
        sheet_name="Free Bets",
        table_name="PlumDuffFreeBetExport",
    )


def build_casino_offer_export(rows: list[dict[str, object]]) -> bytes:
    return build_ledger_export(
        rows,
        headers=CASINO_OFFER_EXPORT_HEADERS,
        sheet_name="Casino Offers",
        table_name="PlumDuffCasinoOfferExport",
    )


def build_cash_adjustment_export(rows: list[dict[str, object]]) -> bytes:
    return build_ledger_export(
        rows,
        headers=CASH_ADJUSTMENT_EXPORT_HEADERS,
        sheet_name="Cash Adjustments",
        table_name="PlumDuffCashAdjustmentExport",
    )


def build_account_export(rows: list[dict[str, object]]) -> bytes:
    return build_ledger_export(
        rows,
        headers=ACCOUNT_EXPORT_HEADERS,
        sheet_name="Accounts",
        table_name="PlumDuffAccountExport",
    )


def build_ledger_export(
    rows: list[dict[str, object]],
    *,
    headers: tuple[str, ...],
    sheet_name: str,
    table_name: str,
) -> bytes:
    last_column = column_name(len(headers))
    last_row = len(rows) + 1
    table_reference = f"A1:{last_column}{last_row}"
    sheet_rows = [
        '<row r="1">'
        + "".join(
            inline_cell(f"{column_name(index)}1", header)
            for index, header in enumerate(headers, start=1)
        )
        + "</row>"
    ]
    for row_index, row in enumerate(rows, start=2):
        sheet_rows.append(
            f'<row r="{row_index}">'
            + "".join(
                inline_cell(f"{column_name(column_index)}{row_index}", row.get(header, ""))
                for column_index, header in enumerate(headers, start=1)
            )
            + "</row>"
        )

    columns = "".join(
        f'<tableColumn id="{index}" name={quoteattr(header)}/>'
        for index, header in enumerate(headers, start=1)
    )
    output = BytesIO()
    with ZipFile(output, "w", ZIP_DEFLATED) as workbook:
        workbook.writestr(
            "[Content_Types].xml",
            """<?xml version="1.0" encoding="UTF-8"?>
            <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
              <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
              <Default Extension="xml" ContentType="application/xml"/>
              <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
              <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
              <Override PartName="/xl/tables/table1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>
            </Types>""",
        )
        workbook.writestr(
            "_rels/.rels",
            """<?xml version="1.0" encoding="UTF-8"?>
            <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
              <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
            </Relationships>""",
        )
        workbook.writestr(
            "xl/workbook.xml",
            f"""<?xml version="1.0" encoding="UTF-8"?>
            <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
              <sheets><sheet name={quoteattr(sheet_name)} sheetId="1" r:id="rId1"/></sheets>
            </workbook>""",
        )
        workbook.writestr(
            "xl/_rels/workbook.xml.rels",
            """<?xml version="1.0" encoding="UTF-8"?>
            <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
              <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
            </Relationships>""",
        )
        workbook.writestr(
            "xl/worksheets/sheet1.xml",
            """<?xml version="1.0" encoding="UTF-8"?>
            <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
              <sheetData>"""
            + "".join(sheet_rows)
            + """</sheetData><tableParts count="1"><tablePart r:id="rId1"/></tableParts></worksheet>""",
        )
        workbook.writestr(
            "xl/worksheets/_rels/sheet1.xml.rels",
            """<?xml version="1.0" encoding="UTF-8"?>
            <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
              <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table1.xml"/>
            </Relationships>""",
        )
        workbook.writestr(
            "xl/tables/table1.xml",
            f"""<?xml version="1.0" encoding="UTF-8"?>
            <table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="1" name={quoteattr(table_name)} displayName={quoteattr(table_name)} ref="{table_reference}">
              <tableColumns count="{len(headers)}">{columns}</tableColumns>
            </table>""",
        )
    return output.getvalue()
