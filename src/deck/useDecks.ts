import { useCallback, useState } from "react";
import type { SavedDeck } from "./model";
import { listDecks, saveDeck, deleteDeck } from "./storage";

/** React state over the persistent named-deck store. */
export function useDecks() {
  const [decks, setDecks] = useState<SavedDeck[]>(() => listDecks());

  const refresh = useCallback(() => setDecks(listDecks()), []);

  const save = useCallback((deck: SavedDeck) => {
    saveDeck(deck);
    setDecks(listDecks());
  }, []);

  const remove = useCallback((id: string) => {
    deleteDeck(id);
    setDecks(listDecks());
  }, []);

  return { decks, refresh, save, remove };
}
