import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { config, proxy } from "./proxy";

const originalEnvironment = { ...process.env };
const secret = "synthetic-session-secret-at-least-32-bytes";

function ownerToken(): string {
  const payload = Buffer.from(
    JSON.stringify({
      aud: "plum-duff",
      email: "founder@example.invalid",
      exp: Math.floor(Date.now() / 1000) + 600,
      iss: "plum-duff-api",
      role: "fund_manager",
    })
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

afterEach(() => {
  process.env = { ...originalEnvironment };
});

describe("application route proxy", () => {
  it("redirects unauthenticated protected routes to login with a safe return path", async () => {
    process.env.OPENFORGE_AUTH_REQUIRED = "true";
    process.env.OPENFORGE_AUTH_SESSION_SECRET = secret;
    process.env.OPENFORGE_AUTH_OWNER_EMAILS = "founder@example.invalid";

    const response = await proxy(
      new NextRequest("http://localhost:3010/profiles?view=reports")
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3010/login?next=%2Fprofiles%3Fview%3Dreports"
    );
  });

  it("protects the Fund Manager account route while leaving registration public", async () => {
    const protectedRequest = new NextRequest("http://localhost:3010/account");
    const protectedResponse = await proxy(protectedRequest);
    expect(protectedResponse.status).toBe(307);
    expect(protectedResponse.headers.get("location")).toBe(
      "http://localhost:3010/login?next=%2Faccount"
    );

    expect(config.matcher).not.toContain("/register");
  });

  it("allows an allowlisted current Fund Manager session", async () => {
    process.env.OPENFORGE_AUTH_REQUIRED = "true";
    process.env.OPENFORGE_AUTH_SESSION_SECRET = secret;
    process.env.OPENFORGE_AUTH_OWNER_EMAILS = "founder@example.invalid";
    const request = new NextRequest("http://localhost:3010/settings", {
      headers: { Cookie: `pd_session=${ownerToken()}` },
    });

    const response = await proxy(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
