import { useState } from "react";
import "./App.css";
import { parseDecklist } from "./lib/decklist";
import { resolveDeck } from "./lib/scryfall";
import { goldfish, DEFAULT_CONFIG, type GoldfishResult } from "./lib/goldfish";
import type { ResolvedDeck } from "./lib/types";
import { GoldfishReport } from "./components/GoldfishReport";
import { SAMPLE_DECK } from "./lib/sampleDeck";

type Status =
  | { kind: "idle" }
  | { kind: "loading"; message: string }
  | { kind: "error"; message: string }
  | { kind: "done"; deck: ResolvedDeck; result: GoldfishResult };

export function App() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function run() {
    const parsed = parseDecklist(text);
    if (parsed.commanders.length === 0 && parsed.mainboard.length === 0) {
      setStatus({ kind: "error", message: "Cole uma decklist para começar." });
      return;
    }

    setStatus({ kind: "loading", message: "Resolvendo cartas no Scryfall…" });
    try {
      const deck = await resolveDeck(parsed);
      if (deck.library.length === 0) {
        setStatus({
          kind: "error",
          message: "Nenhuma carta resolvida. Confira o formato da lista.",
        });
        return;
      }
      setStatus({ kind: "loading", message: "Simulando partidas…" });
      // Yield to the browser so the loading state paints before the CPU work.
      await new Promise((r) => setTimeout(r, 0));
      const result = goldfish(deck, DEFAULT_CONFIG);
      setStatus({ kind: "done", deck, result });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Falha inesperada.",
      });
    }
  }

  const busy = status.kind === "loading";

  return (
    <div className="app">
      <header className="app__header">
        <h1>Commander Playtester</h1>
        <p className="app__subtitle">
          Importe uma decklist, simule milhares de aberturas e veja a
          consistência do deck.
        </p>
      </header>

      <section className="panel">
        <h2>1. Importar decklist</h2>
        <p className="hint">
          Cole no formato Moxfield/Archidekt (ex.: <code>1 Sol Ring</code>).
          Marque o comandante com uma seção <code>Commander</code>.
        </p>
        <textarea
          className="import__textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Commander\n1 Atraxa, Praetors' Voice\n\nDeck\n1 Sol Ring\n1 Arcane Signet\n..."}
          spellCheck={false}
        />
        <div className="import__row">
          <button className="btn" onClick={run} disabled={busy}>
            {busy ? "Processando…" : "Analisar deck"}
          </button>
          <button
            className="btn btn--ghost"
            onClick={() => setText(SAMPLE_DECK)}
            disabled={busy}
          >
            Carregar deck de exemplo
          </button>
          {busy && <span className="spinner">{status.message}</span>}
        </div>
        {status.kind === "error" && (
          <p className="error">{status.message}</p>
        )}
      </section>

      {status.kind === "done" && (
        <>
          <ResolveSummary deck={status.deck} />
          <GoldfishReport result={status.result} />
        </>
      )}
    </div>
  );
}

function ResolveSummary({ deck }: { deck: ResolvedDeck }) {
  return (
    <section className="panel">
      <h2>2. Deck resolvido</h2>
      <div className="chips">
        <span className="chip">
          {deck.commanders.map((c) => c.name).join(", ") || "sem comandante"}
        </span>
        <span className="chip">{deck.library.length} cartas no deck</span>
        {deck.unresolved.length > 0 && (
          <span className="chip" style={{ color: "var(--bad)" }}>
            {deck.unresolved.length} não encontradas
          </span>
        )}
      </div>
      {deck.unresolved.length > 0 && (
        <p className="hint">
          Não resolvidas: {deck.unresolved.slice(0, 10).join(", ")}
          {deck.unresolved.length > 10 ? "…" : ""}
        </p>
      )}
    </section>
  );
}
