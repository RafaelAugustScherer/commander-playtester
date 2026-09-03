import { useState } from "react";
import type { SavedDeck } from "../deck/model";
import { isHundredCards } from "../deck/model";
import type { PlayMode, RunConfig, SeatCount } from "./config";
import { SEAT_COUNTS, MIN_MATCHES, MAX_MATCHES, clampMatchCount } from "./config";
import type { AiDifficulty } from "../engine/types";
import { AI_DIFFICULTIES } from "../engine/types";
import { useI18n } from "../i18n/I18nContext";
import type { Lang } from "../i18n/messages";
import { XpSelect } from "../components/XpSelect";

const DIFFICULTY_LABEL: Record<AiDifficulty, Record<Lang, string>> = {
  VeryEasy: { pt: "Muito fácil", en: "Very easy" },
  Easy: { pt: "Fácil", en: "Easy" },
  Medium: { pt: "Médio", en: "Medium" },
  Hard: { pt: "Difícil", en: "Hard" },
  VeryHard: { pt: "Muito difícil", en: "Very hard" },
  CEDH: { pt: "cEDH", en: "cEDH" },
};

/** Pre-game configuration: your deck, opponents, pod size, play/watch, match count. */
export function MatchSetup({
  decks,
  initialDeckId,
  onStart,
}: {
  decks: SavedDeck[];
  initialDeckId?: string;
  onStart: (config: RunConfig) => void;
}) {
  const { t, lang } = useI18n();
  const [seatCount, setSeatCount] = useState<SeatCount>(4);
  const [mode, setMode] = useState<PlayMode>("watch");
  const [matchCount, setMatchCount] = useState(1);
  const [seed, setSeed] = useState(1);
  const [revealHands, setRevealHands] = useState(false);
  const [difficulty, setDifficulty] = useState<AiDifficulty>("VeryHard");
  const [yourDeckId, setYourDeckId] = useState(
    decks.find((d) => d.id === initialDeckId)?.id ?? decks[0].id,
  );
  const [opponentIds, setOpponentIds] = useState<string[]>([]);

  const yourDeck = decks.find((d) => d.id === yourDeckId) ?? decks[0];
  const opponentDecks = decks.filter((d) => d.id !== yourDeck.id);

  function deckLabel(deck: SavedDeck): string {
    return isHundredCards(deck)
      ? deck.name
      : deck.name + t("setup.partialSuffix");
  }

  function opponentAt(index: number): string {
    const chosen = opponentIds[index];
    if (chosen && opponentDecks.some((d) => d.id === chosen)) return chosen;
    return opponentDecks[0]?.id ?? "";
  }

  function setOpponentAt(index: number, id: string) {
    const next = [...opponentIds];
    next[index] = id;
    setOpponentIds(next);
  }

  const opponentSeats = seatCount - 1;
  const chosenOpponentIds = Array.from({ length: opponentSeats }, (_, i) =>
    opponentAt(i),
  );
  const allChosen =
    opponentDecks.length > 0 && chosenOpponentIds.every(Boolean);
  const chosenDecks = [
    yourDeck,
    ...chosenOpponentIds
      .map((id) => decks.find((d) => d.id === id))
      .filter((d): d is SavedDeck => !!d),
  ];
  const hasPartialChosen = chosenDecks.some((d) => !isHundredCards(d));

  function handleStart() {
    const seatDeckIds = [yourDeck.id, ...chosenOpponentIds];
    onStart({
      seatDeckIds,
      mode,
      matchCount: clampMatchCount(matchCount),
      revealHands,
      difficulty,
      seed,
    });
  }

  return (
    <section className="panel">
      <h2>{t("setup.title")}</h2>

      <div className="field">
        <span className="field__label">{t("setup.yourDeck")}</span>
        <XpSelect
          options={decks.map((deck) => ({
            value: deck.id,
            label: deckLabel(deck),
          }))}
          value={yourDeck.id}
          onChange={setYourDeckId}
          ariaLabel={t("setup.yourDeck")}
        />
      </div>

      <div className="field">
        <span className="field__label">{t("setup.podSize")}</span>
        <div className="seg">
          {SEAT_COUNTS.map((count) => (
            <button
              key={count}
              className={`seg__btn ${seatCount === count ? "seg__btn--active" : ""}`}
              onClick={() => setSeatCount(count)}
              aria-pressed={seatCount === count}
            >
              {t("setup.players", { n: count })}
            </button>
          ))}
        </div>
      </div>

      {opponentSeats > 0 && (
        <div className="field">
          <span className="field__label">{t("setup.opponents")}</span>
          {opponentDecks.length === 0 ? (
            <p className="hint">{t("setup.needOpponent")}</p>
          ) : (
            <ol className="opponent-list">
              {Array.from({ length: opponentSeats }, (_, i) => (
                <li key={i} className="opponent-list__item">
                  <span className="opponent-list__num" aria-hidden="true">
                    {i + 1}
                  </span>
                  <XpSelect
                    options={opponentDecks.map((deck) => ({
                      value: deck.id,
                      label: deckLabel(deck),
                    }))}
                    value={opponentAt(i)}
                    onChange={(id) => setOpponentAt(i, id)}
                    ariaLabel={t("setup.opponentN", { n: i + 1 })}
                  />
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div className="field">
        <span className="field__label">{t("setup.mode")}</span>
        <div className="seg">
          <button
            className={`seg__btn ${mode === "play" ? "seg__btn--active" : ""}`}
            onClick={() => setMode("play")}
            aria-pressed={mode === "play"}
          >
            {t("setup.modePlay")}
          </button>
          <button
            className={`seg__btn ${mode === "watch" ? "seg__btn--active" : ""}`}
            onClick={() => setMode("watch")}
            aria-pressed={mode === "watch"}
          >
            {t("setup.modeWatch")}
          </button>
        </div>
        <p className="hint">
          {mode === "play" ? t("setup.modePlayHint") : t("setup.modeWatchHint")}
        </p>
      </div>

      <div className="field">
        <span className="field__label">{t("setup.difficulty")}</span>
        <div className="seg">
          {AI_DIFFICULTIES.map((d) => (
            <button
              key={d}
              className={`seg__btn ${difficulty === d ? "seg__btn--active" : ""}`}
              onClick={() => setDifficulty(d)}
              aria-pressed={difficulty === d}
            >
              {DIFFICULTY_LABEL[d][lang]}
            </button>
          ))}
        </div>
      </div>

      <div className="field-row">
        <label className="field">
          <span className="field__label">
            {t("setup.matches", { min: MIN_MATCHES, max: MAX_MATCHES })}
          </span>
          <input
            className="input"
            type="number"
            min={MIN_MATCHES}
            max={MAX_MATCHES}
            value={matchCount}
            onChange={(e) => setMatchCount(Number(e.target.value))}
            onBlur={() => setMatchCount(clampMatchCount(matchCount))}
          />
        </label>
        <label className="field">
          <span className="field__label">{t("setup.seed")}</span>
          <input
            className="input"
            type="number"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value) || 0)}
          />
        </label>
      </div>

      <label className="checkbox">
        <input
          type="checkbox"
          checked={revealHands}
          onChange={(e) => setRevealHands(e.target.checked)}
        />
        <span>{t("setup.reveal")}</span>
      </label>

      <p className="hint">{t("setup.timeHint")}</p>
      {hasPartialChosen && <p className="error">{t("setup.partialChosen")}</p>}
      <div className="import__row">
        <button
          className="btn"
          onClick={handleStart}
          disabled={(opponentSeats > 0 && !allChosen) || hasPartialChosen}
        >
          {matchCount > 1
            ? t("setup.startN", { n: clampMatchCount(matchCount) })
            : t("setup.startOne")}
        </button>
      </div>
    </section>
  );
}
