import { expect, test, type Page, type Locator } from "@playwright/test";

test.use({ actionTimeout: 15_000, hasTouch: true });
async function createProfile(page: Page, suffix: string) {
  test.skip(process.env.OPENFORGE_HOSTED_PREVIEW_GATE !== "true", "Authorised isolated/Preview session required");
  const health = await (await page.request.get(process.env.OPENFORGE_E2E_HEALTH_URL || "/healthz")).json();
  expect(["test", "preview"]).toContain(health.runtime_role);
  if (health.runtime_role === "preview") expect(health.database_identity).toBe("preview:plum_duff_preview_cp028");
  expect((await page.request.get("/api/auth/session")).status()).toBe(200);
  const token = `${suffix}-${Date.now()}`;
  const response = await page.request.post("/api/profiles/onboarding", { data: {
    accounts: [], display_name: `Synthetic CP046 Settings ${token}`, profile_code: `C46S-${token.toUpperCase()}`,
    enabled_modules: ["sportsbook-bets", "free-bets", "casino-offers", "cash-adjustments"],
    quick_actions: [], setup_path: "import", tracking_start_date: "2026-09-01",
  } });
  expect(response.status(), await response.text()).toBe(201);
  const id = (await response.json()).profile.profile_id;
  try {
  for (const account of ["Smarkets", "Betfair Exchange"]) {
    const created = await page.request.post(`/api/profiles/${id}/accounts`, { data: {
      account, type: "Exchange", status: "Active", lifecycle_status: "Active", channel: "Online",
      stake_access: "Normal", promo_access: "Full", restrictions: [], current_balance: "0.00", pending_withdrawal_amount: "0.00", commission_rate: "0.02",
    } });
    expect(created.status(), await created.text()).toBe(201);
  }
  } catch (error) {
    await page.request.patch(`/api/profiles/${id}`, { data: { status: "Archived" } });
    throw error;
  }
  return id as string;
}
async function openDefaults(page: Page, id: string) {
  await page.goto(`/profiles/${id}/tracker/settings#defaults`);
  await expect(page.getByRole("tabpanel", { name: "Defaults", exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Active date preset", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Exchange commission settings", exact: true }).getByLabel("Smarkets", { exact: true })).toBeVisible();
}
async function archive(page: Page, ids: string[]) {
  await page.unrouteAll({ behavior: "ignoreErrors" });
  for (const id of ids) expect((await page.request.patch(`/api/profiles/${id}`, { data: { status: "Archived" } })).ok()).toBeTruthy();
}

async function saveAndWait(page: Page, path: string, button: Locator) {
  const confirmed = page.waitForResponse(response => response.url().endsWith(path) && response.request().method() === "PUT");
  await button.click();
  expect((await confirmed).ok()).toBeTruthy();
  await expect(button.locator(".button-spinner")).toHaveCount(0);
  await expect(button).toBeDisabled();
}

test("Profile Defaults headings keep help and fields usable in both themes and compact text", async ({ page }, info) => {
  const id = await createProfile(page, "geometry");
  try {
    await openDefaults(page, id);
    const defaults = page.getByRole("tabpanel", { name: "Defaults", exact: true });
    for (const [width, theme, scale] of [[1440, "light", 100], [390, "dark", 100], [760, "light", 200], [760, "dark", 200]] as const) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(({ theme, scale }) => { document.documentElement.dataset.theme = theme; document.documentElement.style.fontSize = scale + "%"; }, { theme, scale });
      await defaults.screenshot({ path: info.outputPath(`settings-${width}-${theme}-${scale}.png`) });
      const bounds = await defaults.locator("input, select, button").evaluateAll(nodes => nodes.filter(n => n.getBoundingClientRect().width > 0).map(n => {
        const a = n.getBoundingClientRect(), parent = n.closest(".field-control, .inline-actions")?.getBoundingClientRect() ?? n.parentElement!.getBoundingClientRect();
        return { name: n.getAttribute("aria-label") || n.textContent || n.getAttribute("id"), fits: a.left >= parent.left - 1 && a.right <= parent.right + 1 };
      }));
      expect(bounds.filter(n => !n.fits), "Every control stays inside its existing field/action container").toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      const selectWidths = await defaults.locator("select").evaluateAll(nodes => nodes.map(n => {
        const style = getComputedStyle(n), canvas = document.createElement("canvas"), context = canvas.getContext("2d")!;
        context.font = style.font;
        const text = n.selectedOptions[0]?.textContent ?? "";
        return { text, width: context.measureText(text).width, available: n.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) };
      }));
      expect(selectWidths.filter(n => n.width > n.available + 1), "Selected values remain fully readable").toEqual([]);
      const headings = defaults.locator(".section-title-with-help");
      await expect(headings).toHaveCount(6);
      for (const heading of await headings.all()) {
        const help = heading.getByRole("button");
        const geometry = await heading.evaluate(n => {
          const text = n.firstElementChild!.getBoundingClientRect(), help = n.querySelector("button")!.getBoundingClientRect(), box = n.getBoundingClientRect();
          return { gap: help.left - text.right, aligned: Math.abs((text.top + text.bottom) / 2 - (help.top + help.bottom) / 2) < 2, fits: help.right <= box.right + 1 };
        });
        expect(geometry.aligned && geometry.fits && geometry.gap >= 0).toBe(true);
        await help.focus(); await expect(help).toBeFocused();
        const tooltip = page.locator(`[id="${await help.getAttribute("aria-describedby")}"]`);
        await expect(tooltip).toBeVisible();
        expect(await tooltip.evaluate(n => { const r = n.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1; })).toBe(true);
        expect(await tooltip.evaluate(n => {
          const heading = n.closest(".section-title-with-help")!;
          return n.getBoundingClientRect().top >= heading.getBoundingClientRect().bottom
            && getComputedStyle(n).pointerEvents === "none";
        }), "Help sits below the complete heading without intercepting its controls").toBe(true);
        await expect(help).toBeFocused();
        await help.press("Enter"); await expect(help).toHaveAttribute("aria-expanded", "true");
        await help.press("Escape"); await expect(help).toHaveAttribute("aria-expanded", "false");
        await help.tap(); await expect(help).toHaveAttribute("aria-expanded", "true");
        await help.tap(); await expect(help).toHaveAttribute("aria-expanded", "false");
        const headingId = await heading.getAttribute("data-pd-id");
        if (headingId === "profile-settings.defaults.heading" || headingId === "profile-settings.commission.heading") {
          // Clear touch's retained hover on the help button before a neutral capture.
          await heading.locator(":scope > span").first().tap();
          await help.evaluate(n => (n as HTMLElement).blur());
          await expect(tooltip).toBeHidden();
          await heading.evaluate(n => {
            const headerBottom = document.querySelector(".top-app-bar")?.getBoundingClientRect().bottom ?? 0;
            window.scrollBy({ top: n.getBoundingClientRect().top - headerBottom - 24, behavior: "instant" });
          });
          await heading.screenshot({ path: info.outputPath(`${headingId}-${width}-${theme}-${scale}.png`) });
        }
      }
      await page.getByRole("region", { name: "Date range controls", exact: true }).screenshot({ path: info.outputPath(`date-controls-${width}-${theme}-${scale}.png`) });
      await page.getByRole("region", { name: "Exchange commission settings", exact: true }).screenshot({ path: info.outputPath(`commission-${width}-${theme}-${scale}.png`) });
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    const help = defaults.getByRole("button", { name: "About Profile commission defaults", exact: true });
    await help.focus(); await help.press("Enter"); await expect(help).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(`[id="${await help.getAttribute("aria-describedby")}"]`)).toBeVisible();
  } finally { await archive(page, [id]); }
});

test("Profile Defaults retain immediate and explicit saves, failure recovery and Profile ownership", async ({ page }) => {
  const ids: string[] = [];
  try {
    const a = await createProfile(page, "A"); ids.push(a);
    const b = await createProfile(page, "B"); ids.push(b);
    const path = `/api/profiles/${a}/tracker-settings`, commissionPath = `/api/profiles/${a}/exchange-commissions`;
    const baselineB = await (await page.request.get(`/api/profiles/${b}/tracker-settings`)).json();
    await openDefaults(page, a);
    const tracker = page.getByRole("region", { name: "Tracker date settings", exact: true });
    const save = tracker.getByRole("button", { name: "Save", exact: true });
    await expect(save).toBeDisabled();
    await tracker.getByRole("combobox", { name: "Active date preset", exact: true }).selectOption("Last Week");
    await expect.poll(async () => (await (await page.request.get(path)).json()).active_date_preset).toBe("Last Week");
    await expect(save).toBeDisabled();
    await tracker.getByRole("spinbutton", { name: "Mug-bet cadence days", exact: true }).fill("21");
    await expect(save).toBeEnabled();
    expect((await (await page.request.get(path)).json()).mug_bet_frequency_days).not.toBe(21);
    await saveAndWait(page, path, save);
    expect((await (await page.request.get(path)).json()).mug_bet_frequency_days).toBe(21);
    await tracker.getByRole("spinbutton", { name: "Free-bet expiry alert window days", exact: true }).fill("5");
    await page.route("**" + path, route => route.request().method() === "PUT"
      ? route.fulfill({ status: 503, json: { detail: "Synthetic settings save failure" } }) : route.continue());
    await save.click(); await expect(tracker.getByRole("alert")).toContainText("Synthetic settings save failure");
    await expect(save).toBeEnabled();
    await expect(tracker.getByRole("spinbutton", { name: "Free-bet expiry alert window days", exact: true })).toHaveValue("5");
    expect((await (await page.request.get(path)).json()).free_bet_expiry_alert_window_days).not.toBe(5);
    await page.unroute("**" + path); await saveAndWait(page, path, save);
    await page.locator('[data-pd-id="profile-settings.defaults.guided-entry-mode"]').selectOption("off");
    const commission = page.getByRole("region", { name: "Exchange commission settings", exact: true });
    const field = commission.getByLabel("Smarkets", { exact: true });
    const row = field.locator("..");
    await field.fill("1.2"); await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(row.getByRole("button", { name: "Save commission", exact: true })).toBeDisabled();
    await field.fill("0.03"); await row.getByRole("button", { name: "Save commission", exact: true }).click();
    const confirmation = page.getByRole("dialog", { name: "Confirm Exchange commission", exact: true });
    await expect(confirmation).toContainText("for this Profile");
    await page.route("**" + commissionPath, route => route.request().method() === "PUT"
      ? route.fulfill({ status: 503, json: { detail: "Synthetic commission save failure" } }) : route.continue());
    await confirmation.getByRole("button", { name: "Apply commission", exact: true }).click();
    await expect(confirmation.getByRole("alert")).toContainText("Synthetic commission save failure");
    await expect(confirmation.getByRole("button", { name: "Apply commission", exact: true })).toBeEnabled();
    expect((await (await page.request.get(commissionPath)).json()).find((r: { exchange_name: string }) => r.exchange_name === "Smarkets").commission_rate).toBe("0.02");
    await page.unroute("**" + commissionPath);
    await confirmation.getByRole("button", { name: "Apply commission", exact: true }).click();
    await expect(confirmation).toBeHidden();
    await expect(field).toHaveValue("0.03");
    await page.reload(); await expect(page.getByRole("tabpanel", { name: "Defaults", exact: true })).toBeVisible();
    await expect(tracker.getByRole("combobox", { name: "Active date preset", exact: true })).toHaveValue("Last Week");
    await expect(tracker.getByRole("spinbutton", { name: "Mug-bet cadence days", exact: true })).toHaveValue("21");
    await expect(tracker.getByRole("spinbutton", { name: "Free-bet expiry alert window days", exact: true })).toHaveValue("5");
    await expect(field).toHaveValue("0.03");
    await expect(page.locator('[data-pd-id="profile-settings.defaults.guided-entry-mode"]')).toHaveValue("off");
    await page.getByRole("tab", { name: "General", exact: true }).click(); await page.getByRole("tab", { name: "Defaults", exact: true }).click();
    await expect(field).toHaveValue("0.03");
    await openDefaults(page, b);
    await expect(tracker.getByRole("combobox", { name: "Active date preset", exact: true })).toHaveValue(baselineB.active_date_preset);
    await expect(tracker.getByRole("spinbutton", { name: "Mug-bet cadence days", exact: true })).toHaveValue(String(baselineB.mug_bet_frequency_days));
    await expect(field).toHaveValue("0.02");
    await expect(page.locator('[data-pd-id="profile-settings.defaults.guided-entry-mode"]')).toHaveValue("on");
    await openDefaults(page, a); await expect(field).toHaveValue("0.03");
  } finally { await archive(page, ids); }
});

test("Profile Defaults recover from network failures without stranding Saving", async ({ page }) => {
  const id = await createProfile(page, "network");
  const commissionPage = await page.context().newPage();
  try {
    await openDefaults(page, id);
    const tracker = page.getByRole("region", { name: "Tracker date settings", exact: true });
    await page.route(`**/api/profiles/${id}/tracker-settings`, route => route.request().method() === "PUT" ? route.abort("failed") : route.continue());
    await tracker.getByRole("combobox", { name: "Active date preset", exact: true }).selectOption("Last Week");
    await expect(tracker.getByRole("button", { name: "Save", exact: true })).toBeEnabled({ timeout: 1500 });
    await expect(tracker.getByRole("alert")).toContainText("Unable to save tracker settings", { timeout: 1500 });
    await page.unroute(`**/api/profiles/${id}/tracker-settings`);
    await saveAndWait(page, `/api/profiles/${id}/tracker-settings`, tracker.getByRole("button", { name: "Save", exact: true }));
    expect((await (await page.request.get(`/api/profiles/${id}/tracker-settings`)).json()).active_date_preset).toBe("Last Week");
    await openDefaults(commissionPage, id);
    const commission = commissionPage.getByRole("region", { name: "Exchange commission settings", exact: true });
    const field = commission.getByLabel("Smarkets", { exact: true });
    await field.fill("0.03"); await field.locator("..").getByRole("button", { name: "Save commission", exact: true }).click();
    const dialog = commissionPage.getByRole("dialog", { name: "Confirm Exchange commission", exact: true });
    await commissionPage.route(`**/api/profiles/${id}/exchange-commissions`, route => route.request().method() === "PUT" ? route.abort("failed") : route.continue());
    await dialog.getByRole("button", { name: "Apply commission", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Apply commission", exact: true })).toBeEnabled({ timeout: 1500 });
    await expect(dialog.getByRole("alert")).toContainText("Unable to save exchange commission", { timeout: 1500 });
    await commissionPage.unroute(`**/api/profiles/${id}/exchange-commissions`);
    await dialog.getByRole("button", { name: "Apply commission", exact: true }).click();
    await expect(dialog).toBeHidden();
    await commissionPage.reload(); await expect(field).toHaveValue("0.03");
  } finally { await commissionPage.close(); await archive(page, [id]); }
});
