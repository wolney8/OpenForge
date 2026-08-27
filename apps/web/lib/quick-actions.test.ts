import { describe, expect, it } from "vitest";

import { resolveVisibleQuickActions } from "./quick-actions";

const action = (overrides: Partial<Parameters<typeof resolveVisibleQuickActions>[0][number]>) => ({
  preset_id: "action",
  label: "Action",
  ledger_type: "Casino",
  enabled: true,
  availability: "eligible" as const,
  availability_reason: "",
  ...overrides,
});

describe("resolveVisibleQuickActions", () => {
  it("puts required global actions before profile favourites and caps the visible carousel", () => {
    const visible = resolveVisibleQuickActions([
      action({ preset_id: "profile", label: "Profile favourite", is_favourite: true, favourite_order: 1 }),
      action({ preset_id: "optional", label: "Optional", sort_order: 1 }),
      action({ preset_id: "required-b", label: "Required B", enforced: true, sort_order: 2 }),
      action({ preset_id: "required-a", label: "Required A", enforced: true, sort_order: 1 }),
      action({ preset_id: "another", label: "Another optional", sort_order: 2 }),
      action({ preset_id: "blocked", label: "Blocked", availability: "blocked" }),
    ], "Casino");

    expect(visible.map((item) => item.preset_id)).toEqual(["required-a", "required-b", "profile", "optional"]);
  });
});
