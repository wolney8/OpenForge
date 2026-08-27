export type BookmakerDisplayMode = "Name" | "Brand badge" | "Logo";
export type ProfileBookmakerDisplayMode = BookmakerDisplayMode | "Inherit";
export type MasterAccountType = "Bookmaker" | "Exchange" | "Bank";
export type MasterAccountChannel = "web" | "mobile" | "retail";

export type MasterAccountCatalogueEvidence = {
  source_url: string;
  source_title: string;
  publisher: string;
  checked_at: string;
  supports: string[];
  notes: string;
};

export type MasterAccountCatalogueRecord = {
  catalogue_id: string;
  account_type: MasterAccountType;
  operating_jurisdictions: string[];
  operating_subdivisions: string[];
  operating_channels: MasterAccountChannel[];
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
  evidence: MasterAccountCatalogueEvidence[];
};

export type MasterAccountCatalogue = {
  schema_version: "1.0";
  catalogue_name: string;
  updated_at: string;
  default_operating_context: MasterAccountOperatingContext;
  records: MasterAccountCatalogueRecord[];
};

export type MasterAccountOperatingContext = {
  jurisdiction: string;
  subdivision: string;
  channels: MasterAccountChannel[];
};

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
  return entry.brand_name || entry.short_display_name;
}

export function getActiveMasterAccountNames(
  catalogue: MasterAccountCatalogueRecord[],
  accountType: MasterAccountType
): string[] {
  return catalogue
    .filter((entry) => entry.account_type === accountType && entry.status === "Active")
    .map((entry) => entry.brand_name);
}

export function getAvailableMasterAccountNames(
  catalogue: MasterAccountCatalogueRecord[],
  accountType: MasterAccountType,
  context: MasterAccountOperatingContext
): string[] {
  return catalogue
    .filter(
      (entry) =>
        entry.account_type === accountType &&
        isMasterAccountAvailable(
          entry,
          context.jurisdiction,
          context.channels,
          context.subdivision
        )
    )
    .map((entry) => entry.brand_name);
}

export function isMasterAccountAvailable(
  entry: MasterAccountCatalogueRecord,
  jurisdiction: string,
  permittedChannels: MasterAccountChannel[],
  subdivision = ""
): boolean {
  if (
    entry.status !== "Active" ||
    entry.operating_jurisdictions.length === 0 ||
    entry.operating_channels.length === 0 ||
    permittedChannels.length === 0
  ) {
    return false;
  }
  const normalizedJurisdiction = jurisdiction.trim().toUpperCase();
  const normalizedSubdivision = subdivision.trim().toUpperCase();
  return (
    entry.operating_jurisdictions.includes(normalizedJurisdiction) &&
    (entry.operating_subdivisions.length === 0 ||
      entry.operating_subdivisions.includes(normalizedSubdivision)) &&
    entry.operating_channels.some((channel) => permittedChannels.includes(channel))
  );
}
