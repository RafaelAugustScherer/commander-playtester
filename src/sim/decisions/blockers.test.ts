import { describe, it, expect } from "vitest";
import { parseBlockersPrompt, declareBlockersAction } from "./blockers";
import type { WaitingFor } from "../../engine/types";

// A real DeclareBlockers waiting_for captured from the phase-rs WASM build.
const REAL: WaitingFor = {
  type: "DeclareBlockers",
  data: {
    player: 0,
    valid_blocker_ids: [81],
    valid_block_targets: { "81": [200] },
  },
};

describe("parseBlockersPrompt", () => {
  it("parses eligible blockers and the attackers each may block", () => {
    const p = parseBlockersPrompt(REAL)!;
    expect(p.player).toBe(0);
    expect([...p.blockers.keys()]).toEqual([81]);
    expect(p.blockers.get(81)).toEqual([200]);
  });

  it("returns null for non-block waiting_for and empty blocker lists", () => {
    expect(parseBlockersPrompt(undefined)).toBeNull();
    expect(parseBlockersPrompt({ type: "Priority", data: {} })).toBeNull();
    expect(
      parseBlockersPrompt({
        type: "DeclareBlockers",
        data: { player: 0, valid_blocker_ids: [] },
      }),
    ).toBeNull();
  });
});

describe("declareBlockersAction", () => {
  it("builds a DeclareBlockers action from [blocker, attacker] pairs", () => {
    expect(declareBlockersAction([[199, 142]])).toEqual({
      type: "DeclareBlockers",
      data: { assignments: [[199, 142]] },
    });
  });

  it("represents no blocks as an empty assignments list", () => {
    expect(declareBlockersAction([]).data.assignments).toEqual([]);
  });
});
