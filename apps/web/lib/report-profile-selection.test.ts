import { expect, it } from "vitest";
import { restoreReportProfileSelection } from "./report-profile-selection";

it("restores scope without silently retaining newly archived or unauthorised Profiles", () => {
  const profiles = [{ profileId: "A", status: "Archived" }, { profileId: "B", status: "Active" }];
  expect(restoreReportProfileSelection(null, profiles, ["B"])).toEqual(["B"]);
  expect(restoreReportProfileSelection({ selectedIds: ["A", "B", "foreign"], archivedIds: [] }, profiles, ["B"])).toEqual(["B"]);
  expect(restoreReportProfileSelection({ selectedIds: ["A", "B"], archivedIds: ["A"] }, profiles, ["B"])).toEqual(["A", "B"]);
});
