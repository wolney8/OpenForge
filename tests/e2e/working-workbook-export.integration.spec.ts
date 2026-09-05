import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const webBaseURL = "http://127.0.0.1:3110";
const profileId = "profile-working-export-browser";
const expectedClassification =
  "STRUCTURALLY VALID WORKING-WORKBOOK EXPORT — GOOGLE RUNTIME VALIDATION PENDING";

test("real browser control downloads and validates the actual generated workbook", async ({
  context,
  page,
}) => {
  const unauthorizedRequests: string[] = [];
  page.on("response", (response) => {
    if (response.status() === 401) {
      unauthorizedRequests.push(response.url());
    }
  });
  const runtimeRoot = process.env.WORKBOOK_TEMPLATE_ACCEPTANCE_RUNTIME_DIR;
  expect(runtimeRoot).toBeTruthy();
  const runtimeDirectory = join(runtimeRoot!, "api");
  const token = readFileSync(join(runtimeDirectory, "session-token"), "utf8").trim();
  await context.addCookies([
    {
      name: "pd_session",
      value: token,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ]);
  expect((await context.cookies()).some((cookie) => cookie.name === "pd_session")).toBe(true);
  const downloadDirectory = mkdtempSync(
    join(tmpdir(), "workbook-template-export-download-"),
  );
  try {
    await page.goto(`/profiles/${profileId}/tracker/settings#import-export`);
    await page.waitForTimeout(500);
    expect(unauthorizedRequests).toEqual([]);
    const panel = page.locator('[data-pd-id="workbook-template-export.panel"]');
    const button = page.locator('[data-pd-id="workbook-template-export.generate"]');
    await expect(panel).toBeVisible();
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url() ===
          `${webBaseURL}/api/profiles/${profileId}/exports/working-workbook.xlsx` &&
        response.request().method() === "GET",
    );
    const downloadPromise = page.waitForEvent("download");
    await button.click();
    const [response, download] = await Promise.all([responsePromise, downloadPromise]);
    expect(response.status()).toBe(200);
    const downloadPath = join(downloadDirectory, download.suggestedFilename());
    await download.saveAs(downloadPath);
    const headers = await response.allHeaders();
    const verification = JSON.parse(
      execFileSync(
        "./scripts/run-python.sh",
        [
          "scripts/verify_workbook_template_export_acceptance.py",
          "--runtime-directory",
          runtimeDirectory,
          "--workbook",
          downloadPath,
          "--byte-checksum",
          headers["x-export-byte-checksum"],
          "--logical-checksum",
          headers["x-export-logical-checksum"],
          "--changed-part-count",
          headers["x-export-changed-part-count"],
          "--unchanged-part-count",
          headers["x-export-unchanged-part-count"],
        ],
        { encoding: "utf8" },
      ),
    ) as Record<string, boolean | string>;
    expect(verification.classification).toBe(expectedClassification);
    expect(verification.download_byte_checksum_verified).toBe(true);
    expect(verification.logical_checksum_verified).toBe(true);
    expect(verification.expected_projection_values_verified).toBe(true);
    expect(verification.structural_package_verified).toBe(true);
    expect(verification.database_business_state_unchanged).toBe(true);
    expect(verification.global_catalogue_unchanged).toBe(true);
    expect(verification.source_inputs_unchanged).toBe(true);
    await expect(
      panel.locator('[data-pd-id="workbook-template-export.verification"]'),
    ).toContainText(expectedClassification);
    await expect(button).toBeEnabled();
  } finally {
    rmSync(downloadDirectory, { recursive: true, force: true });
  }
});
