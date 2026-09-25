import { expect, test, type Page, type Locator } from "@playwright/test";

test.use({ actionTimeout: 15_000 });
type Lookup = { lookup_value_id: string; lookup_type: string; option_value: string; status: "Active" | "Archived"; sort_order: number };
async function safety(page: Page) {
  test.skip(process.env.OPENFORGE_HOSTED_PREVIEW_GATE !== "true", "Authorised isolated/Preview session required");
  const health = await (await page.request.get(process.env.OPENFORGE_E2E_HEALTH_URL || "/healthz")).json();
  expect(["test", "preview"]).toContain(health.runtime_role);
  if (health.runtime_role === "preview") expect(health.database_identity).toBe("preview:plum_duff_preview_cp028");
  expect((await page.request.get("/api/auth/session")).status()).toBe(200);
  return health.runtime_role as string;
}
async function fixture(page: Page) {
  await safety(page);
  const rows: Lookup[] = [{ lookup_value_id: "synthetic-cp046-list", lookup_type: "offer_name", option_value: "Synthetic existing offer", status: "Active", sort_order: 0 }];
  const state = { gate: null as Promise<void> | null, failure: "" as "" | "network" | "validation", writes: 0 };
  await page.route("**/api/fund-manager/lookup-values**", async route => {
    if (route.request().method() === "GET") return void await route.fulfill({ json: rows });
    state.writes++;
    if (state.gate) await state.gate;
    if (state.failure === "network") return void await route.abort("failed");
    if (state.failure === "validation") return void await route.fulfill({ status: 422, json: { detail: "Value is already present in this tracker list." } });
    const draft = route.request().postDataJSON();
    const existing = rows.find(row => route.request().url().endsWith("/" + row.lookup_value_id));
    const saved: Lookup = { ...draft, lookup_value_id: existing?.lookup_value_id ?? "synthetic-cp046-created" };
    if (existing) Object.assign(existing, saved); else rows.push(saved);
    await route.fulfill({ status: existing ? 200 : 201, json: saved });
  });
  return { rows, state };
}
async function open(page: Page) {
  await page.goto("/settings#lists");
  await expect(page.getByRole("tab", { name: "Lists", exact: true })).toHaveAttribute("aria-selected", "true");
  const section = page.locator('[data-pd-id="fund-manager-authorities.section"]');
  await section.locator('[data-pd-id="fund-manager-authorities.list-filter"]').selectOption("offer_name");
  await section.getByRole("button", { name: "Add Value", exact: true }).click();
  return page.getByRole("dialog", { name: "Manage Fund Manager tracker lists" });
}
async function selectedFits(select: Locator) {
  return select.evaluate((element: HTMLSelectElement) => {
    const style = getComputedStyle(element), canvas = document.createElement("canvas"), context = canvas.getContext("2d")!;
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const available = element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    return { available, required: context.measureText(element.selectedOptions[0].text).width, selectWidth: element.clientWidth, font: style.font, paddingLeft: style.paddingLeft, paddingRight: style.paddingRight, ancestors: [element.parentElement, element.closest(".form-grid"), element.closest(".workflow-editor-modal-body"), element.closest("[role=dialog]")].map(el => ({ className: el!.className, width: el!.getBoundingClientRect().width, padding: getComputedStyle(el!).padding })) };
  });
}

test("Tracker Lists fields and actions fit both themes, compact widths and enlarged text", async ({ page }, info) => {
  await fixture(page);
  const dialog = await open(page);
  await expect(dialog.getByRole("button", { name: "Save Value", exact: true })).toBeDisabled();
  const list = dialog.locator('[data-pd-id="fund-manager-authorities.editor.list"]');
  const value = dialog.locator('[data-pd-id="fund-manager-authorities.editor.value"]');
  await expect(value).toHaveAttribute("aria-describedby", "fund-manager-authorities.value-help");
  await expect(dialog.getByText("Enter a value to save.", { exact: true })).toBeVisible();
  await value.fill("Synthetic long tracker value for readable selected controls");
  for (const [width, theme, scale] of [[1440, "light", 100], [390, "dark", 100], [320, "dark", 100], [760, "light", 200]] as const) {
    await page.setViewportSize({ width, height: 1100 });
    await page.evaluate(({ theme, scale }) => { document.documentElement.dataset.theme = theme; document.documentElement.style.fontSize = scale + "%"; }, { theme, scale });
    const fit = await selectedFits(list);
    console.log(JSON.stringify({ width, theme, scale, fit }));
    expect.soft(fit.available, `${width}/${scale}: List selected value`).toBeGreaterThanOrEqual(fit.required);
    const geometry = await dialog.evaluate(el => {
      const r = el.getBoundingClientRect(), body = el.querySelector(".workflow-editor-modal-body")!, fields = [...el.querySelectorAll(".field-control")];
      return { inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
        bodyOverflow: body.scrollWidth > body.clientWidth + 1, pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        fields: fields.map(field => { const a = field.getBoundingClientRect(), control = field.querySelector("input,select")!.getBoundingClientRect(); return { top: control.top, left: control.left, right: control.right, height: control.height, contained: control.left >= a.left - 1 && control.right <= a.right + 1 }; }) };
    });
    expect.soft(geometry.inside).toBe(true); expect.soft(geometry.bodyOverflow).toBe(false); expect.soft(geometry.pageOverflow).toBe(false);
    expect.soft(geometry.fields.every(field => field.contained)).toBe(true);
    expect.soft(Math.max(...geometry.fields.map(field => field.height)) - Math.min(...geometry.fields.map(field => field.height))).toBeLessThanOrEqual(1);
    const footerActions = await dialog.locator("footer button").evaluateAll(elements => elements.map(element => ({ ...element.getBoundingClientRect().toJSON(), minHeight: getComputedStyle(element).minHeight, alignItems: getComputedStyle(element).alignItems })));
    expect.soft(footerActions[0].minHeight).toBe(footerActions[1].minHeight);
    expect.soft(footerActions.every(action => action.alignItems === "center")).toBe(true);
    if (footerActions[0].bottom > footerActions[1].top && footerActions[1].bottom > footerActions[0].top) {
      expect.soft(footerActions[1].left).toBeGreaterThanOrEqual(footerActions[0].right + 1);
      // Preserve the canonical primary/secondary text treatments while checking matching targets and centres.
      expect.soft(Math.abs(footerActions[0].height - footerActions[1].height)).toBeLessThanOrEqual(2);
      expect.soft(Math.abs((footerActions[0].top + footerActions[0].height / 2) - (footerActions[1].top + footerActions[1].height / 2))).toBeLessThanOrEqual(1);
    } else expect.soft(footerActions[1].top).toBeGreaterThanOrEqual(footerActions[0].bottom + 1);
    await dialog.getByRole("button", { name: "Save Value", exact: true }).focus();
    await page.keyboard.press("Tab");
    expect.soft(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    await page.screenshot({ path: info.outputPath(`tracker-list-${width}-${theme}-${scale}.png`) });
  }
  await list.focus(); await page.keyboard.press("Tab"); await expect(value).toBeFocused();
  await page.keyboard.press("Tab"); await expect(dialog.locator('[data-pd-id="fund-manager-authorities.editor.status"]')).toBeFocused();
  await page.keyboard.press("Tab"); await expect(dialog.getByRole("button", { name: "Back to Tracker Lists", exact: true })).toBeFocused();
  await page.keyboard.press("Tab"); await expect(dialog.getByRole("button", { name: "Save Value", exact: true })).toBeFocused();
  await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible();
  await expect(page.locator('[data-pd-id="fund-manager-authorities.section"]').getByRole("button", { name: "Add Value", exact: true })).toBeFocused();
});

test("Tracker Lists preserve drafts and disable close during failed and pending saves", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  const { state } = await fixture(page);
  const dialog = await open(page), value = dialog.locator('[data-pd-id="fund-manager-authorities.editor.value"]');
  const save = dialog.getByRole("button", { name: "Save Value", exact: true });
  await value.fill("Synthetic retry value");
  state.failure = "network";
  await save.click();
  await expect(dialog.getByRole("alert")).toContainText(/saved|fetch|network/i);
  await expect(save).toBeEnabled(); await expect(value).toHaveValue("Synthetic retry value");
  state.failure = "validation";
  await save.click();
  await expect(dialog.getByRole("alert")).toHaveText("Value is already present in this tracker list.");
  await expect(save).toBeEnabled();
  state.failure = "";
  let release!: () => void; state.gate = new Promise<void>(resolve => { release = resolve; });
  await save.click();
  await expect(dialog.getByRole("button", { name: "Close tracker lists", exact: true })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Back to Tracker Lists", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape"); await expect(dialog).toBeVisible();
  release(); state.gate = null;
  await expect(dialog).not.toBeVisible();
  const section = page.locator('[data-pd-id="fund-manager-authorities.section"]');
  await section.getByRole("button", { name: "Edit Synthetic retry value", exact: true }).click();
  await expect(value).toHaveValue("Synthetic retry value");
  await value.fill("Unsaved synthetic change");
  await dialog.getByRole("button", { name: "Back to Tracker Lists", exact: true }).click();
  await section.getByRole("button", { name: "Edit Synthetic retry value", exact: true }).click();
  await expect(value).toHaveValue("Synthetic retry value");
  await dialog.getByRole("button", { name: "Close tracker lists", exact: true }).click();
  expect(state.writes).toBe(3);
  expect(errors).toEqual([]);
});

test("saved Tracker Lists return to the inline authority table and retain explicit status on reopen", async ({ page }, info) => {
  await fixture(page);
  const dialog = await open(page);
  await dialog.locator('[data-pd-id="fund-manager-authorities.editor.value"]').fill("Synthetic saved tracker value");
  await dialog.locator('[data-pd-id="fund-manager-authorities.editor.status"]').selectOption("Archived");
  await dialog.getByRole("button", { name: "Save Value", exact: true }).click();
  await expect(page.locator('[data-pd-id="fund-manager-authorities.section"]')).toContainText("Synthetic saved tracker value");
  await page.screenshot({ path: info.outputPath("tracker-list-after-save.png") });
  await expect(dialog).not.toBeVisible();
  await page.locator('[data-pd-id="fund-manager-authorities.section"]').getByRole("button", { name: "Edit Synthetic saved tracker value", exact: true }).click();
  await expect(dialog.locator('[data-pd-id="fund-manager-authorities.editor.status"]')).toHaveValue("Archived");
  await expect(dialog.locator('[data-pd-id="fund-manager-authorities.editor.list"]')).toHaveValue("offer_name");
  await dialog.getByRole("button", { name: "Close tracker lists", exact: true }).click();
});
