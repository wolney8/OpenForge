from __future__ import annotations

import hashlib
import io
import json
import os
import re
import shutil
import sqlite3
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from pathlib import Path
from typing import Any
from uuid import uuid4
from zipfile import ZIP_DEFLATED, BadZipFile, ZipFile

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator

from openforge_api.config import settings
from openforge_api.db import (
    BackupSnapshotRecord,
    connect,
    create_backup_snapshot_record,
    database_operation_lock,
    delete_backup_snapshot_record,
    list_backup_snapshot_records,
    update_backup_snapshot_status,
    utc_now,
)

SCHEMA_VERSION = "sqlite-v1"
MANIFEST_VERSION = "1.0"
PORTABLE_PACKAGE_VERSION = "1.0"
MAX_PACKAGE_BYTES = 250 * 1024 * 1024
MAX_UNCOMPRESSED_BYTES = 500 * 1024 * 1024
RESTORE_CONFIRMATION = "RESTORE PLUM DUFF DATABASE"

FINANCIAL_CONTROL_COLUMNS: dict[str, tuple[str, ...]] = {
    "accounts": ("current_balance", "pending_withdrawal_amount"),
    "balance_snapshots": ("balance_amount",),
    "sportsbook_bets": (
        "back_stake",
        "lay_actual",
        "lay_matched_stake_1",
        "manual_override_value",
    ),
    "free_bets": (
        "free_bet_value",
        "lay_actual",
        "lay_matched_stake_1",
        "manual_override_value",
    ),
    "cash_adjustments": ("amount",),
    "fee_period_revisions": (
        "eligible_period_profit",
        "opening_loss_carryforward",
        "closing_loss_carryforward",
        "fee_base",
        "management_fee_amount",
        "investment_fee_amount",
        "total_fee_due",
    ),
    "fee_corrections": ("amount",),
    "fee_withdrawal_links": ("amount",),
    "casino_offers": (
        "cash_stake",
        "credit_amount",
        "bonus_amount",
        "wager_target",
        "spin_stake",
        "free_spins_value",
        "calc_net_pnl",
        "final_net_pnl",
    ),
}

router = APIRouter(prefix="/fund-manager/backups", tags=["fund-manager-backups"])


class CreateBackupPayload(BaseModel):
    reason: str = Field(default="Manual Fund Manager backup", min_length=1, max_length=160)

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, value: str) -> str:
        reason = value.strip()
        if not reason:
            raise ValueError("Backup reason is required")
        return reason


class BackupSnapshotResponse(BaseModel):
    backup_snapshot_id: str
    created_at: str
    backup_scope: str
    schema_version: str
    storage_name: str
    status: str
    notes: str
    checksum_sha256: str
    byte_size: int
    integrity_check: str
    cloud_state: str = "not_configured"
    is_delete_allowed: bool
    delete_blocked_reason: str


class BackupVerificationResponse(BaseModel):
    backup_snapshot_id: str
    status: str
    checksum_valid: bool
    integrity_check: str
    manifest_valid: bool


class BackupImportPreviewResponse(BaseModel):
    import_token: str
    source_filename: str
    source_instance_id: str
    source_created_at: str
    schema_version: str
    profile_count: int
    table_count: int
    total_row_count: int
    financial_control_count: int
    checksum_valid: bool
    integrity_check: str
    foreign_key_check: str
    ready_to_restore: bool


class RestoreBackupPayload(BaseModel):
    confirmation: str
    reason: str = Field(min_length=1, max_length=160)

    @field_validator("reason")
    @classmethod
    def validate_restore_reason(cls, value: str) -> str:
        reason = value.strip()
        if not reason:
            raise ValueError("Restore reason is required")
        return reason


class RestoreBackupResponse(BaseModel):
    restore_event_id: str
    restored_at: str
    pre_restore_backup_snapshot_id: str
    imported_backup_snapshot_id: str
    status: str
    reload_required: bool


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _backup_record(backup_snapshot_id: str) -> BackupSnapshotRecord:
    record = next(
        (
            candidate
            for candidate in list_backup_snapshot_records()
            if candidate.backup_snapshot_id == backup_snapshot_id
        ),
        None,
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Backup snapshot not found")
    return record


def _quoted_identifier(value: str) -> str:
    if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", value) is None:
        raise RuntimeError("Backup database contains an unsafe table or column name")
    return f'"{value}"'


def _database_control_summary(path: Path) -> tuple[dict[str, int], dict[str, str], int]:
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    try:
        table_names = [
            str(row[0])
            for row in connection.execute(
                """
                SELECT name
                FROM sqlite_master
                WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
                ORDER BY name
                """
            ).fetchall()
        ]
        row_counts = {
            table_name: int(
                connection.execute(
                    f"SELECT COUNT(*) FROM {_quoted_identifier(table_name)}"
                ).fetchone()[0]
            )
            for table_name in table_names
        }
        financial_totals: dict[str, str] = {}
        for table_name, configured_columns in FINANCIAL_CONTROL_COLUMNS.items():
            if table_name not in row_counts:
                continue
            available_columns = {
                str(row[1])
                for row in connection.execute(
                    f"PRAGMA table_info({_quoted_identifier(table_name)})"
                ).fetchall()
            }
            for column_name in configured_columns:
                if column_name not in available_columns:
                    continue
                total = Decimal("0")
                values = connection.execute(
                    "SELECT "
                    f"{_quoted_identifier(column_name)} FROM {_quoted_identifier(table_name)}"
                ).fetchall()
                for row in values:
                    raw_value = str(row[0] or "").strip()
                    if not raw_value:
                        continue
                    try:
                        total += Decimal(raw_value)
                    except InvalidOperation as error:
                        raise RuntimeError(
                            f"Invalid financial control value in {table_name}.{column_name}"
                        ) from error
                financial_totals[f"{table_name}.{column_name}"] = format(
                    total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP), "f"
                )
        foreign_key_violations = len(connection.execute("PRAGMA foreign_key_check").fetchall())
    finally:
        connection.close()
    return row_counts, financial_totals, foreign_key_violations


def _portable_manifest(record: BackupSnapshotRecord, snapshot_path: Path) -> dict[str, Any]:
    row_counts, financial_totals, foreign_key_violations = _database_control_summary(snapshot_path)
    if foreign_key_violations:
        raise RuntimeError("Backup contains profile or relational integrity violations")
    return {
        "backup_scope": record.backup_scope,
        "byte_size": snapshot_path.stat().st_size,
        "checksum_sha256": sha256_file(snapshot_path),
        "created_at": record.created_at,
        "database_filename": "plum-duff.sqlite3",
        "financial_control_totals": financial_totals,
        "manifest_version": MANIFEST_VERSION,
        "package_version": PORTABLE_PACKAGE_VERSION,
        "profile_count": row_counts.get("profiles", 0),
        "reason": record.notes,
        "schema_version": record.schema_version,
        "source_instance_id": settings.source_instance_id,
        "table_row_counts": row_counts,
    }


def _build_portable_package(record: BackupSnapshotRecord) -> bytes:
    verify_backup_snapshot(record)
    snapshot_path = _resolve_snapshot_path(record)
    if snapshot_path.stat().st_size > MAX_PACKAGE_BYTES:
        raise RuntimeError("Backup is too large for local package export")
    manifest = _portable_manifest(record, snapshot_path)
    package = io.BytesIO()
    with ZipFile(package, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("manifest.json", json.dumps(manifest, indent=2, sort_keys=True) + "\n")
        archive.write(snapshot_path, "plum-duff.sqlite3")
    return package.getvalue()


def _validate_candidate(
    candidate_path: Path, manifest: dict[str, Any]
) -> BackupImportPreviewResponse:
    required_manifest_values = {
        "byte_size",
        "checksum_sha256",
        "created_at",
        "database_filename",
        "financial_control_totals",
        "package_version",
        "profile_count",
        "schema_version",
        "source_instance_id",
        "table_row_counts",
    }
    if not required_manifest_values.issubset(manifest):
        raise RuntimeError("Backup package manifest is incomplete")
    if manifest.get("package_version") != PORTABLE_PACKAGE_VERSION:
        raise RuntimeError("Backup package version is not supported")
    if manifest.get("schema_version") != SCHEMA_VERSION:
        raise RuntimeError("Backup database schema is not supported")
    if manifest.get("database_filename") != "plum-duff.sqlite3":
        raise RuntimeError("Backup package database filename is invalid")
    if not str(manifest.get("source_instance_id") or "").strip():
        raise RuntimeError("Backup package source instance is missing")
    if not isinstance(manifest.get("table_row_counts"), dict):
        raise RuntimeError("Backup package row-count controls are invalid")
    if not isinstance(manifest.get("financial_control_totals"), dict):
        raise RuntimeError("Backup package financial controls are invalid")
    if manifest.get("byte_size") != candidate_path.stat().st_size:
        raise RuntimeError("Backup package size verification failed")
    if manifest.get("checksum_sha256") != sha256_file(candidate_path):
        raise RuntimeError("Backup package checksum verification failed")
    integrity_result = verify_sqlite_integrity(candidate_path)
    row_counts, financial_totals, foreign_key_violations = _database_control_summary(candidate_path)
    if foreign_key_violations:
        raise RuntimeError("Backup contains profile or relational integrity violations")
    if manifest.get("table_row_counts") != row_counts:
        raise RuntimeError("Backup table row-count verification failed")
    if manifest.get("financial_control_totals") != financial_totals:
        raise RuntimeError("Backup financial control-total verification failed")
    if manifest.get("profile_count") != row_counts.get("profiles", 0):
        raise RuntimeError("Backup profile-count verification failed")
    return BackupImportPreviewResponse(
        import_token="",
        source_filename="",
        source_instance_id=str(manifest["source_instance_id"]),
        source_created_at=str(manifest["created_at"]),
        schema_version=str(manifest["schema_version"]),
        profile_count=int(manifest["profile_count"]),
        table_count=len(row_counts),
        total_row_count=sum(row_counts.values()),
        financial_control_count=len(financial_totals),
        checksum_valid=True,
        integrity_check=integrity_result,
        foreign_key_check="ok",
        ready_to_restore=True,
    )


def _staging_path(import_token: str) -> Path:
    invalid_character = any(character not in "0123456789abcdef" for character in import_token)
    if len(import_token) != 32 or invalid_character:
        raise HTTPException(status_code=404, detail="Staged database import not found")
    return settings.backup_path.resolve() / "imports" / import_token


def verify_sqlite_integrity(path: Path) -> str:
    connection = sqlite3.connect(path)
    try:
        row = connection.execute("PRAGMA integrity_check").fetchone()
    finally:
        connection.close()
    result = "" if row is None else str(row[0])
    if result.casefold() != "ok":
        raise RuntimeError(f"Backup integrity check failed: {result or 'no result'}")
    return result


def protected_verified_backup_ids() -> set[str]:
    verified_records = [
        record for record in list_backup_snapshot_records() if record.status == "verified"
    ]
    return {record.backup_snapshot_id for record in verified_records[:3]}


def backup_delete_policy(record: BackupSnapshotRecord) -> tuple[bool, str]:
    if record.status == "verified" and record.backup_snapshot_id in protected_verified_backup_ids():
        return False, "Keep the latest three verified backups before deleting older restore points."
    return True, ""


def serialize_backup_snapshot(record: BackupSnapshotRecord) -> BackupSnapshotResponse:
    is_delete_allowed, delete_blocked_reason = backup_delete_policy(record)
    return BackupSnapshotResponse(
        backup_snapshot_id=record.backup_snapshot_id,
        created_at=record.created_at,
        backup_scope=record.backup_scope,
        schema_version=record.schema_version,
        storage_name=Path(record.storage_path).name,
        status=record.status,
        notes=record.notes,
        checksum_sha256=record.checksum_sha256,
        byte_size=record.byte_size,
        integrity_check=record.integrity_check,
        is_delete_allowed=is_delete_allowed,
        delete_blocked_reason=delete_blocked_reason,
    )


def _resolve_snapshot_path(record: BackupSnapshotRecord) -> Path:
    backup_root = settings.backup_path.resolve()
    snapshot_path = Path(record.storage_path).resolve()
    if not snapshot_path.is_relative_to(backup_root):
        raise RuntimeError("Backup path is outside the configured private backup directory")
    return snapshot_path


def verify_backup_snapshot(record: BackupSnapshotRecord) -> BackupVerificationResponse:
    snapshot_path = _resolve_snapshot_path(record)
    manifest_path = snapshot_path.with_suffix(".manifest.json")
    if not snapshot_path.is_file() or not manifest_path.is_file():
        raise RuntimeError("Backup snapshot or manifest is missing")

    manifest = json.loads(manifest_path.read_text())
    checksum_valid = sha256_file(snapshot_path) == record.checksum_sha256
    # Snapshots created before manifest v1 remain locally verifiable. New snapshots
    # always include the version and source instance fields required by the contract.
    manifest_valid = all(
        (
            manifest.get("manifest_version") in (None, MANIFEST_VERSION),
            manifest.get("checksum_sha256") == record.checksum_sha256,
            manifest.get("schema_version") == record.schema_version,
            manifest.get("source_instance_id") is None
            or bool(str(manifest.get("source_instance_id")).strip()),
            manifest.get("byte_size") == snapshot_path.stat().st_size,
        )
    )
    if not checksum_valid:
        raise RuntimeError("Backup checksum verification failed")
    if not manifest_valid:
        raise RuntimeError("Backup manifest verification failed")
    integrity_result = verify_sqlite_integrity(snapshot_path)
    return BackupVerificationResponse(
        backup_snapshot_id=record.backup_snapshot_id,
        status="verified",
        checksum_valid=True,
        integrity_check=integrity_result,
        manifest_valid=True,
    )


def create_verified_local_backup(
    *, reason: str, backup_scope: str = "full"
) -> BackupSnapshotRecord:
    backup_directory = settings.backup_path.resolve()
    backup_directory.mkdir(parents=True, exist_ok=True)
    created_at = utc_now()
    file_stamp = created_at.replace(":", "").replace("-", "").replace("T", "-").replace("Z", "")
    backup_key = uuid4().hex[:8].upper()
    backup_path = backup_directory / f"plum-duff-{file_stamp}-{backup_key}.sqlite3"
    manifest_path = backup_path.with_suffix(".manifest.json")

    destination = sqlite3.connect(backup_path)
    try:
        with connect() as source:
            # Database initialisation may seed rows on first open. The Online Backup API
            # must start outside that write transaction or SQLite will wait indefinitely.
            source.commit()
            source.backup(destination)
        destination.commit()
    finally:
        destination.close()

    integrity_result = verify_sqlite_integrity(backup_path)
    checksum = sha256_file(backup_path)
    byte_size = backup_path.stat().st_size
    manifest = {
        "backup_scope": backup_scope,
        "byte_size": byte_size,
        "checksum_sha256": checksum,
        "created_at": created_at,
        "integrity_check": integrity_result,
        "manifest_version": MANIFEST_VERSION,
        "reason": reason,
        "schema_version": SCHEMA_VERSION,
        "source_instance_id": settings.source_instance_id,
        "storage_path": str(backup_path),
    }
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")

    if sha256_file(backup_path) != checksum:
        raise RuntimeError("Backup checksum verification failed after manifest creation")

    return create_backup_snapshot_record(
        {
            "created_at": created_at,
            "backup_scope": backup_scope,
            "schema_version": SCHEMA_VERSION,
            "storage_path": str(backup_path),
            "status": "verified",
            "notes": reason,
            "checksum_sha256": checksum,
            "byte_size": byte_size,
            "integrity_check": integrity_result,
        }
    )


@router.get("", response_model=list[BackupSnapshotResponse])
def list_backups() -> list[BackupSnapshotResponse]:
    return [serialize_backup_snapshot(record) for record in list_backup_snapshot_records()]


@router.post("", response_model=BackupSnapshotResponse, status_code=201)
def create_backup(payload: CreateBackupPayload) -> BackupSnapshotResponse:
    try:
        record = create_verified_local_backup(reason=payload.reason)
    except (OSError, RuntimeError, sqlite3.Error) as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    return serialize_backup_snapshot(record)


@router.post("/{backup_snapshot_id}/verify", response_model=BackupVerificationResponse)
def verify_backup(backup_snapshot_id: str) -> BackupVerificationResponse:
    record = _backup_record(backup_snapshot_id)
    try:
        result = verify_backup_snapshot(record)
        update_backup_snapshot_status(backup_snapshot_id, status="verified")
        return result
    except (OSError, RuntimeError, sqlite3.Error, json.JSONDecodeError) as error:
        update_backup_snapshot_status(backup_snapshot_id, status="verification_failed")
        raise HTTPException(status_code=409, detail=str(error)) from error


@router.get("/{backup_snapshot_id}/export")
def export_backup(backup_snapshot_id: str) -> Response:
    record = _backup_record(backup_snapshot_id)
    try:
        package = _build_portable_package(record)
    except (OSError, RuntimeError, sqlite3.Error, json.JSONDecodeError) as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    filename = f"plum-duff-{record.created_at[:10]}-{record.backup_snapshot_id}.plumduff-backup"
    return Response(
        content=package,
        media_type="application/vnd.plumduff.backup+zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/{backup_snapshot_id}", status_code=204)
def delete_backup(backup_snapshot_id: str) -> Response:
    record = _backup_record(backup_snapshot_id)
    is_delete_allowed, blocked_reason = backup_delete_policy(record)
    if not is_delete_allowed:
        raise HTTPException(status_code=409, detail=blocked_reason)
    try:
        snapshot_path = _resolve_snapshot_path(record)
    except RuntimeError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error

    deleted = delete_backup_snapshot_record(backup_snapshot_id)
    if deleted is None:
        raise HTTPException(status_code=404, detail="Backup snapshot not found")
    snapshot_path.unlink(missing_ok=True)
    snapshot_path.with_suffix(".manifest.json").unlink(missing_ok=True)
    return Response(status_code=204)


@router.post("/import/preview", response_model=BackupImportPreviewResponse)
async def preview_backup_import(request: Request) -> BackupImportPreviewResponse:
    package = await request.body()
    if not package:
        raise HTTPException(status_code=400, detail="Select a Plum Duff backup package")
    if len(package) > MAX_PACKAGE_BYTES:
        raise HTTPException(status_code=413, detail="Backup package exceeds the 250 MB limit")

    source_filename = Path(
        request.headers.get("x-plum-duff-filename", "backup.plumduff-backup")
    ).name
    if not source_filename.endswith(".plumduff-backup"):
        raise HTTPException(status_code=400, detail="Select a .plumduff-backup package")
    import_token = uuid4().hex
    stage_path = _staging_path(import_token)
    stage_path.mkdir(parents=True, exist_ok=False)
    candidate_path = stage_path / "plum-duff.sqlite3"
    preview_path = stage_path / "preview.json"
    try:
        with ZipFile(io.BytesIO(package)) as archive:
            members = archive.infolist()
            if len(members) != 2 or {member.filename for member in members} != {
                "manifest.json",
                "plum-duff.sqlite3",
            }:
                raise RuntimeError("Backup package must contain only its database and manifest")
            if sum(member.file_size for member in members) > MAX_UNCOMPRESSED_BYTES:
                raise RuntimeError("Backup package expands beyond the safety limit")
            manifest_value = json.loads(archive.read("manifest.json"))
            if not isinstance(manifest_value, dict):
                raise RuntimeError("Backup package manifest is invalid")
            manifest: dict[str, Any] = manifest_value
            candidate_path.write_bytes(archive.read("plum-duff.sqlite3"))
        preview = _validate_candidate(candidate_path, manifest)
        preview = preview.model_copy(
            update={"import_token": import_token, "source_filename": source_filename}
        )
        preview_path.write_text(
            json.dumps(
                {"manifest": manifest, "preview": preview.model_dump()},
                indent=2,
                sort_keys=True,
            )
            + "\n"
        )
        return preview
    except (BadZipFile, OSError, RuntimeError, sqlite3.Error, json.JSONDecodeError) as error:
        shutil.rmtree(stage_path, ignore_errors=True)
        raise HTTPException(status_code=409, detail=str(error)) from error


@router.delete("/import/{import_token}", status_code=204)
def cancel_backup_import(import_token: str) -> Response:
    stage_path = _staging_path(import_token)
    if not stage_path.is_dir():
        raise HTTPException(status_code=404, detail="Staged database import not found")
    shutil.rmtree(stage_path)
    return Response(status_code=204)


@router.post("/import/{import_token}/restore", response_model=RestoreBackupResponse)
def restore_backup(import_token: str, payload: RestoreBackupPayload) -> RestoreBackupResponse:
    if payload.confirmation != RESTORE_CONFIRMATION:
        raise HTTPException(
            status_code=400, detail="Full database restore confirmation is required"
        )
    stage_path = _staging_path(import_token)
    candidate_path = stage_path / "plum-duff.sqlite3"
    preview_path = stage_path / "preview.json"
    if not candidate_path.is_file() or not preview_path.is_file():
        raise HTTPException(status_code=404, detail="Staged database import not found")

    try:
        staged = json.loads(preview_path.read_text())
        manifest = staged["manifest"]
        preview = _validate_candidate(candidate_path, manifest)
    except (KeyError, OSError, RuntimeError, sqlite3.Error, json.JSONDecodeError) as error:
        raise HTTPException(status_code=409, detail=str(error)) from error

    live_database_path = settings.database_path.resolve()
    backup_root = settings.backup_path.resolve()
    backup_root.mkdir(parents=True, exist_ok=True)
    imported_archive_path = backup_root / f"plum-duff-imported-{import_token[:8].upper()}.sqlite3"
    imported_manifest_path = imported_archive_path.with_suffix(".manifest.json")
    rollback_path = live_database_path.with_suffix(".restore-rollback.sqlite3")
    restored_at = utc_now()
    restore_event_id = f"RESTORE-{uuid4().hex[:8].upper()}"

    with database_operation_lock:
        try:
            pre_restore = create_verified_local_backup(
                reason=f"Automatic pre-restore backup: {payload.reason}",
                backup_scope="pre-restore",
            )
            shutil.copy2(candidate_path, imported_archive_path)
            imported_local_manifest = {
                "backup_scope": "imported-full-database",
                "byte_size": int(manifest["byte_size"]),
                "checksum_sha256": str(manifest["checksum_sha256"]),
                "created_at": str(manifest["created_at"]),
                "integrity_check": preview.integrity_check,
                "manifest_version": MANIFEST_VERSION,
                "reason": payload.reason,
                "schema_version": str(manifest["schema_version"]),
                "source_instance_id": str(manifest["source_instance_id"]),
                "storage_path": str(imported_archive_path),
            }
            imported_manifest_path.write_text(
                json.dumps(imported_local_manifest, indent=2, sort_keys=True) + "\n"
            )
            shutil.copy2(live_database_path, rollback_path)
            os.replace(candidate_path, live_database_path)

            imported_record = create_backup_snapshot_record(
                {
                    "created_at": str(manifest["created_at"]),
                    "backup_scope": "imported-full-database",
                    "schema_version": str(manifest["schema_version"]),
                    "storage_path": str(imported_archive_path),
                    "status": "verified",
                    "notes": f"Imported database package: {payload.reason}",
                    "checksum_sha256": str(manifest["checksum_sha256"]),
                    "byte_size": int(manifest["byte_size"]),
                    "integrity_check": preview.integrity_check,
                }
            )
            create_backup_snapshot_record(
                {
                    "backup_snapshot_id": pre_restore.backup_snapshot_id,
                    "created_at": pre_restore.created_at,
                    "backup_scope": pre_restore.backup_scope,
                    "schema_version": pre_restore.schema_version,
                    "storage_path": pre_restore.storage_path,
                    "status": pre_restore.status,
                    "notes": pre_restore.notes,
                    "checksum_sha256": pre_restore.checksum_sha256,
                    "byte_size": pre_restore.byte_size,
                    "integrity_check": pre_restore.integrity_check,
                }
            )
            with connect() as connection:
                connection.execute(
                    """
                    INSERT INTO database_restore_events (
                      restore_event_id, restored_at, restored_by, source_filename,
                      source_instance_id, source_created_at, pre_restore_backup_snapshot_id,
                      imported_backup_snapshot_id, schema_version, validation_summary_json, reason
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        restore_event_id,
                        restored_at,
                        "local-fund-manager",
                        str(staged["preview"]["source_filename"]),
                        str(manifest["source_instance_id"]),
                        str(manifest["created_at"]),
                        pre_restore.backup_snapshot_id,
                        imported_record.backup_snapshot_id,
                        str(manifest["schema_version"]),
                        json.dumps(preview.model_dump(), sort_keys=True),
                        payload.reason,
                    ),
                )
        except (KeyError, OSError, RuntimeError, sqlite3.Error, ValueError) as error:
            if rollback_path.is_file():
                os.replace(rollback_path, live_database_path)
            imported_archive_path.unlink(missing_ok=True)
            imported_manifest_path.unlink(missing_ok=True)
            raise HTTPException(
                status_code=500, detail=f"Database restore failed: {error}"
            ) from error
        finally:
            rollback_path.unlink(missing_ok=True)

    shutil.rmtree(stage_path, ignore_errors=True)
    return RestoreBackupResponse(
        restore_event_id=restore_event_id,
        restored_at=restored_at,
        pre_restore_backup_snapshot_id=pre_restore.backup_snapshot_id,
        imported_backup_snapshot_id=imported_record.backup_snapshot_id,
        status="restored",
        reload_required=True,
    )
