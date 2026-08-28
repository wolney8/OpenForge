import { describe, expect, it } from "vitest";

import { formatApiErrorBody } from "./api-error";

describe("formatApiErrorBody", () => {
  it("formats FastAPI validation arrays without object coercion", () => {
    expect(
      formatApiErrorBody(
        JSON.stringify({
          detail: [
            { loc: ["body", "catalogue", "records", 0, "brand_name"], msg: "Field required" },
            { loc: ["body", "catalogue", "records", 0, "foreground_colour"], msg: "Invalid colour" },
          ],
        })
      )
    ).toBe("records › 0 › brand_name: Field required. records › 0 › foreground_colour: Invalid colour");
  });

  it("preserves string details and uses a safe fallback for unknown objects", () => {
    expect(formatApiErrorBody('{"detail":"Catalogue conflict"}')).toBe("Catalogue conflict");
    expect(formatApiErrorBody('{"error":{"code":"unknown"}}', "Import failed.")).toBe(
      "Import failed."
    );
  });

  it("identifies the rejected scalar value in a structured validation error", () => {
    expect(
      formatApiErrorBody(
        JSON.stringify({
          detail: [
            {
              loc: ["body", "catalogue", "records", 102, "evidence", 1, "supports", 0],
              msg: "Input should be an allowed evidence field",
              input: "brand_name",
            },
          ],
        })
      )
    ).toBe(
      "records › 102 › evidence › 1 › supports › 0: Input should be an allowed evidence field (received: brand_name)"
    );
  });
});
