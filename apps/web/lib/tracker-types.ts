export type ProfileSummary = {
  profileId: string;
  displayName: string;
  profileCode: string;
  status: "Active" | "Pending" | "Inactive" | "Paused" | "Archived" | "active" | "paused";
  trackingStartDate: string;
  managementFeePercent: string;
  investmentFeePercent: string;
  currentCashSnapshot: string;
};

export type TrackerRow = Record<string, string>;

export type TrackerModuleKey =
  | "accounts"
  | "sportsbook-bets"
  | "free-bets"
  | "casino-offers"
  | "cash-adjustments";

export type ProfileSeed = ProfileSummary & {
  trackerData: Record<TrackerModuleKey, TrackerRow[]>;
};

export type TrackerSeedFile = {
  generatedAt: string;
  sourceWorkbook: string;
  profiles: ProfileSeed[];
};
