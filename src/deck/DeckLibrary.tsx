import { useState } from "react";
import { DeckEditor } from "./DeckEditor";
import type { SavedDeck } from "./model";
import { totalCards } from "./model";
import { STARTER_DECKS } from "./starterDecks";
import { useI18n } from "../i18n/I18nContext";

/** Manage the library of named, reusable decks. */
export function DeckLibrary({
  decks,
  save,
  remove,
  onSelect,
}: {
  decks: SavedDeck[];
  save: (deck: SavedDeck) => void;
  remove: (id: string) => void;
  onSelect: (deck: SavedDeck) => void;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState<SavedDeck | "new" | null>(null);

  function addStarterDecks() {
    const now = Date.now();
    STARTER_DECKS.forEach((starter, i) => {
      save({
        id: crypto.randomUUID(),
        name: starter.name,
        commanders: starter.commanders,
        mainboard: starter.mainboard,
        createdAt: now + i,
        updatedAt: now + i,
      });
    });
  }

  if (editing) {
    return (
      <DeckEditor
        initial={editing === "new" ? undefined : editing}
        onSave={(deck) => {
          save(deck);
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>{t("library.title")}</h2>
        <button className="btn" onClick={() => setEditing("new")}>
          {t("library.new")}
        </button>
      </div>

      {decks.length === 0 ? (
        <div>
          <p className="hint">{t("library.empty")}</p>
          <button className="btn btn--ghost" onClick={addStarterDecks}>
            {t("library.addStarters", { n: STARTER_DECKS.length })}
          </button>
        </div>
      ) : (
        <ul className="deck-list">
          {decks.map((deck) => (
            <li key={deck.id} className="deck-list__item">
              <button
                className="deck-list__info"
                onClick={() => onSelect(deck)}
              >
                <span className="deck-list__name">{deck.name}</span>
                <span className="deck-list__meta">
                  {deck.commanders.map((c) => c.name).join(", ") ||
                    t("deck.noCommander")}{" "}
                  · {t("deck.cards", { n: totalCards(deck) })}
                </span>
              </button>
              <div className="deck-list__actions">
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => setEditing(deck)}
                >
                  {t("library.edit")}
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    if (confirm(t("library.confirmDelete", { name: deck.name })))
                      remove(deck.id);
                  }}
                >
                  {t("library.delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
