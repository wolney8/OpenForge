from __future__ import annotations

import hashlib
import hmac
import json
import re
import time
from contextlib import contextmanager
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any, Iterator, Literal, NoReturn
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator

from openforge_api.auth import AuthSession, _require_session_secret, require_request_session
from openforge_api.config import settings
from openforge_api.db import (
    connect,
    create_profile_with_onboarding,
    link_fund_manager_profile,
    postgres_runtime_enabled,
    reuse_mutation_connection,
    utc_now,
)
from openforge_api.fee_period_store import list_fee_periods

manager = APIRouter(prefix="/fund-manager/subscribers", tags=["invited subscribers"])
applicant = APIRouter(prefix="/subscriber", tags=["subscriber read-only"])


def denied(message: str = "Access unavailable", code: int = 403) -> NoReturn:
    raise HTTPException(code, message)


def authority(request: Request, owner: bool = False) -> AuthSession:
    session = require_request_session(request)
    if owner and session.role != "fund_manager":
        denied()
    if not owner and session.role not in {"prospective_subscriber", "managed_subscriber_read_only"}:
        denied()
    return session


@contextmanager
def transaction() -> Iterator[Any]:
    with connect() as connection, reuse_mutation_connection(connection):
        if postgres_runtime_enabled():
            # Serialise this small workflow across actors as well as processes. This
            # protects invitation acceptance, unique Profile linking and command retries.
            connection.execute("SELECT pg_advisory_xact_lock(560074)")
        elif not connection.in_transaction:
            connection.execute("BEGIN IMMEDIATE")
        yield connection


class Command(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    command_id: str = Field(min_length=8, max_length=80, pattern=r"^[A-Za-z0-9_-]+$")


class Invite(Command):
    email: str = Field(min_length=3, max_length=254)
    valid_days: int = Field(ge=1, le=30)

    @field_validator("email")
    @classmethod
    def email_address(cls, value: str) -> str:
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("Enter a valid email address")
        return value.casefold()


class Versioned(Command):
    version: int = Field(ge=1)


class Submission(Versioned):
    display_name: str = Field(min_length=1, max_length=120)
    phone: str = Field(default="", max_length=40)
    country_code: str = Field(pattern=r"^[A-Z]{2}$")
    region: str = Field(default="", max_length=100)
    applicant_message: str = Field(default="", max_length=4000)
    self_funding_amount: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    funding_requested: bool = False


class Review(Versioned):
    action: Literal["request_information", "decline", "approve"]
    public_message: str = Field(default="", max_length=4000)
    private_note: str = Field(default="", max_length=4000)


class ProfileLink(Versioned):
    action: Literal["create", "link"]
    profile_id: str | None = None
    display_name: str | None = Field(default=None, max_length=120)
    profile_code: str | None = Field(default=None, max_length=40)
    management_fee_percent: Decimal | None = Field(default=None, ge=0, le=100, decimal_places=2)
    investment_fee_percent: Decimal | None = Field(default=None, ge=0, le=100, decimal_places=2)
    tracking_start_date: date | None = None


class Access(Versioned):
    action: Literal["grant", "revoke"]


def canonical(payload: Command, action: str, entity: str) -> str:
    return hashlib.sha256(
        json.dumps([action, entity, payload.model_dump(mode="json")], sort_keys=True).encode()
    ).hexdigest()


def retry(
    connection: Any, session: AuthSession, payload: Command, action: str, entity: str
) -> dict[str, Any] | None:
    row = connection.execute(
        """SELECT payload_hash, result_json FROM subscriber_review_events WHERE actor = ?
        AND command_id = ?""",
        (session.subject, payload.command_id),
    ).fetchone()
    if row is None:
        return None
    if row["payload_hash"] != canonical(payload, action, entity):
        denied("This request ID was already used with different details", 409)
    return dict(json.loads(row["result_json"]))


def event(
    connection: Any,
    session: AuthSession,
    payload: Command,
    action: str,
    entity: str,
    result: dict[str, Any],
    public: str = "",
    private: str = "",
) -> dict[str, Any]:
    decision = f"{action}:{payload.action}" if hasattr(payload, "action") else action
    result = {
        **result,
        "audit": {
            "actor_role": session.role,
            "contract_version": "invited-subscriber-v1",
            "decision": decision,
        },
    }
    connection.execute(
        """INSERT INTO subscriber_review_events (event_id, entity_id, actor, command_id,
        payload_hash, action, public_message, private_note, result_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            uuid4().hex,
            entity,
            session.subject,
            payload.command_id,
            canonical(payload, action, entity),
            decision,
            public,
            private,
            json.dumps(result),
            datetime.now(UTC).isoformat(timespec="microseconds"),
        ),
    )
    return result


def invitation_token(invitation_id: str) -> str:
    # Recoverable by an authorised retry, never stored. Separate HMAC purpose from
    # session signing. Secret rotation invalidates unaccepted links, not identities.
    return hmac.new(
        _require_session_secret().encode(),
        f"plum-duff-invitation-v1:{invitation_id}".encode(),
        hashlib.sha256,
    ).hexdigest()


def invitation_for_token(token: str) -> dict[str, Any]:
    with connect() as connection:
        row = connection.execute(
            "SELECT * FROM subscriber_invitations WHERE token_hash = ?",
            (hashlib.sha256(token.encode()).hexdigest(),),
        ).fetchone()
        if (
            row is None
            or row["revoked_at"]
            or row["expires_at"] <= int(time.time())
            or row["accepted_at"]
        ):
            denied("Invitation unavailable or expired", 410)
        return dict(row)


def subscriber_role(email: str, subject: str) -> str | None:
    with connect() as connection:
        row = connection.execute(
            """SELECT role FROM fund_manager_users WHERE email = ? AND google_subject = ?
            AND role IN ('prospective_subscriber', 'managed_subscriber_read_only')""",
            (email, subject),
        ).fetchone()
        return str(row["role"]) if row else None


def subscriber_identity(email: str, subject: str) -> bool:
    return subscriber_role(email, subject) is not None


def accept_invitation(
    invitation_id: str, token_hash: str, email: str, subject: str, name: str
) -> None:
    with transaction() as connection:
        row = connection.execute(
            "SELECT * FROM subscriber_invitations WHERE invitation_id = ?", (invitation_id,)
        ).fetchone()
        if (
            row is None
            or row["email"] != email
            or row["token_hash"] != token_hash
            or row["revoked_at"]
            or row["expires_at"] <= int(time.time())
        ):
            denied("Invitation unavailable", 403)
        if row["accepted_at"]:
            if row["accepted_subject"] == subject and subscriber_identity(email, subject):
                return
            denied()
        existing = connection.execute(
            "SELECT * FROM fund_manager_users WHERE email = ? OR google_subject = ?",
            (email, subject),
        ).fetchone()
        if existing and (
            existing["email"] != email
            or existing["google_subject"] != subject
            or existing["role"] == "fund_manager"
        ):
            denied()
        if connection.execute(
            "SELECT 1 FROM subscriber_applications WHERE email = ?", (email,)
        ).fetchone():
            denied("An application already exists", 409)
        now = utc_now()
        connection.execute(
            """INSERT INTO fund_manager_users (email, google_subject, display_name, role,
            oauth_provider, created_at, updated_at, last_login_at) VALUES (?, ?, ?,
            'prospective_subscriber', 'google', ?, ?, ?) ON CONFLICT(email) DO NOTHING""",
            (email, subject, name, now, now, now),
        )
        connection.execute(
            """UPDATE subscriber_invitations SET accepted_at = ?, accepted_subject = ?
            WHERE invitation_id = ?""",
            (now, subject, invitation_id),
        )
        application_id = uuid4().hex
        connection.execute(
            """INSERT INTO subscriber_applications (application_id, invitation_id, email,
            subject, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?,
            ?)""",
            (application_id, invitation_id, email, subject, name[:120], now, now),
        )
        session = AuthSession("", subject, email, name, "prospective_subscriber", 0, 0)
        event(
            connection,
            session,
            Command(command_id=f"accept_{invitation_id}"),
            "accept_invitation",
            application_id,
            {"application_id": application_id},
        )


def application(
    connection: Any, application_id: str, session: AuthSession, version: int | None = None
) -> dict[str, Any]:
    row = connection.execute(
        "SELECT * FROM subscriber_applications WHERE application_id = ?", (application_id,)
    ).fetchone()
    if row is None or (
        session.role != "fund_manager"
        and (row["subject"] != session.subject or row["email"] != session.email)
    ):
        denied("Application unavailable", 404)
    if version is not None and row["version"] != version:
        denied("The request changed. Reload it before acting.", 409)
    return dict(row)


def application_view(connection: Any, row: dict[str, Any], owner: bool) -> dict[str, Any]:
    # No raw event payload, actor identity or private note reaches the applicant.
    visible = {key: value for key, value in row.items() if key not in {"subject", "invitation_id"}}
    events = connection.execute(
        """SELECT action, public_message, private_note, created_at FROM
        subscriber_review_events WHERE entity_id = ? ORDER BY created_at, event_id""",
        (row["application_id"],),
    ).fetchall()
    visible["history"] = [
        {
            key: value
            for key, value in dict(item).items()
            if key != "result_json" and (owner or key != "private_note")
        }
        for item in events
    ]
    grant = connection.execute(
        "SELECT revoked_at FROM subscriber_access_grants WHERE application_id = ?",
        (row["application_id"],),
    ).fetchone()
    visible["access_status"] = (
        "not_granted" if grant is None else "revoked" if grant["revoked_at"] else "read_only"
    )
    return visible


def bump(connection: Any, application_id: str, **changes: Any) -> dict[str, Any]:
    before = connection.execute(
        "SELECT status, version, profile_id FROM subscriber_applications WHERE application_id = ?",
        (application_id,),
    ).fetchone()
    changes["updated_at"] = utc_now()
    connection.execute(
        "UPDATE subscriber_applications SET version = version + 1, "
        + ", ".join(f"{key} = ?" for key in changes)
        + " WHERE application_id = ?",
        (*changes.values(), application_id),
    )
    return {
        "application_id": application_id,
        "transition": {
            "from_status": before["status"],
            "to_status": changes.get("status", before["status"]),
            "from_version": before["version"],
            "to_version": before["version"] + 1,
            "from_profile_id": before["profile_id"],
            "to_profile_id": changes.get("profile_id", before["profile_id"]),
        },
    }


@manager.post("/invitations")
def invite(payload: Invite, request: Request) -> dict[str, Any]:
    session = authority(request, True)
    with transaction() as connection:
        result = retry(connection, session, payload, "invite", "")
        if result is None:
            if payload.email in settings.owner_emails:
                denied("The Fund Manager cannot apply as a subscriber", 422)
            if connection.execute(
                "SELECT 1 FROM subscriber_applications WHERE email = ?", (payload.email,)
            ).fetchone():
                denied("An application already exists for this identity", 409)
            if connection.execute(
                """SELECT 1 FROM subscriber_invitations WHERE email = ? AND revoked_at IS
                NULL AND accepted_at IS NULL AND expires_at > ?""",
                (payload.email, int(time.time())),
            ).fetchone():
                denied("An active invitation already exists. Revoke it before replacing it.", 409)
            invitation_id = uuid4().hex
            token = invitation_token(invitation_id)
            expires = int(time.time()) + payload.valid_days * 86400
            connection.execute(
                """INSERT INTO subscriber_invitations (invitation_id, email, token_hash,
                creator, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    invitation_id,
                    payload.email,
                    hashlib.sha256(token.encode()).hexdigest(),
                    session.email,
                    utc_now(),
                    expires,
                ),
            )
            result = event(
                connection,
                session,
                payload,
                "invite",
                "",
                {"invitation_id": invitation_id, "expires_at": expires},
            )
        row = connection.execute(
            """SELECT revoked_at, accepted_at, expires_at FROM subscriber_invitations
            WHERE invitation_id = ?""",
            (result["invitation_id"],),
        ).fetchone()
        if row["revoked_at"] or row["accepted_at"] or row["expires_at"] <= int(time.time()):
            return {**result, "invite_path": None}
        return {
            **result,
            "invite_path": f"/invite#token={invitation_token(result['invitation_id'])}",
        }


@manager.get("/invitations")
def invitations(request: Request) -> list[dict[str, Any]]:
    authority(request, True)
    with connect() as connection:
        return [
            dict(row)
            for row in connection.execute(
                """SELECT invitation_id, email, created_at, expires_at, accepted_at,
                revoked_at FROM subscriber_invitations ORDER BY created_at DESC"""
            ).fetchall()
        ]


@manager.post("/invitations/{invitation_id}/revoke")
def revoke_invitation(invitation_id: str, payload: Command, request: Request) -> dict[str, Any]:
    session = authority(request, True)
    with transaction() as connection:
        previous = retry(connection, session, payload, "revoke_invitation", invitation_id)
        if previous is not None:
            return previous
        if not connection.execute(
            "SELECT 1 FROM subscriber_invitations WHERE invitation_id = ?", (invitation_id,)
        ).fetchone():
            denied("Invitation unavailable", 404)
        connection.execute(
            """UPDATE subscriber_invitations SET revoked_at = COALESCE(revoked_at, ?)
            WHERE invitation_id = ?""",
            (utc_now(), invitation_id),
        )
        return event(
            connection,
            session,
            payload,
            "revoke_invitation",
            invitation_id,
            {"invitation_id": invitation_id},
        )


@manager.get("/applications")
def requests(request: Request) -> list[dict[str, Any]]:
    authority(request, True)
    with connect() as connection:
        return [
            application_view(connection, dict(row), True)
            for row in connection.execute(
                "SELECT * FROM subscriber_applications ORDER BY created_at DESC"
            ).fetchall()
        ]


@applicant.get("/applications")
def own_requests(request: Request) -> list[dict[str, Any]]:
    session = authority(request)
    with connect() as connection:
        return [
            application_view(connection, dict(row), False)
            for row in connection.execute(
                "SELECT * FROM subscriber_applications WHERE email = ? AND subject = ?",
                (session.email, session.subject),
            ).fetchall()
        ]


@applicant.post("/applications/{application_id}/submit")
def submit(application_id: str, payload: Submission, request: Request) -> dict[str, Any]:
    session = authority(request)
    with transaction() as connection:
        application(connection, application_id, session)
        previous = retry(connection, session, payload, "submit", application_id)
        if previous is not None:
            return previous
        row = application(connection, application_id, session, payload.version)
        if row["status"] not in {"draft", "needs_more_information"}:
            denied("This application cannot be submitted in its current state", 409)
        values = payload.model_dump(exclude={"command_id", "version"})
        values["self_funding_amount"] = (
            None if payload.self_funding_amount is None else f"{payload.self_funding_amount:.2f}"
        )
        values["funding_requested"] = int(payload.funding_requested)
        result = bump(
            connection, application_id, **values, status="submitted", submitted_at=utc_now()
        )
        return event(
            connection,
            session,
            payload,
            "submit",
            application_id,
            result,
            payload.applicant_message,
        )


@applicant.post("/applications/{application_id}/withdraw")
def withdraw(application_id: str, payload: Versioned, request: Request) -> dict[str, Any]:
    session = authority(request)
    with transaction() as connection:
        application(connection, application_id, session)
        previous = retry(connection, session, payload, "withdraw", application_id)
        if previous is not None:
            return previous
        row = application(connection, application_id, session, payload.version)
        if row["status"] not in {"draft", "submitted", "needs_more_information"}:
            denied("This application cannot be withdrawn", 409)
        return event(
            connection,
            session,
            payload,
            "withdraw",
            application_id,
            bump(connection, application_id, status="withdrawn"),
        )


@manager.post("/applications/{application_id}/review")
def review(application_id: str, payload: Review, request: Request) -> dict[str, Any]:
    session = authority(request, True)
    with transaction() as connection:
        previous = retry(connection, session, payload, "review", application_id)
        if previous is not None:
            return previous
        row = application(connection, application_id, session, payload.version)
        if row["status"] != "submitted":
            denied("Only a pending request can be reviewed", 409)
        if payload.action != "approve" and not payload.public_message:
            denied("An applicant-visible explanation is required", 422)
        status = {
            "request_information": "needs_more_information",
            "decline": "declined",
            "approve": "approved",
        }[payload.action]
        return event(
            connection,
            session,
            payload,
            "review",
            application_id,
            bump(connection, application_id, status=status),
            payload.public_message,
            payload.private_note,
        )


@manager.get("/linkable-profiles")
def linkable_profiles(request: Request) -> list[dict[str, Any]]:
    authority(request, True)
    with connect() as connection:
        return [
            dict(row)
            for row in connection.execute(
                """SELECT profile_id, display_name, profile_code FROM profiles WHERE
                profile_relationship = 'Managed subscriber' AND status != 'Archived'
                AND profile_id NOT IN (SELECT profile_id FROM subscriber_applications
                WHERE profile_id IS NOT NULL) ORDER BY display_name"""
            ).fetchall()
        ]


@manager.post("/applications/{application_id}/profile")
def link_profile(application_id: str, payload: ProfileLink, request: Request) -> dict[str, Any]:
    session = authority(request, True)
    with transaction() as connection:
        previous = retry(connection, session, payload, "profile", application_id)
        if previous is not None:
            return previous
        row = application(connection, application_id, session, payload.version)
        if row["status"] != "approved" or row["profile_id"]:
            denied("Approve the request before explicitly linking one Profile", 409)
        profile_id = payload.profile_id
        if payload.action == "create":
            if (
                not payload.display_name
                or not payload.profile_code
                or payload.management_fee_percent is None
                or payload.investment_fee_percent is None
                or payload.tracking_start_date is None
            ):
                denied("Name, code, tracking start and both explicit fee rates are required", 422)
            from openforge_api.profiles import ProfileOnboardingCreatePayload

            try:
                validated = ProfileOnboardingCreatePayload(
                    profile_relationship="Managed subscriber",
                    display_name=payload.display_name,
                    profile_code=payload.profile_code,
                    tracking_start_date=payload.tracking_start_date,
                    enabled_modules=["sportsbook-bets", "free-bets", "cash-adjustments"],
                    management_fee_percent=payload.management_fee_percent,
                    investment_fee_percent=payload.investment_fee_percent,
                )
                details = validated.model_dump(mode="json")
                details.update(
                    status="Pending",
                    current_cash_snapshot="",
                    enabled_modules=["sportsbook-bets", "free-bets", "cash-adjustments"],
                    accounts=[],
                )
                profile, _ = create_profile_with_onboarding(details)
            except ValueError as exc:
                denied(str(exc), 422)
            profile_id = profile.profile_id
            link_fund_manager_profile(email=session.email, profile_id=profile_id)
        else:
            existing = connection.execute(
                "SELECT profile_relationship, status FROM profiles WHERE profile_id = ?",
                (profile_id,),
            ).fetchone()
            if (
                existing is None
                or existing["profile_relationship"] != "Managed subscriber"
                or existing["status"] == "Archived"
            ):
                denied("Select an available Managed subscriber Profile", 422)
            if connection.execute(
                "SELECT 1 FROM subscriber_applications WHERE profile_id = ?", (profile_id,)
            ).fetchone():
                denied("This Profile already has a linked applicant", 409)
        result = bump(connection, application_id, profile_id=profile_id)
        result["profile_id"] = profile_id
        if payload.action == "create":
            result["agreed_terms"] = {
                "management_fee_percent": str(payload.management_fee_percent),
                "investment_fee_percent": str(payload.investment_fee_percent),
            }
        return event(connection, session, payload, "profile", application_id, result)


@manager.post("/applications/{application_id}/access")
def access(application_id: str, payload: Access, request: Request) -> dict[str, Any]:
    session = authority(request, True)
    with transaction() as connection:
        previous = retry(connection, session, payload, "access", application_id)
        if previous is not None:
            return previous
        row = application(connection, application_id, session, payload.version)
        if row["status"] != "approved" or not row["profile_id"]:
            denied("An approved request and explicit Profile link are required", 409)
        profile = connection.execute(
            "SELECT status, profile_relationship FROM profiles WHERE profile_id = ?",
            (row["profile_id"],),
        ).fetchone()
        if payload.action == "grant" and (
            profile["status"] == "Archived"
            or profile["profile_relationship"] != "Managed subscriber"
        ):
            denied("This Profile is unavailable for subscriber access", 409)
        prior_grant = connection.execute(
            "SELECT revoked_at FROM subscriber_access_grants WHERE application_id = ?",
            (application_id,),
        ).fetchone()
        prior_access = (
            "not_granted"
            if prior_grant is None
            else "revoked"
            if prior_grant["revoked_at"]
            else "read_only"
        )
        if payload.action == "grant":
            connection.execute(
                """INSERT INTO subscriber_access_grants (application_id, email, subject,
                profile_id, granted_by, granted_at) VALUES (?, ?, ?, ?, ?, ?) ON
                CONFLICT(application_id) DO UPDATE SET granted_by =
                excluded.granted_by, granted_at = excluded.granted_at, revoked_at =
                NULL""",
                (
                    application_id,
                    row["email"],
                    row["subject"],
                    row["profile_id"],
                    session.email,
                    utc_now(),
                ),
            )
        else:
            connection.execute(
                """UPDATE subscriber_access_grants SET revoked_at = COALESCE(revoked_at,
                ?) WHERE application_id = ?""",
                (utc_now(), application_id),
            )
        connection.execute(
            "UPDATE fund_manager_users SET role = ?, updated_at = ? WHERE email = ?",
            (
                "managed_subscriber_read_only"
                if payload.action == "grant"
                else "prospective_subscriber",
                utc_now(),
                row["email"],
            ),
        )
        result = bump(connection, application_id)
        result["transition"].update(
            from_access=prior_access,
            to_access="read_only" if payload.action == "grant" else "revoked",
        )
        return event(connection, session, payload, "access", application_id, result)


def granted_profiles(connection: Any, session: AuthSession) -> list[dict[str, Any]]:
    return [
        dict(row)
        for row in connection.execute(
            """SELECT p.profile_id, p.display_name, p.profile_code, p.status,
            p.tracking_start_date, p.management_fee_percent, p.investment_fee_percent
            FROM subscriber_access_grants g JOIN profiles p ON p.profile_id =
            g.profile_id JOIN subscriber_applications a ON a.application_id =
            g.application_id WHERE g.email = ? AND g.subject = ? AND g.revoked_at IS
            NULL AND a.status = 'approved' AND a.profile_id = g.profile_id AND
            p.profile_relationship = 'Managed subscriber' AND p.status != 'Archived'""",
            (session.email, session.subject),
        ).fetchall()
    ]


@applicant.get("/profiles")
def own_profiles(request: Request) -> list[dict[str, Any]]:
    session = authority(request)
    with connect() as connection:
        return granted_profiles(connection, session)


@applicant.get("/profiles/{profile_id}")
def own_profile(profile_id: str, request: Request) -> dict[str, Any]:
    session = authority(request)
    with connect() as connection, reuse_mutation_connection(connection):
        profile = next(
            (
                item
                for item in granted_profiles(connection, session)
                if item["profile_id"] == profile_id
            ),
            None,
        )
        if profile is None:
            denied("Profile unavailable", 404)
        statements = []
        for period in list_fee_periods(profile_id):
            if period.state != "crystallised":
                continue
            revision = period.current_revision
            statements.append(
                {
                    "period_start": period.period_start,
                    "period_end": period.period_end,
                    "confirmed_at": period.crystallised_at,
                    **{
                        key: getattr(revision, key)
                        for key in (
                            "eligible_period_profit",
                            "management_fee_amount",
                            "investment_fee_amount",
                            "total_fee_due",
                        )
                    },
                }
            )
        return {"profile": profile, "statements": statements}


@manager.post("/applications/{application_id}/archive")
def archive(application_id: str, payload: Versioned, request: Request) -> dict[str, Any]:
    session = authority(request, True)
    with transaction() as connection:
        previous = retry(connection, session, payload, "archive", application_id)
        if previous is not None:
            return previous
        row = application(connection, application_id, session, payload.version)
        if row["status"] not in {"declined", "withdrawn"}:
            denied("Only declined or withdrawn applications can be archived", 409)
        return event(
            connection,
            session,
            payload,
            "archive",
            application_id,
            bump(connection, application_id, status="archived"),
        )
