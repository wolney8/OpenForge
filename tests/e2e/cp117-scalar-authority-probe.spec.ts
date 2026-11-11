import { expect, test } from "@playwright/test";

test("isolated native PUT accepts a source record with one allowlisted scalar change", async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  expect(health.database_identity).toBe("cp117-integration-synthetic");
  await page.goto(process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/");
  for (const item of [
    { module: "sportsbook-bets", id: "CP117-CELL-001", field: "event_name" },
    { module: "free-bets", id: "CP117-FB-001", field: "event_name" },
    { module: "casino-offers", id: "CP117-CAS-001", field: "game" },
    { module: "each-way-extra-places", id: "CP117-EP-001", field: "runner" },
    { module: "cash-adjustments", id: "CA-SEED-001", field: "description" },
  ]) {
    const url = `/api/profiles/profile-demo-001/${item.module}/${item.id}`;
    const response = await page.request.get(url);
    expect(response.status(), item.module).toBe(200);
    const original = await response.json() as Record<string, unknown>;
    const prior = String(original[item.field] ?? "");
    const next = prior.endsWith(" · probe") ? prior.slice(0, -8) : `${prior} · probe`;
    const saved = await page.request.put(url, { data: { ...original, [item.field]: next } });
    expect(saved.status(), `${item.module}: ${await saved.text()}`).toBe(200);
    const after = await (await page.request.get(url)).json() as Record<string, unknown>;
    expect(after[item.field], item.module).toBe(next);
    for (const [key, value] of Object.entries(original)) {
      if (key !== item.field && !(key.endsWith("updated_at") || key.endsWith("_version"))) expect(after[key], `${item.module}.${key}`).toEqual(value);
    }
    const restored = await page.request.put(url, { data: { ...after, [item.field]: prior } });
    expect(restored.status(), `${item.module}: restore probe value`).toBe(200);
    expect((await (await page.request.get(url)).json() as Record<string, unknown>)[item.field]).toBe(prior);
  }
});
