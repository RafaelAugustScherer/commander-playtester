import { useEffect, useMemo, useRef, useState } from "react";
import type { SavedDeck } from "../deck/model";
import type { RunConfig } from "./config";
import { getEngine } from "../engine/EngineClient";
import { buildDeckList } from "../engine/deckPayload";
import {
  MatchRunner,
  DeckRejectedError,
  type MatchResult,
  type LegalActions,
  type HumanChoice,
} from "../sim/driver";
import { Board, type PlayInteraction } from "../board/Board";
import { toBoardView, type BoardView, type SeatMeta } from "../board/boardView";
import { aggregate } from "../analysis/matchStats";
import { fetchCardsCached } from "../lib/scryfallCache";
import { useI18n } from "../i18n/I18nContext";
import type { Lang } from "../i18n/messages";

type Phase = "loading" | "running" | "done" | "error";
type Speed = "slow" | "normal" | "fast";

const PACE_MS: Record<Speed, number> = { slow: 700, normal: 250, fast: 0 };
const SPEED_LABEL: Record<Speed, Record<Lang, string>> = {
  slow: { pt: "Lento", en: "Slow" },
  normal: { pt: "Normal", en: "Normal" },
  fast: { pt: "Rápido", en: "Fast" },
};

/** Cast/play action types that put a hand card onto the board (drag targets). */
const PLAYABLE_TYPES = new Set([
  "PlayLand",
  "CastSpell",
  "Foretell",
  "PlayFaceDown",
  "CastSpellForFree",
  "CastSpellAsMiracle",
  "CastSpellAsMadness",
  "CastSpellAsSneak",
  "CastSpellAsWebSlinging",
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function actionObjectId(a: any): number | undefined {
  const d = a?.data;
  if (!d) return undefined;
  if (typeof d.object_id === "number") return d.object_id;
  if (typeof d.hand_object === "number") return d.hand_object;
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findPass(actions: any[]): any | undefined {
  return actions.find((a) => a?.type === "PassPriority");
}

function commanderName(deck: SavedDeck): string {
  return deck.commanders.map((c) => c.name).join(", ");
}

function uniqueNames(decks: SavedDeck[]): string[] {
  const names = new Set<string>();
  for (const deck of decks) {
    for (const e of deck.commanders) names.add(e.name);
    for (const e of deck.mainboard) names.add(e.name);
  }
  return [...names];
}

interface HumanTurn {
  legal: LegalActions;
  resolve: (choice: HumanChoice) => void;
}

/** Runs a configured series of matches and renders the live board + results. */
export function RunView({
  config,
  seatDecks,
  onExit,
}: {
  config: RunConfig;
  seatDecks: SavedDeck[];
  onExit: () => void;
}) {
  const { t, lang } = useI18n();
  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState(t("run.preparing"));
  const [board, setBoard] = useState<BoardView | null>(null);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [images, setImages] = useState<Record<string, string>>({});
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<Speed>("normal");
  const [humanTurn, setHumanTurn] = useState<HumanTurn | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const runnerRef = useRef<MatchRunner | null>(null);

  const seatMeta: SeatMeta[] = useMemo(
    () =>
      seatDecks.map((d) => ({ name: d.name, commander: commanderName(d) })),
    [seatDecks],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const engine = getEngine();
        setMessage(t("run.loading"));
        await engine.ready();
        if (cancelled) return;

        setMessage(t("run.resolvingImages"));
        const { cards } = await fetchCardsCached(uniqueNames(seatDecks));
        if (cancelled) return;
        const imgMap: Record<string, string> = {};
        for (const [key, card] of cards) {
          if (card.imageUrl) imgMap[key] = card.imageUrl;
        }
        setImages(imgMap);

        const deckData = buildDeckList(seatDecks, config.difficulty);
        const runner = new MatchRunner(
          engine,
          deckData,
          {
            seatCount: config.seatDeckIds.length,
            matchCount: config.matchCount,
            difficulty: config.difficulty,
            seed: config.seed,
            mode: config.mode,
            humanSeat: 0,
            revealHands: config.revealHands,
            paceMs: PACE_MS.normal,
          },
          {
            onFrame: (env) => {
              if (!cancelled) setBoard(toBoardView(env, seatMeta));
            },
            onMatchStart: (m) => {
              if (!cancelled) setCurrentMatch(m);
            },
            onMatchEnd: (r) => {
              if (!cancelled) setResults((prev) => [...prev, r]);
            },
            requestHumanAction: (_env, legal) =>
              new Promise<HumanChoice>((resolve) => {
                if (cancelled) {
                  resolve({ ai: true });
                  return;
                }
                setHumanTurn({
                  legal,
                  resolve: (choice) => {
                    setHumanTurn(null);
                    resolve(choice);
                  },
                });
              }),
          },
        );
        runnerRef.current = runner;
        setPhase("running");
        await runner.run();
        if (!cancelled) setPhase("done");
      } catch (e) {
        if (!cancelled) {
          setPhase("error");
          setMessage(
            e instanceof DeckRejectedError
              ? t("run.invalidDeck", { reasons: e.reasons.join(" · ") })
              : e instanceof Error
                ? e.message
                : String(e),
          );
        }
      }
    })();
    return () => {
      cancelled = true;
      runnerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(
    () => aggregate(results, config.seatDeckIds.length),
    [results, config.seatDeckIds.length],
  );

  function togglePause() {
    const runner = runnerRef.current;
    if (!runner) return;
    if (paused) {
      runner.resume();
      setPaused(false);
    } else {
      runner.pause();
      setPaused(true);
    }
  }

  function changeSpeed(s: Speed) {
    setSpeed(s);
    runnerRef.current?.setPace(PACE_MS[s]);
  }

  // Reset any in-flight drag when the priority window changes.
  useEffect(() => {
    setDragging(null);
  }, [humanTurn]);

  // Space bar passes priority during the human's turn.
  useEffect(() => {
    if (!humanTurn) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        const pass = findPass(humanTurn.legal.actions ?? []);
        humanTurn.resolve(pass ? { action: pass } : { ai: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [humanTurn]);

  // Map draggable hand cards to their play actions for the current window.
  const play: PlayInteraction | undefined = useMemo(() => {
    if (!humanTurn) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = new Map<number, any>();
    for (const a of humanTurn.legal.actions ?? []) {
      if (!PLAYABLE_TYPES.has(a?.type)) continue;
      const id = actionObjectId(a);
      if (id != null && !map.has(id)) map.set(id, a);
    }
    return {
      playableIds: new Set(map.keys()),
      dragging,
      setDragging,
      onPlay: (objId: number) => {
        const a = map.get(objId);
        if (a) humanTurn.resolve({ action: a });
      },
    };
  }, [humanTurn, dragging]);

  const hasPlayable = (play?.playableIds.size ?? 0) > 0;

  return (
    <div>
      <section className="panel">
        <div className="panel__head">
          <h2>
            {config.matchCount > 1
              ? t("run.matchOf", {
                  i: Math.min(currentMatch + 1, config.matchCount),
                  n: config.matchCount,
                })
              : t("run.match")}
          </h2>
          <div className="deck-list__actions">
            {phase === "running" && (
              <>
                <div className="seg">
                  {(["slow", "normal", "fast"] as Speed[]).map((s) => (
                    <button
                      key={s}
                      className={`seg__btn ${speed === s ? "seg__btn--active" : ""}`}
                      onClick={() => changeSpeed(s)}
                    >
                      {SPEED_LABEL[s][lang]}
                    </button>
                  ))}
                </div>
                <button className="btn btn--ghost btn--sm" onClick={togglePause}>
                  {paused ? t("run.resume") : t("run.pause")}
                </button>
              </>
            )}
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => {
                runnerRef.current?.abort();
                onExit();
              }}
            >
              {t("run.exit")}
            </button>
          </div>
        </div>

        {phase === "loading" && <p className="hint">{message}</p>}
        {phase === "error" && <p className="error">{message}</p>}

        {results.length > 0 && (
          <div className="chips">
            <span className="chip">
              {t("run.yourWins", {
                w: stats.yourWins,
                n: stats.played - stats.stalls,
              })}
            </span>
            <span className="chip">
              {t("run.winRate", { p: (stats.winRate * 100).toFixed(0) })}
            </span>
            {config.matchCount > 1 && (
              <span className="chip">
                {t("run.ci95", {
                  a: (stats.ci95[0] * 100).toFixed(0),
                  b: (stats.ci95[1] * 100).toFixed(0),
                })}
              </span>
            )}
          </div>
        )}
      </section>

      {humanTurn && (
        <section className="panel play-controls">
          <div className="panel__head">
            <h3 style={{ margin: 0 }}>{t("turn.title")}</h3>
            <span className="hint">{t("turn.spaceHint")}</span>
          </div>
          <p className="hint">
            {hasPlayable ? t("turn.dragHint") : t("turn.nothingToPlay")}
          </p>
          <div className="import__row">
            <button
              className="btn"
              onClick={() => {
                const pass = findPass(humanTurn.legal.actions ?? []);
                humanTurn.resolve(pass ? { action: pass } : { ai: true });
              }}
            >
              {t("turn.pass")}
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => humanTurn.resolve({ ai: true })}
            >
              {t("turn.letAi")}
            </button>
          </div>
        </section>
      )}

      {board && (
        <section className="panel">
          <Board view={board} images={images} play={play} />
        </section>
      )}

      {phase === "done" && (
        <RunReport
          stats={stats}
          results={results}
          seatMeta={seatMeta}
          onExit={onExit}
        />
      )}
    </div>
  );
}

function RunReport({
  stats,
  results,
  seatMeta,
  onExit,
}: {
  stats: ReturnType<typeof aggregate>;
  results: MatchResult[];
  seatMeta: SeatMeta[];
  onExit: () => void;
}) {
  const { t } = useI18n();
  const seatName = (seat: number) =>
    seatMeta[seat]?.name ?? t("board.player", { n: seat + 1 });

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>{t("report.title")}</h2>
        <button className="btn" onClick={onExit}>
          {t("report.newSetup")}
        </button>
      </div>
      <div className="stat-grid">
        <Stat
          label={t("report.winRateDeck")}
          value={`${(stats.winRate * 100).toFixed(1)}%`}
        />
        <Stat
          label={t("report.interval95")}
          value={`${(stats.ci95[0] * 100).toFixed(0)}–${(stats.ci95[1] * 100).toFixed(0)}%`}
        />
        <Stat label={t("report.decided")} value={`${stats.played - stats.stalls}`} />
        <Stat label={t("report.draws")} value={`${stats.draws}`} />
        <Stat label={t("report.avgTurns")} value={stats.avgTurns.toFixed(1)} />
        <Stat
          label={t("report.avgTime")}
          value={`${stats.avgSeconds.toFixed(0)}s`}
        />
      </div>

      <h3 style={{ marginTop: "1.25rem" }}>{t("report.winsBySeat")}</h3>
      <div className="chips">
        {stats.winsBySeat.map((w, seat) => (
          <span key={seat} className="chip">
            {seatName(seat)}: {w}
          </span>
        ))}
        {stats.stalls > 0 && (
          <span className="chip" style={{ color: "var(--warn)" }}>
            {t("report.noResult", { n: stats.stalls })}
          </span>
        )}
      </div>

      <h3 style={{ marginTop: "1.25rem" }}>{t("report.matches")}</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>{t("report.colWinner")}</th>
            <th>{t("report.colTurns")}</th>
            <th>{t("report.colTime")}</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.matchIndex}>
              <td>{r.matchIndex + 1}</td>
              <td>
                {r.stopped
                  ? "—"
                  : r.winner === null
                    ? t("board.draw")
                    : seatName(r.winner)}
              </td>
              <td>{r.turns}</td>
              <td>{r.seconds.toFixed(0)}s</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="stat__label">{label}</div>
      <div className="stat__value">{value}</div>
    </div>
  );
}
