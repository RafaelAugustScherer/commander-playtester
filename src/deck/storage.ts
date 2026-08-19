import type { SavedDeck } from "./model";

const STORAGE_KEY = "commander-playtester/decks/v1";
const LAST_PLAYED_KEY = "commander-playtester/last-played-deck/v1";

function readAll(): SavedDeck[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedDeck[]) : [];
  } catch {
    return [];
  }
}

function writeAll(decks: SavedDeck[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
}

/** All saved decks, most recently updated first. */
export function listDecks(): SavedDeck[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getDeck(id: string): SavedDeck | undefined {
  return readAll().find((d) => d.id === id);
}

/** Insert or update a deck by id, stamping updatedAt. */
export function saveDeck(deck: SavedDeck): SavedDeck {
  const decks = readAll();
  const stamped = { ...deck, updatedAt: Date.now() };
  const idx = decks.findIndex((d) => d.id === deck.id);
  if (idx === -1) {
    decks.push(stamped);
  } else {
    decks[idx] = stamped;
  }
  writeAll(decks);
  return stamped;
}

export function deleteDeck(id: string): void {
  writeAll(readAll().filter((d) => d.id !== id));
}

/** The deck id the user last started a run with, if any. */
export function getLastPlayedDeckId(): string | null {
  try {
    return localStorage.getItem(LAST_PLAYED_KEY);
  } catch {
    return null;
  }
}

export function setLastPlayedDeckId(id: string): void {
  try {
    localStorage.setItem(LAST_PLAYED_KEY, id);
  } catch {
    return;
  }
}
