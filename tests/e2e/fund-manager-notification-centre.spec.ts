import { expect, test } from "@playwright/test";

const apiBaseUrl = "http://127.0.0.1:8010";

test("notification panel defaults to New and requires a deliberate hover to mark read", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem("plum-duff:fund-manager-notifications:v1");
  });
  await page.route(`${apiBaseUrl}/fund-manager/notifications`, async (route) => {
    await route.fulfill({
      json: [
        {
          audience: "fund_manager",
          kind: "task",
          task_state: "new",
          notification_id: "partial-lay:PROFILE-HOVER:SB-HOVER:2026-07-21T12:00:00Z",
          notification_type: "partial_lay_reminder",
          title: "Partial lay recheck",
          ledger_label: "Sportsbook Bets",
          bookmaker_label: "Bookmaker A",
          message: "Synthetic hover-delay match",
          profile_id: "profile-demo-001",
          profile_name: "Subscriber Alpha",
          record_id: "SB-HOVER",
          due_at: "2099-07-23T18:00:00Z",
          settles_at: "2099-07-23T20:00:00Z",
          created_at: "2026-07-21T12:00:00Z",
          href: "/profiles/profile-demo-001/tracker/sportsbook-bets?record=SB-HOVER",
          tone: "warning",
        },
      ],
    });
  });

  await page.goto("/profiles");
  const trigger = page.locator('[data-pd-id="notifications.trigger"]');
  const panel = page.locator('[data-pd-id="notifications.panel"]');
  const newView = page.locator('[data-pd-id="notifications.view.new"]');
  const doneView = page.locator('[data-pd-id="notifications.view.done"]');
  const notificationCard = page.locator('[data-pd-id="notifications.item.SB-HOVER"]');

  await trigger.click();
  await expect(newView).toHaveAttribute("aria-pressed", "true");
  await doneView.click();
  await page.locator('[data-pd-id="notifications.close"]').click();
  await trigger.click();
  await expect(panel).toBeVisible();
  await expect(newView).toHaveAttribute("aria-pressed", "true");
  await expect(notificationCard).toHaveClass(/is-unread/);

  await notificationCard.hover();
  await page.waitForTimeout(250);
  await page.locator(".notification-panel-header").hover();
  await expect(notificationCard).toHaveClass(/is-unread/);
  await expect(trigger.locator(".notification-count-badge")).toHaveText("1");

  await notificationCard.hover();
  await page.waitForTimeout(850);
  await expect(notificationCard).not.toHaveClass(/is-unread/);
  await expect(trigger.locator(".notification-count-badge")).toHaveCount(0);
});

test("Fund Manager notification centre exposes and locally manages active reminders", async ({
  page,
  request,
}) => {
  const profileId = "profile-demo-001";
  const eventName = "Notification test match";
  let sportsbookBetId = "";

  const profileResponse = await request.get(`${apiBaseUrl}/profiles/${profileId}`);
  expect(profileResponse.ok()).toBeTruthy();
  const profileName = ((await profileResponse.json()) as { display_name: string }).display_name;

  await page.addInitScript(() => {
    window.localStorage.removeItem("plum-duff:fund-manager-notifications:v1");
  });

  try {
    const commissionResponse = await request.put(
      `${apiBaseUrl}/profiles/${profileId}/exchange-commissions`,
      { data: { exchange_name: "Matchbook", commission_rate: "0.02" } }
    );
    expect(commissionResponse.ok()).toBeTruthy();

    const createResponse = await request.post(
      `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`,
      {
        data: {
          event_name: eventName,
          offer_text: "Synthetic notification centre offer",
          bookmaker: "Bookmaker A",
          offer_type: "Bet & Get",
          bet_type: "Single",
          fixture_type: "Football",
          status: "Placed",
          result: "Pending",
          back_stake: "10.00",
          back_odds: "2.10",
          match_strategy: "Partial Lay",
          lay_odds_1: "2.20",
          lay_actual: "9.63",
          lay_matched_stake_1: "4.78",
          exchange_name: "Matchbook",
          date_settled: "2099-07-23T20:00:00Z",
        },
      }
    );
    expect(createResponse.ok()).toBeTruthy();
    sportsbookBetId = ((await createResponse.json()) as { sportsbook_bet_id: string })
      .sportsbook_bet_id;

    const reminderResponse = await request.put(
      `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${sportsbookBetId}/partial-lay-reminder`,
      {
        data: {
          state: "Active",
          due_at: "2099-07-23T18:00:00Z",
          reason: "Review the synthetic remaining exposure.",
        },
      }
    );
    expect(reminderResponse.ok()).toBeTruthy();

    const feedResponse = await request.get(`${apiBaseUrl}/fund-manager/notifications`);
    expect(feedResponse.ok()).toBeTruthy();
    const targetNotification = (
      (await feedResponse.json()) as Array<Record<string, unknown>>
    ).find((notification) => notification.record_id === sportsbookBetId);
    expect(targetNotification).toBeTruthy();
    await page.route(`${apiBaseUrl}/fund-manager/notifications`, async (route) => {
      const response = await route.fetch();
      const payload = (await response.json()) as Array<Record<string, unknown>>;
      await route.fulfill({
        response,
        json: payload.filter((notification) => notification.record_id === sportsbookBetId),
      });
    });

    await page.setViewportSize({ width: 1180, height: 820 });
    const trigger = page.locator('[data-pd-id="notifications.trigger"]');
    const backLayTrigger = page.getByRole("button", {
      name: "Choose back/lay colour theme",
    });
    for (const route of [
      "/login",
      `/profiles/${profileId}/tracker/dashboard`,
      "/profiles",
    ]) {
      await page.goto(route);
      await expect(trigger).toBeVisible();
    }

    await expect(trigger).toBeVisible();
    await expect(trigger.locator(".material-symbols-outlined")).toHaveText(
      "notifications_active"
    );
    await expect(trigger.locator(".notification-count-badge")).toBeVisible();
    expect(
      await trigger.evaluate((element, otherSelector) => {
        const other = document.querySelector(otherSelector);
        return Boolean(
          other && element.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING
        );
      }, '[aria-label="Choose back/lay colour theme"]')
    ).toBeTruthy();
    await expect(backLayTrigger).toBeVisible();

    await trigger.click();
    const panel = page.locator('[data-pd-id="notifications.panel"]');
    await expect(panel).toBeVisible();
    const notificationCard = page.locator(
      `[data-pd-id="notifications.item.${sportsbookBetId}"]`
    );
    await expect(
      notificationCard.locator(
        `[data-pd-id="notifications.item.${sportsbookBetId}.context"]`
      )
    ).toHaveText(`Sportsbook Bets · Bookmaker A · ${eventName}`);
    await expect(notificationCard).toContainText(profileName);

    const geometry = await panel.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        pageScrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });
    expect(geometry.top).toBeGreaterThanOrEqual(0);
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(1180);
    expect(geometry.bottom).toBeLessThanOrEqual(820);
    expect(geometry.pageScrollWidth).toBeLessThanOrEqual(geometry.viewportWidth);

    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await page.locator('[data-pd-id="notifications.actions.open"]').click();
    await page.getByRole("menuitem", { name: "Mark all as read" }).click();
    await expect(notificationCard).not.toHaveClass(/is-unread/);
    await expect(trigger.locator(".notification-count-badge")).toHaveCount(0);
    await expect(trigger.locator(".material-symbols-outlined")).toHaveText(
      "notifications_active"
    );

    await notificationCard
      .getByRole("button", { name: `Clear notification for ${profileName}` })
      .click();
    await expect(notificationCard.getByText("Are you sure?")).toBeVisible();
    const clearConfirmation = notificationCard.locator(
      '[data-pd-id="notifications.clear-confirmation"]'
    );
    const confirmationGeometry = await clearConfirmation.evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(confirmationGeometry.width).toBeGreaterThanOrEqual(200);
    expect(confirmationGeometry.scrollWidth).toBeLessThanOrEqual(
      confirmationGeometry.clientWidth
    );
    await notificationCard
      .getByRole("button", { name: "Cancel clearing notification" })
      .click();
    await expect(notificationCard.getByText("Are you sure?")).toHaveCount(0);

    const ledgerResolveResponse = await request.put(
      `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${sportsbookBetId}/partial-lay-reminder`,
      { data: { state: "Resolved", resolution_note: "Resolved from the ledger." } }
    );
    expect(ledgerResolveResponse.ok()).toBeTruthy();
    await page.evaluate(() => {
      window.dispatchEvent(new Event("plum-duff:fund-manager-notifications-refresh"));
    });
    await page.locator('[data-pd-id="notifications.view.done"]').click();
    await expect(notificationCard).toBeVisible();

    const reopenResponse = await request.put(
      `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${sportsbookBetId}/partial-lay-reminder`,
      {
        data: {
          state: "Active",
          due_at: "2099-07-23T18:00:00Z",
          reason: "Review the synthetic remaining exposure again.",
        },
      }
    );
    expect(reopenResponse.ok()).toBeTruthy();
    await page.evaluate(() => {
      window.dispatchEvent(new Event("plum-duff:fund-manager-notifications-refresh"));
    });
    await page.locator('[data-pd-id="notifications.view.new"]').click();
    await expect(notificationCard).toBeVisible();
    await notificationCard.evaluate((element) => {
      const observer = new MutationObserver(() => {
        if (element.classList.contains("is-exiting")) {
          document.documentElement.dataset.notificationExitObserved = "true";
          observer.disconnect();
        }
      });
      observer.observe(element, { attributeFilter: ["class"] });
    });
    await notificationCard
      .getByRole("button", { name: `Mark task done for ${profileName}` })
      .click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-notification-exit-observed",
      "true"
    );
    await expect(page.locator('[data-pd-id="notifications.view.new"]')).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(notificationCard).toHaveCount(0);
    await expect(page.locator('[data-pd-id="notifications.view.done"]')).toContainText(
      "Done 1"
    );
    await page.locator('[data-pd-id="notifications.view.done"]').click();
    await expect(notificationCard).toBeVisible();

    const sourceResponse = await request.get(
      `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${sportsbookBetId}`
    );
    expect(sourceResponse.ok()).toBeTruthy();
    expect((await sourceResponse.json()).partial_lay_reminder_state).toBe("Resolved");

    await notificationCard
      .getByRole("button", { name: `Clear notification for ${profileName}` })
      .click();
    await notificationCard.getByRole("button", { name: "Clear", exact: true }).click();
    await expect(notificationCard).toHaveCount(0);
    await expect(trigger.locator(".material-symbols-outlined")).toHaveText("notifications");
  } finally {
    if (sportsbookBetId) {
      await request.delete(
        `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${sportsbookBetId}`
      );
    }
  }
});
