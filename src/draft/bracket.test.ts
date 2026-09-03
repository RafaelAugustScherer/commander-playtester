import { describe, it, expect } from "vitest";
import { bracketTilt } from "./bracket";
import type { BracketEstimate } from "../engine/draftQueries";

function estimate(tier: string): BracketEstimate {
  return {
    tier,
    axes: {},
    axis_caps_at_tier: {},
    contributing: {},
    violations: {},
    data_version: "test",
  };
}

describe("bracketTilt", () => {
  it("is 0 when there is no estimate", () => {
    expect(bracketTilt(null, "focused")).toBe(0);
  });

  it("is 0 when the estimate is exactly at the target tier", () => {
    expect(bracketTilt(estimate("upgraded"), "focused")).toBe(0);
  });

  it("is 0 when the estimate is below the target tier", () => {
    expect(bracketTilt(estimate("exhibition"), "focused")).toBe(0);
  });

  it("is negative and grows with each tier past the target", () => {
    const oneOver = bracketTilt(estimate("optimized"), "focused");
    const twoOver = bracketTilt(estimate("cedh"), "focused");
    expect(oneOver).toBeLessThan(0);
    expect(twoOver).toBeLessThan(oneOver);
  });

  it("treats an unrecognized tier as at-target rather than penalizing", () => {
    expect(bracketTilt(estimate("some-future-tier"), "focused")).toBe(0);
  });

  it("is 0 at every tier when the target is cEDH", () => {
    expect(bracketTilt(estimate("cedh"), "cedh")).toBe(0);
    expect(bracketTilt(estimate("optimized"), "cedh")).toBe(0);
  });
});
