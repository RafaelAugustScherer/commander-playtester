import type { GameState, WaitingFor } from "../../engine/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface EmpowerJaceChoice {
  id: number;
  name: string;
}

export interface EmpowerJacePrompt {
  player: number;
  count: number;
  choices: EmpowerJaceChoice[];
}

export function parseEmpowerJacePrompt(
  wf: WaitingFor | undefined,
  state: GameState,
): EmpowerJacePrompt | null {
  if (!wf || wf.type !== "EmpowerJaceChoice") return null;
  const d: any = wf.data ?? {};
  const ids: number[] = Array.isArray(d.choices)
    ? d.choices.filter((i: unknown): i is number => typeof i === "number")
    : [];
  if (ids.length === 0) return null;
  return {
    player: typeof d.player === "number" ? d.player : 0,
    count: typeof d.count === "number" ? d.count : 0,
    choices: ids.map((id) => ({ id, name: state.objects?.[id]?.name ?? "" })),
  };
}

export function empowerJaceAction(id: number): {
  type: string;
  data: { cards: number[] };
} {
  return { type: "SelectCards", data: { cards: [id] } };
}
