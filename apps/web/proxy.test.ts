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

function expiredOwnerToken(): string {
  const payload = Buffer.from(
    JSON.stringify({
      aud: "plum-duff",
      email: "founder@example.invalid",
      exp: Math.floor(Date.now() / 1000) - 1,
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
    process.env.OPENFORGE_AUTH_REQUIRED = "true";
    process.env.OPENFORGE_AUTH_SESSION_SECRET = secret;
    process.env.OPENFORGE_AUTH_OWNER_EMAILS = "founder@example.invalid";
    const protectedRequest = new NextRequest("http://localhost:3010/account");
    const protectedResponse = await proxy(protectedRequest);
    expect(protectedResponse.status).toBe(307);
    expect(protectedResponse.headers.get("location")).toBe(
      "http://localhost:3010/login?next=%2Faccount"
    );

    expect(config.matcher).not.toContain("/register");
    expect(config.matcher).toContain("/oddsmatcher");
  });

  it("protects the local Design Lab with the existing Fund Manager session boundary", async () => {
    process.env.OPENFORGE_AUTH_REQUIRED = "true";
    process.env.OPENFORGE_AUTH_SESSION_SECRET = secret;
    process.env.OPENFORGE_AUTH_OWNER_EMAILS = "founder@example.invalid";
    expect(config.matcher).toContain("/design-lab/:path*");
    const missing = await proxy(new NextRequest("http://localhost:3010/design-lab"));
    expect(missing.headers.get("location")).toBe("http://localhost:3010/login?next=%2Fdesign-lab");
    const owner = await proxy(new NextRequest("http://localhost:3010/design-lab", {
      headers: { Cookie: `pd_session=${ownerToken()}` },
    }));
    expect(owner.status).toBe(200);
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

  it("distinguishes unavailable validation configuration from an expired session", async () => {
    process.env.OPENFORGE_AUTH_REQUIRED = "true";
    delete process.env.OPENFORGE_AUTH_SESSION_SECRET;
    delete process.env.OPENFORGE_AUTH_OWNER_EMAILS;
    const request = new NextRequest("http://localhost:3010/profiles", {
      headers: { Cookie: `pd_session=${ownerToken()}` },
    });

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3010/login?error=session_validation_unavailable&next=%2Fprofiles"
    );
  });

  it("continues to classify a configured expired session as ended", async () => {
    process.env.OPENFORGE_AUTH_REQUIRED = "true";
    process.env.OPENFORGE_AUTH_SESSION_SECRET = secret;
    process.env.OPENFORGE_AUTH_OWNER_EMAILS = "founder@example.invalid";
    const request = new NextRequest("http://localhost:3010/oddsmatcher", {
      headers: { Cookie: `pd_session=${expiredOwnerToken()}` },
    });

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3010/login?error=session_expired&next=%2Foddsmatcher"
    );
  });
});
