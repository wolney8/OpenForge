import { expect, test, type Page } from "@playwright/test";

const longNotificationType =
  "synthetic_notification_type_with_a_deliberately_long_descriptive_label_for_layout_testing";

async function installSyntheticNotificationHistory(page: Page) {
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/session") {
      await route.fulfill({
        json: {
          authenticated: true,
          email: "founder@example.invalid",
          linked_profile_ids: ["PROFILE-LAYOUT"],
          name: "Synthetic Founder",
          role: "fund_manager",
          session_policy: {
            auto_logout_enabled: false,
            preference_configured: true,
            timeout_minutes: 30,
          },
        },
      });
      return;
    }
    if (pathname === "/api/auth/activity") {
      await route.fulfill({ status: 204 });
      return;
    }
    if (pathname.endsWith("/fund-manager/notifications/state")) {
      await route.fulfill({ json: { dismissed_ids: [], read_keys: [] } });
      return;
    }
    if (pathname.endsWith("/fund-manager/notifications/preferences")) {
      await route.fulfill({ json: { preferences: {} } });
      return;
    }
    if (pathname.endsWith("/fund-manager/notifications")) {
      await route.fulfill({
        json: [
          {
            audience: "fund_manager",
            security_tag: "fund_manager_only",
            kind: "information",
            task_state: "new",
            notification_id: "layout:PROFILE-LAYOUT:NOTICE-001:2099-09-06T10:00:00Z",
            notification_type: longNotificationType,
            title: "Synthetic layout notification",
            ledger_label: "Synthetic Ledger",
            bookmaker_label: "Bookmaker A",
            message: "Synthetic notification content.",
            profile_id: "PROFILE-LAYOUT",
            profile_name: "User 001",
            record_id: "NOTICE-001",
            due_at: "2099-09-06T10:00:00Z",
            settles_at: "2099-09-06T10:00:00Z",
            created_at: "2026-09-06T10:00:00Z",
            href: "/notifications",
            completion_href: "",
            tone: "warning",
          },
        ],
      });
      return;
    }
    await route.fulfill({ json: [] });
  });
}

type Rect = { bottom: number; left: number; right: number; top: number };

function intersects(first: Rect, second: Rect): boolean {
  return !(
    first.right <= second.left ||
    second.right <= first.left ||
    first.bottom <= second.top ||
    second.bottom <= first.top
  );
}

async function readPeerFieldLayout(page: Page) {
  return page.evaluate(() => {
    const selectors = [
      "[data-pd-id='notifications.history.search']",
      "[data-pd-id='notifications.history.type']",
      "[data-pd-id='notifications.history.status']",
    ];
    const fields = selectors.map((selector) => {
      const control = document.querySelector<HTMLElement>(selector);
      const label = control?.closest<HTMLElement>("label.field-control");
      const labelText = label?.querySelector<HTMLElement>(":scope > span");
      if (!control || !label || !labelText) throw new Error(`Missing peer field ${selector}`);
      const controlRect = control.getBoundingClientRect();
      const labelRect = labelText.getBoundingClientRect();
      return {
        controlBottom: controlRect.bottom,
        controlTop: controlRect.top,
        labelTop: labelRect.top,
        selector,
      };
    });
    const actions = document.querySelector<HTMLElement>(".notification-history-actions");
    if (!actions) throw new Error("Missing notification actions");
    const actionRect = actions.getBoundingClientRect();
    const actionButtons = [...actions.querySelectorAll<HTMLElement>("button")].map((button) => {
      const rect = button.getBoundingClientRect();
      return { bottom: rect.bottom, top: rect.top };
    });
    return {
      actionButtons,
      actionTop: actionRect.top,
      fields,
      rootFontSize: Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
    };
  });
}

function expectDesktopPeerAlignment(layout: Awaited<ReturnType<typeof readPeerFieldLayout>>) {
  const labelTops = layout.fields.map((field) => field.labelTop);
  const controlTops = layout.fields.map((field) => field.controlTop);
  expect(Math.max(...labelTops) - Math.min(...labelTops), "peer label top alignment").toBeLessThanOrEqual(1);
  expect(Math.max(...controlTops) - Math.min(...controlTops), "peer control top alignment").toBeLessThanOrEqual(1);
  expect(layout.actionTop, "actions remain below the complete peer field row").toBeGreaterThanOrEqual(
    Math.max(...layout.fields.map((field) => field.controlBottom)) + layout.rootFontSize * 0.75 - 1,
  );
}

test("Notification History keeps peer fields aligned independently of its action row", async ({ page }) => {
  await installSyntheticNotificationHistory(page);
  await page.setViewportSize({ width: 1180, height: 900 });
  await page.goto("/notifications");
  await expect(page.locator('[data-pd-id="notifications.history.item.NOTICE-001"]')).toBeVisible();

  expectDesktopPeerAlignment(await readPeerFieldLayout(page));

  await page.locator(".notification-history-actions").evaluate((actions) => {
    actions.style.maxWidth = "18rem";
  });
  const wrappedLayout = await readPeerFieldLayout(page);
  expect(new Set(wrappedLayout.actionButtons.map((button) => Math.round(button.top))).size).toBe(2);
  expectDesktopPeerAlignment(wrappedLayout);

  await page.locator('[data-pd-id="notifications.history.status"]').selectOption("cleared");
  await expect(page.locator('[data-pd-id="notifications.history.mark-read"]')).toBeDisabled();
  await expect(page.locator('[data-pd-id="notifications.history.clear"]')).toBeDisabled();
  expectDesktopPeerAlignment(await readPeerFieldLayout(page));

  await page.setViewportSize({ width: 390, height: 900 });
  const narrowLayout = await readPeerFieldLayout(page);
  for (let index = 1; index < narrowLayout.fields.length; index += 1) {
    expect(narrowLayout.fields[index].controlTop).toBeGreaterThan(narrowLayout.fields[index - 1].controlTop);
  }
  expect(narrowLayout.actionTop).toBeGreaterThan(
    narrowLayout.fields[narrowLayout.fields.length - 1].controlBottom,
  );
});

test("Notification History controls remain contained and separated through reflow", async ({ page }) => {
  await installSyntheticNotificationHistory(page);
  await page.setViewportSize({ width: 1180, height: 900 });
  await page.goto("/notifications");
  await expect(
    page.locator('[data-pd-id="notifications.history.item.NOTICE-001"]'),
  ).toBeVisible();

  const initialTheme = await page.locator("html").getAttribute("data-theme");
  await page.getByRole("button", { name: /Switch to (light|dark) mode/ }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", initialTheme ?? "");

  const viewportCases = [
    { name: "normal desktop", width: 1440 },
    { name: "reported-layout reproduction", width: 1180 },
    { name: "above reflow breakpoint", width: 861 },
    { name: "at reflow breakpoint", width: 860 },
    { name: "below reflow breakpoint", width: 859 },
    { name: "narrow", width: 390 },
  ];

  for (const theme of ["light", "dark"] as const) {
    await page.evaluate((nextTheme) => {
      document.documentElement.dataset.theme = nextTheme;
    }, theme);

    for (const viewportCase of viewportCases) {
      await page.setViewportSize({ width: viewportCase.width, height: 900 });
      const layout = await page.evaluate(() => {
        const selectors = [
          "[data-pd-id='notifications.history.search']",
          "[data-pd-id='notifications.history.type']",
          "[data-pd-id='notifications.history.status']",
          "[data-pd-id='notifications.history.mark-read']",
          "[data-pd-id='notifications.history.clear']",
        ];
        const controls = selectors.map((selector) => {
          const element = document.querySelector<HTMLElement>(selector);
          if (!element) throw new Error(`Missing ${selector}`);
          const field = element.closest<HTMLElement>("label.field-control") ?? element;
          const rect = element.getBoundingClientRect();
          const fieldRect = field.getBoundingClientRect();
          return {
            selector,
            rect: { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top },
            fieldRect: {
              bottom: fieldRect.bottom,
              left: fieldRect.left,
              right: fieldRect.right,
              top: fieldRect.top,
            },
          };
        });
        const toolbar = document.querySelector<HTMLElement>(".notification-history-toolbar");
        if (!toolbar) throw new Error("Missing notification history toolbar");
        const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
        return {
          canonicalGap: rootFontSize * 0.75,
          controls,
          documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
          toolbarOverflow: toolbar.scrollWidth - toolbar.clientWidth,
        };
      });

      expect(layout.documentOverflow, `${theme} ${viewportCase.name} page overflow`).toBeLessThanOrEqual(1);
      expect(layout.toolbarOverflow, `${theme} ${viewportCase.name} toolbar overflow`).toBeLessThanOrEqual(1);
      for (const control of layout.controls) {
        expect(control.rect.left, `${theme} ${viewportCase.name} ${control.selector} left containment`)
          .toBeGreaterThanOrEqual(control.fieldRect.left - 1);
        expect(control.rect.right, `${theme} ${viewportCase.name} ${control.selector} right containment`)
          .toBeLessThanOrEqual(control.fieldRect.right + 1);
      }
      for (let firstIndex = 0; firstIndex < layout.controls.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < layout.controls.length; secondIndex += 1) {
          const first = layout.controls[firstIndex];
          const second = layout.controls[secondIndex];
          expect(
            intersects(first.rect, second.rect),
            `${theme} ${viewportCase.name} ${first.selector} intersects ${second.selector}`,
          ).toBe(false);
          const sharesRow =
            first.rect.bottom > second.rect.top + 1 && second.rect.bottom > first.rect.top + 1;
          if (sharesRow) {
            const horizontalGap = Math.max(
              second.rect.left - first.rect.right,
              first.rect.left - second.rect.right,
            );
            expect(
              horizontalGap,
              `${theme} ${viewportCase.name} ${first.selector} gap to ${second.selector}`,
            ).toBeGreaterThanOrEqual(layout.canonicalGap - 1);
          }
        }
      }
    }
  }

  await page.setViewportSize({ width: 1180, height: 900 });
  const search = page.locator('[data-pd-id="notifications.history.search"]');
  const type = page.locator('[data-pd-id="notifications.history.type"]');
  const status = page.locator('[data-pd-id="notifications.history.status"]');
  await search.focus();
  await page.keyboard.press("Tab");
  await expect(type).toBeFocused();
  await expect(type).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Tab");
  await expect(status).toBeFocused();
  await expect(status).toHaveCSS("outline-style", "solid");
  const focusedLayout = await page.evaluate(() => {
    const type = document.querySelector<HTMLElement>("[data-pd-id='notifications.history.type']");
    const status = document.querySelector<HTMLElement>("[data-pd-id='notifications.history.status']");
    const toolbar = document.querySelector<HTMLElement>(".notification-history-toolbar");
    if (!type || !status || !toolbar) throw new Error("Missing focused controls");
    const typeStyle = getComputedStyle(type);
    const typeRect = type.getBoundingClientRect();
    const statusRect = status.getBoundingClientRect();
    const expansion = Number.parseFloat(typeStyle.outlineWidth) + Number.parseFloat(typeStyle.outlineOffset);
    return {
      focusRect: {
        bottom: typeRect.bottom + expansion,
        left: typeRect.left - expansion,
        right: typeRect.right + expansion,
        top: typeRect.top - expansion,
      },
      statusRect: {
        bottom: statusRect.bottom,
        left: statusRect.left,
        right: statusRect.right,
        top: statusRect.top,
      },
      toolbarOverflow: getComputedStyle(toolbar).overflow,
      typeParentOverflow: getComputedStyle(type.parentElement!).overflow,
    };
  });
  expect(intersects(focusedLayout.focusRect, focusedLayout.statusRect)).toBe(false);
  expect(focusedLayout.toolbarOverflow).toBe("visible");
  expect(focusedLayout.typeParentOverflow).toBe("visible");

  await page.evaluate(() => {
    document.documentElement.style.fontSize = "20px";
  });
  const scaledLayout = await page.evaluate(() => {
    const controls = [
      document.querySelector<HTMLElement>("[data-pd-id='notifications.history.type']"),
      document.querySelector<HTMLElement>("[data-pd-id='notifications.history.status']"),
    ];
    if (controls.some((control) => !control)) throw new Error("Missing scaled controls");
    return controls.map((control) => {
      const rect = control!.getBoundingClientRect();
      return { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top };
    });
  });
  expect(intersects(scaledLayout[0], scaledLayout[1])).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("Notification History controls retain canonical table-field geometry", async ({ page }) => {
  await installSyntheticNotificationHistory(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/notifications");
  await expect(
    page.locator('[data-pd-id="notifications.history.item.NOTICE-001"]'),
  ).toBeVisible();

  const geometry = await page.evaluate(() => {
    const selectors = [
      "[data-pd-id='notifications.history.search']",
      "[data-pd-id='notifications.history.type']",
      "[data-pd-id='notifications.history.status']",
    ];
    return selectors.map((selector) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      const style = getComputedStyle(element);
      return {
        borderRadius: style.borderRadius,
        height: element.getBoundingClientRect().height,
        paddingBlock: `${style.paddingTop} ${style.paddingBottom}`,
      };
    });
  });
  expect(new Set(geometry.map((control) => Math.round(control.height))).size).toBe(1);
  expect(new Set(geometry.map((control) => control.borderRadius)).size).toBe(1);
  expect(new Set(geometry.map((control) => control.paddingBlock)).size).toBe(1);
});

test("shared settings filters retain child containment after the primitive fix", async ({ page }) => {
  await page.route("**/auth/session**", (route) => route.fulfill({
    json: {
      authenticated: true,
      email: "founder@example.invalid",
      linked_profile_ids: [],
      name: "Synthetic Founder",
      role: "fund_manager",
    },
  }));
  await page.route("**/auth/activity**", (route) => route.fulfill({ status: 204 }));
  await page.route("**/fund-manager/notifications**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const json = pathname.endsWith("/state")
      ? { dismissed_ids: [], read_keys: [] }
      : pathname.endsWith("/preferences")
        ? { preferences: {} }
        : [];
    return route.fulfill({ json });
  });
  await page.route("**/account-catalogue/source", (route) => route.fulfill({
    json: {
      catalogue_name: "Synthetic canonical catalogue",
      default_operating_context: { channels: [], jurisdiction: "", subdivision: "" },
      records: [],
      schema_version: "1.0",
      updated_at: "2026-09-07",
    },
  }));
  await page.setViewportSize({ width: 861, height: 900 });
  await page.goto("/settings#catalogue");
  await expect(page.locator('[data-pd-id="account-catalogue.section"]')).toBeVisible();

  const containment = await page.evaluate(() => {
    const selectors = [
      "[data-pd-id='account-catalogue.search']",
      "[data-pd-id='account-catalogue.type-filter']",
      "[data-pd-id='account-catalogue.status-filter']",
    ];
    return selectors.map((selector) => {
      const control = document.querySelector<HTMLElement>(selector);
      const field = control?.closest<HTMLElement>("label.field-control");
      if (!control || !field) throw new Error(`Missing shared toolbar control ${selector}`);
      const controlRect = control.getBoundingClientRect();
      const fieldRect = field.getBoundingClientRect();
      return {
        control: { left: controlRect.left, right: controlRect.right },
        field: { left: fieldRect.left, right: fieldRect.right },
      };
    });
  });
  for (const item of containment) {
    expect(item.control.left).toBeGreaterThanOrEqual(item.field.left - 1);
    expect(item.control.right).toBeLessThanOrEqual(item.field.right + 1);
  }
});
