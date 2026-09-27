"""CP-056 additive workflow schema; existing identities, sessions and Profiles are reused."""

SCHEMA = """
CREATE TABLE IF NOT EXISTS fund_manager_users (
 email TEXT PRIMARY KEY, google_subject TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'fund_manager', oauth_provider TEXT NOT NULL DEFAULT 'google',
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, last_login_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS subscriber_invitations (
 invitation_id TEXT PRIMARY KEY, email TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE,
 creator TEXT NOT NULL, created_at TEXT NOT NULL, expires_at INTEGER NOT NULL,
 accepted_at TEXT, accepted_subject TEXT, revoked_at TEXT
);
CREATE TABLE IF NOT EXISTS subscriber_applications (
 application_id TEXT PRIMARY KEY,
 invitation_id TEXT NOT NULL UNIQUE REFERENCES subscriber_invitations(invitation_id),
 email TEXT NOT NULL UNIQUE REFERENCES fund_manager_users(email), subject TEXT NOT NULL UNIQUE,
 display_name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', country_code TEXT NOT NULL DEFAULT '',
 region TEXT NOT NULL DEFAULT '', applicant_message TEXT NOT NULL DEFAULT '',
 self_funding_amount TEXT, funding_requested INTEGER NOT NULL DEFAULT 0,
 status TEXT NOT NULL DEFAULT 'draft', version INTEGER NOT NULL DEFAULT 1,
 profile_id TEXT UNIQUE REFERENCES profiles(profile_id),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, submitted_at TEXT
);
CREATE TABLE IF NOT EXISTS subscriber_access_grants (
 application_id TEXT PRIMARY KEY REFERENCES subscriber_applications(application_id),
 email TEXT NOT NULL REFERENCES fund_manager_users(email), subject TEXT NOT NULL,
 profile_id TEXT NOT NULL UNIQUE REFERENCES profiles(profile_id),
 granted_by TEXT NOT NULL, granted_at TEXT NOT NULL, revoked_at TEXT
);
CREATE TABLE IF NOT EXISTS subscriber_review_events (
 event_id TEXT PRIMARY KEY, entity_id TEXT NOT NULL, actor TEXT NOT NULL,
 command_id TEXT NOT NULL, payload_hash TEXT NOT NULL, action TEXT NOT NULL,
 public_message TEXT NOT NULL DEFAULT '', private_note TEXT NOT NULL DEFAULT '',
 result_json TEXT NOT NULL, created_at TEXT NOT NULL,
 UNIQUE(actor, command_id)
);
CREATE TABLE IF NOT EXISTS subscriber_schema_migrations (
 migration_id TEXT PRIMARY KEY, applied_at TEXT NOT NULL
);
INSERT INTO subscriber_schema_migrations (migration_id, applied_at)
 VALUES ('20260927_008_invited_subscribers', CURRENT_TIMESTAMP)
 ON CONFLICT(migration_id) DO NOTHING;
"""
