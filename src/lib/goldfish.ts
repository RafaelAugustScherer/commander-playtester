import type { Card, ResolvedDeck } from "./types";
import { isLand } from "./types";
import { hasRole } from "./roles";
import { mulberry32, shuffle } from "./rng";

export interface GoldfishConfig {
  /** Number of games to simulate. More = smoother numbers, slower. */
  iterations: number;
  /** How many turns to play out per game. */
  turns: number;
  /** On the play (no turn-1 draw) vs. on the draw. */
  onThePlay: boolean;
  /** Max mulligans to take before keeping whatever we have. */
  maxMulligans: number;
  /** Seed for reproducible runs. */
  seed: number;
}

export const DEFAULT_CONFIG: GoldfishConfig = {
  iterations: 10000,
  turns: 6,
  onThePlay: true,
  maxMulligans: 3,
  seed: 1,
};

export interface GoldfishResult {
  iterations: number;
  turns: number;
  /** Fraction of games where at least one mulligan was taken. */
  mulliganRate: number;
  /** Average number of mulligans per game. */
  avgMulligans: number;
  /** Average lands in the final kept opening hand. */
  avgOpeningLands: number;
  /** Fraction of games "screwed" (<= 1 land in kept hand). */
  screwRate: number;
  /** Fraction of games "flooded" (>= 6 lands in kept hand). */
  floodRate: number;
  /** Per-turn probability a land drop was available (index 0 = turn 1). */
  landDropRate: number[];
  /** Per-turn average total mana available (index 0 = turn 1). */
  avgManaByTurn: number[];
  /** Fraction of games with >=1 ramp spell castable by end of turn 3. */
  rampByTurn3Rate: number;
  /** Composition snapshot of the library. */
  composition: DeckComposition;
}

export interface DeckComposition {
  librarySize: number;
  lands: number;
  ramp: number;
  draw: number;
  removal: number;
  /** Mana-value histogram of nonland cards (index = MV, capped at 7+). */
  curve: number[];
  avgNonlandManaValue: number;
}

/** Summarize the static composition of a deck's library. */
export function analyzeComposition(deck: ResolvedDeck): DeckComposition {
  const library = deck.library;
  const curve = new Array(8).fill(0); // 0..6, plus 7+ bucket at index 7
  let lands = 0;
  let ramp = 0;
  let draw = 0;
  let removal = 0;
  let nonlandCount = 0;
  let nonlandMvSum = 0;

  for (const card of library) {
    if (isLand(card)) {
      lands++;
    } else {
      nonlandCount++;
      nonlandMvSum += card.manaValue;
      const bucket = Math.min(7, Math.floor(card.manaValue));
      curve[bucket]++;
    }
    if (hasRole(card, "ramp")) ramp++;
    if (hasRole(card, "draw")) draw++;
    if (hasRole(card, "removal")) removal++;
  }

  return {
    librarySize: library.length,
    lands,
    ramp,
    draw,
    removal,
    curve,
    avgNonlandManaValue: nonlandCount === 0 ? 0 : nonlandMvSum / nonlandCount,
  };
}

interface GameState {
  hand: Card[];
  battlefieldLands: number;
  /** Extra mana per turn from resolved ramp (rocks, dorks, extra lands). */
  rampMana: number;
}

/** London mulligan keep heuristic: keep on a reasonable land count. */
function shouldKeep(hand: Card[], handSizeAfterBottom: number): boolean {
  const lands = hand.filter(isLand).length;
  // For a 7-card look, keep 2..5 lands. Loosen the window as the hand shrinks
  // since we're increasingly forced to keep.
  if (handSizeAfterBottom <= 5) return lands >= 1 && lands <= 6;
  if (handSizeAfterBottom === 6) return lands >= 2 && lands <= 5;
  return lands >= 2 && lands <= 5;
}

/**
 * Draw an opening hand applying the London mulligan: draw 7 each time, and on
 * keep, bottom one card per mulligan taken (we bottom the highest-MV nonland
 * spells, or excess lands, as a human roughly would).
 */
function drawOpeningHand(
  library: Card[],
  rng: () => number,
  maxMulligans: number,
): { hand: Card[]; mulligans: number } {
  let mulligans = 0;
  for (;;) {
    const shuffled = shuffle([...library], rng);
    const seven = shuffled.slice(0, 7);
    const handSizeAfterBottom = 7 - mulligans;
    const forced = mulligans >= maxMulligans;

    if (forced || shouldKeep(seven, handSizeAfterBottom)) {
      const hand = bottomCards(seven, mulligans);
      return { hand, mulligans };
    }
    mulligans++;
  }
}

/** Bottom `count` cards from a kept 7, trimming toward a healthy land count. */
function bottomCards(hand: Card[], count: number): Card[] {
  if (count <= 0) return hand;
  const kept = [...hand];
  const targetLands = 3;

  for (let i = 0; i < count && kept.length > 0; i++) {
    const landCount = kept.filter(isLand).length;
    if (landCount > targetLands) {
      // Bottom an excess land.
      const idx = kept.findIndex(isLand);
      kept.splice(idx, 1);
    } else {
      // Bottom the highest mana-value nonland spell (least castable early).
      let idx = -1;
      let maxMv = -1;
      for (let j = 0; j < kept.length; j++) {
        if (!isLand(kept[j]) && kept[j].manaValue > maxMv) {
          maxMv = kept[j].manaValue;
          idx = j;
        }
      }
      if (idx === -1) idx = 0; // all lands: bottom one anyway
      kept.splice(idx, 1);
    }
  }
  return kept;
}

/** Play out a single game and record per-turn signals. */
function simulateGame(
  library: Card[],
  config: GoldfishConfig,
  rng: () => number,
): {
  mulligans: number;
  openingLands: number;
  landDropByTurn: boolean[];
  manaByTurn: number[];
  rampByTurn3: boolean;
} {
  const { hand, mulligans } = drawOpeningHand(library, rng, config.maxMulligans);
  const openingLands = hand.filter(isLand).length;

  // Build the rest of the library as a draw pile (exclude the opening hand).
  const deck = shuffle([...library], rng);
  const drawPile = removeHandFromPile(deck, hand);

  const state: GameState = { hand: [...hand], battlefieldLands: 0, rampMana: 0 };
  const landDropByTurn: boolean[] = [];
  const manaByTurn: number[] = [];
  let rampByTurn3 = false;

  for (let turn = 1; turn <= config.turns; turn++) {
    // Draw step (skip only turn 1 when on the play).
    if (!(turn === 1 && config.onThePlay)) {
      const drawn = drawPile.shift();
      if (drawn) state.hand.push(drawn);
    }

    // Land drop.
    const landIdx = state.hand.findIndex(isLand);
    const madeLandDrop = landIdx !== -1;
    if (madeLandDrop) {
      state.hand.splice(landIdx, 1);
      state.battlefieldLands++;
    }
    landDropByTurn.push(madeLandDrop);

    // Available mana this turn.
    let availableMana = state.battlefieldLands + state.rampMana;

    // Greedily cast affordable ramp to accelerate future turns.
    for (;;) {
      const idx = cheapestCastableRamp(state.hand, availableMana);
      if (idx === -1) break;
      const spell = state.hand[idx];
      availableMana -= spell.manaValue;
      state.hand.splice(idx, 1);
      state.rampMana += 1; // each ramp piece yields ~1 extra mana going forward
      if (turn <= 3) rampByTurn3 = true;
    }

    manaByTurn.push(state.battlefieldLands + state.rampMana);
  }

  return { mulligans, openingLands, landDropByTurn, manaByTurn, rampByTurn3 };
}

/** Find the cheapest ramp spell in hand castable with the given mana. */
function cheapestCastableRamp(hand: Card[], mana: number): number {
  let idx = -1;
  let cheapest = Infinity;
  for (let i = 0; i < hand.length; i++) {
    const card = hand[i];
    if (isLand(card)) continue;
    if (!hasRole(card, "ramp")) continue;
    if (card.manaValue <= mana && card.manaValue < cheapest) {
      cheapest = card.manaValue;
      idx = i;
    }
  }
  return idx;
}

/** Remove one copy per opening-hand card from the draw pile. */
function removeHandFromPile(pile: Card[], hand: Card[]): Card[] {
  const remaining = [...pile];
  for (const card of hand) {
    const idx = remaining.indexOf(card);
    if (idx !== -1) remaining.splice(idx, 1);
  }
  return remaining;
}

/** Run the full Monte Carlo goldfish simulation over a deck. */
export function goldfish(
  deck: ResolvedDeck,
  config: GoldfishConfig = DEFAULT_CONFIG,
): GoldfishResult {
  const composition = analyzeComposition(deck);
  const rng = mulberry32(config.seed);
  const library = deck.library;

  if (library.length === 0) {
    throw new Error("Cannot goldfish an empty library.");
  }

  let mulliganGames = 0;
  let mulliganTotal = 0;
  let openingLandsTotal = 0;
  let screwGames = 0;
  let floodGames = 0;
  let rampByTurn3Games = 0;
  const landDropTotals = new Array(config.turns).fill(0);
  const manaTotals = new Array(config.turns).fill(0);

  for (let i = 0; i < config.iterations; i++) {
    const g = simulateGame(library, config, rng);
    if (g.mulligans > 0) mulliganGames++;
    mulliganTotal += g.mulligans;
    openingLandsTotal += g.openingLands;
    if (g.openingLands <= 1) screwGames++;
    if (g.openingLands >= 6) floodGames++;
    if (g.rampByTurn3) rampByTurn3Games++;
    for (let t = 0; t < config.turns; t++) {
      if (g.landDropByTurn[t]) landDropTotals[t]++;
      manaTotals[t] += g.manaByTurn[t];
    }
  }

  const n = config.iterations;
  return {
    iterations: n,
    turns: config.turns,
    mulliganRate: mulliganGames / n,
    avgMulligans: mulliganTotal / n,
    avgOpeningLands: openingLandsTotal / n,
    screwRate: screwGames / n,
    floodRate: floodGames / n,
    landDropRate: landDropTotals.map((c) => c / n),
    avgManaByTurn: manaTotals.map((c) => c / n),
    rampByTurn3Rate: rampByTurn3Games / n,
    composition,
  };
}
