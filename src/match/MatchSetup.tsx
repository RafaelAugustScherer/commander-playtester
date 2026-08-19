import { useState } from "react";
import type { SavedDeck } from "../deck/model";
import type { PlayMode, RunConfig, SeatCount } from "./config";
import { SEAT_COUNTS, MIN_MATCHES, MAX_MATCHES, clampMatchCount } from "./config";
import type { AiDifficulty } from "../engine/types";
import { AI_DIFFICULTIES } from "../engine/types";
import { useI18n } from "../i18n/I18nContext";
import type { Lang } from "../i18n/messages";

const DIFFICULTY_LABEL: Record<AiDifficulty, Record<Lang, string>> = {
  VeryEasy: { pt: "Muito fácil", en: "Very easy" },
  Easy: { pt: "Fácil", en: "Easy" },
  Medium: { pt: "Médio", en: "Medium" },
  Hard: { pt: "Difícil", en: "Hard" },
  VeryHard: { pt: "Muito difícil", en: "Very hard" },
  CEDH: { pt: "cEDH", en: "cEDH" },
};

/** Pre-game configuration: opponents, pod size, play/watch, match count. */
export function MatchSetup({
  yourDeck,
  decks,
  onStart,
}: {
  yourDeck: SavedDeck;
  decks: SavedDeck[];
  onStart: (config: RunConfig) => void;
}) {
  const { t, lang } = useI18n();
  const [seatCount, setSeatCount] = useState<SeatCount>(4);
  const [mode, setMode] = useState<PlayMode>("watch");
  const [matchCount, setMatchCount] = useState(3);
  const [seed, setSeed] = useState(1);
  const [revealHands, setRevealHands] = useState(false);
  const [difficulty, setDifficulty] = useState<AiDifficulty>("Medium");
  const [opponentIds, setOpponentIds] = useState<string[]>([]);

  function opponentAt(index: number): string {
    return opponentIds[index] ?? decks[0]?.id ?? "";
  }

  function setOpponentAt(index: number, id: string) {
    const next = [...opponentIds];
    next[index] = id;
    setOpponentIds(next);
  }

  const opponentSeats = seatCount - 1;
  const allChosen =
    decks.length > 0 &&
    Array.from({ length: opponentSeats }, (_, i) => opponentAt(i)).every(
      Boolean,
    );

  function handleStart() {
    const seatDeckIds = [
      yourDeck.id,
      ...Array.from({ length: opponentSeats }, (_, i) => opponentAt(i)),
    ];
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
        <div className="chip">{yourDeck.name}</div>
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
          {decks.length === 0 ? (
            <p className="hint">{t("setup.needOpponent")}</p>
          ) : (
            <div className="opponent-grid">
              {Array.from({ length: opponentSeats }, (_, i) => (
                <select
                  key={i}
                  className="input"
                  value={opponentAt(i)}
                  onChange={(e) => setOpponentAt(i, e.target.value)}
                >
                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.name}
                    </option>
                  ))}
                </select>
              ))}
            </div>
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
      <div className="import__row">
        <button
          className="btn"
          onClick={handleStart}
          disabled={opponentSeats > 0 && !allChosen}
        >
          {matchCount > 1
            ? t("setup.startN", { n: clampMatchCount(matchCount) })
            : t("setup.startOne")}
        </button>
      </div>
    </section>
  );
}
