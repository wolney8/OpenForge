import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  ProfileSeed,
  ProfileSummary,
  TrackerModuleKey,
  TrackerRow,
  TrackerSeedFile,
} from "./tracker-types";

const fallbackProfiles: ProfileSeed[] = [
  {
    profileId: "profile-demo-001",
    displayName: "Subscriber Alpha",
    profileCode: "ALPHA-001",
    status: "active",
    trackingStartDate: "2026-05-01",
    managementFeePercent: "40.00",
    investmentFeePercent: "0.00",
    currentCashSnapshot: "Pending local seed load",
    trackerData: {
      accounts: [],
      "sportsbook-bets": [],
      "free-bets": [],
      "casino-offers": [],
      "cash-adjustments": [],
    },
  },
  {
    profileId: "profile-demo-002",
    displayName: "Subscriber Bravo",
    profileCode: "BRAVO-002",
    status: "paused",
    trackingStartDate: "2026-05-15",
    managementFeePercent: "35.00",
    investmentFeePercent: "5.00",
    currentCashSnapshot: "Pending local seed load",
    trackerData: {
      accounts: [],
      "sportsbook-bets": [],
      "free-bets": [],
      "casino-offers": [],
      "cash-adjustments": [],
    },
  },
];

function resolveDatabasePath() {
  return path.resolve(process.cwd(), "../../data/private/db/openforge.sqlite3");
}

function loadTrackerSeed(): TrackerSeedFile | null {
  const candidatePaths = [
    path.resolve(process.cwd(), "data/private/local-seed/openforge-tracker-seed.json"),
    path.resolve(process.cwd(), "../../data/private/local-seed/openforge-tracker-seed.json"),
  ];

  for (const filePath of candidatePaths) {
    try {
      const raw = readFileSync(filePath, "utf8");
      return JSON.parse(raw) as TrackerSeedFile;
    } catch {
      continue;
    }
  }

  return null;
}

let database: DatabaseSync | null = null;

function getDatabase() {
  if (database) {
    return database;
  }

  const databasePath = resolveDatabasePath();
  mkdirSync(path.dirname(databasePath), { recursive: true });

  database = new DatabaseSync(databasePath);
  database.exec(`
    PRAGMA journal_mode = WAL;
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
    CREATE TABLE IF NOT EXISTS tracker_rows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id TEXT NOT NULL,
      module_key TEXT NOT NULL,
      row_order INTEGER NOT NULL,
      row_json TEXT NOT NULL,
      FOREIGN KEY (profile_id) REFERENCES profiles(profile_id) ON DELETE CASCADE
    );
  `);

  seedDatabase(database);
  return database;
}

function seedDatabase(db: DatabaseSync) {
  const profileCountRow = db
    .prepare("SELECT COUNT(*) AS count FROM profiles")
    .get() as { count: number };

  if (profileCountRow.count > 0) {
    return;
  }

  const sourceProfiles = loadTrackerSeed()?.profiles ?? fallbackProfiles;
  const insertProfile = db.prepare(`
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
  `);
  const insertRow = db.prepare(`
    INSERT INTO tracker_rows (
      profile_id,
      module_key,
      row_order,
      row_json
    ) VALUES (?, ?, ?, ?)
  `);

  db.exec("BEGIN");
  try {
    for (const profile of sourceProfiles) {
      insertProfile.run(
        profile.profileId,
        profile.displayName,
        profile.profileCode,
        profile.status,
        profile.trackingStartDate,
        profile.managementFeePercent,
        profile.investmentFeePercent,
        profile.currentCashSnapshot
      );

      for (const [moduleKey, rows] of Object.entries(profile.trackerData) as [
        TrackerModuleKey,
        TrackerRow[],
      ][]) {
        rows.forEach((row, index) => {
          insertRow.run(profile.profileId, moduleKey, index, JSON.stringify(row));
        });
      }
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function listProfiles(): ProfileSummary[] {
  const db = getDatabase();
  return db
    .prepare(`
      SELECT
        profile_id AS profileId,
        display_name AS displayName,
        profile_code AS profileCode,
        status,
        tracking_start_date AS trackingStartDate,
        management_fee_percent AS managementFeePercent,
        investment_fee_percent AS investmentFeePercent,
        current_cash_snapshot AS currentCashSnapshot
      FROM profiles
      ORDER BY display_name ASC
    `)
    .all() as ProfileSummary[];
}

export function findProfile(profileId: string): ProfileSummary | undefined {
  const db = getDatabase();
  return db
    .prepare(`
      SELECT
        profile_id AS profileId,
        display_name AS displayName,
        profile_code AS profileCode,
        status,
        tracking_start_date AS trackingStartDate,
        management_fee_percent AS managementFeePercent,
        investment_fee_percent AS investmentFeePercent,
        current_cash_snapshot AS currentCashSnapshot
      FROM profiles
      WHERE profile_id = ?
    `)
    .get(profileId) as ProfileSummary | undefined;
}

export function listModuleRows(
  profileId: string,
  moduleKey: TrackerModuleKey
): TrackerRow[] {
  const db = getDatabase();
  const rows = db
    .prepare(`
      SELECT row_json AS rowJson
      FROM tracker_rows
      WHERE profile_id = ? AND module_key = ?
      ORDER BY row_order ASC
    `)
    .all(profileId, moduleKey) as { rowJson: string }[];

  return rows.map((row) => JSON.parse(row.rowJson) as TrackerRow);
}
