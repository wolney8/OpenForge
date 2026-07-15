import { describe, expect, it } from "vitest";
import {
  findBookmakerCatalogueEntry,
  getBookmakerDisplayLabel,
  type BookmakerCatalogueRecord,
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
});
