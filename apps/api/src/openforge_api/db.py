from __future__ import annotations

import json
import re
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterator
from uuid import uuid4
from xml.etree import ElementTree as ET
from zipfile import ZipFile

from openforge_api.config import settings


def utc_now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def load_tracker_seed() -> dict[str, Any] | None:
    root = Path(__file__).resolve().parents[4]
    candidate_paths = [
        root / "data" / "private" / "local-seed" / "openforge-tracker-seed.json",
        root / "apps" / "web" / "data" / "private" / "local-seed" / "openforge-tracker-seed.json",
    ]

    for path in candidate_paths:
        if path.exists():
            return json.loads(path.read_text())

    return None


def resolve_source_workbook_path() -> Path | None:
    root = Path(__file__).resolve().parents[4]
    seed = load_tracker_seed()
    source_workbook = normalize_seed_text(seed.get("sourceWorkbook")) if seed else ""
    candidate_paths = []
    if source_workbook:
        candidate_paths.append(root / "_input" / source_workbook)
    candidate_paths.append(root / "_input" / "WO_MB_Tracker_May2026.xlsx")

    for path in candidate_paths:
        if path.exists():
            return path

    return None


def column_letters_to_index(column_letters: str) -> int:
    total = 0
    for character in column_letters.upper():
        total = (total * 26) + (ord(character) - ord("A") + 1)
    return total


def parse_cell_reference(cell_reference: str) -> tuple[int, int]:
    match = re.fullmatch(r"\$?([A-Z]+)\$?(\d+)", cell_reference)
    if match is None:
        raise ValueError(f"Unsupported cell reference: {cell_reference}")
    column_letters, row_text = match.groups()
    return column_letters_to_index(column_letters), int(row_text)


def parse_defined_name_reference(reference_text: str) -> tuple[str, int, int, int, int]:
    match = re.fullmatch(
        r"(?:'(?P<quoted>(?:[^']|'')+)'|(?P<plain>[^!]+))!(?P<start>\$?[A-Z]+\$?\d+)(?::(?P<end>\$?[A-Z]+\$?\d+))?",
        reference_text,
    )
    if match is None:
        raise ValueError(f"Unsupported defined-name reference: {reference_text}")

    sheet_name = match.group("quoted") or match.group("plain") or ""
    sheet_name = sheet_name.replace("''", "'")
    start_reference = match.group("start")
    end_reference = match.group("end") or start_reference
    start_col, start_row = parse_cell_reference(start_reference)
    end_col, end_row = parse_cell_reference(end_reference)

    return (
        sheet_name,
        min(start_col, end_col),
        min(start_row, end_row),
        max(start_col, end_col),
        max(start_row, end_row),
    )


def normalize_zip_path(path_text: str) -> str:
    if path_text.startswith("/"):
        return path_text.lstrip("/")
    if path_text.startswith("xl/"):
        return path_text
    return f"xl/{path_text}"


def extract_shared_strings(workbook_archive: ZipFile) -> list[str]:
    try:
        root = ET.fromstring(workbook_archive.read("xl/sharedStrings.xml"))
    except KeyError:
        return []

    namespace = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    values: list[str] = []
    for string_item in root.findall("main:si", namespace):
        text_fragments = [
            text_node.text or ""
            for text_node in string_item.findall(".//main:t", namespace)
        ]
        values.append("".join(text_fragments))
    return values


def extract_sheet_paths(workbook_archive: ZipFile) -> dict[str, str]:
    workbook_root = ET.fromstring(workbook_archive.read("xl/workbook.xml"))
    rel_root = ET.fromstring(workbook_archive.read("xl/_rels/workbook.xml.rels"))
    workbook_namespace = {
        "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
        "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    }
    relationships_namespace = {"rels": "http://schemas.openxmlformats.org/package/2006/relationships"}

    relationship_targets = {
        relationship.attrib["Id"]: normalize_zip_path(relationship.attrib["Target"])
        for relationship in rel_root.findall("rels:Relationship", relationships_namespace)
    }

    sheet_paths: dict[str, str] = {}
    for sheet in workbook_root.findall("main:sheets/main:sheet", workbook_namespace):
        relationship_id = sheet.attrib.get(
            "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
        )
        sheet_name = sheet.attrib.get("name", "")
        if relationship_id and sheet_name and relationship_id in relationship_targets:
            sheet_paths[sheet_name] = relationship_targets[relationship_id]

    return sheet_paths


def read_defined_name_reference(workbook_archive: ZipFile, defined_name: str) -> str | None:
    workbook_root = ET.fromstring(workbook_archive.read("xl/workbook.xml"))
    namespace = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    for defined_name_node in workbook_root.findall("main:definedNames/main:definedName", namespace):
        if defined_name_node.attrib.get("name") == defined_name:
            value = (defined_name_node.text or "").strip()
            if value:
                return value
    return None


def read_workbook_named_range_values(workbook_path: Path, defined_name: str) -> list[str]:
    workbook_archive = ZipFile(workbook_path)
    try:
        reference_text = read_defined_name_reference(workbook_archive, defined_name)
        if not reference_text:
            return []

        sheet_name, min_col, min_row, max_col, max_row = parse_defined_name_reference(
            reference_text
        )
        sheet_paths = extract_sheet_paths(workbook_archive)
        sheet_path = sheet_paths.get(sheet_name)
        if not sheet_path:
            return []

        shared_strings = extract_shared_strings(workbook_archive)
        worksheet_root = ET.fromstring(workbook_archive.read(sheet_path))
        namespace = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

        values: list[str] = []
        seen_values: set[str] = set()

        for cell in worksheet_root.findall(".//main:sheetData/main:row/main:c", namespace):
            cell_reference = cell.attrib.get("r", "")
            if not cell_reference:
                continue

            column_index, row_index = parse_cell_reference(cell_reference)
            if not (min_col <= column_index <= max_col and min_row <= row_index <= max_row):
                continue

            cell_type = cell.attrib.get("t")
            if cell_type == "s":
                value_node = cell.find("main:v", namespace)
                if value_node is None or value_node.text is None:
                    continue
                normalized_value = normalize_seed_text(shared_strings[int(value_node.text)])
            elif cell_type == "inlineStr":
                normalized_value = normalize_seed_text(
                    "".join(
                        text_node.text or ""
                        for text_node in cell.findall(".//main:t", namespace)
                    )
                )
            else:
                value_node = cell.find("main:v", namespace)
                normalized_value = normalize_seed_text(
                    "" if value_node is None else value_node.text
                )

            if not normalized_value:
                continue

            lookup_key = normalized_value.casefold()
            if lookup_key in seen_values:
                continue
            seen_values.add(lookup_key)
            values.append(normalized_value)

        return values
    finally:
        workbook_archive.close()


@lru_cache(maxsize=1)
def load_workbook_offer_name_lookup_values() -> tuple[str, ...]:
    workbook_path = resolve_source_workbook_path()
    if workbook_path is None:
        return tuple()

    return tuple(read_workbook_named_range_values(workbook_path, "OfferNameList"))


def normalize_seed_text(value: Any, fallback: str = "") -> str:
    text = str(value or "").strip()
    return text or fallback


def parse_seed_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    normalized = str(value or "").strip().lower()
    return normalized in {"true", "1", "yes", "y"}


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    database_path = settings.database_path
    database_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        initialize_database(connection)
        yield connection
        connection.commit()
    finally:
        connection.close()


def initialize_database(connection: sqlite3.Connection) -> None:
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS profiles (
          profile_id TEXT PRIMARY KEY,
          display_name TEXT NOT NULL,
          profile_code TEXT NOT NULL,
          status TEXT NOT NULL,
          tracking_start_date TEXT NOT NULL,
          management_fee_percent TEXT NOT NULL,
          investment_fee_percent TEXT NOT NULL,
          current_cash_snapshot TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS profile_audit (
          audit_id TEXT PRIMARY KEY,
          profile_id TEXT NOT NULL,
          action TEXT NOT NULL,
          changed_at TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS bookmaker_catalogue (
          bookmaker_id TEXT PRIMARY KEY,
          brand_name TEXT NOT NULL COLLATE NOCASE UNIQUE,
          short_display_name TEXT NOT NULL,
          legal_operator TEXT NOT NULL,
          operator_group TEXT NOT NULL,
          platform TEXT NOT NULL,
          risk_team TEXT NOT NULL,
          licence_reference TEXT NOT NULL,
          licence_status TEXT NOT NULL,
          canonical_domain TEXT NOT NULL,
          status TEXT NOT NULL,
          foreground_colour TEXT NOT NULL,
          background_colour TEXT NOT NULL,
          logo_asset_path TEXT NOT NULL,
          source TEXT NOT NULL,
          confidence TEXT NOT NULL,
          last_verified_date TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS fund_manager_settings (
          fund_manager_id TEXT PRIMARY KEY,
          bookmaker_display_mode TEXT NOT NULL DEFAULT 'Name',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS profile_bookmaker_display_settings (
          profile_id TEXT PRIMARY KEY,
          bookmaker_display_mode_override TEXT NOT NULL DEFAULT 'Inherit',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS profile_exchange_commissions (
          profile_id TEXT NOT NULL,
          exchange_name TEXT NOT NULL,
          commission_rate TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (profile_id, exchange_name),
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS profile_tracker_settings (
          profile_id TEXT PRIMARY KEY,
          active_date_preset TEXT NOT NULL,
          custom_start_date TEXT NOT NULL,
          custom_end_date TEXT NOT NULL,
          range_back_days INTEGER NOT NULL DEFAULT 0,
          range_forward_days INTEGER NOT NULL DEFAULT 0,
          mug_bet_frequency_days INTEGER NOT NULL DEFAULT 14,
                    free_bet_expiry_alert_window_days INTEGER NOT NULL DEFAULT 3,
                    use_global_date_range_toggle INTEGER NOT NULL DEFAULT 1,
                    this_month_mode TEXT NOT NULL DEFAULT 'Calendar',
                    default_free_bet_underlay_factor TEXT NOT NULL DEFAULT '0.928',
                    default_free_bet_overlay_factor TEXT NOT NULL DEFAULT '1.3',
                    default_bonus_retention_percent TEXT NOT NULL DEFAULT '0.7',
                    default_exchange_name TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS profile_lookup_values (
          lookup_value_id TEXT PRIMARY KEY,
          profile_id TEXT NOT NULL,
          lookup_type TEXT NOT NULL,
          option_value TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS fund_manager_lookup_values (
          lookup_value_id TEXT PRIMARY KEY,
          lookup_type TEXT NOT NULL,
          option_value TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'Active',
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE (lookup_type, option_value)
        );

        CREATE TABLE IF NOT EXISTS fund_manager_combo_presets (
          preset_id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          ledger_type TEXT NOT NULL,
          bookmaker TEXT NOT NULL DEFAULT '',
          bookmakers_json TEXT NOT NULL DEFAULT '[]',
          offer_type TEXT NOT NULL DEFAULT '',
          bet_type TEXT NOT NULL DEFAULT '',
          offer_name TEXT NOT NULL DEFAULT '',
          fixture_type TEXT NOT NULL DEFAULT '',
          default_back_stake TEXT NOT NULL DEFAULT '',
          minimum_back_odds TEXT NOT NULL DEFAULT '',
          default_strategy TEXT NOT NULL DEFAULT '',
          allowed_strategies_json TEXT NOT NULL DEFAULT '[]',
          status TEXT NOT NULL DEFAULT 'Active',
          version INTEGER NOT NULL DEFAULT 1,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS accounts (
          account_id TEXT PRIMARY KEY,
          profile_id TEXT NOT NULL,
          bookmaker_id TEXT,
          account TEXT NOT NULL,
          type TEXT NOT NULL,
          counts_in_cash_total INTEGER NOT NULL DEFAULT 1,
          channel TEXT NOT NULL,
          status TEXT NOT NULL,
          lifecycle_status TEXT NOT NULL DEFAULT 'Active',
          restrictions_json TEXT NOT NULL DEFAULT '[]',
          current_balance TEXT NOT NULL,
          pending_withdrawal_amount TEXT NOT NULL,
          last_balance_update TEXT NOT NULL,
          group_name TEXT NOT NULL,
          platform TEXT NOT NULL,
          sign_up_date TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE,
          FOREIGN KEY (bookmaker_id) REFERENCES bookmaker_catalogue(bookmaker_id)
        );

        CREATE TABLE IF NOT EXISTS balance_snapshots (
          balance_snapshot_id TEXT PRIMARY KEY,
          profile_id TEXT NOT NULL,
          snapshot_at TEXT NOT NULL,
          snapshot_type TEXT NOT NULL,
          account_id TEXT,
          balance_amount TEXT NOT NULL,
          notes TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE,
          FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS import_batches (
          import_batch_id TEXT PRIMARY KEY,
          profile_id TEXT NOT NULL,
          source_filename TEXT NOT NULL,
          source_type TEXT NOT NULL,
          mapping_version TEXT NOT NULL,
          status TEXT NOT NULL,
          row_count INTEGER NOT NULL,
          error_count INTEGER NOT NULL,
          warning_count INTEGER NOT NULL,
          summary_json TEXT NOT NULL,
          backup_snapshot_id TEXT NOT NULL DEFAULT '',
          started_at TEXT NOT NULL,
          completed_at TEXT NOT NULL,
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS import_staged_rows (
          import_staged_row_id TEXT PRIMARY KEY,
          import_batch_id TEXT NOT NULL,
          profile_id TEXT NOT NULL,
          source_sheet TEXT NOT NULL,
          source_record_id TEXT NOT NULL,
          source_row INTEGER,
          source_hash TEXT NOT NULL,
          staged_action TEXT NOT NULL,
          errors_json TEXT NOT NULL,
          warnings_json TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          mapped_payload_json TEXT NOT NULL DEFAULT '{}',
          FOREIGN KEY (import_batch_id) REFERENCES import_batches(import_batch_id)
            ON DELETE CASCADE,
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS import_source_records (
          source_sheet TEXT NOT NULL,
          source_record_id TEXT NOT NULL,
          profile_id TEXT NOT NULL,
          source_hash TEXT NOT NULL,
          import_batch_id TEXT NOT NULL,
          entity_type TEXT NOT NULL DEFAULT '',
          entity_id TEXT NOT NULL DEFAULT '',
          imported_at TEXT NOT NULL,
          PRIMARY KEY (source_sheet, source_record_id),
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE,
          FOREIGN KEY (import_batch_id) REFERENCES import_batches(import_batch_id)
        );

        CREATE TABLE IF NOT EXISTS backup_snapshots (
          backup_snapshot_id TEXT PRIMARY KEY,
          created_at TEXT NOT NULL,
          backup_scope TEXT NOT NULL,
          schema_version TEXT NOT NULL,
          storage_path TEXT NOT NULL,
          status TEXT NOT NULL,
          notes TEXT NOT NULL,
          checksum_sha256 TEXT NOT NULL,
          byte_size INTEGER NOT NULL,
          integrity_check TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS account_audit (
          audit_id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          profile_id TEXT NOT NULL,
          action TEXT NOT NULL,
          changed_at TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS sportsbook_bets (
          sportsbook_bet_id TEXT PRIMARY KEY,
          profile_id TEXT NOT NULL,
          event_name TEXT NOT NULL,
          offer_text TEXT NOT NULL,
          bookmaker TEXT NOT NULL,
          offer_type TEXT NOT NULL,
          bet_type TEXT NOT NULL DEFAULT '',
          offer_name TEXT NOT NULL DEFAULT '',
          fixture_type TEXT NOT NULL DEFAULT '',
          market TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL,
          result TEXT NOT NULL,
          back_stake TEXT NOT NULL,
          back_odds TEXT NOT NULL,
          profit_boost_mode TEXT NOT NULL DEFAULT '',
          base_back_odds TEXT NOT NULL DEFAULT '',
          profit_boost_percent TEXT NOT NULL DEFAULT '',
          maximum_boost_winnings TEXT NOT NULL DEFAULT '',
          actual_accepted_back_odds TEXT NOT NULL DEFAULT '',
          source_combo_preset_id TEXT NOT NULL DEFAULT '',
          source_combo_preset_version INTEGER NOT NULL DEFAULT 0,
          bonus_trigger TEXT NOT NULL DEFAULT '',
          maximum_bonus TEXT NOT NULL DEFAULT '',
          bonus_retention_rate TEXT NOT NULL DEFAULT '70',
          match_strategy TEXT NOT NULL,
          lay_odds_1 TEXT NOT NULL,
          multi_lay_outcome_1_name TEXT NOT NULL DEFAULT '',
          multi_lay_outcomes_json TEXT NOT NULL DEFAULT '[]',
          lay_actual TEXT NOT NULL DEFAULT '',
          lay_matched_stake_1 TEXT NOT NULL DEFAULT '',
          lay_commission_1 TEXT NOT NULL DEFAULT '',
          exchange_name TEXT NOT NULL,
          date_settled TEXT NOT NULL,
          user_notes TEXT NOT NULL,
          manual_override_value TEXT NOT NULL,
          manual_override_reason TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS sportsbook_bet_audit (
          audit_id TEXT PRIMARY KEY,
          sportsbook_bet_id TEXT NOT NULL,
          profile_id TEXT NOT NULL,
          action TEXT NOT NULL,
          changed_at TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          FOREIGN KEY (sportsbook_bet_id)
            REFERENCES sportsbook_bets(sportsbook_bet_id)
            ON DELETE CASCADE,
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS multi_profile_entry_batches (
          batch_id TEXT PRIMARY KEY,
          source_profile_id TEXT NOT NULL,
          source_sportsbook_bet_id TEXT NOT NULL,
          actor_id TEXT NOT NULL,
          state TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (source_profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE,
          FOREIGN KEY (source_sportsbook_bet_id)
            REFERENCES sportsbook_bets(sportsbook_bet_id)
            ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS multi_profile_entry_targets (
          target_id TEXT PRIMARY KEY,
          batch_id TEXT NOT NULL,
          target_profile_id TEXT NOT NULL,
          eligibility_state TEXT NOT NULL,
          eligibility_reasons_json TEXT NOT NULL,
          copied_fields_json TEXT NOT NULL,
          changed_fields_json TEXT NOT NULL,
          submit_state TEXT NOT NULL,
          created_sportsbook_bet_id TEXT,
          submitted_at TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE (batch_id, target_profile_id),
          FOREIGN KEY (batch_id) REFERENCES multi_profile_entry_batches(batch_id) ON DELETE CASCADE,
          FOREIGN KEY (target_profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE,
          FOREIGN KEY (created_sportsbook_bet_id)
            REFERENCES sportsbook_bets(sportsbook_bet_id)
            ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS multi_profile_opportunities (
          opportunity_id TEXT PRIMARY KEY,
          actor_id TEXT NOT NULL,
          offer_text TEXT NOT NULL,
          bookmaker TEXT NOT NULL,
          offer_type TEXT NOT NULL,
          bet_type TEXT NOT NULL,
          offer_name TEXT NOT NULL,
          fixture_type TEXT NOT NULL,
          minimum_back_odds TEXT NOT NULL,
          default_back_stake TEXT NOT NULL,
          expected_settlement TEXT NOT NULL,
          reward_timing TEXT NOT NULL,
          preset_id TEXT NOT NULL DEFAULT '',
          preset_version INTEGER NOT NULL DEFAULT 0,
          preferred_strategy TEXT NOT NULL DEFAULT '',
          state TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS multi_profile_opportunity_targets (
          target_id TEXT PRIMARY KEY,
          opportunity_id TEXT NOT NULL,
          profile_id TEXT NOT NULL,
          bookmaker TEXT NOT NULL DEFAULT '',
          eligibility_state TEXT NOT NULL,
          eligibility_reasons_json TEXT NOT NULL,
          workflow_reasons_json TEXT NOT NULL DEFAULT '[]',
          workflow_state TEXT NOT NULL,
          sportsbook_bet_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (opportunity_id)
            REFERENCES multi_profile_opportunities(opportunity_id)
            ON DELETE CASCADE,
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE,
          FOREIGN KEY (sportsbook_bet_id)
            REFERENCES sportsbook_bets(sportsbook_bet_id)
            ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS free_bets (
          free_bet_id TEXT PRIMARY KEY,
          profile_id TEXT NOT NULL,
          event_name TEXT NOT NULL,
          offer_text TEXT NOT NULL,
          bookmaker TEXT NOT NULL,
          offer_type TEXT NOT NULL DEFAULT '',
          bet_type TEXT NOT NULL DEFAULT '',
          offer_name TEXT NOT NULL DEFAULT '',
          fixture_type TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL,
          result TEXT NOT NULL,
          retention_mode TEXT NOT NULL,
          free_bet_value TEXT NOT NULL,
          back_odds TEXT NOT NULL,
          match_strategy TEXT NOT NULL,
          lay_odds_1 TEXT NOT NULL,
          lay_actual TEXT NOT NULL DEFAULT '',
          lay_matched_stake_1 TEXT NOT NULL DEFAULT '',
          lay_commission_1 TEXT NOT NULL DEFAULT '',
          exchange_name TEXT NOT NULL,
          expiry_datetime TEXT NOT NULL,
          date_settled TEXT NOT NULL,
          origin_qual_bet_id TEXT NOT NULL DEFAULT '',
          offer_group_id TEXT NOT NULL DEFAULT '',
          user_notes TEXT NOT NULL,
          manual_override_value TEXT NOT NULL,
          manual_override_reason TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS free_bet_audit (
          audit_id TEXT PRIMARY KEY,
          free_bet_id TEXT NOT NULL,
          profile_id TEXT NOT NULL,
          action TEXT NOT NULL,
          changed_at TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          FOREIGN KEY (free_bet_id) REFERENCES free_bets(free_bet_id) ON DELETE CASCADE,
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS cash_adjustments (
          cash_adjustment_id TEXT PRIMARY KEY,
          profile_id TEXT NOT NULL,
          adjustment_date TEXT NOT NULL,
          direction TEXT NOT NULL,
          amount TEXT NOT NULL,
          adjustment_type TEXT NOT NULL,
          affects_investment INTEGER NOT NULL DEFAULT 0,
          affects_cash_snapshot INTEGER NOT NULL DEFAULT 0,
          linked_account TEXT NOT NULL,
          description TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS cash_adjustment_audit (
          audit_id TEXT PRIMARY KEY,
          cash_adjustment_id TEXT NOT NULL,
          profile_id TEXT NOT NULL,
          action TEXT NOT NULL,
          changed_at TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          FOREIGN KEY (cash_adjustment_id)
            REFERENCES cash_adjustments(cash_adjustment_id)
            ON DELETE CASCADE,
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS fee_periods (
          fee_period_id TEXT PRIMARY KEY,
          profile_id TEXT NOT NULL,
          period_start TEXT NOT NULL,
          period_end TEXT NOT NULL,
          state TEXT NOT NULL,
          current_revision_number INTEGER NOT NULL,
          crystallised_at TEXT,
          crystallised_by TEXT,
          reopened_at TEXT,
          reopened_by TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE (profile_id, period_start, period_end),
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS fee_period_revisions (
          fee_revision_id TEXT PRIMARY KEY,
          profile_id TEXT NOT NULL,
          fee_period_id TEXT NOT NULL,
          revision_number INTEGER NOT NULL,
          reporting_basis TEXT NOT NULL,
          fee_base_source_version TEXT NOT NULL DEFAULT 'monthly-settled-final-v1',
          fee_base_breakdown_json TEXT NOT NULL DEFAULT '{}',
          eligible_period_profit TEXT NOT NULL,
          opening_loss_carryforward TEXT NOT NULL,
          closing_loss_carryforward TEXT NOT NULL,
          fee_base TEXT NOT NULL,
          management_fee_percent TEXT NOT NULL,
          investment_fee_percent TEXT NOT NULL,
          management_fee_amount TEXT NOT NULL,
          investment_fee_amount TEXT NOT NULL,
          total_fee_due TEXT NOT NULL,
          fee_package_id TEXT NOT NULL DEFAULT '',
          fee_package_version INTEGER,
          change_reason TEXT NOT NULL DEFAULT '',
          created_by TEXT NOT NULL,
          created_at TEXT NOT NULL,
          UNIQUE (fee_period_id, revision_number),
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE,
          FOREIGN KEY (fee_period_id) REFERENCES fee_periods(fee_period_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS fee_corrections (
          fee_correction_id TEXT PRIMARY KEY,
          profile_id TEXT NOT NULL,
          source_fee_period_id TEXT NOT NULL,
          target_fee_period_id TEXT,
          adjustment_type TEXT NOT NULL,
          amount TEXT NOT NULL,
          reason TEXT NOT NULL,
          state TEXT NOT NULL,
          created_by TEXT NOT NULL,
          created_at TEXT NOT NULL,
          applied_at TEXT,
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE,
          FOREIGN KEY (source_fee_period_id) REFERENCES fee_periods(fee_period_id),
          FOREIGN KEY (target_fee_period_id) REFERENCES fee_periods(fee_period_id)
        );

        CREATE TABLE IF NOT EXISTS fee_withdrawal_links (
          fee_withdrawal_link_id TEXT PRIMARY KEY,
          profile_id TEXT NOT NULL,
          fee_period_id TEXT NOT NULL,
          fee_revision_id TEXT NOT NULL,
          cash_adjustment_id TEXT NOT NULL UNIQUE,
          component TEXT NOT NULL,
          amount TEXT NOT NULL,
          created_by TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE,
          FOREIGN KEY (fee_period_id) REFERENCES fee_periods(fee_period_id),
          FOREIGN KEY (fee_revision_id) REFERENCES fee_period_revisions(fee_revision_id),
          FOREIGN KEY (cash_adjustment_id) REFERENCES cash_adjustments(cash_adjustment_id)
        );

        CREATE TABLE IF NOT EXISTS casino_offers (
          casino_offer_id TEXT PRIMARY KEY,
          profile_id TEXT NOT NULL,
          offer_group_id TEXT NOT NULL,
          date_started TEXT NOT NULL,
          date_settling TEXT NOT NULL,
          expiry_datetime TEXT NOT NULL,
          bookmaker TEXT NOT NULL,
          offer_type TEXT NOT NULL,
          offer_name TEXT NOT NULL,
          game TEXT NOT NULL,
          cash_stake TEXT NOT NULL,
          credit_amount TEXT NOT NULL,
          bonus_amount TEXT NOT NULL,
          wager_multiplier TEXT NOT NULL,
          wager_target TEXT NOT NULL,
          required_spins TEXT NOT NULL,
          spin_stake TEXT NOT NULL,
          free_spins_awarded TEXT NOT NULL,
          free_spins_value TEXT NOT NULL,
          status TEXT NOT NULL,
          result TEXT NOT NULL,
          calc_net_pnl TEXT NOT NULL,
          final_net_pnl TEXT NOT NULL,
          user_notes TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS casino_offer_audit (
          audit_id TEXT PRIMARY KEY,
          casino_offer_id TEXT NOT NULL,
          profile_id TEXT NOT NULL,
          action TEXT NOT NULL,
          changed_at TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          FOREIGN KEY (casino_offer_id)
            REFERENCES casino_offers(casino_offer_id)
            ON DELETE CASCADE,
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE
        );
        """
    )
    ensure_column(connection, "sportsbook_bets", "lay_commission_1", "TEXT NOT NULL DEFAULT ''")
    ensure_column(
        connection,
        "import_staged_rows",
        "mapped_payload_json",
        "TEXT NOT NULL DEFAULT '{}'",
    )
    ensure_column(
        connection,
        "import_batches",
        "backup_snapshot_id",
        "TEXT NOT NULL DEFAULT ''",
    )
    ensure_column(
        connection,
        "import_source_records",
        "entity_type",
        "TEXT NOT NULL DEFAULT ''",
    )
    ensure_column(
        connection,
        "import_source_records",
        "entity_id",
        "TEXT NOT NULL DEFAULT ''",
    )
    ensure_column(connection, "accounts", "bookmaker_id", "TEXT")
    ensure_column(
        connection,
        "fund_manager_combo_presets",
        "bookmakers_json",
        "TEXT NOT NULL DEFAULT '[]'",
    )
    ensure_column(
        connection,
        "fund_manager_combo_presets",
        "default_strategy",
        "TEXT NOT NULL DEFAULT ''",
    )
    ensure_column(connection, "accounts", "sign_up_date", "TEXT NOT NULL DEFAULT ''")
    ensure_column(connection, "accounts", "notes", "TEXT NOT NULL DEFAULT ''")
    ensure_column(
        connection,
        "multi_profile_opportunities",
        "preset_id",
        "TEXT NOT NULL DEFAULT ''",
    )
    ensure_column(
        connection,
        "multi_profile_opportunities",
        "preset_version",
        "INTEGER NOT NULL DEFAULT 0",
    )
    ensure_column(
        connection,
        "multi_profile_opportunities",
        "preferred_strategy",
        "TEXT NOT NULL DEFAULT ''",
    )
    ensure_column(connection, "sportsbook_bets", "bet_type", "TEXT NOT NULL DEFAULT ''")
    ensure_column(connection, "sportsbook_bets", "offer_name", "TEXT NOT NULL DEFAULT ''")
    ensure_column(connection, "sportsbook_bets", "fixture_type", "TEXT NOT NULL DEFAULT ''")
    ensure_column(connection, "sportsbook_bets", "market", "TEXT NOT NULL DEFAULT ''")
    ensure_column(connection, "sportsbook_bets", "lay_actual", "TEXT NOT NULL DEFAULT ''")
    ensure_column(
        connection, "sportsbook_bets", "profit_boost_mode", "TEXT NOT NULL DEFAULT ''"
    )
    ensure_column(
        connection, "sportsbook_bets", "base_back_odds", "TEXT NOT NULL DEFAULT ''"
    )
    ensure_column(
        connection, "sportsbook_bets", "profit_boost_percent", "TEXT NOT NULL DEFAULT ''"
    )
    ensure_column(
        connection,
        "sportsbook_bets",
        "maximum_boost_winnings",
        "TEXT NOT NULL DEFAULT ''",
    )
    ensure_column(
        connection,
        "sportsbook_bets",
        "actual_accepted_back_odds",
        "TEXT NOT NULL DEFAULT ''",
    )
    ensure_column(
        connection,
        "sportsbook_bets",
        "source_combo_preset_id",
        "TEXT NOT NULL DEFAULT ''",
    )
    ensure_column(
        connection,
        "sportsbook_bets",
        "source_combo_preset_version",
        "INTEGER NOT NULL DEFAULT 0",
    )
    ensure_column(connection, "sportsbook_bets", "bonus_trigger", "TEXT NOT NULL DEFAULT ''")
    ensure_column(connection, "sportsbook_bets", "maximum_bonus", "TEXT NOT NULL DEFAULT ''")
    ensure_column(
        connection, "sportsbook_bets", "bonus_retention_rate", "TEXT NOT NULL DEFAULT '70'"
    )
    ensure_column(
        connection, "sportsbook_bets", "multi_lay_outcome_1_name", "TEXT NOT NULL DEFAULT ''"
    )
    ensure_column(
        connection, "sportsbook_bets", "multi_lay_outcomes_json", "TEXT NOT NULL DEFAULT '[]'"
    )
    ensure_column(
        connection, "sportsbook_bets", "lay_matched_stake_1", "TEXT NOT NULL DEFAULT ''"
    )
    ensure_column(connection, "free_bets", "lay_actual", "TEXT NOT NULL DEFAULT ''")
    ensure_column(connection, "free_bets", "lay_matched_stake_1", "TEXT NOT NULL DEFAULT ''")
    ensure_column(connection, "free_bets", "offer_type", "TEXT NOT NULL DEFAULT ''")
    ensure_column(connection, "free_bets", "bet_type", "TEXT NOT NULL DEFAULT ''")
    ensure_column(connection, "free_bets", "offer_name", "TEXT NOT NULL DEFAULT ''")
    ensure_column(connection, "free_bets", "fixture_type", "TEXT NOT NULL DEFAULT ''")
    ensure_column(connection, "free_bets", "origin_qual_bet_id", "TEXT NOT NULL DEFAULT ''")
    ensure_column(connection, "free_bets", "offer_group_id", "TEXT NOT NULL DEFAULT ''")
    ensure_column(
        connection,
        "profile_tracker_settings",
        "mug_bet_frequency_days",
        "INTEGER NOT NULL DEFAULT 14",
    )
    ensure_column(
        connection,
        "profile_tracker_settings",
        "free_bet_expiry_alert_window_days",
        "INTEGER NOT NULL DEFAULT 3",
    )
    ensure_column(
        connection,
        "profile_tracker_settings",
        "use_global_date_range_toggle",
        "INTEGER NOT NULL DEFAULT 1",
    )
    ensure_column(
        connection,
        "profile_tracker_settings",
        "default_exchange_name",
        "TEXT NOT NULL DEFAULT ''",
    )
    ensure_column(
        connection,
        "multi_profile_opportunity_targets",
        "workflow_reasons_json",
        "TEXT NOT NULL DEFAULT '[]'",
    )
    ensure_column(
        connection,
        "multi_profile_opportunity_targets",
        "bookmaker",
        "TEXT NOT NULL DEFAULT ''",
    )
    ensure_column(
        connection,
        "accounts",
        "lifecycle_status",
        "TEXT NOT NULL DEFAULT 'Active'",
    )
    ensure_column(
        connection,
        "accounts",
        "restrictions_json",
        "TEXT NOT NULL DEFAULT '[]'",
    )
    migrate_multi_profile_opportunity_targets(connection)
    ensure_column(
        connection,
        "profile_tracker_settings",
        "this_month_mode",
        "TEXT NOT NULL DEFAULT 'Calendar'",
    )
    ensure_column(
        connection,
        "profile_tracker_settings",
        "default_free_bet_underlay_factor",
        "TEXT NOT NULL DEFAULT '0.928'",
    )
    ensure_column(
        connection,
        "profile_tracker_settings",
        "default_free_bet_overlay_factor",
        "TEXT NOT NULL DEFAULT '1.3'",
    )
    ensure_column(
        connection,
        "fee_period_revisions",
        "fee_base_source_version",
        "TEXT NOT NULL DEFAULT 'monthly-settled-final-v1'",
    )
    ensure_column(
        connection,
        "fee_period_revisions",
        "fee_base_breakdown_json",
        "TEXT NOT NULL DEFAULT '{}'",
    )
    ensure_column(
        connection,
        "profile_tracker_settings",
        "default_bonus_retention_percent",
        "TEXT NOT NULL DEFAULT '0.7'",
    )
    seed_database(connection)
    seed_bookmaker_catalogue_from_existing(connection)


def seed_bookmaker_catalogue_from_existing(connection: sqlite3.Connection) -> None:
    timestamp = utc_now()
    connection.execute(
        """
        INSERT INTO fund_manager_settings (
          fund_manager_id,
          bookmaker_display_mode,
          created_at,
          updated_at
        ) VALUES ('fund-manager-local', 'Name', ?, ?)
        ON CONFLICT(fund_manager_id) DO NOTHING
        """,
        (timestamp, timestamp),
    )

    rows = connection.execute(
        """
        SELECT account AS brand_name
        FROM accounts
        WHERE type = 'Bookie' AND TRIM(account) <> ''
        UNION
        SELECT bookmaker AS brand_name
        FROM sportsbook_bets
        WHERE TRIM(bookmaker) <> ''
        UNION
        SELECT bookmaker AS brand_name
        FROM free_bets
        WHERE TRIM(bookmaker) <> ''
        UNION
        SELECT bookmaker AS brand_name
        FROM casino_offers
        WHERE TRIM(bookmaker) <> ''
        UNION
        SELECT option_value AS brand_name
        FROM profile_lookup_values
        WHERE lookup_type = 'bookmaker' AND TRIM(option_value) <> ''
        ORDER BY brand_name COLLATE NOCASE
        """
    ).fetchall()

    for row in rows:
        brand_name = str(row["brand_name"]).strip()
        existing = connection.execute(
            """
            SELECT bookmaker_id
            FROM bookmaker_catalogue
            WHERE brand_name = ? COLLATE NOCASE
            """,
            (brand_name,),
        ).fetchone()
        if existing is None:
            bookmaker_id = f"BM-{uuid4().hex[:10].upper()}"
            connection.execute(
                """
                INSERT INTO bookmaker_catalogue (
                  bookmaker_id,
                  brand_name,
                  short_display_name,
                  legal_operator,
                  operator_group,
                  platform,
                  risk_team,
                  licence_reference,
                  licence_status,
                  canonical_domain,
                  status,
                  foreground_colour,
                  background_colour,
                  logo_asset_path,
                  source,
                  confidence,
                  last_verified_date,
                  created_at,
                  updated_at
                ) VALUES (?, ?, ?, '', '', '', '', '', '', '', 'Active',
                          '#FFFFFF', '#455A64', '', 'Local historical authority',
                          'Unverified', '', ?, ?)
                """,
                (bookmaker_id, brand_name, brand_name[:32], timestamp, timestamp),
            )
        else:
            bookmaker_id = str(existing["bookmaker_id"])

        connection.execute(
            """
            UPDATE accounts
            SET bookmaker_id = ?
            WHERE type = 'Bookie'
              AND bookmaker_id IS NULL
              AND account = ? COLLATE NOCASE
            """,
            (bookmaker_id, brand_name),
        )


def migrate_multi_profile_opportunity_targets(connection: sqlite3.Connection) -> None:
    table = connection.execute(
        "SELECT sql FROM sqlite_master WHERE type = 'table' "
        "AND name = 'multi_profile_opportunity_targets'"
    ).fetchone()
    if table is None:
        return
    normalized_sql = " ".join(str(table["sql"] or "").lower().split())
    if "unique (opportunity_id, profile_id)" not in normalized_sql:
        return

    connection.executescript(
        """
        CREATE TABLE multi_profile_opportunity_targets_v2 (
          target_id TEXT PRIMARY KEY,
          opportunity_id TEXT NOT NULL,
          profile_id TEXT NOT NULL,
          bookmaker TEXT NOT NULL DEFAULT '',
          eligibility_state TEXT NOT NULL,
          eligibility_reasons_json TEXT NOT NULL,
          workflow_reasons_json TEXT NOT NULL DEFAULT '[]',
          workflow_state TEXT NOT NULL,
          sportsbook_bet_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (opportunity_id)
            REFERENCES multi_profile_opportunities(opportunity_id)
            ON DELETE CASCADE,
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE,
          FOREIGN KEY (sportsbook_bet_id)
            REFERENCES sportsbook_bets(sportsbook_bet_id)
            ON DELETE SET NULL
        );
        INSERT INTO multi_profile_opportunity_targets_v2 (
          target_id, opportunity_id, profile_id, bookmaker,
          eligibility_state, eligibility_reasons_json, workflow_reasons_json,
          workflow_state, sportsbook_bet_id, created_at, updated_at
        )
        SELECT target_id, opportunity_id, profile_id, bookmaker,
               eligibility_state, eligibility_reasons_json, workflow_reasons_json,
               workflow_state, sportsbook_bet_id, created_at, updated_at
        FROM multi_profile_opportunity_targets;
        DROP TABLE multi_profile_opportunity_targets;
        ALTER TABLE multi_profile_opportunity_targets_v2
          RENAME TO multi_profile_opportunity_targets;
        """
    )


def ensure_column(
    connection: sqlite3.Connection,
    table_name: str,
    column_name: str,
    column_definition: str,
) -> None:
    existing = {
        row["name"]
        for row in connection.execute(f"PRAGMA table_info({table_name})").fetchall()
    }
    if column_name not in existing:
        connection.execute(
            f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}"
        )


def seed_database(connection: sqlite3.Connection) -> None:
    profile_count = connection.execute("SELECT COUNT(*) FROM profiles").fetchone()[0]
    account_count = connection.execute("SELECT COUNT(*) FROM accounts").fetchone()[0]
    sportsbook_count = connection.execute("SELECT COUNT(*) FROM sportsbook_bets").fetchone()[0]
    free_bet_count = connection.execute("SELECT COUNT(*) FROM free_bets").fetchone()[0]
    cash_adjustment_count = connection.execute(
        "SELECT COUNT(*) FROM cash_adjustments"
    ).fetchone()[0]
    casino_offer_count = connection.execute(
        "SELECT COUNT(*) FROM casino_offers"
    ).fetchone()[0]
    commission_count = connection.execute(
        "SELECT COUNT(*) FROM profile_exchange_commissions"
    ).fetchone()[0]
    tracker_settings_count = connection.execute(
        "SELECT COUNT(*) FROM profile_tracker_settings"
    ).fetchone()[0]
    lookup_value_count = connection.execute(
        "SELECT COUNT(*) FROM profile_lookup_values"
    ).fetchone()[0]

    def seed_workbook_offer_name_lookup_values() -> None:
        workbook_offer_names = load_workbook_offer_name_lookup_values()
        if not workbook_offer_names:
            return

        profile_ids = [
            row[0]
            for row in connection.execute(
                """
                SELECT profile_id
                FROM profiles
                ORDER BY profile_id ASC
                """
            ).fetchall()
        ]
        if not profile_ids:
            return

        timestamp = utc_now()
        existing_values = {
            (row["profile_id"], row["option_value"].casefold())
            for row in connection.execute(
                """
                SELECT profile_id, option_value
                FROM profile_lookup_values
                WHERE lookup_type = 'offer_name'
                """
            ).fetchall()
        }

        for profile_id in profile_ids:
            for option_value in workbook_offer_names:
                key = (profile_id, option_value.casefold())
                if key in existing_values:
                    continue
                existing_values.add(key)
                connection.execute(
                    """
                    INSERT INTO profile_lookup_values (
                      lookup_value_id,
                      profile_id,
                      lookup_type,
                      option_value,
                      created_at,
                      updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        f"LOOKUP-{uuid4().hex[:8].upper()}",
                        profile_id,
                        "offer_name",
                        option_value,
                        timestamp,
                        timestamp,
                    ),
                )

    if (
        profile_count > 0
        and account_count > 0
        and sportsbook_count > 0
        and free_bet_count > 0
        and cash_adjustment_count > 0
        and casino_offer_count > 0
        and commission_count > 0
        and tracker_settings_count > 0
        and lookup_value_count > 0
    ):
        seed_workbook_offer_name_lookup_values()
        return

    seed = load_tracker_seed()
    if seed is None:
        seed_workbook_offer_name_lookup_values()
        return

    if profile_count == 0:
        for profile in seed.get("profiles", []):
            connection.execute(
                """
                INSERT INTO profiles (
                  profile_id,
                  display_name,
                  profile_code,
                  status,
                  tracking_start_date,
                  management_fee_percent,
                  investment_fee_percent,
                  current_cash_snapshot
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    profile["profileId"],
                    profile["displayName"],
                    profile["profileCode"],
                    profile["status"],
                    profile["trackingStartDate"],
                    profile["managementFeePercent"],
                    profile["investmentFeePercent"],
                    profile["currentCashSnapshot"],
                ),
            )

    if account_count == 0:
        timestamp = utc_now()
        for profile in seed.get("profiles", []):
            for row in profile.get("trackerData", {}).get("accounts", []):
                payload = {
                    "account_id": row.get("id", f"seed-{uuid4().hex[:8]}"),
                    "profile_id": profile["profileId"],
                    "account": normalize_seed_text(row.get("account"), "Account"),
                    "type": normalize_seed_text(row.get("type"), "Bookie"),
                    "counts_in_cash_total": int(
                        parse_seed_bool(row.get("countsInCashTotal", True))
                    ),
                    "channel": normalize_seed_text(row.get("channel"), "Unknown"),
                    "status": normalize_seed_text(row.get("status"), "Active"),
                    "current_balance": normalize_seed_text(row.get("currentBalance")),
                    "pending_withdrawal_amount": normalize_seed_text(
                        row.get("pendingWithdrawalAmount")
                    ),
                    "last_balance_update": normalize_seed_text(row.get("lastBalanceUpdate")),
                    "group_name": normalize_seed_text(row.get("group")),
                    "platform": normalize_seed_text(row.get("platform")),
                    "created_at": timestamp,
                    "updated_at": timestamp,
                }
                connection.execute(
                    """
                    INSERT INTO accounts (
                      account_id,
                      profile_id,
                      account,
                      type,
                      counts_in_cash_total,
                      channel,
                      status,
                      current_balance,
                      pending_withdrawal_amount,
                      last_balance_update,
                      group_name,
                      platform,
                      created_at,
                      updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    tuple(payload.values()),
                )
                write_account_audit_entry(
                    connection=connection,
                    account_id=payload["account_id"],
                    profile_id=payload["profile_id"],
                    action="seeded",
                    payload=payload,
                )

    if commission_count == 0:
        timestamp = utc_now()
        seeded_settings: set[tuple[str, str]] = set()
        for profile in seed.get("profiles", []):
            profile_id = profile["profileId"]
            sportsbook_rows = profile.get("trackerData", {}).get("sportsbook-bets", [])
            free_bet_rows = profile.get("trackerData", {}).get("free-bets", [])
            for row in [*sportsbook_rows, *free_bet_rows]:
                exchange_name = normalize_seed_text(row.get("exchange"))
                if not exchange_name:
                    continue
                key = (profile_id, exchange_name)
                if key in seeded_settings:
                    continue
                seeded_settings.add(key)
                commission_rate = normalize_seed_text(row.get("layCommission1"))
                connection.execute(
                    """
                    INSERT INTO profile_exchange_commissions (
                      profile_id,
                      exchange_name,
                      commission_rate,
                      created_at,
                      updated_at
                    ) VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        profile_id,
                        exchange_name,
                        commission_rate,
                        timestamp,
                        timestamp,
                    ),
                )

    if tracker_settings_count == 0:
        timestamp = utc_now()
        for profile in seed.get("profiles", []):
            connection.execute(
                """
                INSERT INTO profile_tracker_settings (
                  profile_id,
                  active_date_preset,
                  custom_start_date,
                  custom_end_date,
                  range_back_days,
                  range_forward_days,
                  mug_bet_frequency_days,
                                    free_bet_expiry_alert_window_days,
                                    use_global_date_range_toggle,
                                    this_month_mode,
                                    default_free_bet_underlay_factor,
                                    default_free_bet_overlay_factor,
                                    default_bonus_retention_percent,
                  created_at,
                  updated_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    profile["profileId"],
                    "Week (Mon-Sun)",
                    "",
                    "",
                    0,
                    0,
                    14,
                                        3,
                                        1,
                                        "Calendar",
                                        "0.928",
                                        "1.3",
                                        "0.7",
                    timestamp,
                    timestamp,
                    ),
                )

    if lookup_value_count == 0:
        timestamp = utc_now()
        seeded_values: set[tuple[str, str, str]] = set()

        def seed_lookup_value(profile_id: str, lookup_type: str, option_value: str) -> None:
            normalized_value = normalize_seed_text(option_value)
            if not normalized_value:
                return
            key = (profile_id, lookup_type, normalized_value.casefold())
            if key in seeded_values:
                return
            seeded_values.add(key)
            connection.execute(
                """
                INSERT INTO profile_lookup_values (
                  lookup_value_id,
                  profile_id,
                  lookup_type,
                  option_value,
                  created_at,
                  updated_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    f"LOOKUP-{uuid4().hex[:8].upper()}",
                    profile_id,
                    lookup_type,
                    normalized_value,
                    timestamp,
                    timestamp,
                ),
            )

        for profile in seed.get("profiles", []):
            profile_id = profile["profileId"]
            tracker_data = profile.get("trackerData", {})
            for row in tracker_data.get("accounts", []):
                account_name = normalize_seed_text(row.get("account"))
                account_type = normalize_seed_text(row.get("type"))
                if account_type == "Bookie":
                    seed_lookup_value(profile_id, "bookmaker", account_name)
                if account_type == "Exchange":
                    seed_lookup_value(profile_id, "exchange", account_name)
                seed_lookup_value(profile_id, "group", row.get("group"))
                seed_lookup_value(profile_id, "platform", row.get("platform"))
            for row in tracker_data.get("sportsbook-bets", []):
                seed_lookup_value(profile_id, "bookmaker", row.get("bookmaker"))
                seed_lookup_value(profile_id, "exchange", row.get("exchange"))
            for row in tracker_data.get("free-bets", []):
                seed_lookup_value(profile_id, "bookmaker", row.get("bookmaker"))
                seed_lookup_value(profile_id, "exchange", row.get("exchange"))
            for row in tracker_data.get("casino-offers", []):
                seed_lookup_value(profile_id, "bookmaker", row.get("bookmaker"))
                seed_lookup_value(profile_id, "casino_offer_name", row.get("offerName"))

    seed_workbook_offer_name_lookup_values()

    if sportsbook_count == 0:
        timestamp = utc_now()
        for profile in seed.get("profiles", []):
            for row in profile.get("trackerData", {}).get("sportsbook-bets", []):
                payload = {
                    "sportsbook_bet_id": row.get("id", f"seed-{uuid4().hex[:8]}"),
                    "profile_id": profile["profileId"],
                    "event_name": normalize_seed_text(
                        row.get("eventName"), f"Seed event {row.get('id', '')}".strip()
                    ),
                    "offer_text": normalize_seed_text(row.get("offer")),
                    "bookmaker": normalize_seed_text(row.get("bookmaker"), "Bookmaker A"),
                    "offer_type": normalize_seed_text(row.get("offerType")),
                    "bet_type": normalize_seed_text(row.get("betType")),
                    "offer_name": normalize_seed_text(row.get("offerName")),
                    "fixture_type": normalize_seed_text(row.get("fixtureType")),
                    "market": normalize_seed_text(row.get("market")),
                    "status": normalize_seed_text(row.get("status"), "Prospecting"),
                    "result": normalize_seed_text(row.get("result"), "Pending"),
                    "back_stake": normalize_seed_text(row.get("backStake")),
                    "back_odds": normalize_seed_text(row.get("backOdds")),
                    "bonus_trigger": "",
                    "maximum_bonus": "",
                    "bonus_retention_rate": "70",
                    "match_strategy": normalize_seed_text(
                        row.get("matchStrategy"), "Standard"
                    ),
                    "lay_odds_1": normalize_seed_text(row.get("layOdds1")),
                    "multi_lay_outcome_1_name": "",
                    "multi_lay_outcomes_json": "[]",
                    "lay_actual": normalize_seed_text(row.get("layActual")),
                    "lay_matched_stake_1": normalize_seed_text(row.get("layMatchedStake1")),
                    "lay_commission_1": normalize_seed_text(row.get("layCommission1")),
                    "exchange_name": normalize_seed_text(row.get("exchange"), "Exchange A"),
                    "date_settled": normalize_seed_text(row.get("dateSettling")),
                    "user_notes": "",
                    "manual_override_value": "",
                    "manual_override_reason": "",
                    "created_at": timestamp,
                    "updated_at": timestamp,
                }
                connection.execute(
                    """
                    INSERT INTO sportsbook_bets (
                      sportsbook_bet_id,
                      profile_id,
                      event_name,
                      offer_text,
                      bookmaker,
                      offer_type,
                      bet_type,
                      offer_name,
                      fixture_type,
                      market,
                      status,
                      result,
                      back_stake,
                      back_odds,
                      bonus_trigger,
                      maximum_bonus,
                      bonus_retention_rate,
                      match_strategy,
                      lay_odds_1,
                      multi_lay_outcome_1_name,
                      multi_lay_outcomes_json,
                      lay_actual,
                      lay_matched_stake_1,
                      lay_commission_1,
                      exchange_name,
                      date_settled,
                      user_notes,
                      manual_override_value,
                      manual_override_reason,
                      created_at,
                      updated_at
                    ) VALUES (
                      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                    )
                    """,
                    tuple(payload.values()),
                )
                write_audit_entry(
                    connection=connection,
                    sportsbook_bet_id=payload["sportsbook_bet_id"],
                    profile_id=payload["profile_id"],
                    action="seeded",
                    payload=payload,
                )

    if free_bet_count == 0:
        timestamp = utc_now()
        for profile in seed.get("profiles", []):
            for row in profile.get("trackerData", {}).get("free-bets", []):
                payload = {
                    "free_bet_id": row.get("id", f"seed-{uuid4().hex[:8]}"),
                    "profile_id": profile["profileId"],
                    "event_name": normalize_seed_text(
                        row.get("eventName"), f"Seed event {row.get('id', '')}".strip()
                    ),
                    "offer_text": normalize_seed_text(row.get("offer")),
                    "bookmaker": normalize_seed_text(row.get("bookmaker"), "Bookmaker A"),
                    "offer_type": normalize_seed_text(row.get("offerType")),
                    "bet_type": normalize_seed_text(row.get("betType")),
                    "offer_name": normalize_seed_text(row.get("offerName")),
                    "fixture_type": normalize_seed_text(row.get("fixtureType")),
                    "status": normalize_seed_text(row.get("status"), "Prospecting"),
                    "result": normalize_seed_text(row.get("result"), "Pending"),
                    "retention_mode": normalize_seed_text(row.get("retentionMode"), "SNR"),
                    "free_bet_value": normalize_seed_text(row.get("freeBetValue")),
                    "back_odds": normalize_seed_text(row.get("backOdds")),
                    "match_strategy": normalize_seed_text(row.get("matchStrategy"), "Standard"),
                    "lay_odds_1": normalize_seed_text(row.get("layOdds1")),
                    "lay_actual": normalize_seed_text(row.get("layActual")),
                    "lay_matched_stake_1": normalize_seed_text(row.get("layMatchedStake1")),
                    "lay_commission_1": normalize_seed_text(row.get("layCommission1")),
                    "exchange_name": normalize_seed_text(row.get("exchange"), "Exchange A"),
                    "expiry_datetime": normalize_seed_text(row.get("expiryDateTime")),
                    "date_settled": normalize_seed_text(row.get("dateSettling")),
                    "origin_qual_bet_id": normalize_seed_text(row.get("originQualBetID")),
                    "offer_group_id": normalize_seed_text(row.get("offerGroupID")),
                    "user_notes": "",
                    "manual_override_value": "",
                    "manual_override_reason": "",
                    "created_at": timestamp,
                    "updated_at": timestamp,
                }
                connection.execute(
                    """
                    INSERT INTO free_bets (
                      free_bet_id,
                      profile_id,
                      event_name,
                      offer_text,
                      bookmaker,
                      offer_type,
                      bet_type,
                      offer_name,
                      fixture_type,
                      status,
                      result,
                      retention_mode,
                      free_bet_value,
                      back_odds,
                      match_strategy,
                      lay_odds_1,
                      lay_actual,
                      lay_matched_stake_1,
                      lay_commission_1,
                      exchange_name,
                      expiry_datetime,
                      date_settled,
                      origin_qual_bet_id,
                      offer_group_id,
                      user_notes,
                      manual_override_value,
                      manual_override_reason,
                      created_at,
                      updated_at
                    ) VALUES (
                      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                    )
                    """,
                    tuple(payload.values()),
                )
                write_free_bet_audit_entry(
                    connection=connection,
                    free_bet_id=payload["free_bet_id"],
                    profile_id=payload["profile_id"],
                    action="seeded",
                    payload=payload,
                )

    if cash_adjustment_count == 0:
        timestamp = utc_now()
        for profile in seed.get("profiles", []):
            for row in profile.get("trackerData", {}).get("cash-adjustments", []):
                payload = {
                    "cash_adjustment_id": row.get("id", f"seed-{uuid4().hex[:8]}"),
                    "profile_id": profile["profileId"],
                    "adjustment_date": normalize_seed_text(row.get("adjustmentDate")),
                    "direction": normalize_seed_text(row.get("direction"), "Out"),
                    "amount": normalize_seed_text(row.get("amount")),
                    "adjustment_type": normalize_seed_text(
                        row.get("adjustmentType"),
                        "Withdrawal",
                    ),
                    "affects_investment": int(parse_seed_bool(row.get("affectsInvestment"))),
                    "affects_cash_snapshot": int(
                        parse_seed_bool(row.get("affectsCashSnapshot"))
                    ),
                    "linked_account": normalize_seed_text(row.get("linkedAccount")),
                    "description": normalize_seed_text(row.get("description")),
                    "created_at": timestamp,
                    "updated_at": timestamp,
                }
                connection.execute(
                    """
                    INSERT INTO cash_adjustments (
                      cash_adjustment_id,
                      profile_id,
                      adjustment_date,
                      direction,
                      amount,
                      adjustment_type,
                      affects_investment,
                      affects_cash_snapshot,
                      linked_account,
                      description,
                      created_at,
                      updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    tuple(payload.values()),
                )
                write_cash_adjustment_audit_entry(
                    connection=connection,
                    cash_adjustment_id=payload["cash_adjustment_id"],
                    profile_id=payload["profile_id"],
                    action="seeded",
                    payload=payload,
                )

    if casino_offer_count == 0:
        timestamp = utc_now()
        for profile in seed.get("profiles", []):
            for row in profile.get("trackerData", {}).get("casino-offers", []):
                payload = {
                    "casino_offer_id": row.get("id", f"seed-{uuid4().hex[:8]}"),
                    "profile_id": profile["profileId"],
                    "offer_group_id": normalize_seed_text(row.get("offerGroupId")),
                    "date_started": normalize_seed_text(row.get("dateStarted")),
                    "date_settling": normalize_seed_text(
                        row.get("dateSettling"),
                        normalize_seed_text(row.get("dateStarted")),
                    ),
                    "expiry_datetime": normalize_seed_text(row.get("expiryDateTime")),
                    "bookmaker": normalize_seed_text(row.get("bookmaker"), "Bookmaker A"),
                    "offer_type": normalize_seed_text(row.get("offerType"), "None"),
                    "offer_name": normalize_seed_text(row.get("offerName")),
                    "game": normalize_seed_text(row.get("game")),
                    "cash_stake": normalize_seed_text(row.get("cashStake")),
                    "credit_amount": normalize_seed_text(row.get("creditAmount")),
                    "bonus_amount": normalize_seed_text(row.get("bonusAmount")),
                    "wager_multiplier": normalize_seed_text(row.get("wagerMultiplier")),
                    "wager_target": normalize_seed_text(row.get("wagerTarget")),
                    "required_spins": normalize_seed_text(row.get("requiredSpins")),
                    "spin_stake": normalize_seed_text(row.get("spinStake")),
                    "free_spins_awarded": normalize_seed_text(row.get("freeSpinsAwarded")),
                    "free_spins_value": normalize_seed_text(row.get("freeSpinsValue")),
                    "status": normalize_seed_text(row.get("status"), "Prospecting"),
                    "result": normalize_seed_text(row.get("result"), "Pending"),
                    "calc_net_pnl": normalize_seed_text(row.get("calcNetPnL")),
                    "final_net_pnl": normalize_seed_text(row.get("finalNetPnL")),
                    "user_notes": normalize_seed_text(row.get("userNotes")),
                    "created_at": timestamp,
                    "updated_at": timestamp,
                }
                connection.execute(
                    """
                    INSERT INTO casino_offers (
                      casino_offer_id,
                      profile_id,
                      offer_group_id,
                      date_started,
                      date_settling,
                      expiry_datetime,
                      bookmaker,
                      offer_type,
                      offer_name,
                      game,
                      cash_stake,
                      credit_amount,
                      bonus_amount,
                      wager_multiplier,
                      wager_target,
                      required_spins,
                      spin_stake,
                      free_spins_awarded,
                      free_spins_value,
                      status,
                      result,
                      calc_net_pnl,
                      final_net_pnl,
                      user_notes,
                      created_at,
                      updated_at
                    ) VALUES (
                      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                    )
                    """,
                    tuple(payload.values()),
                )
                write_casino_offer_audit_entry(
                    connection=connection,
                    casino_offer_id=payload["casino_offer_id"],
                    profile_id=payload["profile_id"],
                    action="seeded",
                    payload=payload,
                )


def write_audit_entry(
    connection: sqlite3.Connection,
    sportsbook_bet_id: str,
    profile_id: str,
    action: str,
    payload: dict[str, Any],
) -> None:
    connection.execute(
        """
        INSERT INTO sportsbook_bet_audit (
          audit_id,
          sportsbook_bet_id,
          profile_id,
          action,
          changed_at,
          payload_json
        ) VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            f"audit-{uuid4().hex}",
            sportsbook_bet_id,
            profile_id,
            action,
            utc_now(),
            json.dumps(payload, sort_keys=True),
        ),
    )


def write_account_audit_entry(
    connection: sqlite3.Connection,
    account_id: str,
    profile_id: str,
    action: str,
    payload: dict[str, Any],
) -> None:
    connection.execute(
        """
        INSERT INTO account_audit (
          audit_id,
          account_id,
          profile_id,
          action,
          changed_at,
          payload_json
        ) VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            f"audit-{uuid4().hex}",
            account_id,
            profile_id,
            action,
            utc_now(),
            json.dumps(payload, sort_keys=True),
        ),
    )


def write_free_bet_audit_entry(
    connection: sqlite3.Connection,
    free_bet_id: str,
    profile_id: str,
    action: str,
    payload: dict[str, Any],
) -> None:
    connection.execute(
        """
        INSERT INTO free_bet_audit (
          audit_id,
          free_bet_id,
          profile_id,
          action,
          changed_at,
          payload_json
        ) VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            f"audit-{uuid4().hex}",
            free_bet_id,
            profile_id,
            action,
            utc_now(),
            json.dumps(payload, sort_keys=True),
        ),
    )


def write_cash_adjustment_audit_entry(
    connection: sqlite3.Connection,
    cash_adjustment_id: str,
    profile_id: str,
    action: str,
    payload: dict[str, Any],
) -> None:
    connection.execute(
        """
        INSERT INTO cash_adjustment_audit (
          audit_id,
          cash_adjustment_id,
          profile_id,
          action,
          changed_at,
          payload_json
        ) VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            f"audit-{uuid4().hex}",
            cash_adjustment_id,
            profile_id,
            action,
            utc_now(),
            json.dumps(payload, sort_keys=True),
        ),
    )


def write_casino_offer_audit_entry(
    connection: sqlite3.Connection,
    casino_offer_id: str,
    profile_id: str,
    action: str,
    payload: dict[str, Any],
) -> None:
    connection.execute(
        """
        INSERT INTO casino_offer_audit (
          audit_id,
          casino_offer_id,
          profile_id,
          action,
          changed_at,
          payload_json
        ) VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            f"audit-{uuid4().hex}",
            casino_offer_id,
            profile_id,
            action,
            utc_now(),
            json.dumps(payload, sort_keys=True),
        ),
    )


@dataclass(frozen=True)
class SportsbookBetRecord:
    sportsbook_bet_id: str
    profile_id: str
    event_name: str
    offer_text: str
    bookmaker: str
    offer_type: str
    bet_type: str
    offer_name: str
    fixture_type: str
    market: str
    status: str
    result: str
    back_stake: str
    back_odds: str
    profit_boost_mode: str
    base_back_odds: str
    profit_boost_percent: str
    maximum_boost_winnings: str
    actual_accepted_back_odds: str
    source_combo_preset_id: str
    source_combo_preset_version: int
    bonus_trigger: str
    maximum_bonus: str
    bonus_retention_rate: str
    match_strategy: str
    lay_odds_1: str
    multi_lay_outcome_1_name: str
    multi_lay_outcomes_json: str
    lay_actual: str
    lay_matched_stake_1: str
    lay_commission_1: str
    exchange_name: str
    date_settled: str
    user_notes: str
    manual_override_value: str
    manual_override_reason: str
    created_at: str
    updated_at: str


@dataclass(frozen=True)
class FreeBetRecord:
    free_bet_id: str
    profile_id: str
    event_name: str
    offer_text: str
    bookmaker: str
    offer_type: str
    bet_type: str
    offer_name: str
    fixture_type: str
    status: str
    result: str
    retention_mode: str
    free_bet_value: str
    back_odds: str
    match_strategy: str
    lay_odds_1: str
    lay_actual: str
    lay_matched_stake_1: str
    lay_commission_1: str
    exchange_name: str
    expiry_datetime: str
    date_settled: str
    origin_qual_bet_id: str
    offer_group_id: str
    user_notes: str
    manual_override_value: str
    manual_override_reason: str
    created_at: str
    updated_at: str


@dataclass(frozen=True)
class CashAdjustmentRecord:
    cash_adjustment_id: str
    profile_id: str
    adjustment_date: str
    direction: str
    amount: str
    adjustment_type: str
    affects_investment: bool
    affects_cash_snapshot: bool
    linked_account: str
    description: str
    created_at: str
    updated_at: str


@dataclass(frozen=True)
class CasinoOfferRecord:
    casino_offer_id: str
    profile_id: str
    offer_group_id: str
    date_started: str
    date_settling: str
    expiry_datetime: str
    bookmaker: str
    offer_type: str
    offer_name: str
    game: str
    cash_stake: str
    credit_amount: str
    bonus_amount: str
    wager_multiplier: str
    wager_target: str
    required_spins: str
    spin_stake: str
    free_spins_awarded: str
    free_spins_value: str
    status: str
    result: str
    calc_net_pnl: str
    final_net_pnl: str
    user_notes: str
    created_at: str
    updated_at: str


def map_row(row: sqlite3.Row) -> SportsbookBetRecord:
    return SportsbookBetRecord(**dict(row))


def map_free_bet_row(row: sqlite3.Row) -> FreeBetRecord:
    return FreeBetRecord(**dict(row))


def map_cash_adjustment_row(row: sqlite3.Row) -> CashAdjustmentRecord:
    record = dict(row)
    record["affects_investment"] = bool(record["affects_investment"])
    record["affects_cash_snapshot"] = bool(record["affects_cash_snapshot"])
    return CashAdjustmentRecord(**record)


def map_casino_offer_row(row: sqlite3.Row) -> CasinoOfferRecord:
    return CasinoOfferRecord(**dict(row))


def list_sportsbook_bets(profile_id: str) -> list[SportsbookBetRecord]:
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM sportsbook_bets
            WHERE profile_id = ?
            ORDER BY date_settled DESC, sportsbook_bet_id DESC
            """,
            (profile_id,),
        ).fetchall()
    return [map_row(row) for row in rows]


def get_sportsbook_bet(profile_id: str, sportsbook_bet_id: str) -> SportsbookBetRecord | None:
    with connect() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM sportsbook_bets
            WHERE profile_id = ? AND sportsbook_bet_id = ?
            """,
            (profile_id, sportsbook_bet_id),
        ).fetchone()
    return None if row is None else map_row(row)


def get_sportsbook_bet_by_id(sportsbook_bet_id: str) -> SportsbookBetRecord | None:
    with connect() as connection:
        row = connection.execute(
            "SELECT * FROM sportsbook_bets WHERE sportsbook_bet_id = ?",
            (sportsbook_bet_id,),
        ).fetchone()
    return None if row is None else map_row(row)


def list_free_bets(profile_id: str) -> list[FreeBetRecord]:
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM free_bets
            WHERE profile_id = ?
            ORDER BY expiry_datetime DESC, free_bet_id DESC
            """,
            (profile_id,),
        ).fetchall()
    return [map_free_bet_row(row) for row in rows]


def get_free_bet(profile_id: str, free_bet_id: str) -> FreeBetRecord | None:
    with connect() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM free_bets
            WHERE profile_id = ? AND free_bet_id = ?
            """,
            (profile_id, free_bet_id),
        ).fetchone()
    return None if row is None else map_free_bet_row(row)


def get_free_bet_by_id(free_bet_id: str) -> FreeBetRecord | None:
    with connect() as connection:
        row = connection.execute(
            "SELECT * FROM free_bets WHERE free_bet_id = ?",
            (free_bet_id,),
        ).fetchone()
    return None if row is None else map_free_bet_row(row)


def list_cash_adjustments(profile_id: str) -> list[CashAdjustmentRecord]:
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM cash_adjustments
            WHERE profile_id = ?
            ORDER BY adjustment_date DESC, cash_adjustment_id DESC
            """,
            (profile_id,),
        ).fetchall()
    return [map_cash_adjustment_row(row) for row in rows]


def get_cash_adjustment(
    profile_id: str,
    cash_adjustment_id: str,
) -> CashAdjustmentRecord | None:
    with connect() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM cash_adjustments
            WHERE profile_id = ? AND cash_adjustment_id = ?
            """,
            (profile_id, cash_adjustment_id),
        ).fetchone()
    return None if row is None else map_cash_adjustment_row(row)


def get_cash_adjustment_by_id(
    cash_adjustment_id: str,
) -> CashAdjustmentRecord | None:
    with connect() as connection:
        row = connection.execute(
            "SELECT * FROM cash_adjustments WHERE cash_adjustment_id = ?",
            (cash_adjustment_id,),
        ).fetchone()
    return None if row is None else map_cash_adjustment_row(row)


def list_casino_offers(profile_id: str) -> list[CasinoOfferRecord]:
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM casino_offers
            WHERE profile_id = ?
            ORDER BY date_settling DESC, casino_offer_id DESC
            """,
            (profile_id,),
        ).fetchall()
    return [map_casino_offer_row(row) for row in rows]


def get_casino_offer(profile_id: str, casino_offer_id: str) -> CasinoOfferRecord | None:
    with connect() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM casino_offers
            WHERE profile_id = ? AND casino_offer_id = ?
            """,
            (profile_id, casino_offer_id),
        ).fetchone()
    return None if row is None else map_casino_offer_row(row)


def get_casino_offer_by_id(casino_offer_id: str) -> CasinoOfferRecord | None:
    with connect() as connection:
        row = connection.execute(
            "SELECT * FROM casino_offers WHERE casino_offer_id = ?",
            (casino_offer_id,),
        ).fetchone()
    return None if row is None else map_casino_offer_row(row)


def create_sportsbook_bet(profile_id: str, payload: dict[str, Any]) -> SportsbookBetRecord:
    record = {
        "sportsbook_bet_id": payload.get("sportsbook_bet_id") or f"SB-{uuid4().hex[:8].upper()}",
        "profile_id": profile_id,
        "event_name": payload["event_name"],
        "offer_text": payload["offer_text"],
        "bookmaker": payload["bookmaker"],
        "offer_type": payload["offer_type"],
        "bet_type": payload.get("bet_type", ""),
        "offer_name": payload.get("offer_name", ""),
        "fixture_type": payload.get("fixture_type", ""),
        "market": payload.get("market", ""),
        "status": payload["status"],
        "result": payload["result"],
        "back_stake": payload["back_stake"],
        "back_odds": payload["back_odds"],
        "profit_boost_mode": payload.get("profit_boost_mode", ""),
        "base_back_odds": payload.get("base_back_odds", ""),
        "profit_boost_percent": payload.get("profit_boost_percent", ""),
        "maximum_boost_winnings": payload.get("maximum_boost_winnings", ""),
        "actual_accepted_back_odds": payload.get("actual_accepted_back_odds", ""),
        "source_combo_preset_id": payload.get("source_combo_preset_id", ""),
        "source_combo_preset_version": int(payload.get("source_combo_preset_version", 0)),
        "bonus_trigger": payload.get("bonus_trigger", ""),
        "maximum_bonus": payload.get("maximum_bonus", ""),
        "bonus_retention_rate": payload.get("bonus_retention_rate", "70"),
        "match_strategy": payload["match_strategy"],
        "lay_odds_1": payload["lay_odds_1"],
        "multi_lay_outcome_1_name": payload.get("multi_lay_outcome_1_name", ""),
        "multi_lay_outcomes_json": payload.get("multi_lay_outcomes_json", "[]"),
        "lay_actual": payload["lay_actual"],
        "lay_matched_stake_1": payload["lay_matched_stake_1"],
        # Workbook parity: commission is derived from profile exchange settings,
        # not entered or stored as a row-owned source field.
        "lay_commission_1": "",
        "exchange_name": payload["exchange_name"],
        "date_settled": payload["date_settled"],
        "user_notes": payload["user_notes"],
        "manual_override_value": payload["manual_override_value"],
        "manual_override_reason": payload["manual_override_reason"],
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO sportsbook_bets (
              sportsbook_bet_id,
              profile_id,
              event_name,
              offer_text,
              bookmaker,
              offer_type,
              bet_type,
              offer_name,
              fixture_type,
              market,
              status,
              result,
              back_stake,
              back_odds,
              profit_boost_mode,
              base_back_odds,
              profit_boost_percent,
              maximum_boost_winnings,
              actual_accepted_back_odds,
              source_combo_preset_id,
              source_combo_preset_version,
              bonus_trigger,
              maximum_bonus,
              bonus_retention_rate,
              match_strategy,
              lay_odds_1,
              multi_lay_outcome_1_name,
              multi_lay_outcomes_json,
              lay_actual,
              lay_matched_stake_1,
              lay_commission_1,
              exchange_name,
              date_settled,
              user_notes,
              manual_override_value,
              manual_override_reason,
              created_at,
              updated_at
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?
            )
            """,
            tuple(record.values()),
        )
        write_audit_entry(
            connection=connection,
            sportsbook_bet_id=record["sportsbook_bet_id"],
            profile_id=profile_id,
            action="created",
            payload=record,
        )
    created = get_sportsbook_bet(profile_id, record["sportsbook_bet_id"])
    assert created is not None
    return created


def update_sportsbook_bet(
    profile_id: str,
    sportsbook_bet_id: str,
    payload: dict[str, Any],
) -> SportsbookBetRecord | None:
    existing = get_sportsbook_bet(profile_id, sportsbook_bet_id)
    if existing is None:
        return None

    updated = {
        "event_name": payload["event_name"],
        "offer_text": payload["offer_text"],
        "bookmaker": payload["bookmaker"],
        "offer_type": payload["offer_type"],
        "bet_type": payload.get("bet_type", ""),
        "offer_name": payload.get("offer_name", ""),
        "fixture_type": payload.get("fixture_type", ""),
        "market": payload.get("market", ""),
        "status": payload["status"],
        "result": payload["result"],
        "back_stake": payload["back_stake"],
        "back_odds": payload["back_odds"],
        "profit_boost_mode": payload.get("profit_boost_mode", ""),
        "base_back_odds": payload.get("base_back_odds", ""),
        "profit_boost_percent": payload.get("profit_boost_percent", ""),
        "maximum_boost_winnings": payload.get("maximum_boost_winnings", ""),
        "actual_accepted_back_odds": payload.get("actual_accepted_back_odds", ""),
        "source_combo_preset_id": payload.get("source_combo_preset_id", ""),
        "source_combo_preset_version": int(payload.get("source_combo_preset_version", 0)),
        "bonus_trigger": payload.get("bonus_trigger", ""),
        "maximum_bonus": payload.get("maximum_bonus", ""),
        "bonus_retention_rate": payload.get("bonus_retention_rate", "70"),
        "match_strategy": payload["match_strategy"],
        "lay_odds_1": payload["lay_odds_1"],
        "multi_lay_outcome_1_name": payload.get("multi_lay_outcome_1_name", ""),
        "multi_lay_outcomes_json": payload.get("multi_lay_outcomes_json", "[]"),
        "lay_actual": payload["lay_actual"],
        "lay_matched_stake_1": payload["lay_matched_stake_1"],
        "lay_commission_1": "",
        "exchange_name": payload["exchange_name"],
        "date_settled": payload["date_settled"],
        "user_notes": payload["user_notes"],
        "manual_override_value": payload["manual_override_value"],
        "manual_override_reason": payload["manual_override_reason"],
        "updated_at": utc_now(),
    }
    with connect() as connection:
        connection.execute(
            """
            UPDATE sportsbook_bets
            SET
              event_name = ?,
              offer_text = ?,
              bookmaker = ?,
              offer_type = ?,
              bet_type = ?,
              offer_name = ?,
              fixture_type = ?,
              market = ?,
              status = ?,
              result = ?,
              back_stake = ?,
              back_odds = ?,
              profit_boost_mode = ?,
              base_back_odds = ?,
              profit_boost_percent = ?,
              maximum_boost_winnings = ?,
              actual_accepted_back_odds = ?,
              source_combo_preset_id = ?,
              source_combo_preset_version = ?,
              bonus_trigger = ?,
              maximum_bonus = ?,
              bonus_retention_rate = ?,
              match_strategy = ?,
              lay_odds_1 = ?,
              multi_lay_outcome_1_name = ?,
              multi_lay_outcomes_json = ?,
              lay_actual = ?,
              lay_matched_stake_1 = ?,
              lay_commission_1 = ?,
              exchange_name = ?,
              date_settled = ?,
              user_notes = ?,
              manual_override_value = ?,
              manual_override_reason = ?,
              updated_at = ?
            WHERE profile_id = ? AND sportsbook_bet_id = ?
            """,
            (
                updated["event_name"],
                updated["offer_text"],
                updated["bookmaker"],
                updated["offer_type"],
                updated["bet_type"],
                updated["offer_name"],
                updated["fixture_type"],
                updated["market"],
                updated["status"],
                updated["result"],
                updated["back_stake"],
                updated["back_odds"],
                updated["profit_boost_mode"],
                updated["base_back_odds"],
                updated["profit_boost_percent"],
                updated["maximum_boost_winnings"],
                updated["actual_accepted_back_odds"],
                updated["source_combo_preset_id"],
                updated["source_combo_preset_version"],
                updated["bonus_trigger"],
                updated["maximum_bonus"],
                updated["bonus_retention_rate"],
                updated["match_strategy"],
                updated["lay_odds_1"],
                updated["multi_lay_outcome_1_name"],
                updated["multi_lay_outcomes_json"],
                updated["lay_actual"],
                updated["lay_matched_stake_1"],
                updated["lay_commission_1"],
                updated["exchange_name"],
                updated["date_settled"],
                updated["user_notes"],
                updated["manual_override_value"],
                updated["manual_override_reason"],
                updated["updated_at"],
                profile_id,
                sportsbook_bet_id,
            ),
        )
        write_audit_entry(
            connection=connection,
            sportsbook_bet_id=sportsbook_bet_id,
            profile_id=profile_id,
            action="updated",
            payload={"sportsbook_bet_id": sportsbook_bet_id, "profile_id": profile_id, **updated},
        )
    return get_sportsbook_bet(profile_id, sportsbook_bet_id)


def delete_sportsbook_bet(profile_id: str, sportsbook_bet_id: str) -> bool:
    existing = get_sportsbook_bet(profile_id, sportsbook_bet_id)
    if existing is None:
        return False

    with connect() as connection:
        write_audit_entry(
            connection=connection,
            sportsbook_bet_id=sportsbook_bet_id,
            profile_id=profile_id,
            action="deleted",
            payload={"sportsbook_bet_id": sportsbook_bet_id, "profile_id": profile_id},
        )
        connection.execute(
            """
            DELETE FROM sportsbook_bet_audit
            WHERE profile_id = ? AND sportsbook_bet_id = ?
            """,
            (profile_id, sportsbook_bet_id),
        )
        deleted = connection.execute(
            """
            DELETE FROM sportsbook_bets
            WHERE profile_id = ? AND sportsbook_bet_id = ?
            """,
            (profile_id, sportsbook_bet_id),
        )
    return deleted.rowcount > 0


def count_audit_rows(profile_id: str, sportsbook_bet_id: str) -> int:
    with connect() as connection:
        row = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM sportsbook_bet_audit
            WHERE profile_id = ? AND sportsbook_bet_id = ?
            """,
            (profile_id, sportsbook_bet_id),
        ).fetchone()
    return int(row["count"])


def create_multi_profile_entry_batch(
    *,
    source_profile_id: str,
    source_sportsbook_bet_id: str,
    actor_id: str,
    targets: list[dict[str, Any]],
) -> str:
    batch_id = f"MPB-{uuid4().hex[:10].upper()}"
    timestamp = utc_now()
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO multi_profile_entry_batches (
              batch_id, source_profile_id, source_sportsbook_bet_id,
              actor_id, state, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'In Progress', ?, ?)
            """,
            (
                batch_id,
                source_profile_id,
                source_sportsbook_bet_id,
                actor_id,
                timestamp,
                timestamp,
            ),
        )
        for target in targets:
            connection.execute(
                """
                INSERT INTO multi_profile_entry_targets (
                  target_id, batch_id, target_profile_id, eligibility_state,
                  eligibility_reasons_json, copied_fields_json, changed_fields_json,
                  submit_state, created_sportsbook_bet_id, submitted_at,
                  created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, '{}', '{}', ?, NULL, '', ?, ?)
                """,
                (
                    f"MPT-{uuid4().hex[:10].upper()}",
                    batch_id,
                    target["profile_id"],
                    target["eligibility_state"],
                    json.dumps(target.get("eligibility_reasons", []), sort_keys=True),
                    target["submit_state"],
                    timestamp,
                    timestamp,
                ),
            )
    return batch_id


def get_multi_profile_entry_batch_target(
    batch_id: str,
    target_profile_id: str,
) -> dict[str, Any] | None:
    with connect() as connection:
        row = connection.execute(
            """
            SELECT b.*, t.*
            FROM multi_profile_entry_batches b
            JOIN multi_profile_entry_targets t ON t.batch_id = b.batch_id
            WHERE b.batch_id = ? AND t.target_profile_id = ?
            """,
            (batch_id, target_profile_id),
        ).fetchone()
    return None if row is None else dict(row)


def update_multi_profile_entry_target(
    *,
    batch_id: str,
    target_profile_id: str,
    eligibility_state: str | None = None,
    eligibility_reasons: list[str] | None = None,
    submit_state: str,
    copied_fields: dict[str, Any] | None = None,
    changed_fields: dict[str, Any] | None = None,
    created_sportsbook_bet_id: str | None = None,
) -> None:
    timestamp = utc_now()
    with connect() as connection:
        current = connection.execute(
            """
            SELECT eligibility_state, eligibility_reasons_json
            FROM multi_profile_entry_targets
            WHERE batch_id = ? AND target_profile_id = ?
            """,
            (batch_id, target_profile_id),
        ).fetchone()
        if current is None:
            raise ValueError("Multi-profile target does not exist")
        connection.execute(
            """
            UPDATE multi_profile_entry_targets
            SET eligibility_state = ?, eligibility_reasons_json = ?,
                copied_fields_json = ?, changed_fields_json = ?, submit_state = ?,
                created_sportsbook_bet_id = ?, submitted_at = ?, updated_at = ?
            WHERE batch_id = ? AND target_profile_id = ?
            """,
            (
                eligibility_state or current["eligibility_state"],
                json.dumps(eligibility_reasons, sort_keys=True)
                if eligibility_reasons is not None
                else current["eligibility_reasons_json"],
                json.dumps(copied_fields or {}, sort_keys=True),
                json.dumps(changed_fields or {}, sort_keys=True),
                submit_state,
                created_sportsbook_bet_id,
                timestamp if submit_state == "Created" else "",
                timestamp,
                batch_id,
                target_profile_id,
            ),
        )
        pending_count = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM multi_profile_entry_targets
            WHERE batch_id = ? AND submit_state = 'Pending'
            """,
            (batch_id,),
        ).fetchone()["count"]
        if pending_count == 0:
            connection.execute(
                """
                UPDATE multi_profile_entry_batches
                SET state = 'Complete', updated_at = ?
                WHERE batch_id = ?
                """,
                (timestamp, batch_id),
            )


def list_multi_profile_entry_batch_targets(batch_id: str) -> list[dict[str, Any]]:
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM multi_profile_entry_targets
            WHERE batch_id = ?
            ORDER BY created_at, target_profile_id
            """,
            (batch_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def create_multi_profile_opportunity(
    *,
    actor_id: str,
    payload: dict[str, Any],
    targets: list[dict[str, Any]],
) -> str:
    opportunity_id = f"MPO-{uuid4().hex[:10].upper()}"
    timestamp = utc_now()
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO multi_profile_opportunities (
              opportunity_id, actor_id, offer_text, bookmaker, offer_type,
              bet_type, offer_name, fixture_type, minimum_back_odds,
              default_back_stake, expected_settlement, reward_timing,
              preset_id, preset_version, preferred_strategy, state, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'In Progress', ?, ?)
            """,
            (
                opportunity_id,
                actor_id,
                payload["offer_text"],
                payload["bookmaker"],
                payload["offer_type"],
                payload.get("bet_type", ""),
                payload.get("offer_name", ""),
                payload.get("fixture_type", ""),
                payload.get("minimum_back_odds", ""),
                payload.get("default_back_stake", ""),
                payload.get("expected_settlement", ""),
                payload.get("reward_timing", ""),
                payload.get("preset_id", ""),
                int(payload.get("preset_version", 0)),
                payload.get("preferred_strategy", ""),
                timestamp,
                timestamp,
            ),
        )
        for target in targets:
            connection.execute(
                """
                INSERT INTO multi_profile_opportunity_targets (
                  target_id, opportunity_id, profile_id, bookmaker, eligibility_state,
                  eligibility_reasons_json, workflow_reasons_json,
                  workflow_state, sportsbook_bet_id,
                  created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?)
                """,
                (
                    target.get("target_id") or f"MPOT-{uuid4().hex[:10].upper()}",
                    opportunity_id,
                    target["profile_id"],
                    target.get("bookmaker", payload.get("bookmaker", "")),
                    target["eligibility_state"],
                    json.dumps(target.get("eligibility_reasons", []), sort_keys=True),
                    target["workflow_state"],
                    target.get("sportsbook_bet_id"),
                    timestamp,
                    timestamp,
                ),
            )
    return opportunity_id


def update_multi_profile_opportunity_target(
    *,
    opportunity_id: str,
    target_id: str,
    workflow_state: str,
    sportsbook_bet_id: str | None = None,
    workflow_reasons: list[str] | None = None,
    bookmaker: str | None = None,
) -> None:
    timestamp = utc_now()
    with connect() as connection:
        connection.execute(
            """
            UPDATE multi_profile_opportunity_targets
            SET workflow_state = ?,
                sportsbook_bet_id = COALESCE(?, sportsbook_bet_id),
                workflow_reasons_json = ?,
                bookmaker = COALESCE(?, bookmaker),
                updated_at = ?
            WHERE opportunity_id = ? AND target_id = ?
            """,
            (
                workflow_state,
                sportsbook_bet_id,
                json.dumps(workflow_reasons or [], sort_keys=True),
                bookmaker,
                timestamp,
                opportunity_id,
                target_id,
            ),
        )
        connection.execute(
            """
            UPDATE multi_profile_opportunities
            SET updated_at = ?
            WHERE opportunity_id = ?
            """,
            (timestamp, opportunity_id),
        )
        remaining = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM multi_profile_opportunity_targets
            WHERE opportunity_id = ?
              AND workflow_state IN ('Prospecting', 'Draft')
            """,
            (opportunity_id,),
        ).fetchone()["count"]
        if remaining == 0:
            connection.execute(
                """
                UPDATE multi_profile_opportunities
                SET state = 'Complete', updated_at = ?
                WHERE opportunity_id = ?
                """,
                (timestamp, opportunity_id),
            )


def add_or_restore_multi_profile_opportunity_target(
    *,
    opportunity_id: str,
    profile_id: str,
    bookmaker: str,
    eligibility_state: str,
    eligibility_reasons: list[str],
    sportsbook_bet_id: str,
) -> str:
    timestamp = utc_now()
    with connect() as connection:
        existing = connection.execute(
            """
            SELECT target_id
            FROM multi_profile_opportunity_targets
            WHERE opportunity_id = ? AND profile_id = ? AND bookmaker = ?
              AND workflow_state IN ('Removed', 'Skipped')
            ORDER BY updated_at DESC
            LIMIT 1
            """,
            (opportunity_id, profile_id, bookmaker),
        ).fetchone()
        target_id = (
            str(existing["target_id"])
            if existing is not None
            else f"MPOT-{uuid4().hex[:10].upper()}"
        )
        if existing is None:
            connection.execute(
                """
                INSERT INTO multi_profile_opportunity_targets (
                  target_id, opportunity_id, profile_id, bookmaker, eligibility_state,
                  eligibility_reasons_json, workflow_reasons_json, workflow_state,
                  sportsbook_bet_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, '[]', 'Prospecting', ?, ?, ?)
                """,
                (
                    target_id,
                    opportunity_id,
                    profile_id,
                    bookmaker,
                    eligibility_state,
                    json.dumps(eligibility_reasons, sort_keys=True),
                    sportsbook_bet_id,
                    timestamp,
                    timestamp,
                ),
            )
        else:
            connection.execute(
                """
                UPDATE multi_profile_opportunity_targets
                SET eligibility_state = ?, eligibility_reasons_json = ?,
                    workflow_reasons_json = '[]', workflow_state = 'Prospecting',
                    sportsbook_bet_id = ?, updated_at = ?
                WHERE target_id = ?
                """,
                (
                    eligibility_state,
                    json.dumps(eligibility_reasons, sort_keys=True),
                    sportsbook_bet_id,
                    timestamp,
                    target_id,
                ),
            )
        connection.execute(
            """
            UPDATE multi_profile_opportunities
            SET state = 'In Progress', updated_at = ?
            WHERE opportunity_id = ?
            """,
            (timestamp, opportunity_id),
        )
    return target_id


def remove_multi_profile_opportunity_target_row(
    *, opportunity_id: str, target_id: str
) -> None:
    timestamp = utc_now()
    with connect() as connection:
        connection.execute(
            """
            UPDATE multi_profile_opportunity_targets
            SET workflow_state = 'Removed', sportsbook_bet_id = NULL,
                workflow_reasons_json = '[]', updated_at = ?
            WHERE opportunity_id = ? AND target_id = ?
            """,
            (timestamp, opportunity_id, target_id),
        )
        connection.execute(
            """
            UPDATE multi_profile_opportunities
            SET updated_at = ? WHERE opportunity_id = ?
            """,
            (timestamp, opportunity_id),
        )


def get_multi_profile_opportunity(opportunity_id: str) -> dict[str, Any] | None:
    with connect() as connection:
        row = connection.execute(
            "SELECT * FROM multi_profile_opportunities WHERE opportunity_id = ?",
            (opportunity_id,),
        ).fetchone()
    return None if row is None else dict(row)


def list_multi_profile_opportunity_targets(opportunity_id: str) -> list[dict[str, Any]]:
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT t.*, p.display_name, p.profile_code
            FROM multi_profile_opportunity_targets t
            JOIN profiles p ON p.profile_id = t.profile_id
            WHERE t.opportunity_id = ?
            ORDER BY p.display_name COLLATE NOCASE, t.bookmaker COLLATE NOCASE, t.created_at
            """,
            (opportunity_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def list_multi_profile_opportunities(*, include_complete: bool = False) -> list[dict[str, Any]]:
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM multi_profile_opportunities
            WHERE ? = 1 OR state = 'In Progress'
            ORDER BY updated_at DESC, rowid DESC
            """,
            (int(include_complete),),
        ).fetchall()
    return [dict(row) for row in rows]


def set_multi_profile_opportunity_state(opportunity_id: str, state: str) -> bool:
    with connect() as connection:
        updated = connection.execute(
            """
            UPDATE multi_profile_opportunities
            SET state = ?, updated_at = ?
            WHERE opportunity_id = ?
            """,
            (state, utc_now(), opportunity_id),
        )
    return updated.rowcount > 0


def delete_multi_profile_opportunity(opportunity_id: str) -> bool:
    with connect() as connection:
        deleted = connection.execute(
            "DELETE FROM multi_profile_opportunities WHERE opportunity_id = ?",
            (opportunity_id,),
        )
    return deleted.rowcount > 0


def get_most_used_profile_exchange(profile_id: str) -> str:
    with connect() as connection:
        row = connection.execute(
            """
            SELECT exchange_name, COUNT(*) AS usage_count
            FROM sportsbook_bets
            WHERE profile_id = ? AND TRIM(exchange_name) != ''
            GROUP BY exchange_name
            ORDER BY usage_count DESC, exchange_name COLLATE NOCASE
            LIMIT 1
            """,
            (profile_id,),
        ).fetchone()
    return "" if row is None else str(row["exchange_name"])


def create_free_bet(profile_id: str, payload: dict[str, str]) -> FreeBetRecord:
    record = {
        "free_bet_id": payload.get("free_bet_id") or f"FB-{uuid4().hex[:8].upper()}",
        "profile_id": profile_id,
        "event_name": payload["event_name"],
        "offer_text": payload["offer_text"],
        "bookmaker": payload["bookmaker"],
        "offer_type": payload.get("offer_type", ""),
        "bet_type": payload.get("bet_type", ""),
        "offer_name": payload.get("offer_name", ""),
        "fixture_type": payload.get("fixture_type", ""),
        "status": payload["status"],
        "result": payload["result"],
        "retention_mode": payload["retention_mode"],
        "free_bet_value": payload["free_bet_value"],
        "back_odds": payload["back_odds"],
        "match_strategy": payload["match_strategy"],
        "lay_odds_1": payload["lay_odds_1"],
        "lay_actual": payload["lay_actual"],
        "lay_matched_stake_1": payload["lay_matched_stake_1"],
        # Workbook parity: commission is derived from profile exchange settings,
        # not entered or stored as a row-owned source field.
        "lay_commission_1": "",
        "exchange_name": payload["exchange_name"],
        "expiry_datetime": payload["expiry_datetime"],
        "date_settled": payload["date_settled"],
        "origin_qual_bet_id": payload.get("origin_qual_bet_id", ""),
        "offer_group_id": payload.get("offer_group_id", ""),
        "user_notes": payload["user_notes"],
        "manual_override_value": payload["manual_override_value"],
        "manual_override_reason": payload["manual_override_reason"],
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO free_bets (
              free_bet_id,
              profile_id,
              event_name,
              offer_text,
              bookmaker,
              offer_type,
              bet_type,
              offer_name,
              fixture_type,
              status,
              result,
              retention_mode,
              free_bet_value,
              back_odds,
              match_strategy,
              lay_odds_1,
              lay_actual,
              lay_matched_stake_1,
              lay_commission_1,
              exchange_name,
              expiry_datetime,
              date_settled,
              origin_qual_bet_id,
              offer_group_id,
              user_notes,
              manual_override_value,
              manual_override_reason,
              created_at,
              updated_at
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
            """,
            tuple(record.values()),
        )
        write_free_bet_audit_entry(
            connection=connection,
            free_bet_id=record["free_bet_id"],
            profile_id=profile_id,
            action="created",
            payload=record,
        )
    created = get_free_bet(profile_id, record["free_bet_id"])
    assert created is not None
    return created


def update_free_bet(
    profile_id: str,
    free_bet_id: str,
    payload: dict[str, str],
) -> FreeBetRecord | None:
    existing = get_free_bet(profile_id, free_bet_id)
    if existing is None:
        return None

    updated = {
        "event_name": payload["event_name"],
        "offer_text": payload["offer_text"],
        "bookmaker": payload["bookmaker"],
        "offer_type": payload.get("offer_type", ""),
        "bet_type": payload.get("bet_type", ""),
        "offer_name": payload.get("offer_name", ""),
        "fixture_type": payload.get("fixture_type", ""),
        "status": payload["status"],
        "result": payload["result"],
        "retention_mode": payload["retention_mode"],
        "free_bet_value": payload["free_bet_value"],
        "back_odds": payload["back_odds"],
        "match_strategy": payload["match_strategy"],
        "lay_odds_1": payload["lay_odds_1"],
        "lay_actual": payload["lay_actual"],
        "lay_matched_stake_1": payload["lay_matched_stake_1"],
        "lay_commission_1": "",
        "exchange_name": payload["exchange_name"],
        "expiry_datetime": payload["expiry_datetime"],
        "date_settled": payload["date_settled"],
        "origin_qual_bet_id": payload.get("origin_qual_bet_id", ""),
        "offer_group_id": payload.get("offer_group_id", ""),
        "user_notes": payload["user_notes"],
        "manual_override_value": payload["manual_override_value"],
        "manual_override_reason": payload["manual_override_reason"],
        "updated_at": utc_now(),
    }
    with connect() as connection:
        connection.execute(
            """
            UPDATE free_bets
            SET
              event_name = ?,
              offer_text = ?,
              bookmaker = ?,
              offer_type = ?,
              bet_type = ?,
              offer_name = ?,
              fixture_type = ?,
              status = ?,
              result = ?,
              retention_mode = ?,
              free_bet_value = ?,
              back_odds = ?,
              match_strategy = ?,
              lay_odds_1 = ?,
              lay_actual = ?,
              lay_matched_stake_1 = ?,
              lay_commission_1 = ?,
              exchange_name = ?,
              expiry_datetime = ?,
              date_settled = ?,
              origin_qual_bet_id = ?,
              offer_group_id = ?,
              user_notes = ?,
              manual_override_value = ?,
              manual_override_reason = ?,
              updated_at = ?
            WHERE profile_id = ? AND free_bet_id = ?
            """,
            (
                updated["event_name"],
                updated["offer_text"],
                updated["bookmaker"],
                updated["offer_type"],
                updated["bet_type"],
                updated["offer_name"],
                updated["fixture_type"],
                updated["status"],
                updated["result"],
                updated["retention_mode"],
                updated["free_bet_value"],
                updated["back_odds"],
                updated["match_strategy"],
                updated["lay_odds_1"],
                updated["lay_actual"],
                updated["lay_matched_stake_1"],
                updated["lay_commission_1"],
                updated["exchange_name"],
                updated["expiry_datetime"],
                updated["date_settled"],
                updated["origin_qual_bet_id"],
                updated["offer_group_id"],
                updated["user_notes"],
                updated["manual_override_value"],
                updated["manual_override_reason"],
                updated["updated_at"],
                profile_id,
                free_bet_id,
            ),
        )
        write_free_bet_audit_entry(
            connection=connection,
            free_bet_id=free_bet_id,
            profile_id=profile_id,
            action="updated",
            payload={"free_bet_id": free_bet_id, "profile_id": profile_id, **updated},
        )
    return get_free_bet(profile_id, free_bet_id)


def delete_free_bet(profile_id: str, free_bet_id: str) -> bool:
    existing = get_free_bet(profile_id, free_bet_id)
    if existing is None:
        return False

    with connect() as connection:
        write_free_bet_audit_entry(
            connection=connection,
            free_bet_id=free_bet_id,
            profile_id=profile_id,
            action="deleted",
            payload={"free_bet_id": free_bet_id, "profile_id": profile_id},
        )
        connection.execute(
            """
            DELETE FROM free_bet_audit
            WHERE profile_id = ? AND free_bet_id = ?
            """,
            (profile_id, free_bet_id),
        )
        deleted = connection.execute(
            """
            DELETE FROM free_bets
            WHERE profile_id = ? AND free_bet_id = ?
            """,
            (profile_id, free_bet_id),
        )
    return deleted.rowcount > 0


def count_free_bet_audit_rows(profile_id: str, free_bet_id: str) -> int:
    with connect() as connection:
        row = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM free_bet_audit
            WHERE profile_id = ? AND free_bet_id = ?
            """,
            (profile_id, free_bet_id),
        ).fetchone()
    return int(row["count"])


def create_cash_adjustment(
    profile_id: str,
    payload: dict[str, Any],
) -> CashAdjustmentRecord:
    record = {
        "cash_adjustment_id": payload.get("cash_adjustment_id")
        or f"CA-{uuid4().hex[:8].upper()}",
        "profile_id": profile_id,
        "adjustment_date": payload["adjustment_date"],
        "direction": payload["direction"],
        "amount": payload["amount"],
        "adjustment_type": payload["adjustment_type"],
        "affects_investment": int(bool(payload["affects_investment"])),
        "affects_cash_snapshot": int(bool(payload["affects_cash_snapshot"])),
        "linked_account": payload["linked_account"],
        "description": payload["description"],
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO cash_adjustments (
              cash_adjustment_id,
              profile_id,
              adjustment_date,
              direction,
              amount,
              adjustment_type,
              affects_investment,
              affects_cash_snapshot,
              linked_account,
              description,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            tuple(record.values()),
        )
        write_cash_adjustment_audit_entry(
            connection=connection,
            cash_adjustment_id=record["cash_adjustment_id"],
            profile_id=profile_id,
            action="created",
            payload=record,
        )
    created = get_cash_adjustment(profile_id, record["cash_adjustment_id"])
    assert created is not None
    return created


def update_cash_adjustment(
    profile_id: str,
    cash_adjustment_id: str,
    payload: dict[str, Any],
) -> CashAdjustmentRecord | None:
    existing = get_cash_adjustment(profile_id, cash_adjustment_id)
    if existing is None:
        return None

    updated = {
        "adjustment_date": payload["adjustment_date"],
        "direction": payload["direction"],
        "amount": payload["amount"],
        "adjustment_type": payload["adjustment_type"],
        "affects_investment": int(bool(payload["affects_investment"])),
        "affects_cash_snapshot": int(bool(payload["affects_cash_snapshot"])),
        "linked_account": payload["linked_account"],
        "description": payload["description"],
        "updated_at": utc_now(),
    }
    with connect() as connection:
        linked_fee_withdrawal = connection.execute(
            """
            SELECT 1 FROM fee_withdrawal_links
            WHERE profile_id = ? AND cash_adjustment_id = ?
            LIMIT 1
            """,
            (profile_id, cash_adjustment_id),
        ).fetchone()
        if linked_fee_withdrawal is not None:
            raise ValueError("fee_withdrawal_adjustment_locked")
        connection.execute(
            """
            UPDATE cash_adjustments
            SET
              adjustment_date = ?,
              direction = ?,
              amount = ?,
              adjustment_type = ?,
              affects_investment = ?,
              affects_cash_snapshot = ?,
              linked_account = ?,
              description = ?,
              updated_at = ?
            WHERE profile_id = ? AND cash_adjustment_id = ?
            """,
            (
                updated["adjustment_date"],
                updated["direction"],
                updated["amount"],
                updated["adjustment_type"],
                updated["affects_investment"],
                updated["affects_cash_snapshot"],
                updated["linked_account"],
                updated["description"],
                updated["updated_at"],
                profile_id,
                cash_adjustment_id,
            ),
        )
        write_cash_adjustment_audit_entry(
            connection=connection,
            cash_adjustment_id=cash_adjustment_id,
            profile_id=profile_id,
            action="updated",
            payload={
                "cash_adjustment_id": cash_adjustment_id,
                "profile_id": profile_id,
                **updated,
            },
        )
    return get_cash_adjustment(profile_id, cash_adjustment_id)


def delete_cash_adjustment(profile_id: str, cash_adjustment_id: str) -> bool:
    existing = get_cash_adjustment(profile_id, cash_adjustment_id)
    if existing is None:
        return False

    with connect() as connection:
        linked_fee_withdrawal = connection.execute(
            """
            SELECT 1 FROM fee_withdrawal_links
            WHERE profile_id = ? AND cash_adjustment_id = ?
            LIMIT 1
            """,
            (profile_id, cash_adjustment_id),
        ).fetchone()
        if linked_fee_withdrawal is not None:
            raise ValueError("fee_withdrawal_adjustment_locked")
        write_cash_adjustment_audit_entry(
            connection=connection,
            cash_adjustment_id=cash_adjustment_id,
            profile_id=profile_id,
            action="deleted",
            payload={"cash_adjustment_id": cash_adjustment_id, "profile_id": profile_id},
        )
        connection.execute(
            """
            DELETE FROM cash_adjustment_audit
            WHERE profile_id = ? AND cash_adjustment_id = ?
            """,
            (profile_id, cash_adjustment_id),
        )
        deleted = connection.execute(
            """
            DELETE FROM cash_adjustments
            WHERE profile_id = ? AND cash_adjustment_id = ?
            """,
            (profile_id, cash_adjustment_id),
        )
    return deleted.rowcount > 0


def count_cash_adjustment_audit_rows(profile_id: str, cash_adjustment_id: str) -> int:
    with connect() as connection:
        row = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM cash_adjustment_audit
            WHERE profile_id = ? AND cash_adjustment_id = ?
            """,
            (profile_id, cash_adjustment_id),
        ).fetchone()
    return int(row["count"])


def create_casino_offer(
    profile_id: str,
    payload: dict[str, str],
) -> CasinoOfferRecord:
    record = {
        "casino_offer_id": payload.get("casino_offer_id") or f"CO-{uuid4().hex[:8].upper()}",
        "profile_id": profile_id,
        "offer_group_id": payload["offer_group_id"],
        "date_started": payload["date_started"],
        "date_settling": payload["date_settling"],
        "expiry_datetime": payload["expiry_datetime"],
        "bookmaker": payload["bookmaker"],
        "offer_type": payload["offer_type"],
        "offer_name": payload["offer_name"],
        "game": payload["game"],
        "cash_stake": payload["cash_stake"],
        "credit_amount": payload["credit_amount"],
        "bonus_amount": payload["bonus_amount"],
        "wager_multiplier": payload["wager_multiplier"],
        "wager_target": payload["wager_target"],
        "required_spins": payload["required_spins"],
        "spin_stake": payload["spin_stake"],
        "free_spins_awarded": payload["free_spins_awarded"],
        "free_spins_value": payload["free_spins_value"],
        "status": payload["status"],
        "result": payload["result"],
        "calc_net_pnl": payload["calc_net_pnl"],
        "final_net_pnl": payload["final_net_pnl"],
        "user_notes": payload["user_notes"],
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO casino_offers (
              casino_offer_id,
              profile_id,
              offer_group_id,
              date_started,
              date_settling,
              expiry_datetime,
              bookmaker,
              offer_type,
              offer_name,
              game,
              cash_stake,
              credit_amount,
              bonus_amount,
              wager_multiplier,
              wager_target,
              required_spins,
              spin_stake,
              free_spins_awarded,
              free_spins_value,
              status,
              result,
              calc_net_pnl,
              final_net_pnl,
              user_notes,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            tuple(record.values()),
        )
        write_casino_offer_audit_entry(
            connection=connection,
            casino_offer_id=record["casino_offer_id"],
            profile_id=profile_id,
            action="created",
            payload=record,
        )
    created = get_casino_offer(profile_id, record["casino_offer_id"])
    assert created is not None
    return created


def update_casino_offer(
    profile_id: str,
    casino_offer_id: str,
    payload: dict[str, str],
) -> CasinoOfferRecord | None:
    existing = get_casino_offer(profile_id, casino_offer_id)
    if existing is None:
        return None

    updated = {
        "offer_group_id": payload["offer_group_id"],
        "date_started": payload["date_started"],
        "date_settling": payload["date_settling"],
        "expiry_datetime": payload["expiry_datetime"],
        "bookmaker": payload["bookmaker"],
        "offer_type": payload["offer_type"],
        "offer_name": payload["offer_name"],
        "game": payload["game"],
        "cash_stake": payload["cash_stake"],
        "credit_amount": payload["credit_amount"],
        "bonus_amount": payload["bonus_amount"],
        "wager_multiplier": payload["wager_multiplier"],
        "wager_target": payload["wager_target"],
        "required_spins": payload["required_spins"],
        "spin_stake": payload["spin_stake"],
        "free_spins_awarded": payload["free_spins_awarded"],
        "free_spins_value": payload["free_spins_value"],
        "status": payload["status"],
        "result": payload["result"],
        "calc_net_pnl": payload["calc_net_pnl"],
        "final_net_pnl": payload["final_net_pnl"],
        "user_notes": payload["user_notes"],
        "updated_at": utc_now(),
    }
    with connect() as connection:
        connection.execute(
            """
            UPDATE casino_offers
            SET
              offer_group_id = ?,
              date_started = ?,
              date_settling = ?,
              expiry_datetime = ?,
              bookmaker = ?,
              offer_type = ?,
              offer_name = ?,
              game = ?,
              cash_stake = ?,
              credit_amount = ?,
              bonus_amount = ?,
              wager_multiplier = ?,
              wager_target = ?,
              required_spins = ?,
              spin_stake = ?,
              free_spins_awarded = ?,
              free_spins_value = ?,
              status = ?,
              result = ?,
              calc_net_pnl = ?,
              final_net_pnl = ?,
              user_notes = ?,
              updated_at = ?
            WHERE profile_id = ? AND casino_offer_id = ?
            """,
            (
                updated["offer_group_id"],
                updated["date_started"],
                updated["date_settling"],
                updated["expiry_datetime"],
                updated["bookmaker"],
                updated["offer_type"],
                updated["offer_name"],
                updated["game"],
                updated["cash_stake"],
                updated["credit_amount"],
                updated["bonus_amount"],
                updated["wager_multiplier"],
                updated["wager_target"],
                updated["required_spins"],
                updated["spin_stake"],
                updated["free_spins_awarded"],
                updated["free_spins_value"],
                updated["status"],
                updated["result"],
                updated["calc_net_pnl"],
                updated["final_net_pnl"],
                updated["user_notes"],
                updated["updated_at"],
                profile_id,
                casino_offer_id,
            ),
        )
        write_casino_offer_audit_entry(
            connection=connection,
            casino_offer_id=casino_offer_id,
            profile_id=profile_id,
            action="updated",
            payload={"casino_offer_id": casino_offer_id, "profile_id": profile_id, **updated},
        )
    return get_casino_offer(profile_id, casino_offer_id)


def delete_casino_offer(profile_id: str, casino_offer_id: str) -> bool:
    existing = get_casino_offer(profile_id, casino_offer_id)
    if existing is None:
        return False

    with connect() as connection:
        write_casino_offer_audit_entry(
            connection=connection,
            casino_offer_id=casino_offer_id,
            profile_id=profile_id,
            action="deleted",
            payload={"casino_offer_id": casino_offer_id, "profile_id": profile_id},
        )
        connection.execute(
            """
            DELETE FROM casino_offer_audit
            WHERE profile_id = ? AND casino_offer_id = ?
            """,
            (profile_id, casino_offer_id),
        )
        deleted = connection.execute(
            """
            DELETE FROM casino_offers
            WHERE profile_id = ? AND casino_offer_id = ?
            """,
            (profile_id, casino_offer_id),
        )
    return deleted.rowcount > 0


def count_casino_offer_audit_rows(profile_id: str, casino_offer_id: str) -> int:
    with connect() as connection:
        row = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM casino_offer_audit
            WHERE profile_id = ? AND casino_offer_id = ?
            """,
            (profile_id, casino_offer_id),
        ).fetchone()
    return int(row["count"])


@dataclass(frozen=True)
class ProfileRecord:
    profile_id: str
    display_name: str
    profile_code: str
    status: str
    tracking_start_date: str
    management_fee_percent: str
    investment_fee_percent: str
    current_cash_snapshot: str


@dataclass(frozen=True)
class BookmakerCatalogueRecord:
    bookmaker_id: str
    brand_name: str
    short_display_name: str
    legal_operator: str
    operator_group: str
    platform: str
    risk_team: str
    licence_reference: str
    licence_status: str
    canonical_domain: str
    status: str
    foreground_colour: str
    background_colour: str
    logo_asset_path: str
    source: str
    confidence: str
    last_verified_date: str
    created_at: str
    updated_at: str


@dataclass(frozen=True)
class BookmakerDisplaySettingsRecord:
    global_mode: str
    profile_override: str
    resolved_mode: str


@dataclass(frozen=True)
class ProfileExchangeCommissionRecord:
    profile_id: str
    exchange_name: str
    commission_rate: str
    created_at: str
    updated_at: str


@dataclass(frozen=True)
class ProfileTrackerSettingsRecord:
    profile_id: str
    active_date_preset: str
    custom_start_date: str
    custom_end_date: str
    range_back_days: int
    range_forward_days: int
    mug_bet_frequency_days: int
    free_bet_expiry_alert_window_days: int
    use_global_date_range_toggle: bool
    this_month_mode: str
    default_free_bet_underlay_factor: str
    default_free_bet_overlay_factor: str
    default_bonus_retention_percent: str
    default_exchange_name: str
    created_at: str
    updated_at: str


@dataclass(frozen=True)
class ProfileLookupValueRecord:
    lookup_value_id: str
    profile_id: str
    lookup_type: str
    option_value: str
    created_at: str
    updated_at: str


@dataclass(frozen=True)
class FundManagerLookupValueRecord:
    lookup_value_id: str
    lookup_type: str
    option_value: str
    status: str
    sort_order: int
    created_at: str
    updated_at: str


@dataclass(frozen=True)
class FundManagerComboPresetRecord:
    preset_id: str
    name: str
    ledger_type: str
    bookmaker: str
    bookmakers_json: str
    offer_type: str
    bet_type: str
    offer_name: str
    fixture_type: str
    default_back_stake: str
    minimum_back_odds: str
    default_strategy: str
    allowed_strategies_json: str
    status: str
    version: int
    sort_order: int
    created_at: str
    updated_at: str


@dataclass(frozen=True)
class AccountRecord:
    account_id: str
    profile_id: str
    bookmaker_id: str | None
    account: str
    type: str
    counts_in_cash_total: bool
    channel: str
    status: str
    lifecycle_status: str
    restrictions_json: str
    current_balance: str
    pending_withdrawal_amount: str
    last_balance_update: str
    group_name: str
    platform: str
    sign_up_date: str
    notes: str
    created_at: str
    updated_at: str


@dataclass(frozen=True)
class BalanceSnapshotRecord:
    balance_snapshot_id: str
    profile_id: str
    snapshot_at: str
    snapshot_type: str
    account_id: str | None
    balance_amount: str
    notes: str
    created_at: str


@dataclass(frozen=True)
class ImportBatchRecord:
    import_batch_id: str
    profile_id: str
    source_filename: str
    source_type: str
    mapping_version: str
    status: str
    row_count: int
    error_count: int
    warning_count: int
    summary_json: str
    backup_snapshot_id: str
    started_at: str
    completed_at: str


@dataclass(frozen=True)
class ImportStagedRowRecord:
    import_staged_row_id: str
    import_batch_id: str
    profile_id: str
    source_sheet: str
    source_record_id: str
    source_row: int | None
    source_hash: str
    staged_action: str
    errors_json: str
    warnings_json: str
    payload_json: str
    mapped_payload_json: str


@dataclass(frozen=True)
class ImportSourceRecord:
    source_sheet: str
    source_record_id: str
    profile_id: str
    source_hash: str
    import_batch_id: str
    entity_type: str
    entity_id: str
    imported_at: str


@dataclass(frozen=True)
class BackupSnapshotRecord:
    backup_snapshot_id: str
    created_at: str
    backup_scope: str
    schema_version: str
    storage_path: str
    status: str
    notes: str
    checksum_sha256: str
    byte_size: int
    integrity_check: str


def map_exchange_commission_row(row: sqlite3.Row) -> ProfileExchangeCommissionRecord:
    return ProfileExchangeCommissionRecord(**dict(row))


def map_profile_row(row: sqlite3.Row) -> ProfileRecord:
    return ProfileRecord(**dict(row))


def map_bookmaker_catalogue_row(row: sqlite3.Row) -> BookmakerCatalogueRecord:
    return BookmakerCatalogueRecord(**dict(row))


def map_tracker_settings_row(row: sqlite3.Row) -> ProfileTrackerSettingsRecord:
    record = dict(row)
    record["use_global_date_range_toggle"] = bool(record["use_global_date_range_toggle"])
    return ProfileTrackerSettingsRecord(**record)


def map_lookup_value_row(row: sqlite3.Row) -> ProfileLookupValueRecord:
    return ProfileLookupValueRecord(**dict(row))


def map_account_row(row: sqlite3.Row) -> AccountRecord:
    record = dict(row)
    record["counts_in_cash_total"] = bool(record["counts_in_cash_total"])
    return AccountRecord(**record)


def map_balance_snapshot_row(row: sqlite3.Row) -> BalanceSnapshotRecord:
    return BalanceSnapshotRecord(**dict(row))


def map_import_batch_row(row: sqlite3.Row) -> ImportBatchRecord:
    return ImportBatchRecord(**dict(row))


def map_import_staged_row(row: sqlite3.Row) -> ImportStagedRowRecord:
    return ImportStagedRowRecord(**dict(row))


def map_import_source_row(row: sqlite3.Row) -> ImportSourceRecord:
    return ImportSourceRecord(**dict(row))


def map_backup_snapshot_row(row: sqlite3.Row) -> BackupSnapshotRecord:
    return BackupSnapshotRecord(**dict(row))


def list_bookmaker_catalogue(*, include_archived: bool = True) -> list[BookmakerCatalogueRecord]:
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM bookmaker_catalogue
            WHERE ? = 1 OR status <> 'Archived'
            ORDER BY brand_name COLLATE NOCASE, bookmaker_id
            """,
            (int(include_archived),),
        ).fetchall()
    return [map_bookmaker_catalogue_row(row) for row in rows]


def get_bookmaker_catalogue_entry(bookmaker_id: str) -> BookmakerCatalogueRecord | None:
    with connect() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM bookmaker_catalogue
            WHERE bookmaker_id = ?
            """,
            (bookmaker_id,),
        ).fetchone()
    return None if row is None else map_bookmaker_catalogue_row(row)


def create_bookmaker_catalogue_entry(payload: dict[str, Any]) -> BookmakerCatalogueRecord:
    timestamp = utc_now()
    bookmaker_id = payload.get("bookmaker_id") or f"BM-{uuid4().hex[:10].upper()}"
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO bookmaker_catalogue (
              bookmaker_id, brand_name, short_display_name, legal_operator,
              operator_group, platform, risk_team, licence_reference, licence_status,
              canonical_domain, status, foreground_colour, background_colour,
              logo_asset_path, source, confidence, last_verified_date, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                bookmaker_id,
                payload["brand_name"],
                payload["short_display_name"],
                payload["legal_operator"],
                payload["operator_group"],
                payload["platform"],
                payload["risk_team"],
                payload["licence_reference"],
                payload["licence_status"],
                payload["canonical_domain"],
                payload["status"],
                payload["foreground_colour"],
                payload["background_colour"],
                payload["logo_asset_path"],
                payload["source"],
                payload["confidence"],
                payload["last_verified_date"],
                timestamp,
                timestamp,
            ),
        )
    created = get_bookmaker_catalogue_entry(bookmaker_id)
    assert created is not None
    return created


def update_bookmaker_catalogue_entry(
    bookmaker_id: str, payload: dict[str, Any]
) -> BookmakerCatalogueRecord | None:
    if get_bookmaker_catalogue_entry(bookmaker_id) is None:
        return None
    timestamp = utc_now()
    with connect() as connection:
        connection.execute(
            """
            UPDATE bookmaker_catalogue
            SET brand_name = ?, short_display_name = ?, legal_operator = ?,
                operator_group = ?, platform = ?, risk_team = ?, licence_reference = ?,
                licence_status = ?, canonical_domain = ?, status = ?,
                foreground_colour = ?, background_colour = ?, logo_asset_path = ?,
                source = ?, confidence = ?, last_verified_date = ?, updated_at = ?
            WHERE bookmaker_id = ?
            """,
            (
                payload["brand_name"],
                payload["short_display_name"],
                payload["legal_operator"],
                payload["operator_group"],
                payload["platform"],
                payload["risk_team"],
                payload["licence_reference"],
                payload["licence_status"],
                payload["canonical_domain"],
                payload["status"],
                payload["foreground_colour"],
                payload["background_colour"],
                payload["logo_asset_path"],
                payload["source"],
                payload["confidence"],
                payload["last_verified_date"],
                timestamp,
                bookmaker_id,
            ),
        )
        connection.execute(
            """
            UPDATE accounts
            SET account = ?, group_name = ?, platform = ?, updated_at = ?
            WHERE bookmaker_id = ?
            """,
            (
                payload["brand_name"],
                payload["operator_group"],
                payload["platform"],
                timestamp,
                bookmaker_id,
            ),
        )
    return get_bookmaker_catalogue_entry(bookmaker_id)


def get_bookmaker_display_settings(profile_id: str) -> BookmakerDisplaySettingsRecord:
    with connect() as connection:
        global_row = connection.execute(
            """
            SELECT bookmaker_display_mode
            FROM fund_manager_settings
            WHERE fund_manager_id = 'fund-manager-local'
            """
        ).fetchone()
        profile_row = connection.execute(
            """
            SELECT bookmaker_display_mode_override
            FROM profile_bookmaker_display_settings
            WHERE profile_id = ?
            """,
            (profile_id,),
        ).fetchone()
    global_mode = str(global_row["bookmaker_display_mode"]) if global_row else "Name"
    profile_override = (
        str(profile_row["bookmaker_display_mode_override"]) if profile_row else "Inherit"
    )
    resolved_mode = global_mode if profile_override == "Inherit" else profile_override
    return BookmakerDisplaySettingsRecord(global_mode, profile_override, resolved_mode)


def update_global_bookmaker_display_mode(mode: str) -> None:
    timestamp = utc_now()
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO fund_manager_settings (
              fund_manager_id, bookmaker_display_mode, created_at, updated_at
            ) VALUES ('fund-manager-local', ?, ?, ?)
            ON CONFLICT(fund_manager_id) DO UPDATE SET
              bookmaker_display_mode = excluded.bookmaker_display_mode,
              updated_at = excluded.updated_at
            """,
            (mode, timestamp, timestamp),
        )


def update_profile_bookmaker_display_mode(profile_id: str, mode: str) -> None:
    timestamp = utc_now()
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO profile_bookmaker_display_settings (
              profile_id, bookmaker_display_mode_override, created_at, updated_at
            ) VALUES (?, ?, ?, ?)
            ON CONFLICT(profile_id) DO UPDATE SET
              bookmaker_display_mode_override = excluded.bookmaker_display_mode_override,
              updated_at = excluded.updated_at
            """,
            (profile_id, mode, timestamp, timestamp),
        )


def list_profile_exchange_commissions(
    profile_id: str,
) -> list[ProfileExchangeCommissionRecord]:
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM profile_exchange_commissions
            WHERE profile_id = ?
            ORDER BY exchange_name ASC
            """,
            (profile_id,),
        ).fetchall()
    return [map_exchange_commission_row(row) for row in rows]


def list_profiles() -> list[ProfileRecord]:
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT
              profile_id,
              display_name,
              profile_code,
              status,
              tracking_start_date,
              management_fee_percent,
              investment_fee_percent,
              current_cash_snapshot
            FROM profiles
            ORDER BY display_name COLLATE NOCASE
            """
        ).fetchall()
    return [map_profile_row(row) for row in rows]


def get_profile(profile_id: str) -> ProfileRecord | None:
    with connect() as connection:
        row = connection.execute(
            """
            SELECT
              profile_id,
              display_name,
              profile_code,
              status,
              tracking_start_date,
              management_fee_percent,
              investment_fee_percent,
              current_cash_snapshot
            FROM profiles
            WHERE profile_id = ?
            """,
            (profile_id,),
        ).fetchone()
    return map_profile_row(row) if row else None


def update_profile_metadata(
    profile_id: str,
    *,
    display_name: str | None = None,
    profile_code: str | None = None,
    status: str | None = None,
    tracking_start_date: str | None = None,
    management_fee_percent: str | None = None,
    investment_fee_percent: str | None = None,
) -> ProfileRecord | None:
    current = get_profile(profile_id)
    if current is None:
        return None

    next_display_name = display_name if display_name is not None else current.display_name
    next_profile_code = profile_code if profile_code is not None else current.profile_code
    next_status = status if status is not None else current.status
    next_tracking_start_date = (
        tracking_start_date
        if tracking_start_date is not None
        else current.tracking_start_date
    )
    next_management_fee = (
        management_fee_percent
        if management_fee_percent is not None
        else current.management_fee_percent
    )
    next_investment_fee = (
        investment_fee_percent
        if investment_fee_percent is not None
        else current.investment_fee_percent
    )
    if float(next_management_fee) + float(next_investment_fee) > 100:
        raise ValueError("Combined management and investment fees cannot exceed 100%")

    changes = {
        key: {"from": old_value, "to": new_value}
        for key, old_value, new_value in (
            ("display_name", current.display_name, next_display_name),
            ("profile_code", current.profile_code, next_profile_code),
            ("status", current.status, next_status),
            ("tracking_start_date", current.tracking_start_date, next_tracking_start_date),
            ("management_fee_percent", current.management_fee_percent, next_management_fee),
            ("investment_fee_percent", current.investment_fee_percent, next_investment_fee),
        )
        if old_value != new_value
    }
    if not changes:
        return current

    with connect() as connection:
        duplicate = connection.execute(
            "SELECT 1 FROM profiles WHERE profile_code = ? AND profile_id <> ?",
            (next_profile_code, profile_id),
        ).fetchone()
        if duplicate is not None:
            raise ValueError("Profile code must be unique")
        connection.execute(
            """
            UPDATE profiles
            SET display_name = ?, profile_code = ?, status = ?, tracking_start_date = ?,
                management_fee_percent = ?, investment_fee_percent = ?
            WHERE profile_id = ?
            """,
            (
                next_display_name,
                next_profile_code,
                next_status,
                next_tracking_start_date,
                next_management_fee,
                next_investment_fee,
                profile_id,
            ),
        )
        connection.execute(
            """
            INSERT INTO profile_audit (audit_id, profile_id, action, changed_at, payload_json)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                f"audit-{uuid4().hex}",
                profile_id,
                "metadata_updated",
                utc_now(),
                json.dumps({"changes": changes}, sort_keys=True),
            ),
        )
    return get_profile(profile_id)


def count_profile_audit_rows(profile_id: str) -> int:
    with connect() as connection:
        row = connection.execute(
            "SELECT COUNT(*) AS count FROM profile_audit WHERE profile_id = ?",
            (profile_id,),
        ).fetchone()
    return int(row["count"])


def get_profile_exchange_commission(profile_id: str, exchange_name: str) -> str:
    with connect() as connection:
        row = connection.execute(
            """
            SELECT commission_rate
            FROM profile_exchange_commissions
            WHERE profile_id = ? AND exchange_name = ?
            """,
            (profile_id, exchange_name),
        ).fetchone()
    if row is None:
        return ""
    return str(row["commission_rate"])


def get_profile_tracker_settings(profile_id: str) -> ProfileTrackerSettingsRecord:
    with connect() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM profile_tracker_settings
            WHERE profile_id = ?
            """,
            (profile_id,),
        ).fetchone()
        if row is None:
            timestamp = utc_now()
            connection.execute(
                """
                INSERT INTO profile_tracker_settings (
                  profile_id,
                  active_date_preset,
                  custom_start_date,
                  custom_end_date,
                  range_back_days,
                  range_forward_days,
                  mug_bet_frequency_days,
                                    free_bet_expiry_alert_window_days,
                                    use_global_date_range_toggle,
                                    this_month_mode,
                                    default_free_bet_underlay_factor,
                                    default_free_bet_overlay_factor,
                                    default_bonus_retention_percent,
                                    default_exchange_name,
                  created_at,
                  updated_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                                (
                                        profile_id,
                                        "Week (Mon-Sun)",
                                        "",
                                        "",
                                        0,
                                        0,
                                        14,
                                        3,
                                        1,
                                        "Calendar",
                                        "0.928",
                                        "1.3",
                                        "0.7",
                                        "",
                                        timestamp,
                                        timestamp,
                                ),
            )
            row = connection.execute(
                """
                SELECT *
                FROM profile_tracker_settings
                WHERE profile_id = ?
                """,
                (profile_id,),
            ).fetchone()
    return map_tracker_settings_row(row)


def upsert_profile_tracker_settings(
    profile_id: str, payload: dict[str, Any]
) -> ProfileTrackerSettingsRecord:
    timestamp = utc_now()
    with connect() as connection:
        existing = connection.execute(
            """
            SELECT created_at
            FROM profile_tracker_settings
            WHERE profile_id = ?
            """,
            (profile_id,),
        ).fetchone()
        created_at = timestamp if existing is None else str(existing["created_at"])
        connection.execute(
            """
            INSERT INTO profile_tracker_settings (
              profile_id,
              active_date_preset,
              custom_start_date,
              custom_end_date,
              range_back_days,
              range_forward_days,
              mug_bet_frequency_days,
                            free_bet_expiry_alert_window_days,
                            use_global_date_range_toggle,
                            this_month_mode,
                            default_free_bet_underlay_factor,
                            default_free_bet_overlay_factor,
                            default_bonus_retention_percent,
                            default_exchange_name,
              created_at,
              updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(profile_id) DO UPDATE SET
              active_date_preset = excluded.active_date_preset,
              custom_start_date = excluded.custom_start_date,
              custom_end_date = excluded.custom_end_date,
              range_back_days = excluded.range_back_days,
              range_forward_days = excluded.range_forward_days,
              mug_bet_frequency_days = excluded.mug_bet_frequency_days,
                            free_bet_expiry_alert_window_days =
                                excluded.free_bet_expiry_alert_window_days,
                            use_global_date_range_toggle = excluded.use_global_date_range_toggle,
                            this_month_mode = excluded.this_month_mode,
                            default_free_bet_underlay_factor =
                                excluded.default_free_bet_underlay_factor,
                            default_free_bet_overlay_factor =
                                excluded.default_free_bet_overlay_factor,
                            default_bonus_retention_percent =
                                excluded.default_bonus_retention_percent,
                            default_exchange_name = excluded.default_exchange_name,
              updated_at = excluded.updated_at
            """,
            (
                profile_id,
                payload["active_date_preset"],
                payload["custom_start_date"],
                payload["custom_end_date"],
                payload["range_back_days"],
                payload["range_forward_days"],
                payload["mug_bet_frequency_days"],
                payload["free_bet_expiry_alert_window_days"],
                int(payload["use_global_date_range_toggle"]),
                payload["this_month_mode"],
                payload["default_free_bet_underlay_factor"],
                payload["default_free_bet_overlay_factor"],
                payload["default_bonus_retention_percent"],
                payload.get("default_exchange_name", ""),
                created_at,
                timestamp,
            ),
        )
        row = connection.execute(
            """
            SELECT *
            FROM profile_tracker_settings
            WHERE profile_id = ?
            """,
            (profile_id,),
        ).fetchone()
    return map_tracker_settings_row(row)


def list_profile_lookup_values(profile_id: str) -> list[ProfileLookupValueRecord]:
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM profile_lookup_values
            WHERE profile_id = ?
            ORDER BY lookup_type ASC, option_value ASC, lookup_value_id ASC
            """,
            (profile_id,),
        ).fetchall()
    return [map_lookup_value_row(row) for row in rows]


def map_fund_manager_lookup_value_row(row: sqlite3.Row) -> FundManagerLookupValueRecord:
    return FundManagerLookupValueRecord(
        lookup_value_id=str(row["lookup_value_id"]),
        lookup_type=str(row["lookup_type"]),
        option_value=str(row["option_value"]),
        status=str(row["status"]),
        sort_order=int(row["sort_order"]),
        created_at=str(row["created_at"]),
        updated_at=str(row["updated_at"]),
    )


def list_fund_manager_lookup_values(
    *, active_only: bool = False
) -> list[FundManagerLookupValueRecord]:
    where_clause = "WHERE status = 'Active'" if active_only else ""
    with connect() as connection:
        rows = connection.execute(
            f"""
            SELECT * FROM fund_manager_lookup_values
            {where_clause}
            ORDER BY lookup_type ASC, sort_order ASC, option_value ASC
            """
        ).fetchall()
    return [map_fund_manager_lookup_value_row(row) for row in rows]


def get_fund_manager_lookup_value(
    lookup_value_id: str,
) -> FundManagerLookupValueRecord | None:
    with connect() as connection:
        row = connection.execute(
            "SELECT * FROM fund_manager_lookup_values WHERE lookup_value_id = ?",
            (lookup_value_id,),
        ).fetchone()
    return None if row is None else map_fund_manager_lookup_value_row(row)


def create_fund_manager_lookup_value(
    payload: dict[str, Any],
) -> FundManagerLookupValueRecord:
    record = {
        "lookup_value_id": payload.get("lookup_value_id")
        or f"FMLOOKUP-{uuid4().hex[:8].upper()}",
        "lookup_type": payload["lookup_type"],
        "option_value": str(payload["option_value"]).strip(),
        "status": payload.get("status", "Active"),
        "sort_order": int(payload.get("sort_order", 0)),
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO fund_manager_lookup_values (
              lookup_value_id, lookup_type, option_value, status, sort_order,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            tuple(record.values()),
        )
    created = get_fund_manager_lookup_value(record["lookup_value_id"])
    assert created is not None
    return created


def update_fund_manager_lookup_value(
    lookup_value_id: str, payload: dict[str, Any]
) -> FundManagerLookupValueRecord | None:
    if get_fund_manager_lookup_value(lookup_value_id) is None:
        return None
    with connect() as connection:
        connection.execute(
            """
            UPDATE fund_manager_lookup_values
            SET lookup_type = ?, option_value = ?, status = ?, sort_order = ?, updated_at = ?
            WHERE lookup_value_id = ?
            """,
            (
                payload["lookup_type"],
                str(payload["option_value"]).strip(),
                payload.get("status", "Active"),
                int(payload.get("sort_order", 0)),
                utc_now(),
                lookup_value_id,
            ),
        )
    return get_fund_manager_lookup_value(lookup_value_id)


def map_fund_manager_combo_preset_row(
    row: sqlite3.Row,
) -> FundManagerComboPresetRecord:
    return FundManagerComboPresetRecord(
        preset_id=str(row["preset_id"]),
        name=str(row["name"]),
        ledger_type=str(row["ledger_type"]),
        bookmaker=str(row["bookmaker"]),
        bookmakers_json=str(row["bookmakers_json"]),
        offer_type=str(row["offer_type"]),
        bet_type=str(row["bet_type"]),
        offer_name=str(row["offer_name"]),
        fixture_type=str(row["fixture_type"]),
        default_back_stake=str(row["default_back_stake"]),
        minimum_back_odds=str(row["minimum_back_odds"]),
        default_strategy=str(row["default_strategy"]),
        allowed_strategies_json=str(row["allowed_strategies_json"]),
        status=str(row["status"]),
        version=int(row["version"]),
        sort_order=int(row["sort_order"]),
        created_at=str(row["created_at"]),
        updated_at=str(row["updated_at"]),
    )


def list_fund_manager_combo_presets(
    *, active_only: bool = False
) -> list[FundManagerComboPresetRecord]:
    where_clause = "WHERE status = 'Active'" if active_only else ""
    with connect() as connection:
        rows = connection.execute(
            f"""
            SELECT * FROM fund_manager_combo_presets
            {where_clause}
            ORDER BY sort_order ASC, name ASC, preset_id ASC
            """
        ).fetchall()
    return [map_fund_manager_combo_preset_row(row) for row in rows]


def delete_fund_manager_combo_presets(preset_ids: set[str]) -> int:
    if not preset_ids:
        return 0
    placeholders = ", ".join("?" for _ in preset_ids)
    with connect() as connection:
        cursor = connection.execute(
            f"DELETE FROM fund_manager_combo_presets WHERE preset_id IN ({placeholders})",
            tuple(sorted(preset_ids)),
        )
    return cursor.rowcount


def get_fund_manager_combo_preset(
    preset_id: str,
) -> FundManagerComboPresetRecord | None:
    with connect() as connection:
        row = connection.execute(
            "SELECT * FROM fund_manager_combo_presets WHERE preset_id = ?",
            (preset_id,),
        ).fetchone()
    return None if row is None else map_fund_manager_combo_preset_row(row)


def create_fund_manager_combo_preset(
    payload: dict[str, Any],
) -> FundManagerComboPresetRecord:
    bookmakers = [
        str(value).strip()
        for value in payload.get("bookmakers", [])
        if str(value).strip()
    ]
    legacy_bookmaker = str(payload.get("bookmaker", "")).strip()
    if not bookmakers and legacy_bookmaker:
        bookmakers = [legacy_bookmaker]
    record = {
        "preset_id": payload.get("preset_id") or f"COMBO-{uuid4().hex[:8].upper()}",
        "name": str(payload["name"]).strip(),
        "ledger_type": payload.get("ledger_type", "Sportsbook"),
        "bookmaker": bookmakers[0] if len(bookmakers) == 1 else "",
        "bookmakers_json": json.dumps(bookmakers, sort_keys=True),
        "offer_type": str(payload.get("offer_type", "")).strip(),
        "bet_type": str(payload.get("bet_type", "")).strip(),
        "offer_name": str(payload.get("offer_name", "")).strip(),
        "fixture_type": str(payload.get("fixture_type", "")).strip(),
        "default_back_stake": str(payload.get("default_back_stake", "")).strip(),
        "minimum_back_odds": str(payload.get("minimum_back_odds", "")).strip(),
        "default_strategy": str(payload.get("default_strategy", "")).strip(),
        "allowed_strategies_json": json.dumps(
            payload.get("allowed_strategies", []), sort_keys=True
        ),
        "status": payload.get("status", "Active"),
        "version": 1,
        "sort_order": int(payload.get("sort_order", 0)),
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO fund_manager_combo_presets (
              preset_id, name, ledger_type, bookmaker, bookmakers_json, offer_type, bet_type,
              offer_name, fixture_type, default_back_stake, minimum_back_odds,
              default_strategy, allowed_strategies_json, status, version, sort_order,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            tuple(record.values()),
        )
    created = get_fund_manager_combo_preset(record["preset_id"])
    assert created is not None
    return created


def update_fund_manager_combo_preset(
    preset_id: str, payload: dict[str, Any]
) -> FundManagerComboPresetRecord | None:
    existing = get_fund_manager_combo_preset(preset_id)
    if existing is None:
        return None
    bookmakers = [
        str(value).strip()
        for value in payload.get("bookmakers", [])
        if str(value).strip()
    ]
    legacy_bookmaker = str(payload.get("bookmaker", "")).strip()
    if not bookmakers and legacy_bookmaker:
        bookmakers = [legacy_bookmaker]
    with connect() as connection:
        connection.execute(
            """
            UPDATE fund_manager_combo_presets
            SET name = ?, ledger_type = ?, bookmaker = ?, bookmakers_json = ?,
                offer_type = ?, bet_type = ?,
                offer_name = ?, fixture_type = ?, default_back_stake = ?,
                minimum_back_odds = ?, default_strategy = ?,
                allowed_strategies_json = ?, status = ?,
                version = version + 1, sort_order = ?, updated_at = ?
            WHERE preset_id = ?
            """,
            (
                str(payload["name"]).strip(),
                payload.get("ledger_type", "Sportsbook"),
                bookmakers[0] if len(bookmakers) == 1 else "",
                json.dumps(bookmakers, sort_keys=True),
                str(payload.get("offer_type", "")).strip(),
                str(payload.get("bet_type", "")).strip(),
                str(payload.get("offer_name", "")).strip(),
                str(payload.get("fixture_type", "")).strip(),
                str(payload.get("default_back_stake", "")).strip(),
                str(payload.get("minimum_back_odds", "")).strip(),
                str(payload.get("default_strategy", "")).strip(),
                json.dumps(payload.get("allowed_strategies", []), sort_keys=True),
                payload.get("status", "Active"),
                int(payload.get("sort_order", 0)),
                utc_now(),
                preset_id,
            ),
        )
    return get_fund_manager_combo_preset(preset_id)


def get_profile_lookup_value(
    profile_id: str, lookup_value_id: str
) -> ProfileLookupValueRecord | None:
    with connect() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM profile_lookup_values
            WHERE profile_id = ? AND lookup_value_id = ?
            """,
            (profile_id, lookup_value_id),
        ).fetchone()
    return None if row is None else map_lookup_value_row(row)


def create_profile_lookup_value(
    profile_id: str, payload: dict[str, str]
) -> ProfileLookupValueRecord:
    record = {
        "lookup_value_id": payload.get("lookup_value_id")
        or f"LOOKUP-{uuid4().hex[:8].upper()}",
        "profile_id": profile_id,
        "lookup_type": payload["lookup_type"],
        "option_value": payload["option_value"].strip(),
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO profile_lookup_values (
              lookup_value_id,
              profile_id,
              lookup_type,
              option_value,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            tuple(record.values()),
        )
    created = get_profile_lookup_value(profile_id, record["lookup_value_id"])
    assert created is not None
    return created


def update_profile_lookup_value(
    profile_id: str, lookup_value_id: str, payload: dict[str, str]
) -> ProfileLookupValueRecord | None:
    existing = get_profile_lookup_value(profile_id, lookup_value_id)
    if existing is None:
        return None
    updated = {
        "lookup_type": payload["lookup_type"],
        "option_value": payload["option_value"].strip(),
        "updated_at": utc_now(),
    }
    with connect() as connection:
        connection.execute(
            """
            UPDATE profile_lookup_values
            SET
              lookup_type = ?,
              option_value = ?,
              updated_at = ?
            WHERE profile_id = ? AND lookup_value_id = ?
            """,
            (
                updated["lookup_type"],
                updated["option_value"],
                updated["updated_at"],
                profile_id,
                lookup_value_id,
            ),
        )
    return get_profile_lookup_value(profile_id, lookup_value_id)


def delete_profile_lookup_value(profile_id: str, lookup_value_id: str) -> bool:
    with connect() as connection:
        cursor = connection.execute(
            """
            DELETE FROM profile_lookup_values
            WHERE profile_id = ? AND lookup_value_id = ?
            """,
            (profile_id, lookup_value_id),
        )
    return cursor.rowcount > 0


def list_balance_snapshots(profile_id: str) -> list[BalanceSnapshotRecord]:
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM balance_snapshots
            WHERE profile_id = ?
            ORDER BY snapshot_at DESC, created_at DESC, balance_snapshot_id ASC
            """,
            (profile_id,),
        ).fetchall()
    return [map_balance_snapshot_row(row) for row in rows]


def create_balance_snapshot(
    profile_id: str, payload: dict[str, Any]
) -> BalanceSnapshotRecord:
    record = {
        "balance_snapshot_id": payload.get("balance_snapshot_id")
        or f"BS-{uuid4().hex[:8].upper()}",
        "profile_id": profile_id,
        "snapshot_at": payload["snapshot_at"],
        "snapshot_type": payload["snapshot_type"],
        "account_id": payload.get("account_id"),
        "balance_amount": payload["balance_amount"],
        "notes": payload["notes"],
        "created_at": utc_now(),
    }
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO balance_snapshots (
              balance_snapshot_id,
              profile_id,
              snapshot_at,
              snapshot_type,
              account_id,
              balance_amount,
              notes,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            tuple(record.values()),
        )
    return BalanceSnapshotRecord(**record)


def create_import_batch(
    profile_id: str,
    payload: dict[str, Any],
    staged_rows: list[dict[str, Any]],
) -> ImportBatchRecord:
    timestamp = utc_now()
    record = {
        "import_batch_id": payload.get("import_batch_id")
        or f"IMPORT-{uuid4().hex[:8].upper()}",
        "profile_id": profile_id,
        "source_filename": payload["source_filename"],
        "source_type": payload["source_type"],
        "mapping_version": payload["mapping_version"],
        "status": payload["status"],
        "row_count": payload["row_count"],
        "error_count": payload["error_count"],
        "warning_count": payload["warning_count"],
        "summary_json": payload["summary_json"],
        "backup_snapshot_id": "",
        "started_at": timestamp,
        "completed_at": timestamp,
    }
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO import_batches (
              import_batch_id,
              profile_id,
              source_filename,
              source_type,
              mapping_version,
              status,
              row_count,
              error_count,
              warning_count,
              summary_json,
              backup_snapshot_id,
              started_at,
              completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            tuple(record.values()),
        )
        for row in staged_rows:
            staged_record = {
                "import_staged_row_id": f"STAGED-{uuid4().hex[:8].upper()}",
                "import_batch_id": record["import_batch_id"],
                "profile_id": profile_id,
                "source_sheet": row["source_sheet"],
                "source_record_id": row["source_record_id"],
                "source_row": row.get("source_row"),
                "source_hash": row["source_hash"],
                "staged_action": row["staged_action"],
                "errors_json": row["errors_json"],
                "warnings_json": row["warnings_json"],
                "payload_json": row["payload_json"],
                "mapped_payload_json": row.get("mapped_payload_json", "{}"),
            }
            connection.execute(
                """
                INSERT INTO import_staged_rows (
                  import_staged_row_id,
                  import_batch_id,
                  profile_id,
                  source_sheet,
                  source_record_id,
                  source_row,
                  source_hash,
                  staged_action,
                  errors_json,
                  warnings_json,
                  payload_json,
                  mapped_payload_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                tuple(staged_record.values()),
            )
    return ImportBatchRecord(**record)


def list_import_batches(profile_id: str) -> list[ImportBatchRecord]:
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM import_batches
            WHERE profile_id = ?
            ORDER BY started_at DESC, import_batch_id DESC
            """,
            (profile_id,),
        ).fetchall()
    return [map_import_batch_row(row) for row in rows]


def get_import_batch(
    profile_id: str, import_batch_id: str
) -> tuple[ImportBatchRecord, list[ImportStagedRowRecord]] | None:
    with connect() as connection:
        batch_row = connection.execute(
            """
            SELECT *
            FROM import_batches
            WHERE profile_id = ? AND import_batch_id = ?
            """,
            (profile_id, import_batch_id),
        ).fetchone()
        if batch_row is None:
            return None
        staged_rows = connection.execute(
            """
            SELECT *
            FROM import_staged_rows
            WHERE profile_id = ? AND import_batch_id = ?
            ORDER BY source_sheet, source_row, import_staged_row_id
            """,
            (profile_id, import_batch_id),
        ).fetchall()
    return (
        map_import_batch_row(batch_row),
        [map_import_staged_row(row) for row in staged_rows],
    )


def delete_unconfirmed_import_batch(profile_id: str, import_batch_id: str) -> bool:
    with connect() as connection:
        batch = connection.execute(
            """
            SELECT status
            FROM import_batches
            WHERE profile_id = ? AND import_batch_id = ?
            """,
            (profile_id, import_batch_id),
        ).fetchone()
        if batch is None:
            return False
        if not str(batch["status"]).startswith("dry_run_"):
            raise ValueError("Confirmed import audit records cannot be deleted")
        connection.execute(
            "DELETE FROM import_staged_rows WHERE profile_id = ? AND import_batch_id = ?",
            (profile_id, import_batch_id),
        )
        connection.execute(
            "DELETE FROM import_batches WHERE profile_id = ? AND import_batch_id = ?",
            (profile_id, import_batch_id),
        )
    return True


def get_import_source_record(
    source_sheet: str, source_record_id: str
) -> ImportSourceRecord | None:
    with connect() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM import_source_records
            WHERE source_sheet = ? AND source_record_id = ?
            """,
            (source_sheet, source_record_id),
        ).fetchone()
    return None if row is None else map_import_source_row(row)


def register_import_source_record(
    *,
    profile_id: str,
    source_sheet: str,
    source_record_id: str,
    source_hash: str,
    import_batch_id: str,
    entity_type: str = "",
    entity_id: str = "",
) -> ImportSourceRecord:
    record = {
        "source_sheet": source_sheet,
        "source_record_id": source_record_id,
        "profile_id": profile_id,
        "source_hash": source_hash,
        "import_batch_id": import_batch_id,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "imported_at": utc_now(),
    }
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO import_source_records (
              source_sheet,
              source_record_id,
              profile_id,
              source_hash,
              import_batch_id,
              entity_type,
              entity_id,
              imported_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            tuple(record.values()),
        )
    return ImportSourceRecord(**record)


def get_import_source_record_for_entity(
    profile_id: str, entity_type: str, entity_id: str
) -> ImportSourceRecord | None:
    with connect() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM import_source_records
            WHERE profile_id = ? AND entity_type = ? AND entity_id = ?
            """,
            (profile_id, entity_type, entity_id),
        ).fetchone()
    return None if row is None else map_import_source_row(row)


def confirm_sportsbook_import_batch(
    *,
    profile_id: str,
    import_batch_id: str,
    backup_snapshot_id: str,
    selected_staged_row_ids: set[str],
) -> list[str]:
    imported_ids: list[str] = []
    with connect() as connection:
        batch = connection.execute(
            """
            SELECT *
            FROM import_batches
            WHERE profile_id = ? AND import_batch_id = ?
            """,
            (profile_id, import_batch_id),
        ).fetchone()
        if batch is None:
            raise ValueError("Import batch was not found for this profile")
        if batch["status"] != "dry_run_ready":
            raise ValueError("Only a dry-run-ready batch can be confirmed")
        if batch["mapping_version"] != "sportsbook-v1":
            raise ValueError("Only sportsbook-v1 batches can use this confirmation path")

        staged_rows = connection.execute(
            """
            SELECT *
            FROM import_staged_rows
            WHERE profile_id = ? AND import_batch_id = ?
            ORDER BY source_row, import_staged_row_id
            """,
            (profile_id, import_batch_id),
        ).fetchall()
        if any(row["staged_action"] == "blocked" for row in staged_rows):
            raise ValueError("Blocked staged rows prevent confirmation")
        selectable_ids = {
            str(row["import_staged_row_id"])
            for row in staged_rows
            if row["staged_action"] == "insert"
        }
        if not selected_staged_row_ids:
            raise ValueError("At least one new sportsbook row must be selected")
        if not selected_staged_row_ids.issubset(selectable_ids):
            raise ValueError("Selected rows must be new rows from this import batch")

        for staged_row in staged_rows:
            if staged_row["import_staged_row_id"] not in selected_staged_row_ids:
                continue
            payload = json.loads(staged_row["mapped_payload_json"])
            timestamp = utc_now()
            record = {
                "sportsbook_bet_id": f"SB-{uuid4().hex[:8].upper()}",
                "profile_id": profile_id,
                "event_name": payload["event_name"],
                "offer_text": payload["offer_text"],
                "bookmaker": payload["bookmaker"],
                "offer_type": payload["offer_type"],
                "bet_type": payload["bet_type"],
                "offer_name": payload["offer_name"],
                "fixture_type": payload["fixture_type"],
                "market": payload["market"],
                "status": payload["status"],
                "result": payload["result"],
                "back_stake": payload["back_stake"],
                "back_odds": payload["back_odds"],
                "bonus_trigger": payload["bonus_trigger"],
                "maximum_bonus": payload["maximum_bonus"],
                "bonus_retention_rate": payload["bonus_retention_rate"],
                "match_strategy": payload["match_strategy"],
                "lay_odds_1": payload["lay_odds_1"],
                "multi_lay_outcome_1_name": payload["multi_lay_outcome_1_name"],
                "multi_lay_outcomes_json": payload["multi_lay_outcomes_json"],
                "lay_actual": payload["lay_actual"],
                "lay_matched_stake_1": payload["lay_matched_stake_1"],
                "lay_commission_1": "",
                "exchange_name": payload["exchange_name"],
                "date_settled": payload["date_settled"],
                "user_notes": payload["user_notes"],
                "manual_override_value": payload["manual_override_value"],
                "manual_override_reason": payload["manual_override_reason"],
                "created_at": timestamp,
                "updated_at": timestamp,
            }
            connection.execute(
                """
                INSERT INTO sportsbook_bets (
                  sportsbook_bet_id, profile_id, event_name, offer_text, bookmaker,
                  offer_type, bet_type, offer_name, fixture_type, market, status, result,
                  back_stake, back_odds, bonus_trigger, maximum_bonus, bonus_retention_rate,
                  match_strategy, lay_odds_1, multi_lay_outcome_1_name,
                  multi_lay_outcomes_json, lay_actual, lay_matched_stake_1, lay_commission_1,
                  exchange_name, date_settled, user_notes, manual_override_value,
                  manual_override_reason, created_at, updated_at
                ) VALUES (
                  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                  ?, ?, ?, ?, ?, ?, ?
                )
                """,
                tuple(record.values()),
            )
            write_audit_entry(
                connection=connection,
                sportsbook_bet_id=record["sportsbook_bet_id"],
                profile_id=profile_id,
                action="imported",
                payload={
                    **record,
                    "import_batch_id": import_batch_id,
                    "source_record_id": staged_row["source_record_id"],
                    "backup_snapshot_id": backup_snapshot_id,
                },
            )
            connection.execute(
                """
                INSERT INTO import_source_records (
                  source_sheet, source_record_id, profile_id, source_hash,
                  import_batch_id, entity_type, entity_id, imported_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    staged_row["source_sheet"],
                    staged_row["source_record_id"],
                    profile_id,
                    staged_row["source_hash"],
                    import_batch_id,
                    "sportsbook_bet",
                    record["sportsbook_bet_id"],
                    timestamp,
                ),
            )
            connection.execute(
                """
                UPDATE import_staged_rows
                SET staged_action = 'imported'
                WHERE import_staged_row_id = ? AND import_batch_id = ?
                """,
                (staged_row["import_staged_row_id"], import_batch_id),
            )
            imported_ids.append(record["sportsbook_bet_id"])

        connection.execute(
            """
            UPDATE import_staged_rows
            SET staged_action = 'skipped_by_operator'
            WHERE import_batch_id = ? AND profile_id = ? AND staged_action = 'insert'
            """,
            (import_batch_id, profile_id),
        )
        action_counts = connection.execute(
            """
            SELECT staged_action, COUNT(*) AS row_count
            FROM import_staged_rows
            WHERE import_batch_id = ? AND profile_id = ?
            GROUP BY staged_action
            """,
            (import_batch_id, profile_id),
        ).fetchall()
        confirmed_summary = {
            str(row["staged_action"]): int(row["row_count"])
            for row in action_counts
        }
        connection.execute(
            """
            UPDATE import_batches
            SET status = ?, summary_json = ?, backup_snapshot_id = ?, completed_at = ?
            WHERE profile_id = ? AND import_batch_id = ?
            """,
            (
                "confirmed",
                json.dumps(confirmed_summary, sort_keys=True),
                backup_snapshot_id,
                utc_now(),
                profile_id,
                import_batch_id,
            ),
        )
    return imported_ids


def confirm_free_bet_import_batch(
    *,
    profile_id: str,
    import_batch_id: str,
    backup_snapshot_id: str,
    selected_staged_row_ids: set[str],
) -> list[str]:
    imported_ids: list[str] = []
    with connect() as connection:
        batch = connection.execute(
            """
            SELECT *
            FROM import_batches
            WHERE profile_id = ? AND import_batch_id = ?
            """,
            (profile_id, import_batch_id),
        ).fetchone()
        if batch is None:
            raise ValueError("Import batch was not found for this profile")
        if batch["status"] != "dry_run_ready":
            raise ValueError("Only a dry-run-ready batch can be confirmed")
        if batch["mapping_version"] != "free-bets-v1":
            raise ValueError("Only free-bets-v1 batches can use this confirmation path")

        staged_rows = connection.execute(
            """
            SELECT *
            FROM import_staged_rows
            WHERE profile_id = ? AND import_batch_id = ?
            ORDER BY source_row, import_staged_row_id
            """,
            (profile_id, import_batch_id),
        ).fetchall()
        if any(row["staged_action"] == "blocked" for row in staged_rows):
            raise ValueError("Blocked staged rows prevent confirmation")
        selectable_ids = {
            str(row["import_staged_row_id"])
            for row in staged_rows
            if row["staged_action"] == "insert"
        }
        if not selected_staged_row_ids:
            raise ValueError("At least one new free-bet row must be selected")
        if not selected_staged_row_ids.issubset(selectable_ids):
            raise ValueError("Selected rows must be new rows from this import batch")

        for staged_row in staged_rows:
            if staged_row["import_staged_row_id"] not in selected_staged_row_ids:
                continue
            payload = json.loads(staged_row["mapped_payload_json"])
            timestamp = utc_now()
            record = {
                "free_bet_id": f"FB-{uuid4().hex[:8].upper()}",
                "profile_id": profile_id,
                "event_name": payload["event_name"],
                "offer_text": payload["offer_text"],
                "bookmaker": payload["bookmaker"],
                "offer_type": payload["offer_type"],
                "bet_type": payload["bet_type"],
                "offer_name": payload["offer_name"],
                "fixture_type": payload["fixture_type"],
                "status": payload["status"],
                "result": payload["result"],
                "retention_mode": payload["retention_mode"],
                "free_bet_value": payload["free_bet_value"],
                "back_odds": payload["back_odds"],
                "match_strategy": payload["match_strategy"],
                "lay_odds_1": payload["lay_odds_1"],
                "lay_actual": payload["lay_actual"],
                "lay_matched_stake_1": payload["lay_matched_stake_1"],
                "lay_commission_1": "",
                "exchange_name": payload["exchange_name"],
                "expiry_datetime": payload["expiry_datetime"],
                "date_settled": payload["date_settled"],
                "origin_qual_bet_id": payload["origin_qual_bet_id"],
                "offer_group_id": payload["offer_group_id"],
                "user_notes": payload["user_notes"],
                "manual_override_value": payload["manual_override_value"],
                "manual_override_reason": payload["manual_override_reason"],
                "created_at": timestamp,
                "updated_at": timestamp,
            }
            connection.execute(
                """
                INSERT INTO free_bets (
                  free_bet_id, profile_id, event_name, offer_text, bookmaker,
                  offer_type, bet_type, offer_name, fixture_type, status, result,
                  retention_mode, free_bet_value, back_odds, match_strategy, lay_odds_1,
                  lay_actual, lay_matched_stake_1, lay_commission_1, exchange_name,
                  expiry_datetime, date_settled, origin_qual_bet_id, offer_group_id,
                  user_notes, manual_override_value, manual_override_reason, created_at,
                  updated_at
                ) VALUES (
                  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                  ?, ?, ?, ?, ?, ?
                )
                """,
                tuple(record.values()),
            )
            write_free_bet_audit_entry(
                connection=connection,
                free_bet_id=record["free_bet_id"],
                profile_id=profile_id,
                action="imported",
                payload={
                    **record,
                    "import_batch_id": import_batch_id,
                    "source_record_id": staged_row["source_record_id"],
                    "backup_snapshot_id": backup_snapshot_id,
                },
            )
            connection.execute(
                """
                INSERT INTO import_source_records (
                  source_sheet, source_record_id, profile_id, source_hash,
                  import_batch_id, entity_type, entity_id, imported_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    staged_row["source_sheet"],
                    staged_row["source_record_id"],
                    profile_id,
                    staged_row["source_hash"],
                    import_batch_id,
                    "free_bet",
                    record["free_bet_id"],
                    timestamp,
                ),
            )
            connection.execute(
                """
                UPDATE import_staged_rows
                SET staged_action = 'imported'
                WHERE import_staged_row_id = ? AND import_batch_id = ?
                """,
                (staged_row["import_staged_row_id"], import_batch_id),
            )
            imported_ids.append(record["free_bet_id"])

        connection.execute(
            """
            UPDATE import_staged_rows
            SET staged_action = 'skipped_by_operator'
            WHERE import_batch_id = ? AND profile_id = ? AND staged_action = 'insert'
            """,
            (import_batch_id, profile_id),
        )
        action_counts = connection.execute(
            """
            SELECT staged_action, COUNT(*) AS row_count
            FROM import_staged_rows
            WHERE import_batch_id = ? AND profile_id = ?
            GROUP BY staged_action
            """,
            (import_batch_id, profile_id),
        ).fetchall()
        confirmed_summary = {
            str(row["staged_action"]): int(row["row_count"])
            for row in action_counts
        }
        connection.execute(
            """
            UPDATE import_batches
            SET status = ?, summary_json = ?, backup_snapshot_id = ?, completed_at = ?
            WHERE profile_id = ? AND import_batch_id = ?
            """,
            (
                "confirmed",
                json.dumps(confirmed_summary, sort_keys=True),
                backup_snapshot_id,
                utc_now(),
                profile_id,
                import_batch_id,
            ),
        )
    return imported_ids


def confirm_casino_offer_import_batch(
    *,
    profile_id: str,
    import_batch_id: str,
    backup_snapshot_id: str,
    selected_staged_row_ids: set[str],
) -> list[str]:
    imported_ids: list[str] = []
    with connect() as connection:
        batch = connection.execute(
            "SELECT * FROM import_batches WHERE profile_id = ? AND import_batch_id = ?",
            (profile_id, import_batch_id),
        ).fetchone()
        if batch is None:
            raise ValueError("Import batch was not found for this profile")
        if batch["status"] != "dry_run_ready":
            raise ValueError("Only a dry-run-ready batch can be confirmed")
        if batch["mapping_version"] != "casino-offers-v1":
            raise ValueError("Only casino-offers-v1 batches can use this confirmation path")

        staged_rows = connection.execute(
            """
            SELECT * FROM import_staged_rows
            WHERE profile_id = ? AND import_batch_id = ?
            ORDER BY source_row, import_staged_row_id
            """,
            (profile_id, import_batch_id),
        ).fetchall()
        if any(row["staged_action"] == "blocked" for row in staged_rows):
            raise ValueError("Blocked staged rows prevent confirmation")
        selectable_ids = {
            str(row["import_staged_row_id"])
            for row in staged_rows
            if row["staged_action"] == "insert"
        }
        if not selected_staged_row_ids:
            raise ValueError("At least one new casino-offer row must be selected")
        if not selected_staged_row_ids.issubset(selectable_ids):
            raise ValueError("Selected rows must be new rows from this import batch")

        for staged_row in staged_rows:
            if staged_row["import_staged_row_id"] not in selected_staged_row_ids:
                continue
            payload = json.loads(staged_row["mapped_payload_json"])
            timestamp = utc_now()
            record = {
                "casino_offer_id": f"CO-{uuid4().hex[:8].upper()}",
                "profile_id": profile_id,
                "offer_group_id": payload["offer_group_id"],
                "date_started": payload["date_started"],
                "date_settling": payload["date_settling"] or payload["date_started"],
                "expiry_datetime": payload["expiry_datetime"],
                "bookmaker": payload["bookmaker"],
                "offer_type": payload["offer_type"],
                "offer_name": payload["offer_name"],
                "game": payload["game"],
                "cash_stake": payload["cash_stake"],
                "credit_amount": payload["credit_amount"],
                "bonus_amount": payload["bonus_amount"],
                "wager_multiplier": payload["wager_multiplier"],
                "wager_target": payload["wager_target"],
                "required_spins": payload["required_spins"],
                "spin_stake": payload["spin_stake"],
                "free_spins_awarded": payload["free_spins_awarded"],
                "free_spins_value": payload["free_spins_value"],
                "status": payload["status"],
                "result": payload["result"],
                "calc_net_pnl": payload["calc_net_pnl"],
                "final_net_pnl": payload["final_net_pnl"],
                "user_notes": payload["user_notes"],
                "created_at": timestamp,
                "updated_at": timestamp,
            }
            connection.execute(
                """
                INSERT INTO casino_offers (
                  casino_offer_id, profile_id, offer_group_id, date_started, date_settling,
                  expiry_datetime, bookmaker, offer_type, offer_name, game, cash_stake,
                  credit_amount, bonus_amount, wager_multiplier, wager_target, required_spins,
                  spin_stake, free_spins_awarded, free_spins_value, status, result, calc_net_pnl,
                  final_net_pnl, user_notes, created_at, updated_at
                ) VALUES (
                  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
                """,
                tuple(record.values()),
            )
            write_casino_offer_audit_entry(
                connection=connection,
                casino_offer_id=record["casino_offer_id"],
                profile_id=profile_id,
                action="imported",
                payload={
                    **record,
                    "import_batch_id": import_batch_id,
                    "source_record_id": staged_row["source_record_id"],
                    "backup_snapshot_id": backup_snapshot_id,
                },
            )
            connection.execute(
                """
                INSERT INTO import_source_records (
                  source_sheet, source_record_id, profile_id, source_hash,
                  import_batch_id, entity_type, entity_id, imported_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    staged_row["source_sheet"],
                    staged_row["source_record_id"],
                    profile_id,
                    staged_row["source_hash"],
                    import_batch_id,
                    "casino_offer",
                    record["casino_offer_id"],
                    timestamp,
                ),
            )
            connection.execute(
                """
                UPDATE import_staged_rows SET staged_action = 'imported'
                WHERE import_staged_row_id = ? AND import_batch_id = ?
                """,
                (staged_row["import_staged_row_id"], import_batch_id),
            )
            imported_ids.append(record["casino_offer_id"])

        connection.execute(
            """
            UPDATE import_staged_rows SET staged_action = 'skipped_by_operator'
            WHERE import_batch_id = ? AND profile_id = ? AND staged_action = 'insert'
            """,
            (import_batch_id, profile_id),
        )
        action_counts = connection.execute(
            """
            SELECT staged_action, COUNT(*) AS row_count FROM import_staged_rows
            WHERE import_batch_id = ? AND profile_id = ? GROUP BY staged_action
            """,
            (import_batch_id, profile_id),
        ).fetchall()
        confirmed_summary = {
            str(row["staged_action"]): int(row["row_count"])
            for row in action_counts
        }
        connection.execute(
            """
            UPDATE import_batches
            SET status = ?, summary_json = ?, backup_snapshot_id = ?, completed_at = ?
            WHERE profile_id = ? AND import_batch_id = ?
            """,
            (
                "confirmed",
                json.dumps(confirmed_summary, sort_keys=True),
                backup_snapshot_id,
                utc_now(),
                profile_id,
                import_batch_id,
            ),
        )
    return imported_ids


def confirm_cash_adjustment_import_batch(
    *,
    profile_id: str,
    import_batch_id: str,
    backup_snapshot_id: str,
    selected_staged_row_ids: set[str],
) -> list[str]:
    imported_ids: list[str] = []
    with connect() as connection:
        batch = connection.execute(
            "SELECT * FROM import_batches WHERE profile_id = ? AND import_batch_id = ?",
            (profile_id, import_batch_id),
        ).fetchone()
        if batch is None:
            raise ValueError("Import batch was not found for this profile")
        if batch["status"] != "dry_run_ready":
            raise ValueError("Only a dry-run-ready batch can be confirmed")
        if batch["mapping_version"] != "cash-adjustments-v1":
            raise ValueError("Only cash-adjustments-v1 batches can use this confirmation path")

        staged_rows = connection.execute(
            """
            SELECT * FROM import_staged_rows
            WHERE profile_id = ? AND import_batch_id = ?
            ORDER BY source_row, import_staged_row_id
            """,
            (profile_id, import_batch_id),
        ).fetchall()
        if any(row["staged_action"] == "blocked" for row in staged_rows):
            raise ValueError("Blocked staged rows prevent confirmation")
        selectable_ids = {
            str(row["import_staged_row_id"])
            for row in staged_rows
            if row["staged_action"] == "insert"
        }
        if not selected_staged_row_ids:
            raise ValueError("At least one new cash-adjustment row must be selected")
        if not selected_staged_row_ids.issubset(selectable_ids):
            raise ValueError("Selected rows must be new rows from this import batch")

        for staged_row in staged_rows:
            if staged_row["import_staged_row_id"] not in selected_staged_row_ids:
                continue
            payload = json.loads(staged_row["mapped_payload_json"])
            timestamp = utc_now()
            record = {
                "cash_adjustment_id": f"CA-{uuid4().hex[:8].upper()}",
                "profile_id": profile_id,
                "adjustment_date": payload["adjustment_date"],
                "direction": payload["direction"],
                "amount": payload["amount"],
                "adjustment_type": payload["adjustment_type"],
                "affects_investment": int(bool(payload["affects_investment"])),
                "affects_cash_snapshot": int(bool(payload["affects_cash_snapshot"])),
                "linked_account": payload["linked_account"],
                "description": payload["description"],
                "created_at": timestamp,
                "updated_at": timestamp,
            }
            connection.execute(
                """
                INSERT INTO cash_adjustments (
                  cash_adjustment_id, profile_id, adjustment_date, direction, amount,
                  adjustment_type, affects_investment, affects_cash_snapshot,
                  linked_account, description, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                tuple(record.values()),
            )
            write_cash_adjustment_audit_entry(
                connection=connection,
                cash_adjustment_id=record["cash_adjustment_id"],
                profile_id=profile_id,
                action="imported",
                payload={
                    **record,
                    "import_batch_id": import_batch_id,
                    "source_record_id": staged_row["source_record_id"],
                    "backup_snapshot_id": backup_snapshot_id,
                },
            )
            connection.execute(
                """
                INSERT INTO import_source_records (
                  source_sheet, source_record_id, profile_id, source_hash,
                  import_batch_id, entity_type, entity_id, imported_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    staged_row["source_sheet"],
                    staged_row["source_record_id"],
                    profile_id,
                    staged_row["source_hash"],
                    import_batch_id,
                    "cash_adjustment",
                    record["cash_adjustment_id"],
                    timestamp,
                ),
            )
            connection.execute(
                """
                UPDATE import_staged_rows SET staged_action = 'imported'
                WHERE import_staged_row_id = ? AND import_batch_id = ?
                """,
                (staged_row["import_staged_row_id"], import_batch_id),
            )
            imported_ids.append(record["cash_adjustment_id"])

        connection.execute(
            """
            UPDATE import_staged_rows SET staged_action = 'skipped_by_operator'
            WHERE import_batch_id = ? AND profile_id = ? AND staged_action = 'insert'
            """,
            (import_batch_id, profile_id),
        )
        action_counts = connection.execute(
            """
            SELECT staged_action, COUNT(*) AS row_count FROM import_staged_rows
            WHERE import_batch_id = ? AND profile_id = ? GROUP BY staged_action
            """,
            (import_batch_id, profile_id),
        ).fetchall()
        confirmed_summary = {
            str(row["staged_action"]): int(row["row_count"])
            for row in action_counts
        }
        connection.execute(
            """
            UPDATE import_batches
            SET status = ?, summary_json = ?, backup_snapshot_id = ?, completed_at = ?
            WHERE profile_id = ? AND import_batch_id = ?
            """,
            (
                "confirmed",
                json.dumps(confirmed_summary, sort_keys=True),
                backup_snapshot_id,
                utc_now(),
                profile_id,
                import_batch_id,
            ),
        )
    return imported_ids


def confirm_account_import_batch(
    *,
    profile_id: str,
    import_batch_id: str,
    backup_snapshot_id: str,
    selected_staged_row_ids: set[str],
) -> list[str]:
    imported_ids: list[str] = []
    with connect() as connection:
        batch = connection.execute(
            "SELECT * FROM import_batches WHERE profile_id = ? AND import_batch_id = ?",
            (profile_id, import_batch_id),
        ).fetchone()
        if batch is None:
            raise ValueError("Import batch was not found for this profile")
        if batch["status"] != "dry_run_ready":
            raise ValueError("Only a dry-run-ready batch can be confirmed")
        if batch["mapping_version"] != "accounts-v1":
            raise ValueError("Only accounts-v1 batches can use this confirmation path")

        staged_rows = connection.execute(
            """
            SELECT * FROM import_staged_rows
            WHERE profile_id = ? AND import_batch_id = ?
            ORDER BY source_row, import_staged_row_id
            """,
            (profile_id, import_batch_id),
        ).fetchall()
        if any(row["staged_action"] == "blocked" for row in staged_rows):
            raise ValueError("Blocked staged rows prevent confirmation")
        selectable_ids = {
            str(row["import_staged_row_id"])
            for row in staged_rows
            if row["staged_action"] in {"insert", "update"}
        }
        if not selected_staged_row_ids:
            raise ValueError("At least one new or changed account row must be selected")
        if not selected_staged_row_ids.issubset(selectable_ids):
            raise ValueError("Selected rows must be new or changed rows from this import batch")

        for staged_row in staged_rows:
            if staged_row["import_staged_row_id"] not in selected_staged_row_ids:
                continue
            payload = json.loads(staged_row["mapped_payload_json"])
            timestamp = utc_now()
            is_update = staged_row["staged_action"] == "update"
            source = connection.execute(
                """
                SELECT * FROM import_source_records
                WHERE source_sheet = ? AND source_record_id = ?
                """,
                (staged_row["source_sheet"], staged_row["source_record_id"]),
            ).fetchone()
            target_account_id = (
                str(source["entity_id"])
                if source is not None and source["entity_type"] == "account"
                else str(staged_row["source_record_id"])
            )
            existing = None
            if is_update:
                existing = connection.execute(
                    "SELECT * FROM accounts WHERE profile_id = ? AND account_id = ?",
                    (profile_id, target_account_id),
                ).fetchone()
                if existing is None:
                    raise ValueError("Changed account target was not found for this profile")
            record = {
                "account_id": target_account_id if is_update else f"AC-{uuid4().hex[:8].upper()}",
                "profile_id": profile_id,
                "bookmaker_id": None,
                "account": payload["account"],
                "type": payload["type"],
                "counts_in_cash_total": int(bool(payload["counts_in_cash_total"])),
                "channel": payload["channel"],
                "status": payload["status"],
                "current_balance": payload["current_balance"],
                "pending_withdrawal_amount": payload["pending_withdrawal_amount"],
                "last_balance_update": payload["last_balance_update"],
                "group_name": payload["group_name"],
                "platform": payload["platform"],
                "sign_up_date": payload["sign_up_date"],
                "notes": payload["notes"],
                "created_at": str(existing["created_at"]) if existing is not None else timestamp,
                "updated_at": timestamp,
            }
            if is_update:
                connection.execute(
                    """
                    UPDATE accounts SET
                      bookmaker_id = ?, account = ?, type = ?, counts_in_cash_total = ?,
                      channel = ?, status = ?, current_balance = ?,
                      pending_withdrawal_amount = ?, last_balance_update = ?, group_name = ?,
                      platform = ?, sign_up_date = ?, notes = ?, updated_at = ?
                    WHERE profile_id = ? AND account_id = ?
                    """,
                    (
                        record["bookmaker_id"], record["account"], record["type"],
                        record["counts_in_cash_total"], record["channel"], record["status"],
                        record["current_balance"], record["pending_withdrawal_amount"],
                        record["last_balance_update"], record["group_name"], record["platform"],
                        record["sign_up_date"], record["notes"], record["updated_at"],
                        profile_id, record["account_id"],
                    ),
                )
            else:
                connection.execute(
                    """
                    INSERT INTO accounts (
                      account_id, profile_id, bookmaker_id, account, type,
                      counts_in_cash_total, channel, status, current_balance,
                      pending_withdrawal_amount, last_balance_update, group_name,
                      platform, sign_up_date, notes, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    tuple(record.values()),
                )
            write_account_audit_entry(
                connection=connection,
                account_id=record["account_id"],
                profile_id=profile_id,
                action="imported_update" if is_update else "imported",
                payload={
                    **record,
                    "import_batch_id": import_batch_id,
                    "source_record_id": staged_row["source_record_id"],
                    "backup_snapshot_id": backup_snapshot_id,
                    "previous_record": dict(existing) if existing is not None else None,
                },
            )
            if source is None:
                connection.execute(
                    """
                    INSERT INTO import_source_records (
                      source_sheet, source_record_id, profile_id, source_hash,
                      import_batch_id, entity_type, entity_id, imported_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        staged_row["source_sheet"], staged_row["source_record_id"], profile_id,
                        staged_row["source_hash"], import_batch_id, "account",
                        record["account_id"], timestamp,
                    ),
                )
            else:
                connection.execute(
                    """
                    UPDATE import_source_records
                    SET source_hash = ?, import_batch_id = ?, entity_type = 'account',
                        entity_id = ?, imported_at = ?
                    WHERE source_sheet = ? AND source_record_id = ? AND profile_id = ?
                    """,
                    (
                        staged_row["source_hash"], import_batch_id, record["account_id"], timestamp,
                        staged_row["source_sheet"], staged_row["source_record_id"], profile_id,
                    ),
                )
            connection.execute(
                """
                UPDATE import_staged_rows SET staged_action = 'imported'
                WHERE import_staged_row_id = ? AND import_batch_id = ?
                """,
                (staged_row["import_staged_row_id"], import_batch_id),
            )
            imported_ids.append(record["account_id"])

        connection.execute(
            """
            UPDATE import_staged_rows SET staged_action = 'skipped_by_operator'
            WHERE import_batch_id = ? AND profile_id = ?
              AND staged_action IN ('insert', 'update')
            """,
            (import_batch_id, profile_id),
        )
        action_counts = connection.execute(
            """
            SELECT staged_action, COUNT(*) AS row_count FROM import_staged_rows
            WHERE import_batch_id = ? AND profile_id = ? GROUP BY staged_action
            """,
            (import_batch_id, profile_id),
        ).fetchall()
        confirmed_summary = {
            str(row["staged_action"]): int(row["row_count"])
            for row in action_counts
        }
        connection.execute(
            """
            UPDATE import_batches
            SET status = ?, summary_json = ?, backup_snapshot_id = ?, completed_at = ?
            WHERE profile_id = ? AND import_batch_id = ?
            """,
            (
                "confirmed",
                json.dumps(confirmed_summary, sort_keys=True),
                backup_snapshot_id,
                utc_now(),
                profile_id,
                import_batch_id,
            ),
        )
    return imported_ids


def create_backup_snapshot_record(payload: dict[str, Any]) -> BackupSnapshotRecord:
    record = {
        "backup_snapshot_id": payload.get("backup_snapshot_id")
        or f"BACKUP-{uuid4().hex[:8].upper()}",
        "created_at": payload["created_at"],
        "backup_scope": payload["backup_scope"],
        "schema_version": payload["schema_version"],
        "storage_path": payload["storage_path"],
        "status": payload["status"],
        "notes": payload["notes"],
        "checksum_sha256": payload["checksum_sha256"],
        "byte_size": payload["byte_size"],
        "integrity_check": payload["integrity_check"],
    }
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO backup_snapshots (
              backup_snapshot_id,
              created_at,
              backup_scope,
              schema_version,
              storage_path,
              status,
              notes,
              checksum_sha256,
              byte_size,
              integrity_check
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            tuple(record.values()),
        )
    return BackupSnapshotRecord(**record)


def list_backup_snapshot_records() -> list[BackupSnapshotRecord]:
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM backup_snapshots
            ORDER BY created_at DESC, backup_snapshot_id DESC
            """
        ).fetchall()
    return [map_backup_snapshot_row(row) for row in rows]


def list_accounts(profile_id: str) -> list[AccountRecord]:
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM accounts
            WHERE profile_id = ?
            ORDER BY account ASC, account_id ASC
            """,
            (profile_id,),
        ).fetchall()
    return [map_account_row(row) for row in rows]


def get_account(profile_id: str, account_id: str) -> AccountRecord | None:
    with connect() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM accounts
            WHERE profile_id = ? AND account_id = ?
            """,
            (profile_id, account_id),
        ).fetchone()
    return None if row is None else map_account_row(row)


def get_account_by_id(account_id: str) -> AccountRecord | None:
    with connect() as connection:
        row = connection.execute(
            "SELECT * FROM accounts WHERE account_id = ?",
            (account_id,),
        ).fetchone()
    return None if row is None else map_account_row(row)


def create_account(profile_id: str, payload: dict[str, Any]) -> AccountRecord:
    record = {
        "account_id": payload.get("account_id") or f"AC-{uuid4().hex[:8].upper()}",
        "profile_id": profile_id,
        "bookmaker_id": payload.get("bookmaker_id"),
        "account": payload["account"],
        "type": payload["type"],
        "counts_in_cash_total": int(bool(payload["counts_in_cash_total"])),
        "channel": payload["channel"],
        "status": payload["status"],
        "lifecycle_status": payload.get("lifecycle_status", "Active"),
        "restrictions_json": payload.get("restrictions_json", "[]"),
        "current_balance": payload["current_balance"],
        "pending_withdrawal_amount": payload["pending_withdrawal_amount"],
        "last_balance_update": payload["last_balance_update"],
        "group_name": payload["group_name"],
        "platform": payload["platform"],
        "sign_up_date": payload.get("sign_up_date", ""),
        "notes": payload.get("notes", ""),
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO accounts (
              account_id,
              profile_id,
              bookmaker_id,
              account,
              type,
              counts_in_cash_total,
              channel,
              status,
              lifecycle_status,
              restrictions_json,
              current_balance,
              pending_withdrawal_amount,
              last_balance_update,
              group_name,
              platform,
              sign_up_date,
              notes,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            tuple(record.values()),
        )
        write_account_audit_entry(
            connection=connection,
            account_id=record["account_id"],
            profile_id=profile_id,
            action="created",
            payload=record,
        )
    created = get_account(profile_id, record["account_id"])
    assert created is not None
    return created


def update_account(
    profile_id: str,
    account_id: str,
    payload: dict[str, Any],
) -> AccountRecord | None:
    existing = get_account(profile_id, account_id)
    if existing is None:
        return None

    updated = {
        "bookmaker_id": payload.get("bookmaker_id"),
        "account": payload["account"],
        "type": payload["type"],
        "counts_in_cash_total": int(bool(payload["counts_in_cash_total"])),
        "channel": payload["channel"],
        "status": payload["status"],
        "lifecycle_status": payload.get("lifecycle_status", "Active"),
        "restrictions_json": payload.get("restrictions_json", "[]"),
        "current_balance": payload["current_balance"],
        "pending_withdrawal_amount": payload["pending_withdrawal_amount"],
        "last_balance_update": payload["last_balance_update"],
        "group_name": payload["group_name"],
        "platform": payload["platform"],
        "sign_up_date": payload.get("sign_up_date", ""),
        "notes": payload.get("notes", ""),
        "updated_at": utc_now(),
    }
    with connect() as connection:
        connection.execute(
            """
            UPDATE accounts
            SET
              bookmaker_id = ?,
              account = ?,
              type = ?,
              counts_in_cash_total = ?,
              channel = ?,
              status = ?,
              lifecycle_status = ?,
              restrictions_json = ?,
              current_balance = ?,
              pending_withdrawal_amount = ?,
              last_balance_update = ?,
              group_name = ?,
              platform = ?,
              sign_up_date = ?,
              notes = ?,
              updated_at = ?
            WHERE profile_id = ? AND account_id = ?
            """,
            (
                updated["bookmaker_id"],
                updated["account"],
                updated["type"],
                updated["counts_in_cash_total"],
                updated["channel"],
                updated["status"],
                updated["lifecycle_status"],
                updated["restrictions_json"],
                updated["current_balance"],
                updated["pending_withdrawal_amount"],
                updated["last_balance_update"],
                updated["group_name"],
                updated["platform"],
                updated["sign_up_date"],
                updated["notes"],
                updated["updated_at"],
                profile_id,
                account_id,
            ),
        )
        write_account_audit_entry(
            connection=connection,
            account_id=account_id,
            profile_id=profile_id,
            action="updated",
            payload={"account_id": account_id, "profile_id": profile_id, **updated},
        )
    return get_account(profile_id, account_id)


def count_account_audit_rows(profile_id: str, account_id: str) -> int:
    with connect() as connection:
        row = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM account_audit
            WHERE profile_id = ? AND account_id = ?
            """,
            (profile_id, account_id),
        ).fetchone()
    return int(row["count"])


def upsert_profile_exchange_commission(
    profile_id: str,
    exchange_name: str,
    commission_rate: str,
) -> ProfileExchangeCommissionRecord:
    timestamp = utc_now()
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO profile_exchange_commissions (
              profile_id,
              exchange_name,
              commission_rate,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(profile_id, exchange_name)
            DO UPDATE SET
              commission_rate = excluded.commission_rate,
              updated_at = excluded.updated_at
            """,
            (profile_id, exchange_name, commission_rate, timestamp, timestamp),
        )
        row = connection.execute(
            """
            SELECT *
            FROM profile_exchange_commissions
            WHERE profile_id = ? AND exchange_name = ?
            """,
            (profile_id, exchange_name),
        ).fetchone()
    assert row is not None
    return map_exchange_commission_row(row)
