import { describe, it, expect } from "vitest";
import {
  parseAttackersPrompt,
  declareAttackersAction,
  clickAttacker,
  aimAtDefender,
  type AttackDraft,
  type AttackersPrompt,
} from "./attackers";
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

// Two attackers (7, 9), two defending players (1, 2). Each attacker may aim at
// either player — the shape the split-attack UI operates on.
const MULTI: AttackersPrompt = {
  player: 0,
  attackers: [
    {
      attackerId: 7,
      targets: [
        { type: "Player", data: 1 },
        { type: "Player", data: 2 },
      ],
    },
    {
      attackerId: 9,
      targets: [
        { type: "Player", data: 1 },
        { type: "Player", data: 2 },
      ],
    },
  ],
};

const empty = (): AttackDraft => ({ attacks: new Map(), selected: null });

describe("clickAttacker (single defender)", () => {
  const prompt: AttackersPrompt = {
    player: 0,
    attackers: [{ attackerId: 7, targets: [{ type: "Player", data: 1 }] }],
  };

  it("toggles an attacker on with its only legal target", () => {
    const r = clickAttacker(empty(), 7, prompt, false);
    expect([...r.attacks.entries()]).toEqual([[7, { type: "Player", data: 1 }]]);
    expect(r.selected).toBeNull();
  });

  it("toggles an already-declared attacker back off", () => {
    const on = clickAttacker(empty(), 7, prompt, false);
    const off = clickAttacker(on, 7, prompt, false);
    expect(off.attacks.size).toBe(0);
  });
});

describe("clickAttacker (multiple defenders)", () => {
  it("declares and focuses an attacker on first click", () => {
    const r = clickAttacker(empty(), 7, MULTI, true);
    expect(r.attacks.get(7)).toEqual({ type: "Player", data: 1 });
    expect(r.selected).toBe(7);
  });

  it("focuses a second attacker without dropping the first", () => {
    const a = clickAttacker(empty(), 7, MULTI, true);
    const b = clickAttacker(a, 9, MULTI, true);
    expect([...b.attacks.keys()]).toEqual([7, 9]);
    expect(b.selected).toBe(9);
  });

  it("re-focuses an already-declared attacker instead of removing it", () => {
    const a = clickAttacker(empty(), 7, MULTI, true);
    const b = clickAttacker(a, 9, MULTI, true); // 9 focused, 7 still declared
    const c = clickAttacker(b, 7, MULTI, true); // clicking unfocused 7 focuses it
    expect(c.attacks.has(7)).toBe(true);
    expect(c.selected).toBe(7);
  });

  it("removes an attacker when its focused card is clicked again", () => {
    const a = clickAttacker(empty(), 7, MULTI, true); // 7 focused
    const b = clickAttacker(a, 7, MULTI, true); // focused again -> remove
    expect(b.attacks.has(7)).toBe(false);
    expect(b.selected).toBeNull();
  });
});

describe("aimAtDefender", () => {
  it("re-aims only the focused attacker, leaving others untouched", () => {
    let d = clickAttacker(empty(), 7, MULTI, true); // 7 -> player 1, focused
    d = clickAttacker(d, 9, MULTI, true); // 9 -> player 1, focused
    d = aimAtDefender(d, 2, MULTI); // aim focused (9) at player 2
    expect(d.attacks.get(7)).toEqual({ type: "Player", data: 1 });
    expect(d.attacks.get(9)).toEqual({ type: "Player", data: 2 });
  });

  it("is a no-op when nothing is focused", () => {
    const d = aimAtDefender(empty(), 2, MULTI);
    expect(d.attacks.size).toBe(0);
    expect(d.selected).toBeNull();
  });

  it("ignores a seat the focused attacker cannot attack", () => {
    const focused = clickAttacker(empty(), 7, MULTI, true);
    const r = aimAtDefender(focused, 3, MULTI); // player 3 not a legal target
    expect(r.attacks.get(7)).toEqual({ type: "Player", data: 1 });
  });
});
