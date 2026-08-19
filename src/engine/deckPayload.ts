import type { SavedDeck } from "../deck/model";
import type { DecklistEntry } from "../lib/types";
import { frontFace } from "../lib/cardName";
import type { EngineDeckList, PlayerDeckPayload } from "./types";

function expand(entries: DecklistEntry[]): string[] {
  const names: string[] = [];
  for (const entry of entries) {
    const name = frontFace(entry.name);
    for (let i = 0; i < entry.quantity; i++) names.push(name);
  }
  return names;
}

/** Convert a saved deck into the engine's name-only per-seat payload. */
export function toPlayerDeck(deck: SavedDeck): PlayerDeckPayload {
  return {
    main_deck: expand(deck.mainboard),
    commander: expand(deck.commanders),
  };
}

/**
 * Assemble the engine deck payload for a pod. `seatDecks[0]` is you (seat 0),
 * the rest are opponents. Seats map to player / opponent / ai_decks[] in order.
 */
export function buildDeckList(
  seatDecks: SavedDeck[],
  difficulty: string,
): EngineDeckList {
  const [player, opponent, ...rest] = seatDecks.map(toPlayerDeck);
  const emptySeat: PlayerDeckPayload = { main_deck: [], commander: [] };
  return {
    player,
    opponent: opponent ?? emptySeat,
    ai_decks: rest,
    ai_difficulties: seatDecks.map(() => difficulty),
  };
}
