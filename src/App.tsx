import { useState } from "react";
import "./App.css";
import { DeckLibrary } from "./deck/DeckLibrary";
import { DeckDetail } from "./deck/DeckDetail";
import { useDecks } from "./deck/useDecks";
import { getLastPlayedDeckId, setLastPlayedDeckId } from "./deck/storage";
import type { SavedDeck } from "./deck/model";
import { MatchSetup } from "./match/MatchSetup";
import { RunView } from "./match/RunView";
import type { RunConfig } from "./match/config";
import { useI18n } from "./i18n/I18nContext";
import { LangToggle } from "./i18n/LangToggle";

type View = "decks" | "play";

export function App() {
  const { t } = useI18n();
  const { decks, save, remove } = useDecks();
  const [view, setView] = useState<View>("decks");
  const [selected, setSelected] = useState<SavedDeck | null>(null);
  const [playDeck, setPlayDeck] = useState<SavedDeck | null>(null);
  const [runConfig, setRunConfig] = useState<RunConfig | null>(null);

  const wide = view === "play" && !!runConfig;

  const preferredDeckId =
    (playDeck && decks.some((d) => d.id === playDeck.id) && playDeck.id) ||
    getLastPlayedDeckId() ||
    undefined;

  return (
    <div className={`app${wide ? " app--wide" : ""}`}>
      <header className="app__header app__header--row">
        <div>
          <h1>Commander Playtester</h1>
          <p className="app__subtitle">{t("app.subtitle")}</p>
        </div>
        <div className="app__nav">
          <LangToggle />
          <nav className="tabs">
            <button
              className={`tab ${view === "decks" ? "tab--active" : ""}`}
              onClick={() => setView("decks")}
              aria-current={view === "decks" ? "page" : undefined}
            >
              {t("nav.decks")}
            </button>
            <button
              className={`tab ${view === "play" ? "tab--active" : ""}`}
              onClick={() => setView("play")}
              aria-current={view === "play" ? "page" : undefined}
            >
              {t("nav.play")}
            </button>
          </nav>
        </div>
      </header>

      {view === "decks" &&
        (selected ? (
          <DeckDetail
            deck={selected}
            onBack={() => setSelected(null)}
            onPlay={(deck) => {
              setPlayDeck(deck);
              setView("play");
            }}
          />
        ) : (
          <DeckLibrary
            decks={decks}
            save={save}
            remove={remove}
            onSelect={setSelected}
          />
        ))}

      {view === "play" &&
        (decks.length === 0 ? (
          <section className="panel">
            <h2>{t("play.empty.title")}</h2>
            <p className="hint">{t("play.empty.body")}</p>
          </section>
        ) : runConfig ? (
          <RunView
            config={runConfig}
            seatDecks={runConfig.seatDeckIds
              .map((id) => decks.find((d) => d.id === id))
              .filter((d): d is SavedDeck => !!d)}
            onExit={() => setRunConfig(null)}
          />
        ) : (
          <MatchSetup
            decks={decks}
            initialDeckId={preferredDeckId}
            onStart={(config) => {
              setLastPlayedDeckId(config.seatDeckIds[0]);
              setRunConfig(config);
            }}
          />
        ))}
    </div>
  );
}
