import { useState } from "react";
import "./App.css";
import { DeckLibrary } from "./deck/DeckLibrary";
import { DeckDetail } from "./deck/DeckDetail";
import { DeckEditor } from "./deck/DeckEditor";
import { DraftView } from "./draft/DraftView";
import { useDecks } from "./deck/useDecks";
import { getLastPlayedDeckId, setLastPlayedDeckId } from "./deck/storage";
import type { SavedDeck } from "./deck/model";
import { MatchSetup } from "./match/MatchSetup";
import { RunView } from "./match/RunView";
import type { RunConfig } from "./match/config";
import { useI18n } from "./i18n/I18nContext";
import { LangToggle } from "./i18n/LangToggle";
import { SettingsMenu } from "./settings/SettingsMenu";
import { XpScroll } from "./components/XpScroll";
import iconDecks from "./assets/icon-decks.png";
import iconPlay from "./assets/icon-play.png";

type View = "decks" | "play";
type EditingState = SavedDeck | "new" | null;
type Translate = ReturnType<typeof useI18n>["t"];

function getWindowTitle(
  t: Translate,
  {
    playApp,
    runConfig,
    editing,
    selected,
    drafting,
  }: {
    playApp: boolean;
    runConfig: RunConfig | null;
    editing: EditingState;
    selected: SavedDeck | null;
    drafting: boolean;
  },
): string {
  if (playApp) return runConfig ? t("run.match") : t("setup.title");
  if (drafting) return t("draft.windowTitle");
  if (editing)
    return editing === "new" ? t("editor.newTitle") : t("editor.editTitle");
  if (selected) return t("win.reportTitle", { name: selected.name });
  return t("library.title");
}

function DecksView({
  decks,
  editing,
  selected,
  drafting,
  save,
  remove,
  setEditing,
  setSelected,
  setDrafting,
  setPlayDeck,
  setView,
}: {
  decks: SavedDeck[];
  editing: EditingState;
  selected: SavedDeck | null;
  drafting: boolean;
  save: (deck: SavedDeck) => void;
  remove: (id: string) => void;
  setEditing: (value: EditingState) => void;
  setSelected: (value: SavedDeck | null) => void;
  setDrafting: (value: boolean) => void;
  setPlayDeck: (value: SavedDeck | null) => void;
  setView: (value: View) => void;
}) {
  if (drafting) {
    return (
      <DraftView
        onSave={(deck) => {
          save(deck);
          setDrafting(false);
        }}
        onExit={() => setDrafting(false)}
      />
    );
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
  if (selected) {
    return (
      <DeckDetail
        deck={selected}
        onBack={() => setSelected(null)}
        onPlay={(deck) => {
          setPlayDeck(deck);
          setView("play");
        }}
      />
    );
  }
  return (
    <DeckLibrary
      decks={decks}
      save={save}
      remove={remove}
      onSelect={setSelected}
      onNew={() => setEditing("new")}
      onEdit={(deck) => setEditing(deck)}
      onDraft={() => setDrafting(true)}
    />
  );
}

function PlayView({
  decks,
  runConfig,
  preferredDeckId,
  setRunConfig,
  t,
}: {
  decks: SavedDeck[];
  runConfig: RunConfig | null;
  preferredDeckId: string | undefined;
  setRunConfig: (value: RunConfig | null) => void;
  t: Translate;
}) {
  if (decks.length === 0) {
    return (
      <section className="panel">
        <h2>{t("play.empty.title")}</h2>
        <p className="hint">{t("play.empty.body")}</p>
      </section>
    );
  }
  if (runConfig) {
    return (
      <RunView
        config={runConfig}
        seatDecks={runConfig.seatDeckIds
          .map((id) => decks.find((d) => d.id === id))
          .filter((d): d is SavedDeck => !!d)}
        onExit={() => setRunConfig(null)}
      />
    );
  }
  return (
    <MatchSetup
      decks={decks}
      initialDeckId={preferredDeckId}
      onStart={(config) => {
        setLastPlayedDeckId(config.seatDeckIds[0]);
        setRunConfig(config);
      }}
    />
  );
}

export function App() {
  const { t } = useI18n();
  const { decks, save, remove } = useDecks();
  const [view, setView] = useState<View>("decks");
  const [selected, setSelected] = useState<SavedDeck | null>(null);
  const [editing, setEditing] = useState<EditingState>(null);
  const [drafting, setDrafting] = useState(false);
  const [playDeck, setPlayDeck] = useState<SavedDeck | null>(null);
  const [runConfig, setRunConfig] = useState<RunConfig | null>(null);

  const playApp = view === "play";
  // Report, drafting and live board go full-bleed; forms (library, editor, setup) cap width.
  const wideContent = playApp ? !!runConfig : drafting || (!editing && !!selected);

  const preferredDeckId =
    (playDeck && decks.some((d) => d.id === playDeck.id) && playDeck.id) ||
    getLastPlayedDeckId() ||
    undefined;

  // Window title + icon are derived from the active view and its sub-state.
  const winTitle = getWindowTitle(t, { playApp, runConfig, editing, selected, drafting });

  return (
    <div className="xp-desktop">
      <div className="xp-window-area">
        <div className="xp-window">
          <div className="xp-titlebar">
            <img
              className="xp-titlebar__icon"
              src={playApp ? iconPlay : iconDecks}
              alt=""
            />
            <span className="xp-titlebar__title">{winTitle}</span>
          </div>
          <XpScroll
            wrapperClassName={`xp-content ${wideContent ? "xp-content--wide" : "xp-content--narrow"}`}
          >
            {view === "decks" && (
              <DecksView
                decks={decks}
                editing={editing}
                selected={selected}
                drafting={drafting}
                save={save}
                remove={remove}
                setEditing={setEditing}
                setSelected={setSelected}
                setDrafting={setDrafting}
                setPlayDeck={setPlayDeck}
                setView={setView}
              />
            )}

            {view === "play" && (
              <PlayView
                decks={decks}
                runConfig={runConfig}
                preferredDeckId={preferredDeckId}
                setRunConfig={setRunConfig}
                t={t}
              />
            )}
          </XpScroll>
        </div>
      </div>

      <div className="xp-taskbar">
        <button
          className={`xp-taskbtn ${playApp ? "" : "xp-taskbtn--active"}`}
          onClick={() => setView("decks")}
          aria-current={playApp ? undefined : "page"}
        >
          <img className="xp-taskbtn__icon" src={iconDecks} alt="" />
          {t("nav.decks")}
        </button>
        <button
          className={`xp-taskbtn ${playApp ? "xp-taskbtn--active" : ""}`}
          onClick={() => setView("play")}
          aria-current={playApp ? "page" : undefined}
        >
          <img className="xp-taskbtn__icon" src={iconPlay} alt="" />
          {t("nav.play")}
        </button>
        <SettingsMenu />
        <LangToggle />
      </div>
    </div>
  );
}
