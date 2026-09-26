import { expect, test } from "@playwright/test";

test.use({ extraHTTPHeaders: { Cookie: `pd_session=${process.env.OPENFORGE_E2E_SESSION_TOKEN ?? ""}` } });

test.beforeEach(async ({ page, request }) => {
  const health = await (await request.get("/api/healthz")).json();
  expect(health.runtime_role).toBe("test");
  expect(health.database_identity).toBe("cp055-synthetic");
});

for (const relationship of ["Personal", "Managed subscriber"]) {
  test(`${relationship}: explicit import setup, validation, persistence and reopen`, async ({ page, request }) => {
    const code = `${relationship === "Personal" ? "REL-PERSONAL" : "REL-MANAGED"}-${Date.now()}`;
    await page.goto("/profiles/new");
    await page.getByLabel("Import existing workbook/data").check();
    await page.getByLabel("Display Name", { exact: true }).fill(`Synthetic ${relationship}`);
    await page.getByLabel("Profile Code", { exact: true }).fill(code);
    await page.locator("footer").getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Complete" })).toContainText("Complete");
    const select = page.getByRole("combobox", { name: "Profile relationship", exact: true });
    await select.selectOption(relationship);
    if (relationship === "Personal") {
      await expect(page.getByLabel("Management Fee", { exact: true })).toBeDisabled();
      await expect(page.getByLabel("Management Fee", { exact: true })).toHaveValue("0.00");
      await expect(page.getByLabel("Investment Fee", { exact: true })).toHaveValue("0.00");
    } else {
      await expect(page.getByLabel("Management Fee", { exact: true })).toHaveValue("");
      await page.getByLabel("Management Fee", { exact: true }).fill("40");
      await page.getByLabel("Investment Fee", { exact: true }).fill("0");
    }
    for (const [width, theme, scale] of [[1440,"light",100],[390,"dark",100],[760,"light",200]] as const) {
      await page.setViewportSize({ width, height: 960 });
      await page.evaluate(({ theme, scale }) => { document.documentElement.dataset.theme=theme; document.documentElement.style.fontSize=`${scale}%`; }, { theme, scale });
      await select.focus();
      await expect(select).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1)).toBe(true);
      const escaped = await page.locator(".form-grid .field-control").evaluateAll((fields) => fields.flatMap((field) => {
        const box=field.getBoundingClientRect();
        return [...field.querySelectorAll("input,select")].filter((node) => { const r=node.getBoundingClientRect(); return r.width && (r.left<box.left-1 || r.right>box.right+1); }).map((n)=>n.getAttribute("aria-label") || n.tagName);
      }));
      expect(escaped).toEqual([]);
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => { document.documentElement.style.fontSize="100%"; });
    await page.locator("footer").getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Review Profile" })).toBeVisible();
    const saved=page.waitForResponse((r)=>r.url().endsWith("/profiles/onboarding") && r.request().method()==="POST");
    await page.getByRole("button", { name: "Create and import", exact: true }).click();
    const response=await saved; expect(response.status()).toBe(201);
    const profile=(await response.json()).profile;
    expect(profile.profile_relationship).toBe(relationship);
    await page.waitForURL(`**/profiles/${profile.profile_id}/tracker/settings?setup=import#import-export`);
    const persisted=await (await request.get(`/api/profiles/${profile.profile_id}`)).json();
    expect(persisted.profile_relationship).toBe(relationship);
    expect(persisted.management_fee_percent).toBe(relationship==="Personal" ? "0.00" : "40.00");
    await page.goto(`/profiles/${profile.profile_id}/manage#financial`);
    await page.getByRole("tab", { name: "Financial / Fees", exact: true }).click();
    await expect(page.getByRole("combobox", { name: "Profile relationship", exact: true })).toHaveValue(relationship);
    await page.reload();
    await page.getByRole("tab", { name: "Financial / Fees", exact: true }).click();
    await expect(page.getByRole("combobox", { name: "Profile relationship", exact: true })).toHaveValue(relationship);
  });
}

test("failed create retains setup and retry; Cancel never creates a Profile", async ({ page, request }) => {
  const before=(await (await request.get("/api/profiles")).json()).length;
  await page.goto("/profiles/new");
  await page.getByLabel("Import existing workbook/data").check();
  await page.getByRole("combobox", { name: "Profile relationship", exact: true }).selectOption("Personal");
  await page.getByLabel("Display Name", { exact: true }).fill("Synthetic failure");
  await page.getByLabel("Profile Code", { exact: true }).fill("REL-FAILURE");
  await page.locator("footer").getByRole("button", { name: "Next", exact: true }).click();
  await page.route("**/profiles/onboarding", route=>route.fulfill({status:503,json:{detail:"Synthetic retryable failure"}}));
  await page.getByRole("button", { name: "Create and import", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Synthetic retryable failure" })).toContainText("Synthetic retryable failure");
  await expect(page.getByRole("button", { name: "Create and import", exact: true })).toBeEnabled();
  expect((await (await request.get("/api/profiles")).json()).length).toBe(before);
  await page.unroute("**/profiles/onboarding");
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await expect(page.getByLabel("Display Name", { exact: true })).toHaveValue("Synthetic failure");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: /Discard/i }).click();
  expect((await (await request.get("/api/profiles")).json()).length).toBe(before);
});
