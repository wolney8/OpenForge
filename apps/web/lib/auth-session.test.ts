import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { verifyFounderSessionToken } from "./auth-session";

const secret = "synthetic-session-secret-at-least-32-bytes";

function tokenFor(payload: Record<string, unknown>): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

describe("verifyFounderSessionToken", () => {
  it("accepts only a current allowlisted Fund Manager session", async () => {
    const token = tokenFor({
      aud: "plum-duff",
      email: "founder@example.invalid",
      exp: Math.floor(Date.now() / 1000) + 600,
      iss: "plum-duff-api",
      role: "fund_manager",
    });

    await expect(
      verifyFounderSessionToken(token, secret, "FOUNDER@example.invalid")
    ).resolves.toBe(true);
    await expect(
      verifyFounderSessionToken(token, secret, "other@example.invalid")
    ).resolves.toBe(false);
  });

  it("rejects tampered, expired, or incorrectly scoped sessions", async () => {
    const current = Math.floor(Date.now() / 1000);
    const expired = tokenFor({
      aud: "plum-duff",
      email: "founder@example.invalid",
      exp: current - 1,
      iss: "plum-duff-api",
      role: "fund_manager",
    });
    const subscriber = tokenFor({
      aud: "plum-duff",
      email: "founder@example.invalid",
      exp: current + 600,
      iss: "plum-duff-api",
      role: "subscriber",
    });

    await expect(
      verifyFounderSessionToken(`${expired.slice(0, -1)}x`, secret, "founder@example.invalid")
    ).resolves.toBe(false);
    await expect(
      verifyFounderSessionToken(expired, secret, "founder@example.invalid")
    ).resolves.toBe(false);
    await expect(
      verifyFounderSessionToken(subscriber, secret, "founder@example.invalid")
    ).resolves.toBe(false);
  });
});
