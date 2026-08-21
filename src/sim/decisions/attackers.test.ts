import { describe, it, expect } from "vitest";
import { parseAttackersPrompt, declareAttackersAction } from "./attackers";
import type { GameObject, WaitingFor } from "../../engine/types";

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

  it("drops creatures with the Defender keyword the engine wrongly offers", () => {
    const objects: Record<string, GameObject> = {
      "53": { id: 53, zone: "Battlefield", keywords: ["Defender"] },
      "81": { id: 81, zone: "Battlefield", keywords: ["Flying"] },
    };
    const p = parseAttackersPrompt(REAL, objects)!;
    expect(p.attackers.map((a) => a.attackerId)).toEqual([81]);
  });

  it("returns null when every offered attacker has Defender", () => {
    const objects: Record<string, GameObject> = {
      "53": { id: 53, zone: "Battlefield", keywords: ["Defender"] },
      "81": { id: 81, zone: "Battlefield", keywords: ["Defender", "Reach"] },
    };
    expect(parseAttackersPrompt(REAL, objects)).toBeNull();
  });

  it("keeps all attackers when object data is unavailable", () => {
    const p = parseAttackersPrompt(REAL)!;
    expect(p.attackers.map((a) => a.attackerId)).toEqual([53, 81]);
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
