import { describe, expect, it } from "vitest";
import {
  initialLabAccounts,
  labAccountBalanceError,
  saveLabAccountBalance,
  summarizeDesignLab,
} from "./design-lab-fixture";

describe("isolated Design Lab financial sources", () => {
  it("separates known cash from an unknown Account and excludes planning from committed exposure", () => {
    const summary = summarizeDesignLab(initialLabAccounts, "all", "Last Month");
    expect(summary.cash.knownSubtotal).toBe("185.00");
    expect(summary.cashMissingCount).toBe(1);
    expect(Number.isNaN(summary.cash.value)).toBe(true);
    expect(summary.exposure.knownValue).toBe(25);
    expect(summary.committedCount).toBe(2);
    expect(summary.realised.knownValue).toBeCloseTo(14.4, 2);
  });

  it("uses the shared range resolver and Profile scope without cross-Profile rows", () => {
    expect(summarizeDesignLab(initialLabAccounts, "LAB-PROFILE-A", "Last Month").realised.knownValue).toBeCloseTo(18.4, 2);
    expect(summarizeDesignLab(initialLabAccounts, "LAB-PROFILE-B", "Last Month").realised.knownValue).toBe(-4);
    expect(summarizeDesignLab(initialLabAccounts, "all", "This Year").realised.knownValue).toBeCloseTo(55.1, 2);
    expect(summarizeDesignLab(initialLabAccounts, "LAB-PROFILE-B", "This Year").cash.knownSubtotal).toBe("60.00");
  });

  it("keeps blank unknown and accepts authoritative zero only after explicit review", () => {
    expect(labAccountBalanceError("")).toMatch(/current balance/);
    expect(labAccountBalanceError("bad")).toBeTruthy();
    const saved = saveLabAccountBalance(initialLabAccounts, "LAB-ACCOUNT-C", "0");
    const summary = summarizeDesignLab(saved, "LAB-PROFILE-A", "Last Month");
    expect(saved.find((account) => account.id === "LAB-ACCOUNT-C")?.currentBalance).toBe("0.00");
    expect(summary.cashMissingCount).toBe(0);
    expect(summary.cash.value).toBe(125);
    expect(initialLabAccounts.find((account) => account.id === "LAB-ACCOUNT-C")?.currentBalance).toBe("");
  });
});
