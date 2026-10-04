import { expect, it } from "vitest";
import {
  profileIdsForReportScope,
  resolveReportProfileSelection,
  restoreReportProfileSelection,
} from "./report-profile-selection";

it("restores scope without silently retaining newly archived or unauthorised Profiles", () => {
  const profiles = [{ profileId: "A", status: "Archived" }, { profileId: "B", status: "Active" }];
  expect(restoreReportProfileSelection(null, profiles, ["B"])).toEqual(["B"]);
  expect(restoreReportProfileSelection({ selectedIds: ["A", "B", "foreign"], archivedIds: [] }, profiles, ["B"])).toEqual(["B"]);
  expect(restoreReportProfileSelection({ selectedIds: ["A", "B"], archivedIds: ["A"] }, profiles, ["B"])).toEqual(["A", "B"]);
});

it("defaults Reports to exact Active Profiles and keeps inactive scope deliberate", () => {
  const profiles = [
    { profileId: "A", status: "Active" },
    { profileId: "B", status: "Inactive" },
    { profileId: "C", status: "Archived" },
    { profileId: "D", status: "Pending" },
  ];
  expect(resolveReportProfileSelection(null, profiles)).toEqual({ scope: "active", selectedIds: ["A"] });
  expect(profileIdsForReportScope("inactive", profiles)).toEqual(["B", "C", "D"]);
  expect(profileIdsForReportScope("all", profiles)).toEqual(["A", "B", "C", "D"]);
});

it("migrates the old active selection and preserves an explicit custom selection", () => {
  const profiles = [{ profileId: "A", status: "Active" }, { profileId: "B", status: "Archived" }];
  expect(resolveReportProfileSelection({ selectedIds: ["A"], archivedIds: [] }, profiles).scope).toBe("active");
  expect(resolveReportProfileSelection({ selectedIds: ["A", "B"], archivedIds: ["B"], scope: "custom" }, profiles))
    .toEqual({ scope: "custom", selectedIds: ["A", "B"] });
});
