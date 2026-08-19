// Ninjutsu (and commander ninjutsu) surfaces in the human's priority legal
// actions as its own action type, one entry per (ninja, returnable attacker)
// pair: `{ type: "ActivateNinjutsu", data: { ninjutsu_object_id, creature_to_return } }`.
// We group the entries by the ninja that would enter so the board can offer
// click-to-activate: choose the ninja, then which unblocked attacker to return.

import type { LegalAction } from "./abilities";

export interface NinjutsuOption {
  /** The unblocked attacker returned to hand as the ninjutsu cost. */
  creatureId: number;
  action: LegalAction;
}

/** Map each ninja's object id (in hand or the command zone) to its options. */
export function ninjutsuBySource(
  actions: LegalAction[] | undefined,
): Map<number, NinjutsuOption[]> {
  const map = new Map<number, NinjutsuOption[]>();
  for (const a of actions ?? []) {
    if (a?.type !== "ActivateNinjutsu") continue;
    const ninjaId = a.data?.ninjutsu_object_id;
    const creatureId = a.data?.creature_to_return;
    if (typeof ninjaId !== "number" || typeof creatureId !== "number") continue;
    const list = map.get(ninjaId) ?? [];
    list.push({ creatureId, action: a });
    map.set(ninjaId, list);
  }
  return map;
}
