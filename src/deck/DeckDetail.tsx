import { useEffect, useState } from "react";
import { resolveDeckCached } from "../lib/scryfallCache";
import { goldfish, DEFAULT_CONFIG, type GoldfishResult } from "../lib/goldfish";
import type { ResolvedDeck } from "../lib/types";
import { GoldfishReport } from "../components/GoldfishReport";
import type { SavedDeck } from "./model";
import { isHundredCards } from "./model";
import { useI18n } from "../i18n/I18nContext";

type State =
  | { kind: "loading"; message: string }
  | { kind: "error"; message: string }
  | { kind: "done"; deck: ResolvedDeck; result: GoldfishResult };

/** Resolve a saved deck against Scryfall and show its consistency report. */
export function DeckDetail({
  deck,
  onBack,
  onPlay,
}: {
  deck: SavedDeck;
  onBack: () => void;
  onPlay: (deck: SavedDeck) => void;
}) {
  const { t } = useI18n();
  const [state, setState] = useState<State>({
    kind: "loading",
    message: t("detail.resolving"),
  });
  const playable = isHundredCards(deck);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading", message: t("detail.resolving") });
    (async () => {
      try {
        const resolved = await resolveDeckCached({
          commanders: deck.commanders,
          mainboard: deck.mainboard,
          warnings: [],
        });
        if (cancelled) return;
        if (resolved.library.length === 0) {
          setState({ kind: "error", message: t("detail.noneResolved") });
          return;
        }
        setState({ kind: "loading", message: t("detail.simulating") });
        await new Promise((r) => setTimeout(r, 0));
        const result = goldfish(resolved, DEFAULT_CONFIG);
        if (!cancelled) setState({ kind: "done", deck: resolved, result });
      } catch (err) {
        if (!cancelled) {
          setState({
            kind: "error",
            message: err instanceof Error ? err.message : t("detail.unexpected"),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deck.commanders, deck.mainboard, t]);

  return (
    <div>
      <section className="panel">
        <div className="panel__head">
          <div>
            <button className="btn btn--ghost btn--sm" onClick={onBack}>
              {t("detail.back")}
            </button>
            <h2 style={{ marginTop: "0.5rem" }}>
              {deck.name}
              {!playable && (
                <span
                  className="chip"
                  style={{ color: "var(--warn)", marginLeft: "0.5rem" }}
                >
                  {t("deck.partial")}
                </span>
              )}
            </h2>
          </div>
          <button
            className="btn"
            onClick={() => onPlay(deck)}
            disabled={!playable}
          >
            {t("detail.play")}
          </button>
        </div>

        {!playable && <p className="hint">{t("detail.partialReason")}</p>}
        {state.kind === "loading" && (
          <p className="hint">{state.message}</p>
        )}
        {state.kind === "error" && <p className="error">{state.message}</p>}
        {state.kind === "done" && (
          <div className="chips">
            <span className="chip">
              {state.deck.commanders.map((c) => c.name).join(", ") ||
                t("deck.noCommander")}
            </span>
            <span className="chip">
              {t("deck.cards", { n: state.deck.library.length })}
            </span>
            {state.deck.unresolved.length > 0 && (
              <span className="chip" style={{ color: "var(--bad)" }}>
                {t("detail.notFound", { n: state.deck.unresolved.length })}
              </span>
            )}
          </div>
        )}
      </section>

      {state.kind === "done" && <GoldfishReport result={state.result} />}
    </div>
  );
}
