import { describe, expect, it } from "vitest";

import fixture from "../../../tests/fixtures/sportsbook-odds-input-fixtures.json";
import calculatorFixture from "../../../tests/fixtures/calculator-odds-normalization-fixtures.json";

import {
  getSportsbookOddsInputError,
  normalizeCalculatorOddsInput,
  parseSportsbookOddsInput,
  SPORTSBOOK_ODDS_FORMAT_MESSAGE,
  SPORTSBOOK_ODDS_MINIMUM_MESSAGE,
} from "./sportsbook-odds-input";

describe("Sportsbook odds input", () => {
  it.each(fixture.valid)(
    "accepts the complete decimal value %s",
    (value) => {
      expect(getSportsbookOddsInputError(value)).toBeNull();
      expect(parseSportsbookOddsInput(value)).toBe(Number(value));
    }
  );

  it.each(fixture.invalid_format)("rejects the complete malformed value %s", (value) => {
    expect(getSportsbookOddsInputError(value)).toBe(SPORTSBOOK_ODDS_FORMAT_MESSAGE);
    expect(parseSportsbookOddsInput(value)).toBeNull();
  });

  it.each(fixture.below_minimum)("rejects odds below 1.01: %s", (value) => {
    expect(getSportsbookOddsInputError(value)).toBe(SPORTSBOOK_ODDS_MINIMUM_MESSAGE);
  });

  it("keeps optional and required empty states distinct", () => {
    expect(getSportsbookOddsInputError("")).toBeNull();
    expect(getSportsbookOddsInputError("", { required: true })).toBe("Enter odds.");
  });
});

describe("Calculator odds normalization", () => {
  it.each(calculatorFixture.valid)(
    "normalizes $input to $canonical",
    ({ input, canonical }) => expect(normalizeCalculatorOddsInput(input)).toMatchObject({ canonicalValue: canonical, error: null })
  );

  it.each(calculatorFixture.invalid)(
    "rejects ambiguous or malformed %s",
    (input) => expect(normalizeCalculatorOddsInput(input).error).not.toBeNull()
  );
});
