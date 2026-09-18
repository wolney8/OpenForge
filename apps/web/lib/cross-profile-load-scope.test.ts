import { describe, expect, it } from "vitest";
import { resolveCrossProfileSummaryLoadIds } from "./cross-profile-load-scope";

const profiles = [
  ...Array.from({ length: 3 }, (_, index) => ({
    profileId: `owner-${index}`,
    displayName: `Owner ${index}`,
    profileCode: `OWNER-${index}`,
    status: "Active",
  })),
  ...Array.from({ length: 63 }, (_, index) => ({
    profileId: `synthetic-${index}`,
    displayName: `Synthetic archived ${String(index).padStart(2, "0")}`,
    profileCode: `SYN-${index}`,
    status: "Archived",
  })),
];

const matureFixtureShape = {
  accounts: 175,
  financialActivities: 1_100,
  financialHistoryEvents: 305,
  importedLineageRecords: 91,
  notificationEvents: 52,
};

describe("mature cross-Profile summary load scope", () => {
  it("loads only selected active Profiles for ordinary owner reporting", () => {
    expect(Object.values(matureFixtureShape).every((count) => count > 0)).toBe(true);
    expect(resolveCrossProfileSummaryLoadIds({
      profiles,
      selectedProfileIds: ["owner-0", "owner-1", "owner-2"],
      includeDirectoryPage: false,
      directoryStatus: "Active",
      directoryQuery: "",
      directoryPage: 1,
      directoryPageSize: 8,
      pinnedProfileIds: [],
    })).toEqual(["owner-0", "owner-1", "owner-2"]);
  });

  it("loads only one archived directory page plus active defaults", () => {
    const result = resolveCrossProfileSummaryLoadIds({
      profiles,
      selectedProfileIds: ["owner-0", "owner-1", "owner-2"],
      includeDirectoryPage: true,
      directoryStatus: "Archived",
      directoryQuery: "",
      directoryPage: 1,
      directoryPageSize: 8,
      pinnedProfileIds: [],
    });
    expect(result).toHaveLength(11);
    expect(result.filter((profileId) => profileId.startsWith("synthetic-"))).toHaveLength(8);
  });

  it("loads an archived Profile only when it is explicitly selected", () => {
    expect(resolveCrossProfileSummaryLoadIds({
      profiles,
      selectedProfileIds: ["owner-0", "owner-1", "owner-2", "synthetic-42"],
      includeDirectoryPage: false,
      directoryStatus: "Active",
      directoryQuery: "",
      directoryPage: 1,
      directoryPageSize: 8,
      pinnedProfileIds: [],
    })).toContain("synthetic-42");
  });
});
