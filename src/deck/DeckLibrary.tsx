import type { SavedDeck } from "./model";
import { isHundredCards, totalCards } from "./model";
import { STARTER_DECKS } from "./starterDecks";
import { useI18n } from "../i18n/I18nContext";

/** Manage the library of named, reusable decks. */
export function DeckLibrary({
  decks,
  save,
  remove,
  onSelect,
  onNew,
  onEdit,
}: {
  decks: SavedDeck[];
  save: (deck: SavedDeck) => void;
  remove: (id: string) => void;
  onSelect: (deck: SavedDeck) => void;
  onNew: () => void;
  onEdit: (deck: SavedDeck) => void;
}) {
  const { t } = useI18n();

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

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>{t("library.title")}</h2>
        <button className="btn" onClick={onNew}>
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
                <span className="deck-list__name">
                  {deck.name}
                  {!isHundredCards(deck) && (
                    <span
                      className="chip"
                      style={{ color: "var(--warn)", marginLeft: "0.5rem" }}
                    >
                      {t("deck.partial")}
                    </span>
                  )}
                </span>
                <span className="deck-list__meta">
                  {deck.commanders.map((c) => c.name).join(", ") ||
                    t("deck.noCommander")}{" "}
                  · {t("deck.cards", { n: totalCards(deck) })}
                </span>
              </button>
              <div className="deck-list__actions">
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => onEdit(deck)}
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
