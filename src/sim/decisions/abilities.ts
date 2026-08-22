// Activated abilities surface directly in the human's priority legal actions as
// `{ type: "ActivateAbility", data: { source_id, ability_index } }`. We group
// them by the permanent that owns them so the board can offer click-to-activate.

/* eslint-disable @typescript-eslint/no-explicit-any, sonarjs/redundant-type-aliases */

export type LegalAction = any;

/** Map each permanent's object id to its list of ActivateAbility actions. */
export function abilitiesBySource(
  actions: LegalAction[] | undefined,
): Map<number, LegalAction[]> {
  const map = new Map<number, LegalAction[]>();
  for (const a of actions ?? []) {
    if (a?.type !== "ActivateAbility") continue;
    const id = a.data?.source_id;
    if (typeof id !== "number") continue;
    const list = map.get(id) ?? [];
    list.push(a);
    map.set(id, list);
  }
  return map;
}
