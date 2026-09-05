import type { BracketEstimate } from "../engine/draftQueries";

/**
 * The engine's own tier vocabulary, confirmed by runtime introspection
 * (`estimate_bracket_for_deck(...).tier`) — see `deck-draft/ADR-0001`. Ordered
 * lowest to highest power.
 */
export type EngineBracketTier =
  | "exhibition"
  | "core"
  | "upgraded"
  | "optimized"
  | "cedh";

const TIER_ORDER: EngineBracketTier[] = [
  "exhibition",
  "core",
  "upgraded",
  "optimized",
  "cedh",
];

/**
 * The user-facing bracket target set (glossary: "Exhibition, Core,
 * Upgraded/Focused, Optimized, cEDH"). "Focused" is the label shown to the
 * user for the engine's `upgraded` tier and is the default.
 */
export type BracketTarget =
  | "exhibition"
  | "core"
  | "focused"
  | "optimized"
  | "cedh";

export const BRACKET_TARGETS: BracketTarget[] = [
  "exhibition",
  "core",
  "focused",
  "optimized",
  "cedh",
];

export const DEFAULT_BRACKET_TARGET: BracketTarget = "focused";

const TARGET_TO_TIER: Record<BracketTarget, EngineBracketTier> = {
  exhibition: "exhibition",
  core: "core",
  focused: "upgraded",
  optimized: "optimized",
  cedh: "cedh",
};

/** How much a candidate is pushed down for each tier it pushes the deck past target. */
const PENALTY_PER_TIER_OVER = 2;

/**
 * Bracket tilt for a candidate: 0 when the deck-with-candidate is at or below
 * the bracket target, and a penalty that grows with each tier past it. A card
 * that would push the deck past the target is pushed down in the ranking, not
 * hidden (`draft-a-deck`, `deck-draft/ADR-0001`).
 */
export function bracketTilt(
  estimate: BracketEstimate | null,
  target: BracketTarget,
): number {
  if (!estimate) return 0;
  const targetIndex = TIER_ORDER.indexOf(TARGET_TO_TIER[target]);
  const estimateIndex = TIER_ORDER.indexOf(estimate.tier as EngineBracketTier);
  // An unrecognized tier (future engine vocabulary drift) is treated as "at
  // target" rather than penalized, so ranking degrades gracefully.
  if (estimateIndex === -1) return 0;
  const tiersOver = estimateIndex - targetIndex;
  if (tiersOver <= 0) return 0;
  return -tiersOver * PENALTY_PER_TIER_OVER;
}
