// "Choose a creature type" (Cavern of Souls, Metallic Mimic, Unclaimed Territory…)
// arrives as a generic NamedChoice whose choice_type marks it a CreatureType — the
// same waiting_for also carries Color and other named choices, which stay AI-driven.
// data.options is the engine-filtered list of valid types; data.source names the
// permanent asking. Submit the pick as a ChooseOption action, echoing its string.

import type { WaitingFor } from "../../engine/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface CreatureTypePrompt {
  player: number;
  options: string[];
  /** The permanent asking for the choice, for the prompt (may be empty). */
  sourceName: string;
}

function isCreatureTypeChoice(choiceType: any): boolean {
  return (
    choiceType === "CreatureType" ||
    (choiceType && typeof choiceType === "object" && "CreatureType" in choiceType)
  );
}

/** Read a "choose a creature type" decision aimed at the human, or null. */
export function parseCreatureTypePrompt(
  wf: WaitingFor | undefined,
): CreatureTypePrompt | null {
  if (!wf || wf.type !== "NamedChoice") return null;
  const d: any = wf.data;
  if (!isCreatureTypeChoice(d?.choice_type)) return null;
  const options: string[] = Array.isArray(d?.options)
    ? d.options.filter((o: unknown): o is string => typeof o === "string")
    : [];
  if (options.length === 0) return null;
  return {
    player: d?.player ?? 0,
    options,
    sourceName: d?.source?.prompt?.display_name ?? "",
  };
}

/** Submit a named choice (creature type) back to the engine. */
export function chooseOptionAction(choice: string): {
  type: string;
  data: { choice: string };
} {
  return { type: "ChooseOption", data: { choice } };
}
