import { describe, expect, it } from "vitest";
import { designLabAllowed } from "./design-lab-access";

describe("Design Lab route isolation", () => {
  const local = { host: "localhost:3010", enabled: "true", nodeEnv: "development", vercel: undefined };
  it("admits only an explicitly enabled local development request", () => {
    expect(designLabAllowed(local)).toBe(true);
    expect(designLabAllowed({ ...local, host: "127.0.0.1:3010" })).toBe(true);
    expect(designLabAllowed({ ...local, enabled: undefined })).toBe(false);
    expect(designLabAllowed({ ...local, host: "example.com" })).toBe(false);
    expect(designLabAllowed({ ...local, nodeEnv: "production" })).toBe(false);
    expect(designLabAllowed({ ...local, vercel: "1" })).toBe(false);
  });
});
