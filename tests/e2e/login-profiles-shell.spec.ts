import { test } from "@playwright/test";

test.describe("Login to profiles shell", () => {
  test.skip(
    true,
    "Scaffold baseline only. Enable once the dev server and profile shell data flow are wired."
  );

  test("moves from login to profiles to tracker dashboard", async () => {
    // This path is intentionally deferred until the shell is wired to a running app process.
  });
});
