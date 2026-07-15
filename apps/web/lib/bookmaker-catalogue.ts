export type BookmakerDisplayMode = "Name" | "Brand badge" | "Logo";
export type ProfileBookmakerDisplayMode = BookmakerDisplayMode | "Inherit";

export type BookmakerCatalogueRecord = {
  bookmaker_id: string;
  brand_name: string;
  short_display_name: string;
  legal_operator: string;
  operator_group: string;
  platform: string;
  risk_team: string;
  licence_reference: string;
  licence_status: string;
  canonical_domain: string;
  status: "Active" | "Archived";
  foreground_colour: string;
  background_colour: string;
  logo_asset_path: string;
  source: string;
  confidence: "Verified" | "Likely" | "Unverified";
  last_verified_date: string;
  created_at: string;
  updated_at: string;
};

export type BookmakerDisplaySettings = {
  global_mode: BookmakerDisplayMode;
  profile_override: ProfileBookmakerDisplayMode;
  resolved_mode: BookmakerDisplayMode;
};

function normalizeBookmakerName(value: string): string {
  return value.trim().toLocaleLowerCase("en-GB");
}

export function findBookmakerCatalogueEntry(
  catalogue: BookmakerCatalogueRecord[],
  bookmakerName: string
): BookmakerCatalogueRecord | null {
  const target = normalizeBookmakerName(bookmakerName);
  if (!target) {
    return null;
  }
  return (
    catalogue.find(
      (entry) =>
        normalizeBookmakerName(entry.brand_name) === target ||
        normalizeBookmakerName(entry.short_display_name) === target
    ) ?? null
  );
}

export function getBookmakerDisplayLabel(entry: BookmakerCatalogueRecord): string {
  return entry.short_display_name || entry.brand_name;
}
