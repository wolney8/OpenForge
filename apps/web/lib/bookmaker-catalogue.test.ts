import { describe, expect, it } from "vitest";
import {
  findBookmakerCatalogueEntry,
  getActiveMasterAccountNames,
  getAvailableMasterAccountNames,
  getBookmakerDisplayLabel,
  isMasterAccountAvailable,
  type BookmakerCatalogueRecord,
  type MasterAccountCatalogueRecord,
} from "./bookmaker-catalogue";

function fixture(overrides: Partial<BookmakerCatalogueRecord> = {}): BookmakerCatalogueRecord {
  return {
    bookmaker_id: "bookmaker-demo-001",
    brand_name: "Bookmaker A",
    short_display_name: "Book A",
    legal_operator: "Demo Operator Limited",
    operator_group: "Demo Group",
    platform: "Demo Platform",
    risk_team: "Demo Risk Team",
    licence_reference: "DEMO-LICENCE-001",
    licence_status: "Demo",
    canonical_domain: "bookmaker-a.example.invalid",
    status: "Active",
    foreground_colour: "#FFFFFF",
    background_colour: "#1B5E20",
    logo_asset_path: "",
    source: "Synthetic fixture",
    confidence: "Verified",
    last_verified_date: "2026-07-15",
    created_at: "2026-07-15 10:00:00",
    updated_at: "2026-07-15 10:00:00",
    ...overrides,
  };
}

function masterFixture(
  overrides: Partial<MasterAccountCatalogueRecord> = {}
): MasterAccountCatalogueRecord {
  return {
    catalogue_id: "BOOKMAKER-DEMO-001",
    account_type: "Bookmaker",
    operating_jurisdictions: [],
    operating_subdivisions: [],
    operating_channels: [],
    brand_name: "Bookmaker A",
    short_display_name: "Bookmaker A",
    legal_operator: "",
    operator_group: "",
    platform: "",
    risk_team: "",
    licence_reference: "",
    licence_status: "",
    canonical_domain: "",
    status: "Active",
    foreground_colour: "#FFFFFF",
    background_colour: "#455A64",
    logo_asset_path: "",
    source: "Synthetic fixture",
    confidence: "Unverified",
    last_verified_date: "",
    evidence: [],
    ...overrides,
  };
}

describe("bookmaker catalogue matching", () => {
  it("matches historical brand text without case sensitivity", () => {
    expect(findBookmakerCatalogueEntry([fixture()], " bookmaker a ")?.bookmaker_id).toBe(
      "bookmaker-demo-001"
    );
  });

  it("matches the short display name", () => {
    expect(findBookmakerCatalogueEntry([fixture()], "BOOK A")?.brand_name).toBe("Bookmaker A");
  });

  it("leaves unmatched historical text unresolved", () => {
    expect(findBookmakerCatalogueEntry([fixture()], "Legacy Bookmaker")).toBeNull();
  });

  it("uses the full brand when no short label is available", () => {
    expect(getBookmakerDisplayLabel(fixture({ short_display_name: "" }))).toBe("Bookmaker A");
  });

  it("uses the full brand name even when a short label exists", () => {
    expect(getBookmakerDisplayLabel(fixture())).toBe("Bookmaker A");
  });

  it("returns active universal account choices for the selected account type", () => {
    const sourceRows = [
      masterFixture({ account_type: "Exchange", brand_name: "Exchange A" }),
      masterFixture({
        catalogue_id: "EXCHANGE-DEMO-002",
        account_type: "Exchange",
        brand_name: "Exchange B",
        status: "Archived",
      }),
      masterFixture({
        catalogue_id: "BANK-DEMO-001",
        account_type: "Bank",
        brand_name: "Bank A",
      }),
    ];

    expect(getActiveMasterAccountNames(sourceRows, "Exchange")).toEqual(["Exchange A"]);
    expect(getActiveMasterAccountNames(sourceRows, "Bank")).toEqual(["Bank A"]);
  });

  it("requires verified jurisdiction and channel overlap for account availability", () => {
    const entry = masterFixture({
      operating_jurisdictions: ["GB"],
      operating_channels: ["mobile"],
    });

    expect(isMasterAccountAvailable(entry, "GB", ["mobile"])).toBe(true);
    expect(isMasterAccountAvailable(entry, "IE", ["mobile"])).toBe(false);
    expect(isMasterAccountAvailable(entry, "GB", ["web"])).toBe(false);
    expect(
      isMasterAccountAvailable(
        { ...entry, operating_jurisdictions: ["US"], operating_subdivisions: ["US-NJ"] },
        "US",
        ["mobile"]
      )
    ).toBe(false);
    expect(
      isMasterAccountAvailable(
        { ...entry, operating_jurisdictions: ["US"], operating_subdivisions: ["US-NJ"] },
        "US",
        ["mobile"],
        "US-NJ"
      )
    ).toBe(true);
    expect(
      isMasterAccountAvailable(
        { ...entry, operating_jurisdictions: [], operating_channels: [] },
        "GB",
        ["mobile"]
      )
    ).toBe(false);
  });

  it("filters universal account choices through the resolved operating context", () => {
    const sourceRows = [
      masterFixture({
        catalogue_id: "EXCHANGE-GB-MOBILE",
        account_type: "Exchange",
        brand_name: "Exchange GB Mobile",
        operating_jurisdictions: ["GB"],
        operating_channels: ["mobile"],
      }),
      masterFixture({
        catalogue_id: "EXCHANGE-IE-WEB",
        account_type: "Exchange",
        brand_name: "Exchange IE Web",
        operating_jurisdictions: ["IE"],
        operating_channels: ["web"],
      }),
    ];

    expect(
      getAvailableMasterAccountNames(sourceRows, "Exchange", {
        jurisdiction: "GB",
        subdivision: "",
        channels: ["web"],
      })
    ).toEqual([]);
    expect(
      getAvailableMasterAccountNames(sourceRows, "Exchange", {
        jurisdiction: "GB",
        subdivision: "",
        channels: ["mobile"],
      })
    ).toEqual(["Exchange GB Mobile"]);
  });
});
