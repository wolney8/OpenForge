import { expect, test, type Page, type Locator, type TestInfo } from "@playwright/test";
import type { MasterAccountCatalogueRecord } from "../../apps/web/lib/bookmaker-catalogue";
import type { CommonBetCombo } from "../../apps/web/components/common-bet-combo-settings";

test.use({ actionTimeout: 12_000 });
async function fixture(page: Page) {
  test.skip(process.env.OPENFORGE_HOSTED_PREVIEW_GATE !== "true", "Authorised isolated/Preview session required");
  const health = await (await page.request.get(process.env.OPENFORGE_E2E_HEALTH_URL || "/healthz")).json();
  expect(["test", "preview"]).toContain(health.runtime_role);
  if (health.runtime_role === "preview") expect(health.database_identity).toBe("preview:plum_duff_preview_cp028");
  expect((await page.request.get("/api/auth/session")).status()).toBe(200);
  const catalogue: MasterAccountCatalogueRecord[] = [], combos: CommonBetCombo[] = [];
  const state = { writes: 0, failure: "" as "" | "network" | "validation", gate: null as Promise<void> | null };
  // Shared reference writes must never reach the live catalogue or combo repository.
  for (const endpoint of ["account-catalogue/source", "fund-manager/common-bet-combos"]) {
    await page.route(`**/api/${endpoint}**`, async route => {
      const request = route.request(), isCatalogue = endpoint.startsWith("account");
      if (request.method() === "GET") return void await route.fulfill({ json: isCatalogue ? { schema_version: "1.0", records: catalogue } : combos });
      state.writes++;
      if (state.gate) await state.gate;
      if (state.failure === "network") return void await route.abort("failed");
      if (state.failure === "validation") return void await route.fulfill({ status: 422, json: { detail: "Synthetic validation: review the entered value." } });
      const data = request.postDataJSON();
      if (isCatalogue) {
        const index = catalogue.findIndex(row => row.catalogue_id === data.catalogue_id);
        if (index >= 0) catalogue[index] = data; else catalogue.push(data);
      } else {
        data.preset_id ||= "synthetic-cp048-combo"; data.version = (data.version || 0) + 1;
        const index = combos.findIndex(row => row.preset_id === data.preset_id);
        if (index >= 0) combos[index] = data; else combos.push(data);
      }
      await route.fulfill({ status: request.method() === "POST" ? 201 : 200, json: data });
    });
  }
  return { state, catalogue, combos };
}
async function geometry(page: Page, dialog: Locator, info: TestInfo, name: string) {
  for (const [width, theme, scale] of [[1440, "light", 100], [390, "dark", 100], [760, "light", 200]] as const) {
    await page.setViewportSize({ width, height: 1050 });
    await page.evaluate(({ theme, scale }) => { document.documentElement.dataset.theme = theme; document.documentElement.style.fontSize = `${scale}%`; }, { theme, scale });
    await page.evaluate(async () => { await Promise.allSettled(document.getAnimations().filter(a => a instanceof CSSTransition).map(a => a.finished)); });
    const result = await dialog.evaluate(el => {
      const r = el.getBoundingClientRect(), footer = el.querySelector("footer")!;
      const controls = [...el.querySelectorAll<HTMLInputElement | HTMLSelectElement>(".field-control input:not([type=color]):not([type=checkbox]), .field-control select")];
      const clipped = controls.filter(control => { const c = control.getBoundingClientRect(), f = control.closest(".field-control")!.getBoundingClientRect(); return c.width > 0 && (c.left < f.left - 1 || c.right > f.right + 1); }).map(c => c.closest(".field-control")!.textContent);
      const selected = [...el.querySelectorAll("select")].filter(c => { const s = getComputedStyle(c), ctx = document.createElement("canvas").getContext("2d")!; ctx.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`; return ctx.measureText(c.selectedOptions[0]?.text || "").width > c.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight) + 1; }).map(c => c.selectedOptions[0]?.text);
      const actions = [...footer.querySelectorAll("button")].map(c => c.getBoundingClientRect());
      const scroll = el.querySelector<HTMLElement>(".account-catalogue-form, .common-bet-combo-body")!;
      return { clipped, selected, inside: r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1,
        bodyOverflow: scroll.scrollWidth > scroll.clientWidth + 1, pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        actionsInside: actions.every(a => a.left >= r.left && a.right <= r.right + 1 && a.bottom <= r.bottom && a.top >= r.top),
        actionOverlap: actions.some((a, i) => actions.some((b, j) => i !== j && a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1)) };
    });
    expect.soft(result, `${name}/${width}/${scale}`).toEqual({ clipped: [], selected: [], inside: true, bodyOverflow: false, pageOverflow: false, actionsInside: true, actionOverlap: false });
    const first = dialog.locator("input:not([type=checkbox]):not([readonly])").first();
    await first.focus(); await expect(first).toBeFocused();
    expect.soft(await first.evaluate(control => {
      const rect = control.getBoundingClientRect(), parent = control.closest('[role="dialog"]')!, footer = parent.querySelector("footer")!.getBoundingClientRect();
      return rect.top >= parent.getBoundingClientRect().top && rect.bottom <= footer.top + 1;
    }), `${name}/${width}/${scale}: focused field clears footer`).toBe(true);
    await dialog.locator("footer button").last().focus(); await page.keyboard.press("Tab");
    expect.soft(await dialog.evaluate(el => el.contains(document.activeElement)), `${name}: Tab stays inside`).toBe(true);
    await page.screenshot({ path: info.outputPath(`${name}-${width}-${theme}-${scale}.png`) });
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = "100%"; });
  await page.setViewportSize({ width: 1440, height: 1050 });
}
for (const kind of ["catalogue", "combo"] as const) {
  test(`${kind} create/edit validates, recovers, reopens and contains keyboard/layout`, async ({ page }, info) => {
    const { state, catalogue, combos } = await fixture(page);
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await page.goto(`/settings#${kind === "catalogue" ? "catalogue" : "quick-actions"}`);
    const section = page.locator(`[data-pd-id="${kind === "catalogue" ? "account-catalogue" : "common-bet-combos"}.section"]`);
    const add = section.getByRole("button", { name: kind === "catalogue" ? "Add Account" : "Add Combo", exact: true });
    await add.click();
    const dialog = page.locator(`[data-pd-id="${kind === "catalogue" ? "account-catalogue" : "common-bet-combos"}.dialog"]`);
    const name = dialog.getByLabel(kind === "catalogue" ? "Brand name" : "Combo Name", { exact: true });
    let save = dialog.getByRole("button", { name: kind === "catalogue" ? "Add Account" : "Save Combo", exact: true });
    if (kind === "catalogue") { await save.click(); expect(state.writes).toBe(0); await expect(name).toBeFocused(); }
    else await expect(save).toBeDisabled();
    await name.fill(`Synthetic CP048 ${kind}`);
    await geometry(page, dialog, info, kind);
    state.failure = "network"; await save.click();
    await expect(dialog.getByRole("alert")).toContainText(/fetch|network|saved|save/i);
    await expect(save).toBeEnabled(); await expect(name).toHaveValue(`Synthetic CP048 ${kind}`);
    state.failure = "validation"; await save.click();
    await expect(dialog.getByRole("alert")).toHaveText("Synthetic validation: review the entered value.");
    state.failure = "";
    let release!: () => void; state.gate = new Promise<void>(resolve => { release = resolve; });
    await save.click(); await expect(dialog.locator("footer .modal-primary-button")).toBeDisabled();
    const close = dialog.getByRole("button", { name: kind === "catalogue" ? "Close Account Catalogue" : "Close common bet combos", exact: true });
    await expect(close).toBeDisabled();
    await page.keyboard.press("Escape"); await expect(dialog).toBeVisible();
    release(); state.gate = null;
    await expect(dialog).toBeHidden(); await expect(add).toBeFocused();
    const edit = section.getByRole("button", { name: `Edit Synthetic CP048 ${kind}`, exact: true });
    await edit.click(); await expect(name).toHaveValue(`Synthetic CP048 ${kind}`);
    if (kind === "catalogue") await expect(dialog.getByLabel("Catalogue ID", { exact: true })).toHaveAttribute("readonly", "");
    await geometry(page, dialog, info, `${kind}-edit`);
    await name.fill(`Synthetic CP048 ${kind} amended`);
    save = dialog.getByRole("button", { name: kind === "catalogue" ? "Save Account" : "Save Combo", exact: true });
    await save.click(); await expect(dialog).toBeHidden();
    const amended = section.getByRole("button", { name: `Edit Synthetic CP048 ${kind} amended`, exact: true });
    await amended.click(); await expect(name).toHaveValue(`Synthetic CP048 ${kind} amended`);
    await name.fill("Discard this change");
    await dialog.getByRole("button", { name: kind === "catalogue" ? "Back to Catalogue" : "Cancel", exact: true }).click();
    await expect(dialog).toBeHidden(); await expect(amended).toBeFocused();
    await amended.click(); await expect(name).toHaveValue(`Synthetic CP048 ${kind} amended`);
    await page.emulateMedia({ reducedMotion: "reduce" }); await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden(); await expect(amended).toBeFocused();
    expect(state.writes).toBe(4); expect(kind === "catalogue" ? catalogue : combos).toHaveLength(1); expect(errors).toEqual([]);
  });
}
