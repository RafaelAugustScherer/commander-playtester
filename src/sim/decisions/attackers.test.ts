import { describe, it, expect } from "vitest";
import { parseAttackersPrompt, declareAttackersAction } from "./attackers";
import type { WaitingFor } from "../../engine/types";

// A real DeclareAttackers waiting_for captured from the phase-rs WASM build.
const REAL: WaitingFor = {
  type: "DeclareAttackers",
  data: {
    player: 0,
    valid_attacker_ids: [53, 81],
    valid_attack_targets: [{ type: "Player", data: 1 }],
    valid_attack_targets_by_attacker: {
      "53": [{ type: "Player", data: 1 }],
      "81": [{ type: "Player", data: 1 }],
    },
  },
};

describe("parseAttackersPrompt", () => {
  it("parses eligible attackers and their legal targets", () => {
    const p = parseAttackersPrompt(REAL)!;
    expect(p.player).toBe(0);
    expect(p.attackers.map((a) => a.attackerId)).toEqual([53, 81]);
    expect(p.attackers[0].targets).toEqual([{ type: "Player", data: 1 }]);
  });

  it("returns null for non-attack waiting_for and empty attacker lists", () => {
    expect(parseAttackersPrompt(undefined)).toBeNull();
    expect(parseAttackersPrompt({ type: "Priority", data: {} })).toBeNull();
    expect(
      parseAttackersPrompt({
        type: "DeclareAttackers",
        data: { player: 0, valid_attacker_ids: [] },
      }),
    ).toBeNull();
  });
});

describe("declareAttackersAction", () => {
  it("builds the DeclareAttackers action echoing the target refs", () => {
    const action = declareAttackersAction([
      [53, { type: "Player", data: 1 }],
      [81, { type: "Player", data: 1 }],
    ]);
    expect(action).toEqual({
      type: "DeclareAttackers",
      data: {
        attacks: [
          [53, { type: "Player", data: 1 }],
          [81, { type: "Player", data: 1 }],
        ],
        bands: [],
      },
    });
  });

  it("represents no attackers as an empty attacks list", () => {
    expect(declareAttackersAction([]).data.attacks).toEqual([]);
  });
});
