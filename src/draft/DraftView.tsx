import { useEffect, useRef, useState } from "react";
import type { SavedDeck } from "../deck/model";
import { fetchCardsCached } from "../lib/scryfallCache";
import { getEngine } from "../engine/EngineClient";
import { frontFace } from "../lib/cardName";
import type { BracketEstimate, ClassifyDeckResult } from "../engine/draftQueries";
import { DraftSession } from "./draftSession";
import { engineDraftEngine, scryfallCardResolver } from "./candidates";
import { BRACKET_TARGETS, DEFAULT_BRACKET_TARGET, type BracketTarget } from "./bracket";
import { DraftCandidateCard } from "./DraftCandidateCard";
import { CardPreview, type Preview } from "../board/CardPreview";
import { useI18n } from "../i18n/I18nContext";
import type { MsgKey } from "../i18n/messages";

const MIN_BASE_CARDS = 3;
const MAX_BASE_CARD_ROWS = 10;

const BRACKET_TARGET_LABEL: Record<BracketTarget, MsgKey> = {
  exhibition: "draft.bracket.exhibition",
  core: "draft.bracket.core",
  focused: "draft.bracket.focused",
  optimized: "draft.bracket.optimized",
  cedh: "draft.bracket.cedh",
};

const ENGINE_TIER_LABEL: Record<string, MsgKey> = {
  exhibition: "draft.bracket.exhibition",
  core: "draft.bracket.core",
  upgraded: "draft.bracket.focused",
  optimized: "draft.bracket.optimized",
  cedh: "draft.bracket.cedh",
};

type EntryStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "starting" }
  | { kind: "error"; message: string };

type RoundBusy = number | "all" | null;

function BracketTargetPicker({
  target,
  onChange,
}: {
  target: BracketTarget;
  onChange: (target: BracketTarget) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="seg">
      {BRACKET_TARGETS.map((bt) => (
        <button
          key={bt}
          className={`seg__btn ${target === bt ? "seg__btn--active" : ""}`}
          onClick={() => onChange(bt)}
          aria-pressed={target === bt}
        >
          {t(BRACKET_TARGET_LABEL[bt])}
        </button>
      ))}
    </div>
  );
}

/** After removing base-card row `removedIndex`, where the flagged commander row lands. */
function shiftCommanderRow(row: number | null, removedIndex: number): number | null {
  if (row === null || row === removedIndex) return null;
  return row > removedIndex ? row - 1 : row;
}

/** Entry form: three or more base cards, an optional commander flag, and the bracket target. */
function DraftEntry({
  onStart,
  onCancel,
}: {
  onStart: (
    names: string[],
    commanderName: string | null,
    target: BracketTarget,
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [names, setNames] = useState<string[]>(["", "", ""]);
  const [commanderRow, setCommanderRow] = useState<number | null>(null);
  const [target, setTarget] = useState<BracketTarget>(DEFAULT_BRACKET_TARGET);
  const [status, setStatus] = useState<EntryStatus>({ kind: "idle" });
  const [unresolved, setUnresolved] = useState<string[]>([]);

  function setName(index: number, value: string) {
    setNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  }

  function addRow() {
    setNames((prev) => [...prev, ""]);
  }

  function removeRow(index: number) {
    setNames((prev) => prev.filter((_, i) => i !== index));
    setCommanderRow((row) => shiftCommanderRow(row, index));
  }

  async function handleStart() {
    const trimmed = names.map((n) => n.trim()).filter(Boolean);
    const unique = [...new Set(trimmed)];
    if (unique.length < MIN_BASE_CARDS) {
      setStatus({
        kind: "error",
        message: t("draft.entry.tooFew", { n: MIN_BASE_CARDS - unique.length }),
      });
      return;
    }

    setStatus({ kind: "checking" });
    setUnresolved([]);
    const { cards, notFound } = await fetchCardsCached(unique);
    setUnresolved(notFound);
    const resolvedNames = unique.filter((n) => cards.has(n.toLowerCase()));
    if (resolvedNames.length < MIN_BASE_CARDS) {
      setStatus({ kind: "error", message: t("draft.entry.tooFewResolved") });
      return;
    }

    const flaggedName = commanderRow !== null ? names[commanderRow]?.trim() : "";
    const commanderName =
      flaggedName &&
      resolvedNames.some((n) => n.toLowerCase() === flaggedName.toLowerCase())
        ? flaggedName
        : null;

    setStatus({ kind: "starting" });
    try {
      await getEngine().ready();
      await onStart(resolvedNames, commanderName, target);
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : t("draft.entry.startFailed"),
      });
    }
  }

  const busy = status.kind === "checking" || status.kind === "starting";

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>{t("draft.entry.title")}</h2>
        <button className="btn btn--ghost btn--sm" onClick={onCancel}>
          {t("draft.leave.back")}
        </button>
      </div>
      <p className="hint">{t("draft.entry.subtitle")}</p>

      <div className="field">
        <span className="field__label">{t("draft.entry.baseCardsLabel")}</span>
        {names.map((name, i) => (
          <div className="draft-entry-row" key={i}>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(i, e.target.value)}
              placeholder={t("draft.entry.baseCardPlaceholder")}
              spellCheck={false}
            />
            <label className="draft-entry-row__commander">
              <input
                type="radio"
                name="draft-commander"
                checked={commanderRow === i}
                onChange={() => setCommanderRow(i)}
                disabled={!name.trim()}
              />
              {t("draft.entry.commanderFlag")}
            </label>
            {commanderRow === i && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setCommanderRow(null)}
              >
                {t("draft.entry.unflag")}
              </button>
            )}
            {names.length > MIN_BASE_CARDS && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => removeRow(i)}
                aria-label={t("draft.entry.removeCard")}
              >
                ×
              </button>
            )}
          </div>
        ))}
        {names.length < MAX_BASE_CARD_ROWS && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={addRow}>
            {t("draft.entry.addCard")}
          </button>
        )}
      </div>

      <div className="field">
        <span className="field__label">{t("draft.entry.bracketLabel")}</span>
        <BracketTargetPicker target={target} onChange={setTarget} />
      </div>

      {unresolved.length > 0 && (
        <p className="hint" style={{ color: "var(--warn)" }}>
          {t("draft.entry.unresolved", { list: unresolved.join(", ") })}
        </p>
      )}
      {status.kind === "error" && <p className="error">{status.message}</p>}
      {status.kind === "starting" && (
        <p className="hint">{t("draft.entry.starting")}</p>
      )}

      <div className="import__row">
        <button className="btn" onClick={() => void handleStart()} disabled={busy}>
          {status.kind === "checking"
            ? t("draft.entry.checking")
            : t("draft.entry.start")}
        </button>
        <button className="btn btn--ghost" onClick={onCancel} disabled={busy}>
          {t("draft.entry.cancel")}
        </button>
      </div>
    </section>
  );
}

/** The live archetype + bracket estimate, refetched whenever the deck's cards change. */
function useDeckMeasures(session: DraftSession, deckVersion: number) {
  const [archetype, setArchetype] = useState<ClassifyDeckResult | null>(null);
  const [bracket, setBracket] = useState<BracketEstimate | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const commanderNames = session.commanders.map((e) => frontFace(e.name));
    const mainNames = session.mainboard.map((e) => frontFace(e.name));
    setLoading(true);
    Promise.all([
      getEngine().classifyDeck([...commanderNames, ...mainNames]),
      getEngine().estimateBracket({ commander: commanderNames, main_deck: mainNames }),
    ])
      .then(([a, b]) => {
        if (cancelled) return;
        setArchetype(a);
        setBracket(b);
      })
      .catch(() => {
        if (!cancelled) {
          setArchetype(null);
          setBracket(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session, deckVersion]);

  return { archetype, bracket, loading };
}

function DraftCommanderPanel({
  session,
  roundBusy,
  roundError,
  onPick,
  onRefresh,
  onExit,
  onHover,
  preview,
}: {
  session: DraftSession;
  roundBusy: RoundBusy;
  roundError: string | null;
  onPick: (index: number) => void;
  onRefresh: (index: number) => void;
  onExit: () => void;
  onHover: (p: Preview | null) => void;
  preview: Preview | null;
}) {
  const { t } = useI18n();
  return (
    <section className="panel">
      <div className="panel__head">
        <h2>{t("draft.commander.title")}</h2>
        <button className="btn btn--ghost btn--sm" onClick={onExit}>
          {t("draft.leave.back")}
        </button>
      </div>
      <p className="hint">{t("draft.commander.hint")}</p>
      {roundBusy === "all" && <p className="hint">{t("draft.round.loadingNext")}</p>}
      {session.round.length === 0 ? (
        <p className="hint">{t("draft.commander.empty")}</p>
      ) : (
        <div className={`draft-round ${roundBusy === "all" ? "draft-round--loading" : ""}`}>
          {session.round.map((candidate, i) => (
            <DraftCandidateCard
              key={candidate.card.name}
              candidate={candidate}
              busy={roundBusy === i || roundBusy === "all"}
              primaryLabel={t("draft.commander.choose")}
              onPrimary={() => onPick(i)}
              onRefresh={() => onRefresh(i)}
              onHover={onHover}
              preview={preview}
            />
          ))}
        </div>
      )}
      {roundError && <p className="error">{roundError}</p>}
    </section>
  );
}

function DraftSummaryPanel({
  session,
  target,
  totalCards,
  archetype,
  bracket,
  measuresLoading,
  onTargetChange,
  onExit,
}: {
  session: DraftSession;
  target: BracketTarget;
  totalCards: number;
  archetype: ClassifyDeckResult | null;
  bracket: BracketEstimate | null;
  measuresLoading: boolean;
  onTargetChange: (target: BracketTarget) => void;
  onExit: () => void;
}) {
  const { t } = useI18n();
  const tierLabel = bracket
    ? t(ENGINE_TIER_LABEL[bracket.tier] ?? "draft.bracket.exhibition")
    : "—";
  const commanderName = session.background
    ? `${session.commander?.name} + ${session.background.name}`
    : (session.commander?.name ?? t("deck.noCommander"));

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>{t("draft.windowTitle")}</h2>
        <button className="btn btn--ghost btn--sm" onClick={onExit}>
          {t("draft.leave.back")}
        </button>
      </div>
      <div className="chips">
        <span className="chip">{t("draft.summary.cards", { n: totalCards })}</span>
        <span className="chip">
          {t("draft.summary.commander", { name: commanderName })}
        </span>
        {session.profile.colorIdentity.length > 0 && (
          <span className="chip">
            {t("draft.summary.colorIdentity", {
              list: session.profile.colorIdentity.join(""),
            })}
          </span>
        )}
        <span className="chip">
          {measuresLoading
            ? "…"
            : t("draft.summary.archetype", { name: archetype?.archetype ?? "—" })}
        </span>
        <span className="chip">
          {measuresLoading ? "…" : t("draft.summary.bracket", { tier: tierLabel })}
        </span>
      </div>
      <div className="field" style={{ marginTop: "0.75rem" }}>
        <span className="field__label">{t("draft.summary.bracketTarget")}</span>
        <BracketTargetPicker target={target} onChange={onTargetChange} />
        <p className="hint">{t("draft.summary.targetHint")}</p>
      </div>
    </section>
  );
}

function DraftRoundPanel({
  session,
  roundBusy,
  roundError,
  onAdd,
  onRefresh,
  onHover,
  preview,
}: {
  session: DraftSession;
  roundBusy: RoundBusy;
  roundError: string | null;
  onAdd: (index: number) => void;
  onRefresh: (index: number) => void;
  onHover: (p: Preview | null) => void;
  preview: Preview | null;
}) {
  const { t } = useI18n();
  const loadingNext = roundBusy === "all";
  return (
    <section className="panel">
      <h3>{t("draft.round.title")}</h3>
      {loadingNext && <p className="hint">{t("draft.round.loadingNext")}</p>}
      {session.round.length === 0 ? (
        <p className="hint">{t("draft.round.empty")}</p>
      ) : (
        <div className={`draft-round ${loadingNext ? "draft-round--loading" : ""}`}>
          {session.round.map((candidate, i) => (
            <DraftCandidateCard
              key={candidate.card.name}
              candidate={candidate}
              busy={roundBusy === i || roundBusy === "all"}
              primaryLabel={t("draft.round.add")}
              onPrimary={() => onAdd(i)}
              onRefresh={() => onRefresh(i)}
              onHover={onHover}
              preview={preview}
            />
          ))}
        </div>
      )}
      {roundError && <p className="error">{roundError}</p>}
    </section>
  );
}

function DraftLeavePanel({
  session,
  totalCards,
  saveName,
  setSaveName,
  copied,
  onCopy,
  onSave,
  onExit,
}: {
  session: DraftSession;
  totalCards: number;
  saveName: string;
  setSaveName: (value: string) => void;
  copied: boolean;
  onCopy: () => void;
  onSave: () => void;
  onExit: () => void;
}) {
  const { t } = useI18n();
  return (
    <section className="panel">
      <h3>{t("draft.leave.title")}</h3>
      <div className="import__row">
        <button className="btn btn--ghost" onClick={onCopy}>
          {copied ? t("draft.leave.copied") : t("draft.leave.copy")}
        </button>
      </div>
      <label className="field">
        <span className="field__label">{t("draft.leave.nameLabel")}</span>
        <input
          className="input"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          placeholder={session.commander?.name ?? t("editor.untitled")}
        />
      </label>
      {totalCards !== 100 && (
        <p className="hint" style={{ color: "var(--warn)" }}>
          {t("draft.leave.partialHint")}
        </p>
      )}
      <div className="import__row">
        <button className="btn" onClick={onSave}>
          {t("draft.leave.save")}
        </button>
        <button className="btn btn--ghost" onClick={onExit}>
          {t("draft.leave.back")}
        </button>
      </div>
    </section>
  );
}

/** The commander-selection or drafting session UI, driven by a live `DraftSession`. */
function DraftSessionView({
  session,
  onExit,
  onSave,
}: {
  session: DraftSession;
  onExit: () => void;
  onSave: (deck: SavedDeck) => void;
}) {
  const { t } = useI18n();
  const [, setTick] = useState(0);
  const [deckVersion, setDeckVersion] = useState(0);
  const [roundBusy, setRoundBusy] = useState<RoundBusy>(null);
  const [roundError, setRoundError] = useState<string | null>(null);
  const [target, setTarget] = useState<BracketTarget>(session.target);
  const [saveName, setSaveName] = useState("");
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { archetype, bracket, loading: measuresLoading } = useDeckMeasures(
    session,
    deckVersion,
  );

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  async function runRoundAction(busy: RoundBusy, action: () => Promise<void>) {
    setRoundBusy(busy);
    setRoundError(null);
    try {
      await action();
      setTick((n) => n + 1);
    } catch (err) {
      setRoundError(
        err instanceof Error ? err.message : t("draft.round.actionFailed"),
      );
    } finally {
      setRoundBusy(null);
    }
  }

  function handlePick(index: number) {
    void runRoundAction("all", async () => {
      await session.pickCommander(session.round[index].card.name);
      setDeckVersion((v) => v + 1);
    });
  }

  function handleAdd(index: number) {
    void runRoundAction("all", async () => {
      await session.addCard(index);
      setDeckVersion((v) => v + 1);
    });
  }

  function handleRefresh(index: number) {
    void runRoundAction(index, () => session.refreshSlot(index));
  }

  function handleTargetChange(next: BracketTarget) {
    setTarget(next);
    session.setBracketTarget(next);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(session.exportText());
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1500);
  }

  function handleSave() {
    const name = saveName.trim() || session.commander?.name || t("editor.untitled");
    onSave(session.toSavedDeck(name));
  }

  const totalCards = session.commanders.length + session.mainboard.length;

  if (session.phase === "commander-selection") {
    return (
      <>
        {preview && <CardPreview preview={preview} />}
        <DraftCommanderPanel
          session={session}
          roundBusy={roundBusy}
          roundError={roundError}
          onPick={handlePick}
          onRefresh={handleRefresh}
          onExit={onExit}
          onHover={setPreview}
          preview={preview}
        />
      </>
    );
  }

  return (
    <div>
      {preview && <CardPreview preview={preview} />}
      <DraftSummaryPanel
        session={session}
        target={target}
        totalCards={totalCards}
        archetype={archetype}
        bracket={bracket}
        measuresLoading={measuresLoading}
        onTargetChange={handleTargetChange}
        onExit={onExit}
      />
      <DraftRoundPanel
        session={session}
        roundBusy={roundBusy}
        roundError={roundError}
        onAdd={handleAdd}
        onRefresh={handleRefresh}
        onHover={setPreview}
        preview={preview}
      />
      <DraftLeavePanel
        session={session}
        totalCards={totalCards}
        saveName={saveName}
        setSaveName={setSaveName}
        copied={copied}
        onCopy={() => void handleCopy()}
        onSave={handleSave}
        onExit={onExit}
      />
    </div>
  );
}

/** Assisted deck draft (`draft-a-deck`): seed cards, a commander step, then suggestion rounds. */
export function DraftView({
  onSave,
  onExit,
}: {
  onSave: (deck: SavedDeck) => void;
  onExit: () => void;
}) {
  const sessionRef = useRef<DraftSession | null>(null);
  const [started, setStarted] = useState(false);

  async function handleStart(
    names: string[],
    commanderName: string | null,
    target: BracketTarget,
  ) {
    const session = new DraftSession({
      engine: engineDraftEngine,
      resolver: scryfallCardResolver,
    });
    await session.start(names, commanderName, target);
    sessionRef.current = session;
    setStarted(true);
  }

  if (!started || !sessionRef.current) {
    return <DraftEntry onStart={handleStart} onCancel={onExit} />;
  }

  return (
    <DraftSessionView session={sessionRef.current} onExit={onExit} onSave={onSave} />
  );
}
