import { expect, test } from "@playwright/test";

test.use({ actionTimeout: 15_000 });

test("Profile Accounts Create/Edit retains validation, draft actions, ownership and compact field geometry", async ({ page, playwright }, info) => {
  test.setTimeout(240_000);
  test.skip(process.env.OPENFORGE_HOSTED_PREVIEW_GATE !== "true", "Authorised isolated/Preview session required");
  const health = await (await page.request.get(process.env.OPENFORGE_E2E_HEALTH_URL || "/healthz")).json();
  expect(["test", "preview"]).toContain(health.runtime_role);
  if (health.runtime_role === "preview") expect(health.database_identity).toBe("preview:plum_duff_preview_cp028");
  const cleanupRequest = await playwright.request.newContext({
    baseURL: info.project.use.baseURL,
    storageState: await page.context().storageState(),
  });
  const catalogueBefore = await (await page.request.get("/api/account-catalogue/source")).json();
  const created = await page.request.post("/api/profiles/onboarding", { data: {
    accounts: [], display_name: `Synthetic CP046 Accounts ${Date.now()}`, profile_code: `C46A-${Date.now()}`,
    enabled_modules: ["sportsbook-bets", "free-bets", "cash-adjustments"], quick_actions: [], setup_path: "import", tracking_start_date: "2026-09-01",
    profile_relationship: "Personal", management_fee_percent: "0", investment_fee_percent: "0",
  } });
  expect(created.status(), await created.text()).toBe(201);
  const id = (await created.json()).profile.profile_id, path = `/api/profiles/${id}/accounts`;
  let writes = 0;
  page.on("request", r => { if (r.url().includes(path) && ["POST", "PUT"].includes(r.method())) writes++; });
  try {
    await page.goto(`/profiles/${id}/tracker/accounts`);
    const add = page.getByRole("button", { name: "Add Account", exact: true });
    await add.click();
    let dialog = page.getByRole("dialog", { name: "Create account", exact: true });
    await dialog.getByRole("button", { name: "Create", exact: true }).click();
    expect(await dialog.getByLabel("Account", { exact: true }).evaluate((el: HTMLSelectElement) => el.validity.valueMissing)).toBe(true);
    expect(writes).toBe(0);
    await dialog.getByLabel("Account", { exact: true }).selectOption({ label: "Bet365" });
    const balance = dialog.getByRole("textbox", { name: "Current balance", exact: true });
    await balance.fill("invalid"); await balance.blur();
    await expect(balance).toHaveAttribute("aria-invalid", "true");
    await expect(dialog.getByRole("button", { name: "Create", exact: true })).toBeDisabled();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await balance.fill("125.50"); await balance.blur();
    await dialog.getByLabel("Notes", { exact: true }).fill("Synthetic CP046 saved account");
    await dialog.getByRole("button", { name: "Create", exact: true }).click();
    await expect(dialog).toBeHidden();
    const rows = await (await page.request.get(path)).json();
    expect(rows).toHaveLength(1); expect(rows[0].current_balance).toBe("125.50"); expect(rows[0].profile_id).toBe(id);
    const edit = page.locator(".accounts-data-table tbody tr").filter({ hasText: "Bet365" }).getByTitle("Edit account");
    await edit.click(); dialog = page.getByRole("dialog", { name: "Edit account", exact: true });
    await expect(dialog.getByLabel("Account", { exact: true })).toHaveAttribute("readonly", "");
    for (const label of ["Type", "Group", "Platform"]) {
      await expect(dialog.getByLabel(label, { exact: true })).toHaveAttribute("readonly", "");
    }
    for (const [width, theme, scale] of [[1440, "light", 100], [390, "dark", 100], [760, "light", 200]] as const) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(({ theme, scale }) => { document.documentElement.dataset.theme = theme; document.documentElement.style.fontSize = scale + "%"; }, { theme, scale });
      await page.evaluate(async () => {
        await Promise.allSettled(document.getAnimations().filter(animation => animation instanceof CSSTransition).map(animation => animation.finished));
      });
      const geometry = await dialog.evaluate(el => {
        const fields = [...el.querySelectorAll(".field-control")];
        const clipped = fields.flatMap(field => [...field.querySelectorAll("input,select,textarea")].filter(control => {
          const a = control.getBoundingClientRect(), b = field.getBoundingClientRect(); return a.width > 0 && (a.left < b.left - 1 || a.right > b.right + 1);
        }).map(control => control.getAttribute("aria-label") || field.textContent));
        const selected = [...el.querySelectorAll("select")].flatMap(node => {
          const style = getComputedStyle(node), ctx = document.createElement("canvas").getContext("2d")!; ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const text = node.selectedOptions[0]?.text || "";
          return ctx.measureText(text).width > node.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) ? [text] : [];
        });
        return { clipped, selected, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
      });
      expect.soft(geometry, `${width}/${scale}`).toEqual({ clipped: [], selected: [], overflow: false });
      const peers = await dialog.evaluate(el => {
        const [account, type] = [...el.querySelectorAll<HTMLLabelElement>("form > label.field-control")];
        const accountLabel = account.querySelector("span")!.getBoundingClientRect(), typeLabel = type.querySelector("span")!.getBoundingClientRect();
        const accountControl = account.querySelector("input")!.getBoundingClientRect(), typeControl = type.querySelector("input")!.getBoundingClientRect();
        return Math.abs(accountLabel.top - typeLabel.top) <= 1
          ? Math.abs(accountControl.top - typeControl.top) <= 1
          : accountControl.bottom <= typeLabel.top;
      });
      expect(peers, `${width}/${scale}: Account and Type controls align or stack without overlap`).toBe(true);
      for (const label of ["Account", "Notes"]) {
        const field = dialog.getByRole("textbox", { name: label, exact: true });
        await field.focus(); await expect(field).toBeFocused();
        const readFocus = () => field.evaluate(control => {
          const editor = control.closest('[role="dialog"]')!;
          const body = editor.querySelector(".workflow-editor-body")!.getBoundingClientRect();
          const footer = editor.querySelector('[data-pd-id="accounts.editor.footer"]')!.getBoundingClientRect();
          const rect = control.getBoundingClientRect(), style = getComputedStyle(control);
          const firstLineTop = rect.top + parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop);
          const firstLineBottom = firstLineTop + (parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2);
          return { margins: [rect.left - body.left, body.right - rect.right, rect.top - body.top, body.bottom - rect.bottom],
            footerGap: footer.top - rect.bottom, height: rect.height, availableHeight: body.height,
            firstLineMargins: [firstLineTop - body.top, body.bottom - firstLineBottom, footer.top - firstLineBottom] };
        });
        if (label === "Notes") {
          const nativeFocus = await readFocus();
          expect.soft(Math.min(...nativeFocus.firstLineMargins), `${width}/${scale}: native Notes focus keeps the first editing line visible: ${JSON.stringify(nativeFocus)}`).toBeGreaterThanOrEqual(0);
          // Native textarea focus reveals its caret line. Scrolling must also expose the entire field.
          await field.evaluate(el => el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" }));
        }
        const focus = await readFocus(), margin = label === "Account" ? 2 : 0;
        expect.soft(Math.min(...focus.margins), `${width}/${scale}: focused ${label} is fully reachable inside the body: ${JSON.stringify(focus)}`).toBeGreaterThanOrEqual(margin);
        expect.soft(focus.footerGap, `${width}/${scale}: focused ${label} clears the footer`).toBeGreaterThanOrEqual(margin);
        await page.screenshot({ path: info.outputPath(`account-${label.toLowerCase()}-${width}-${theme}-${scale}.png`) });
      }
      const save = dialog.getByRole("button", { name: "Save", exact: true });
      await dialog.getByRole("textbox", { name: "Notes", exact: true }).press("Tab");
      await expect(save).toBeFocused();
      const box = await save.boundingBox(); expect(box!.y).toBeGreaterThanOrEqual(0); expect(box!.y + box!.height).toBeLessThanOrEqual(1001);
      await save.press("Tab"); expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
      const clippedFooter = await dialog.locator('[data-pd-id="accounts.editor.footer"]').evaluate(footer => {
        const failures: { label: string; ancestor: string; outside: number[] }[] = [];
        for (const control of footer.querySelectorAll("button")) {
          const bounds = control.getBoundingClientRect();
          for (let parent = control.parentElement; parent && parent !== document.body && parent !== document.documentElement; parent = parent.parentElement) {
            const style = getComputedStyle(parent), outer = parent.getBoundingClientRect();
            const clippedX = /(auto|scroll|hidden|clip)/.test(style.overflowX);
            const clippedY = /(auto|scroll|hidden|clip)/.test(style.overflowY);
            const outside = [clippedX ? outer.left - bounds.left : 0, clippedX ? bounds.right - outer.right : 0,
              clippedY ? outer.top - bounds.top : 0, clippedY ? bounds.bottom - outer.bottom : 0];
            if (outside.some(value => value > 1)) failures.push({ label: control.textContent?.trim() || "", ancestor: parent.className, outside });
          }
        }
        return failures;
      });
      expect.soft(clippedFooter, `${width}/${scale}: all footer targets must remain inside clipping ancestors`).toEqual([]);
      await page.screenshot({ path: info.outputPath(`account-editor-${width}-${theme}-${scale}.png`) });
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    const notes = dialog.getByRole("textbox", { name: "Notes", exact: true });
    await notes.fill("Synthetic discarded change");
    await dialog.getByRole("button", { name: "Revert", exact: true }).click(); await expect(notes).toHaveValue("Synthetic CP046 saved account");
    await notes.fill("Synthetic discarded change"); await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("button", { name: "Discard Changes", exact: true }).click(); await expect(dialog).toBeHidden(); await expect(edit).toBeFocused();
    expect(await (await page.request.get(path)).json()).toEqual(rows);
    await edit.click(); await notes.fill("Synthetic CP046 amended account");
    await dialog.getByRole("button", { name: "Save", exact: true }).click(); await expect(dialog).toBeHidden();
    await edit.click(); await expect(notes).toHaveValue("Synthetic CP046 amended account"); await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    expect(await (await page.request.get("/api/account-catalogue/source")).json()).toEqual(catalogueBefore);
  } finally {
    try {
      expect((await cleanupRequest.patch(`/api/profiles/${id}`, { data: { status: "Archived" } })).ok()).toBeTruthy();
    } finally {
      await cleanupRequest.dispose();
    }
  }
});
