import type { GameState, WaitingFor } from "../../engine/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface LibraryOrderCard {
  id: number;
  name: string;
}

export interface LibraryOrderPrompt {
  kind: "revealUntilBottom" | "digRestSplit";
  player: number;
  cards: LibraryOrderCard[];
  topCount: number;
  bottomCount: number;
  splitLocked: boolean;
}

function cardIds(d: any): number[] {
  return Array.isArray(d.cards)
    ? d.cards.filter((i: unknown): i is number => typeof i === "number")
    : [];
}

export function parseLibraryOrderPrompt(
  wf: WaitingFor | undefined,
  state: GameState,
): LibraryOrderPrompt | null {
  if (wf?.type !== "RevealUntilBottomOrder" && wf?.type !== "DigRestSplitChoice") {
    return null;
  }
  const d: any = wf.data ?? {};
  const ids = cardIds(d);
  if (ids.length === 0) return null;
  const isSplit = wf.type === "DigRestSplitChoice";
  const topCount = isSplit && typeof d.top_count === "number" ? d.top_count : 0;
  return {
    kind: isSplit ? "digRestSplit" : "revealUntilBottom",
    player: typeof d.player === "number" ? d.player : 0,
    cards: ids.map((id) => ({ id, name: state.objects?.[id]?.name ?? "" })),
    topCount,
    bottomCount: ids.length - topCount,
    splitLocked: isSplit && d.scope === "order_only",
  };
}

export function libraryOrderCanMove(
  prompt: LibraryOrderPrompt,
  from: number,
  to: number,
): boolean {
  if (to < 0 || to >= prompt.cards.length) return false;
  if (!prompt.splitLocked) return true;
  return from < prompt.topCount === to < prompt.topCount;
}

export function libraryOrderAction(order: number[]): {
  type: string;
  data: { cards: number[] };
} {
  return { type: "SelectCards", data: { cards: order } };
}
