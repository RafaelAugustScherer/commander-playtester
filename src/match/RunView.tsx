import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";
import type { SavedDeck } from "../deck/model";
import type { RunConfig } from "./config";
import { getEngine } from "../engine/EngineClient";
import { buildDeckList } from "../engine/deckPayload";
import {
  MatchRunner,
  DeckRejectedError,
  selectTargetsAction,
  type MatchResult,
  type LegalActions,
  type HumanChoice,
  type TargetPrompt,
  type TargetRef,
  type DriverCallbacks,
} from "../sim/driver";
import {
  Board,
  type PlayInteraction,
  type TargetInteraction,
  type AbilityInteraction,
  type NinjutsuInteraction,
  type AttackInteraction,
  type BlockInteraction,
  type ManaInteraction,
} from "../board/Board";
import { useCardPreview } from "./useCardPreview";
import {
  discardCardsAction,
  type DiscardPrompt,
} from "../sim/decisions/discard";
import { scryAction, type ScryPrompt } from "../sim/decisions/scry";
import {
  declineResolutionOptionalPaymentAction,
  payResolutionOptionalPaymentAction,
  type ResolutionOptionalPaymentPrompt,
} from "../sim/decisions/resolutionOptionalPayment";
import {
  decideOptionalCostAction,
  type OptionalCostPrompt,
} from "../sim/decisions/optionalCost";
import {
  commanderZoneAction,
  type CommanderZonePrompt,
} from "../sim/decisions/commanderZone";
import { chooseXAction, type XValuePrompt } from "../sim/decisions/xValue";
import {
  orderTriggersAction,
  type OrderTriggersPrompt,
} from "../sim/decisions/orderTriggers";
import {
  selectSearchCardsAction,
  chooseOutsideGameAction,
  type SearchDecisionPrompt,
  type OutsideGameSelection,
} from "../sim/decisions/search";
import { keepDigCardsAction, type DigPrompt } from "../sim/decisions/dig";
import {
  exploreCreatureAction,
  revealUntilAction,
  type ExploreRevealPrompt,
} from "../sim/decisions/exploreReveal";
import {
  defaultPhyrexianChoices,
  submitPhyrexianAction,
  type ManaColor,
  type PhyrexianPaymentPrompt,
  type PhyrexianShardChoice,
} from "../sim/decisions/phyrexianPayment";
import { XpWindow } from "../components/XpWindow";
import {
  declareAttackersAction,
  clickAttacker,
  aimAtDefender,
  type AttackDraft,
  type AttackersPrompt,
  type AttackTargetRef,
} from "../sim/decisions/attackers";
import {
  declareBlockersAction,
  type BlockersPrompt,
} from "../sim/decisions/blockers";
import {
  chooseManaColorAction,
  tapManaSourceAction,
  priorityManaSources,
  canPayFromPool,
  readManaPool,
  type ManaPrompt,
  type ManaPip,
  type ManaSourceOption,
} from "../sim/decisions/mana";
import {
  chooseOptionAction,
  type CreatureTypePrompt,
} from "../sim/decisions/creatureType";
import { selectModesAction, type ModesPrompt } from "../sim/decisions/modes";
import {
  mulliganKeepAction,
  mulliganTakeAction,
  bottomCardsAction,
  type MulliganPrompt,
} from "../sim/decisions/mulligan";
import { toBoardView, type BoardView, type SeatMeta } from "../board/boardView";
import { seatColor } from "../board/seatColor";
import { GameSidebar, type LoggedEntry } from "../board/GameSidebar";
import type { GameObject, LogEntry } from "../engine/types";
import { abilitiesBySource } from "../sim/decisions/abilities";
import { ninjutsuBySource } from "../sim/decisions/ninjutsu";
import { aggregate } from "../analysis/matchStats";
import { fetchCardsCached } from "../lib/scryfallCache";
import { SearchableSelect } from "../components/SearchableSelect";
import { Eye, EyeOff } from "lucide-react";
import { useI18n } from "../i18n/I18nContext";
import { useSettings } from "../settings/SettingsContext";
import {
  phaseLabel,
  type Lang,
  type MsgKey,
  type Vars,
} from "../i18n/messages";

type Phase = "loading" | "running" | "done" | "error";
type Speed = "slow" | "normal" | "fast";

const PACE_MS: Record<Speed, number> = { slow: 700, normal: 250, fast: 0 };
const SPEED_LABEL: Record<Speed, Record<Lang, string>> = {
  slow: { pt: "Lento", en: "Slow" },
  normal: { pt: "Normal", en: "Normal" },
  fast: { pt: "Rápido", en: "Fast" },
};
const SPEED_TICKS: Record<Speed, number> = { slow: 1, normal: 2, fast: 3 };

function PlayGlyph({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 4 L20 12 L6 20 Z" />
    </svg>
  );
}

function PauseGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="4.5" width="4.5" height="15" rx="1.5" />
      <rect x="13.5" y="4.5" width="4.5" height="15" rx="1.5" />
    </svg>
  );
}

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
  /** True when this priority window is on the human's own turn. */
  myTurn: boolean;
  /** True when an opponent has something on the stack awaiting the human. */
  opponentActed: boolean;
  /** Your floating mana this window (manual-mana gating + reserve display). */
  manaPool: ManaPip[];
  /** This frame's objects, for reading a castable spell's mana cost. */
  objects: Record<string, GameObject>;
  resolve: (choice: HumanChoice) => void;
}

interface TargetTurn {
  prompt: TargetPrompt;
  resolve: (choice: HumanChoice) => void;
}

interface AttackTurn {
  prompt: AttackersPrompt;
  resolve: (choice: HumanChoice) => void;
}

interface BlockTurn {
  prompt: BlockersPrompt;
  resolve: (choice: HumanChoice) => void;
}

interface ManaTurn {
  prompt: ManaPrompt;
  resolve: (choice: HumanChoice) => void;
}

interface CreatureTypeTurn {
  prompt: CreatureTypePrompt & { aiChoice: string | null };
  resolve: (choice: HumanChoice) => void;
}

interface ModesTurn {
  prompt: ModesPrompt;
  resolve: (choice: HumanChoice) => void;
}

interface MulliganTurn {
  prompt: MulliganPrompt;
  resolve: (choice: HumanChoice) => void;
}

interface DiscardTurn {
  prompt: DiscardPrompt;
  resolve: (choice: HumanChoice) => void;
}

interface ScryTurn {
  prompt: ScryPrompt;
  resolve: (choice: HumanChoice) => void;
}

interface ResolutionOptionalPaymentTurn {
  prompt: ResolutionOptionalPaymentPrompt;
  resolve: (choice: HumanChoice) => void;
}

interface OptionalCostTurn {
  prompt: OptionalCostPrompt;
  resolve: (choice: HumanChoice) => void;
}

interface CommanderZoneTurn {
  prompt: CommanderZonePrompt;
  resolve: (choice: HumanChoice) => void;
}

interface XValueTurn {
  prompt: XValuePrompt;
  resolve: (choice: HumanChoice) => void;
}

interface OrderTriggersTurn {
  prompt: OrderTriggersPrompt;
  resolve: (choice: HumanChoice) => void;
}

interface SearchTurn {
  prompt: SearchDecisionPrompt;
  resolve: (choice: HumanChoice) => void;
}

function formatZoneLabel(zone: string): string {
  if (!zone) return zone;
  return zone.charAt(0).toUpperCase() + zone.slice(1).toLowerCase();
}

/** One row in the search/outside-game candidate list: a stable key plus its label. */
interface SearchListItem {
  key: number;
  label: string;
}

function searchListItems(prompt: SearchDecisionPrompt): SearchListItem[] {
  if (prompt.kind === "outside") {
    return prompt.entries.map((entry, i) => ({ key: i, label: entry.label }));
  }
  return prompt.cards.map((card) => ({ key: card.id, label: card.name }));
}

/** Build the confirm action: card ids for search/partition, entry sources for outside-game. */
function searchConfirmAction(prompt: SearchDecisionPrompt, pick: number[]) {
  if (prompt.kind === "outside") {
    return chooseOutsideGameAction(
      pick.map((i) => prompt.entries[i].source as OutsideGameSelection),
    );
  }
  return selectSearchCardsAction(pick);
}

function searchPanelTitle(
  prompt: SearchDecisionPrompt,
  t: (key: MsgKey, vars?: Vars) => string,
): string {
  if (prompt.kind === "partition") {
    return t("search.partitionTitle", {
      primary: formatZoneLabel(prompt.primaryDestination),
      rest: formatZoneLabel(prompt.restDestination),
    });
  }
  if (prompt.kind === "outside") return t("search.outsideTitle");
  return t("search.title");
}

function SearchPanel({
  turn,
  pick,
  onTogglePick,
  onConfirm,
  onLetAi,
}: {
  turn: SearchTurn;
  pick: number[];
  onTogglePick: (key: number) => void;
  onConfirm: () => void;
  onLetAi: () => void;
}) {
  const { t } = useI18n();
  const { prompt } = turn;
  const atCap = pick.length >= prompt.count;
  const upTo = prompt.kind === "search" && prompt.upTo;
  const valid = upTo ? pick.length <= prompt.count : pick.length === prompt.count;
  return (
    <>
      <div className="control-title">
        <strong>{searchPanelTitle(prompt, t)}</strong>
      </div>
      <p className="hint">
        {t("search.selected", { n: pick.length, max: prompt.count })}
      </p>
      <div className="search-list">
        {searchListItems(prompt).map((item) => {
          const picked = pick.includes(item.key);
          return (
            <button
              key={item.key}
              className={picked ? "btn" : "btn--ghost"}
              disabled={!picked && atCap}
              onClick={() => onTogglePick(item.key)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="import__row">
        <button className="btn" disabled={!valid} onClick={onConfirm}>
          {t("search.confirm")}
        </button>
        <button className="btn btn--ghost" onClick={onLetAi}>
          {t("search.letAi")}
        </button>
      </div>
    </>
  );
}

interface DigTurn {
  prompt: DigPrompt;
  resolve: (choice: HumanChoice) => void;
}

function digHint(
  prompt: DigPrompt,
  t: (key: MsgKey, vars?: Vars) => string,
): string {
  return t(prompt.upTo ? "dig.hintUpTo" : "dig.hintExact", {
    n: prompt.keepCount,
    kept: formatZoneLabel(prompt.keptDestination),
    rest: formatZoneLabel(prompt.restDestination),
  });
}

function DigPanel({
  turn,
  pick,
  onTogglePick,
  onConfirm,
  onLetAi,
}: {
  turn: DigTurn;
  pick: Set<number>;
  onTogglePick: (id: number) => void;
  onConfirm: () => void;
  onLetAi: () => void;
}) {
  const { t } = useI18n();
  const { prompt } = turn;
  const atCap = pick.size >= prompt.keepCount;
  const valid = prompt.upTo
    ? pick.size <= prompt.keepCount
    : pick.size === prompt.keepCount;
  return (
    <>
      <div className="control-title">
        <strong>{t("dig.title")}</strong>
      </div>
      <p className="hint">{digHint(prompt, t)}</p>
      <p className="hint">
        {t("dig.kept", { picked: pick.size, n: prompt.keepCount })}
      </p>
      <div className="search-list">
        {prompt.cards.map((card) => {
          const selectable = prompt.selectableIds.includes(card.id);
          const picked = pick.has(card.id);
          return (
            <button
              key={card.id}
              className={picked ? "btn" : "btn--ghost"}
              disabled={!selectable || (!picked && atCap)}
              onClick={() => onTogglePick(card.id)}
            >
              {card.name}
            </button>
          );
        })}
      </div>
      <div className="import__row">
        <button className="btn" disabled={!valid} onClick={onConfirm}>
          {t("dig.confirm")}
        </button>
        <button className="btn btn--ghost" onClick={onLetAi}>
          {t("dig.letAi")}
        </button>
      </div>
    </>
  );
}

interface ExploreRevealTurn {
  prompt: ExploreRevealPrompt;
  resolve: (choice: HumanChoice) => void;
}

function ExploreRevealPanel({ turn }: { turn: ExploreRevealTurn }) {
  const { t } = useI18n();
  const { prompt, resolve } = turn;
  const sourceName = prompt.sourceName || t("exploreReveal.sourceFallback");

  if (prompt.kind === "explore") {
    return (
      <>
        <div className="control-title">
          <strong>{t("exploreReveal.exploreTitle")}</strong>
        </div>
        <p className="hint">
          {t("exploreReveal.exploreHint", { name: sourceName })}
        </p>
        <div className="search-list">
          {prompt.creatures.map((creature) => (
            <button
              key={creature.id}
              className="btn"
              onClick={() =>
                resolve({ action: exploreCreatureAction(creature.id) })
              }
            >
              {creature.name}
            </button>
          ))}
        </div>
        <div className="import__row">
          <button
            className="btn btn--ghost"
            onClick={() => resolve({ ai: true })}
          >
            {t("exploreReveal.letAi")}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="control-title">
        <strong>{t("exploreReveal.revealTitle")}</strong>
      </div>
      <p className="hint">
        {t("exploreReveal.revealHint", {
          name: sourceName,
          card: prompt.hitCardName,
        })}
      </p>
      <div className="import__row">
        <button
          className="btn"
          onClick={() => resolve({ action: revealUntilAction(true) })}
        >
          {t("exploreReveal.keep", {
            zone: formatZoneLabel(prompt.acceptZone),
          })}
        </button>
        <button
          className="btn btn--ghost"
          onClick={() => resolve({ action: revealUntilAction(false) })}
        >
          {t("exploreReveal.decline", {
            zone: formatZoneLabel(prompt.declineZone),
          })}
        </button>
        <button
          className="btn btn--ghost"
          onClick={() => resolve({ ai: true })}
        >
          {t("exploreReveal.letAi")}
        </button>
      </div>
    </>
  );
}

interface PhyrexianTurn {
  prompt: PhyrexianPaymentPrompt;
  resolve: (choice: HumanChoice) => void;
}

const PHYREXIAN_COLOR_KEY: Record<ManaColor, MsgKey> = {
  White: "phyrexian.colorWhite",
  Blue: "phyrexian.colorBlue",
  Black: "phyrexian.colorBlack",
  Red: "phyrexian.colorRed",
  Green: "phyrexian.colorGreen",
};

function PhyrexianPanel({
  turn,
  pick,
  onTogglePick,
  onConfirm,
  onLetAi,
}: {
  turn: PhyrexianTurn;
  pick: PhyrexianShardChoice[];
  onTogglePick: (index: number) => void;
  onConfirm: () => void;
  onLetAi: () => void;
}) {
  const { t } = useI18n();
  const { prompt } = turn;
  const sourceName = prompt.sourceName || t("phyrexian.spellFallback");
  const lifeTotal =
    pick.filter((choice) => choice === "PayLife").length * 2;
  return (
    <>
      <div className="control-title">
        <strong>{t("phyrexian.title")}</strong>
      </div>
      <p className="hint">{t("phyrexian.prompt", { name: sourceName })}</p>
      <div className="search-list">
        {prompt.shards.map((shard, index) => {
          const locked = shard.optionType !== "ManaOrLife";
          const payingLife = pick[index] === "PayLife";
          const colorLabel = t(PHYREXIAN_COLOR_KEY[shard.color]);
          return (
            <div className="import__row" key={index}>
              <div className="seg">
                <button
                  className={`seg__btn ${!payingLife ? "seg__btn--active" : ""}`}
                  disabled={locked}
                  aria-pressed={!payingLife}
                  onClick={() => onTogglePick(index)}
                >
                  {t("phyrexian.manaOption", { color: colorLabel })}
                </button>
                <button
                  className={`seg__btn ${payingLife ? "seg__btn--active" : ""}`}
                  disabled={locked}
                  aria-pressed={payingLife}
                  onClick={() => onTogglePick(index)}
                >
                  {t("phyrexian.lifeOption")}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="hint">{t("phyrexian.lifeTotal", { n: lifeTotal })}</p>
      <div className="import__row">
        <button className="btn" onClick={onConfirm}>
          {t("phyrexian.confirm")}
        </button>
        <button className="btn btn--ghost" onClick={onLetAi}>
          {t("phyrexian.letAi")}
        </button>
      </div>
    </>
  );
}

function isTargetOptional(
  targeting: TargetTurn | null,
  chosen: TargetRef[],
): boolean {
  if (!targeting) return false;
  if (targeting.prompt.multi) return targeting.prompt.min === 0;
  const slotIdx = Math.min(chosen.length, targeting.prompt.slots.length - 1);
  return targeting.prompt.slots[slotIdx]?.optional ?? false;
}

function partitionChosenRefs(chosen: TargetRef[]): {
  chosenObjIds: Set<number>;
  chosenSeats: Set<number>;
} {
  const chosenObjIds = new Set<number>();
  const chosenSeats = new Set<number>();
  for (const tr of chosen) {
    if ("Object" in tr) chosenObjIds.add(tr.Object);
    else chosenSeats.add(tr.Player);
  }
  return { chosenObjIds, chosenSeats };
}

function partitionTargetPool(
  pool: TargetRef[],
  multi: boolean,
  chosenObjIds: Set<number>,
  chosenSeats: Set<number>,
): { objectIds: Set<number>; playerSeats: Set<number> } {
  const objectIds = new Set<number>();
  const playerSeats = new Set<number>();
  for (const tr of pool) {
    if ("Object" in tr) {
      if (multi && chosenObjIds.has(tr.Object)) continue;
      objectIds.add(tr.Object);
    } else {
      if (multi && chosenSeats.has(tr.Player)) continue;
      playerSeats.add(tr.Player);
    }
  }
  return { objectIds, playerSeats };
}

function resolveTargetPick(
  targeting: TargetTurn,
  chosen: TargetRef[],
  ref: TargetRef,
  setChosen: Dispatch<SetStateAction<TargetRef[]>>,
) {
  const { prompt } = targeting;
  const next = [...chosen, ref];
  const done = prompt.multi
    ? next.length >= prompt.max
    : next.length >= prompt.slots.length;
  if (done) targeting.resolve({ action: selectTargetsAction(next) });
  else setChosen(next);
}

function MatchStatusHeading({ board }: { board: BoardView }) {
  const { t, lang } = useI18n();
  if (!board.gameOver) {
    return (
      <>
        <span className="match-status__turn">
          {t("board.turn", { n: board.turn })}
        </span>
        <span className="match-status__phase">
          {phaseLabel(lang, board.phase)}
        </span>
        <span className="match-status__active">
          {t("board.activeTurn", {
            name:
              board.seats[board.activePlayer]?.name ||
              t("board.player", { n: board.activePlayer + 1 }),
          })}
        </span>
      </>
    );
  }
  if (board.winner === null) return <>{t("board.draw")}</>;
  return (
    <>
      {t("board.winner", {
        name:
          board.seats[board.winner]?.name ||
          t("board.player", { n: board.winner + 1 }),
      })}
    </>
  );
}

function describeRunError(
  e: unknown,
  t: (key: MsgKey, vars?: Vars) => string,
): string {
  if (e instanceof DeckRejectedError)
    return t("run.invalidDeck", { reasons: e.reasons.join(" · ") });
  if (e instanceof Error) return e.message;
  return String(e);
}

interface RunnerCallbackDeps {
  isCancelled: () => boolean;
  seatMeta: SeatMeta[];
  logIdRef: MutableRefObject<number>;
  setBoard: Dispatch<SetStateAction<BoardView | null>>;
  setCurrentMatch: Dispatch<SetStateAction<number>>;
  setPassingTurn: Dispatch<SetStateAction<boolean>>;
  setLogEntries: Dispatch<SetStateAction<LoggedEntry[]>>;
  setResults: Dispatch<SetStateAction<MatchResult[]>>;
  setHumanTurn: Dispatch<SetStateAction<HumanTurn | null>>;
  setChosen: Dispatch<SetStateAction<TargetRef[]>>;
  setTargeting: Dispatch<SetStateAction<TargetTurn | null>>;
  setAttacks: Dispatch<SetStateAction<Map<number, AttackTargetRef>>>;
  setSelectedAttacker: Dispatch<SetStateAction<number | null>>;
  setAttacking: Dispatch<SetStateAction<AttackTurn | null>>;
  setBlockAssign: Dispatch<SetStateAction<Map<number, number>>>;
  setSelectedBlocker: Dispatch<SetStateAction<number | null>>;
  setBlockingTurn: Dispatch<SetStateAction<BlockTurn | null>>;
  setManaTurn: Dispatch<SetStateAction<ManaTurn | null>>;
  setCreatureTypePick: Dispatch<SetStateAction<string>>;
  setCreatureTypeTurn: Dispatch<SetStateAction<CreatureTypeTurn | null>>;
  setModesPick: Dispatch<SetStateAction<number[]>>;
  setModesTurn: Dispatch<SetStateAction<ModesTurn | null>>;
  setBottomPick: Dispatch<SetStateAction<Set<number>>>;
  setMulliganTurn: Dispatch<SetStateAction<MulliganTurn | null>>;
  setDiscardPick: Dispatch<SetStateAction<Set<number>>>;
  setDiscardTurn: Dispatch<SetStateAction<DiscardTurn | null>>;
  setScryTurn: Dispatch<SetStateAction<ScryTurn | null>>;
  setResolutionOptionalPaymentTurn: Dispatch<
    SetStateAction<ResolutionOptionalPaymentTurn | null>
  >;
  setOptionalCostTurn: Dispatch<SetStateAction<OptionalCostTurn | null>>;
  setCommanderZoneTurn: Dispatch<SetStateAction<CommanderZoneTurn | null>>;
  setXValuePick: Dispatch<SetStateAction<number>>;
  setXValueTurn: Dispatch<SetStateAction<XValueTurn | null>>;
  setOrderTriggersPick: Dispatch<SetStateAction<number[]>>;
  setOrderTriggersTurn: Dispatch<SetStateAction<OrderTriggersTurn | null>>;
  setSearchPick: Dispatch<SetStateAction<number[]>>;
  setSearchTurn: Dispatch<SetStateAction<SearchTurn | null>>;
  setDigPick: Dispatch<SetStateAction<Set<number>>>;
  setDigTurn: Dispatch<SetStateAction<DigTurn | null>>;
  setExploreRevealTurn: Dispatch<SetStateAction<ExploreRevealTurn | null>>;
  setPhyrexianPick: Dispatch<SetStateAction<PhyrexianShardChoice[]>>;
  setPhyrexianTurn: Dispatch<SetStateAction<PhyrexianTurn | null>>;
}

function buildRunnerCallbacks(deps: RunnerCallbackDeps): DriverCallbacks {
  const {
    isCancelled,
    seatMeta,
    logIdRef,
    setBoard,
    setCurrentMatch,
    setPassingTurn,
    setLogEntries,
    setResults,
    setHumanTurn,
    setChosen,
    setTargeting,
    setAttacks,
    setSelectedAttacker,
    setAttacking,
    setBlockAssign,
    setSelectedBlocker,
    setBlockingTurn,
    setManaTurn,
    setCreatureTypePick,
    setCreatureTypeTurn,
    setModesPick,
    setModesTurn,
    setBottomPick,
    setMulliganTurn,
    setDiscardPick,
    setDiscardTurn,
    setScryTurn,
    setResolutionOptionalPaymentTurn,
    setOptionalCostTurn,
    setCommanderZoneTurn,
    setXValuePick,
    setXValueTurn,
    setOrderTriggersPick,
    setOrderTriggersTurn,
    setSearchPick,
    setSearchTurn,
    setDigPick,
    setDigTurn,
    setExploreRevealTurn,
    setPhyrexianPick,
    setPhyrexianTurn,
  } = deps;
  return {
    onFrame: (env) => {
      if (!isCancelled()) setBoard(toBoardView(env, seatMeta));
    },
    onMatchStart: (m) => {
      if (!isCancelled()) {
        setCurrentMatch(m);
        setPassingTurn(false);
        setLogEntries([]);
      }
    },
    onMatchEnd: (r) => {
      if (!isCancelled()) setResults((prev) => [...prev, r]);
    },
    onLogEntries: (entries: LogEntry[]) => {
      if (isCancelled()) return;
      const tagged = entries.map((entry) => ({
        id: logIdRef.current++,
        entry,
      }));
      setLogEntries((prev) => {
        const next = prev.concat(tagged);
        return next.length > 800 ? next.slice(next.length - 800) : next;
      });
    },
    requestHumanAction: (env, legal) =>
      new Promise<HumanChoice>((resolve) => {
        if (isCancelled()) {
          resolve({ ai: true });
          return;
        }
        const st = env.state;
        const stack = st.stack ?? [];
        setHumanTurn({
          legal,
          myTurn: st.active_player === 0,
          opponentActed: stack.some(
            (id) => (st.objects?.[id]?.controller ?? -1) !== 0,
          ),
          manaPool: readManaPool(st.players?.[0]),
          objects: st.objects ?? {},
          resolve: (choice) => {
            setHumanTurn(null);
            resolve(choice);
          },
        });
      }),
    requestHumanTargets: (_env, prompt) =>
      new Promise<HumanChoice>((resolve) => {
        if (isCancelled()) {
          resolve({ ai: true });
          return;
        }
        setChosen([]);
        setTargeting({
          prompt,
          resolve: (choice) => {
            setTargeting(null);
            setChosen([]);
            resolve(choice);
          },
        });
      }),
    requestHumanAttackers: (_env, prompt) =>
      new Promise<HumanChoice>((resolve) => {
        if (isCancelled()) {
          resolve({ ai: true });
          return;
        }
        setAttacks(new Map());
        setSelectedAttacker(null);
        setAttacking({
          prompt,
          resolve: (choice) => {
            setAttacking(null);
            setAttacks(new Map());
            setSelectedAttacker(null);
            resolve(choice);
          },
        });
      }),
    requestHumanBlockers: (_env, prompt) =>
      new Promise<HumanChoice>((resolve) => {
        if (isCancelled()) {
          resolve({ ai: true });
          return;
        }
        setBlockAssign(new Map());
        setSelectedBlocker(null);
        setBlockingTurn({
          prompt,
          resolve: (choice) => {
            setBlockingTurn(null);
            setBlockAssign(new Map());
            setSelectedBlocker(null);
            resolve(choice);
          },
        });
      }),
    requestHumanMana: (_env, prompt) =>
      new Promise<HumanChoice>((resolve) => {
        if (isCancelled()) {
          resolve({ ai: true });
          return;
        }
        setManaTurn({
          prompt,
          resolve: (choice) => {
            setManaTurn(null);
            resolve(choice);
          },
        });
      }),
    requestHumanCreatureType: (_env, prompt) =>
      new Promise<HumanChoice>((resolve) => {
        if (isCancelled()) {
          resolve({ ai: true });
          return;
        }
        setCreatureTypePick(prompt.aiChoice ?? prompt.options[0] ?? "");
        setCreatureTypeTurn({
          prompt,
          resolve: (choice) => {
            setCreatureTypeTurn(null);
            resolve(choice);
          },
        });
      }),
    requestHumanModes: (_env, prompt) =>
      new Promise<HumanChoice>((resolve) => {
        if (isCancelled()) {
          resolve({ ai: true });
          return;
        }
        setModesPick([]);
        setModesTurn({
          prompt,
          resolve: (choice) => {
            setModesTurn(null);
            setModesPick([]);
            resolve(choice);
          },
        });
      }),
    requestHumanMulligan: (_env, prompt) =>
      new Promise<HumanChoice>((resolve) => {
        if (isCancelled()) {
          resolve({ ai: true });
          return;
        }
        setBottomPick(new Set());
        setMulliganTurn({
          prompt,
          resolve: (choice) => {
            setMulliganTurn(null);
            setBottomPick(new Set());
            resolve(choice);
          },
        });
      }),
    requestHumanDiscard: (_env, prompt) =>
      new Promise<HumanChoice>((resolve) => {
        if (isCancelled()) {
          resolve({ ai: true });
          return;
        }
        setDiscardPick(new Set());
        setDiscardTurn({
          prompt,
          resolve: (choice) => {
            setDiscardTurn(null);
            setDiscardPick(new Set());
            resolve(choice);
          },
        });
      }),
    requestHumanScry: (_env, prompt) =>
      new Promise<HumanChoice>((resolve) => {
        if (isCancelled()) {
          resolve({ ai: true });
          return;
        }
        setScryTurn({
          prompt,
          resolve: (choice) => {
            setScryTurn(null);
            resolve(choice);
          },
        });
      }),
    requestHumanResolutionOptionalPayment: (_env, prompt) =>
      new Promise<HumanChoice>((resolve) => {
        if (isCancelled()) {
          resolve({ ai: true });
          return;
        }
        setResolutionOptionalPaymentTurn({
          prompt,
          resolve: (choice) => {
            setResolutionOptionalPaymentTurn(null);
            resolve(choice);
          },
        });
      }),
    requestHumanOptionalCost: (_env, prompt) =>
      new Promise<HumanChoice>((resolve) => {
        if (isCancelled()) {
          resolve({ ai: true });
          return;
        }
        setOptionalCostTurn({
          prompt,
          resolve: (choice) => {
            setOptionalCostTurn(null);
            resolve(choice);
          },
        });
      }),
    requestHumanCommanderZone: (_env, prompt) =>
      new Promise<HumanChoice>((resolve) => {
        if (isCancelled()) {
          resolve({ ai: true });
          return;
        }
        setCommanderZoneTurn({
          prompt,
          resolve: (choice) => {
            setCommanderZoneTurn(null);
            resolve(choice);
          },
        });
      }),
    requestHumanXValue: (_env, prompt) =>
      new Promise<HumanChoice>((resolve) => {
        if (isCancelled()) {
          resolve({ ai: true });
          return;
        }
        setXValuePick(prompt.min);
        setXValueTurn({
          prompt,
          resolve: (choice) => {
            setXValueTurn(null);
            setXValuePick(prompt.min);
            resolve(choice);
          },
        });
      }),
    requestHumanOrderTriggers: (_env, prompt) =>
      new Promise<HumanChoice>((resolve) => {
        if (isCancelled()) {
          resolve({ ai: true });
          return;
        }
        const identity = prompt.triggers.map((_, i) => i);
        setOrderTriggersPick(identity);
        setOrderTriggersTurn({
          prompt,
          resolve: (choice) => {
            setOrderTriggersTurn(null);
            setOrderTriggersPick(identity);
            resolve(choice);
          },
        });
      }),
    requestHumanSearch: (_env, prompt) =>
      new Promise<HumanChoice>((resolve) => {
        if (isCancelled()) {
          resolve({ ai: true });
          return;
        }
        setSearchPick([]);
        setSearchTurn({
          prompt,
          resolve: (choice) => {
            setSearchTurn(null);
            setSearchPick([]);
            resolve(choice);
          },
        });
      }),
    requestHumanDig: (_env, prompt) =>
      new Promise<HumanChoice>((resolve) => {
        if (isCancelled()) {
          resolve({ ai: true });
          return;
        }
        setDigPick(new Set());
        setDigTurn({
          prompt,
          resolve: (choice) => {
            setDigTurn(null);
            setDigPick(new Set());
            resolve(choice);
          },
        });
      }),
    requestHumanExploreReveal: (_env, prompt) =>
      new Promise<HumanChoice>((resolve) => {
        if (isCancelled()) {
          resolve({ ai: true });
          return;
        }
        setExploreRevealTurn({
          prompt,
          resolve: (choice) => {
            setExploreRevealTurn(null);
            resolve(choice);
          },
        });
      }),
    requestHumanPhyrexianPayment: (_env, prompt) =>
      new Promise<HumanChoice>((resolve) => {
        if (isCancelled()) {
          resolve({ ai: true });
          return;
        }
        setPhyrexianPick(defaultPhyrexianChoices(prompt.shards));
        setPhyrexianTurn({
          prompt,
          resolve: (choice) => {
            setPhyrexianTurn(null);
            setPhyrexianPick(defaultPhyrexianChoices(prompt.shards));
            resolve(choice);
          },
        });
      }),
  };
}

/** Traps Tab focus inside a modal and restores focus to the opener on close. */
function useFocusTrap(modalRef: RefObject<HTMLDivElement>) {
  useEffect(() => {
    const node = modalRef.current;
    if (!node) return;
    const prev = document.activeElement as HTMLElement | null;
    const focusable = () =>
      [
        ...node.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ];
    focusable()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const els = focusable();
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    node.addEventListener("keydown", onKey);
    return () => {
      node.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
  const { settings } = useSettings();
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [abilityPick, setAbilityPick] = useState<{ objId: number; actions: any[] } | null>(null);
  // Which colour to make when a tapped mana source produces more than one.
  const [manaSourcePick, setManaSourcePick] = useState<{
    objId: number;
    options: ManaSourceOption[];
  } | null>(null);
  const [ninjutsuSource, setNinjutsuSource] = useState<number | null>(null);
  const [targeting, setTargeting] = useState<TargetTurn | null>(null);
  const [chosen, setChosen] = useState<TargetRef[]>([]);
  const [attacking, setAttacking] = useState<AttackTurn | null>(null);
  const [attacks, setAttacks] = useState<Map<number, AttackTargetRef>>(
    new Map(),
  );
  const [selectedAttacker, setSelectedAttacker] = useState<number | null>(null);
  const [blockingTurn, setBlockingTurn] = useState<BlockTurn | null>(null);
  const [blockAssign, setBlockAssign] = useState<Map<number, number>>(new Map());
  const [selectedBlocker, setSelectedBlocker] = useState<number | null>(null);
  const [manaTurn, setManaTurn] = useState<ManaTurn | null>(null);
  const [creatureTypeTurn, setCreatureTypeTurn] =
    useState<CreatureTypeTurn | null>(null);
  const [creatureTypePick, setCreatureTypePick] = useState("");
  const [modesTurn, setModesTurn] = useState<ModesTurn | null>(null);
  const [modesPick, setModesPick] = useState<number[]>([]);
  const [mulliganTurn, setMulliganTurn] = useState<MulliganTurn | null>(null);
  const [bottomPick, setBottomPick] = useState<Set<number>>(new Set());
  const [discardTurn, setDiscardTurn] = useState<DiscardTurn | null>(null);
  const [discardPick, setDiscardPick] = useState<Set<number>>(new Set());
  const [scryTurn, setScryTurn] = useState<ScryTurn | null>(null);
  const [resolutionOptionalPaymentTurn, setResolutionOptionalPaymentTurn] =
    useState<ResolutionOptionalPaymentTurn | null>(null);
  const [optionalCostTurn, setOptionalCostTurn] =
    useState<OptionalCostTurn | null>(null);
  const [commanderZoneTurn, setCommanderZoneTurn] =
    useState<CommanderZoneTurn | null>(null);
  const [xValueTurn, setXValueTurn] = useState<XValueTurn | null>(null);
  const [xValuePick, setXValuePick] = useState(0);
  const [orderTriggersTurn, setOrderTriggersTurn] =
    useState<OrderTriggersTurn | null>(null);
  const [orderTriggersPick, setOrderTriggersPick] = useState<number[]>([]);
  const [searchTurn, setSearchTurn] = useState<SearchTurn | null>(null);
  const [searchPick, setSearchPick] = useState<number[]>([]);
  const [digTurn, setDigTurn] = useState<DigTurn | null>(null);
  const [digPick, setDigPick] = useState<Set<number>>(new Set());
  const [exploreRevealTurn, setExploreRevealTurn] =
    useState<ExploreRevealTurn | null>(null);
  const [phyrexianTurn, setPhyrexianTurn] = useState<PhyrexianTurn | null>(
    null,
  );
  const [phyrexianPick, setPhyrexianPick] = useState<PhyrexianShardChoice[]>(
    [],
  );
  const [passingTurn, setPassingTurn] = useState(false);
  const [logEntries, setLogEntries] = useState<LoggedEntry[]>([]);
  // On mobile the log is a full-screen drawer, so it always starts closed and
  // its state isn't persisted (a remembered "open" would cover the board). On
  // desktop it starts open and remembers the last choice.
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (!window.matchMedia("(min-width: 900px)").matches) return false;
    const saved = localStorage.getItem("sidebarOpen");
    return saved != null ? saved === "1" : true;
  });
  // Touch/narrow screens: drop keyboard hints (space/enter don't apply).
  const [compact, setCompact] = useState<boolean>(() =>
    window.matchMedia("(max-width: 899px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 899px)");
    const onChange = () => setCompact(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const logIdRef = useRef(0);
  const runnerRef = useRef<MatchRunner | null>(null);

  useEffect(() => {
    if (!window.matchMedia("(min-width: 900px)").matches) return;
    localStorage.setItem("sidebarOpen", sidebarOpen ? "1" : "0");
  }, [sidebarOpen]);

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
          buildRunnerCallbacks({
            isCancelled: () => cancelled,
            seatMeta,
            logIdRef,
            setBoard,
            setCurrentMatch,
            setPassingTurn,
            setLogEntries,
            setResults,
            setHumanTurn,
            setChosen,
            setTargeting,
            setAttacks,
            setSelectedAttacker,
            setAttacking,
            setBlockAssign,
            setSelectedBlocker,
            setBlockingTurn,
            setManaTurn,
            setCreatureTypePick,
            setCreatureTypeTurn,
            setModesPick,
            setModesTurn,
            setBottomPick,
            setMulliganTurn,
            setDiscardPick,
            setDiscardTurn,
            setScryTurn,
            setResolutionOptionalPaymentTurn,
            setOptionalCostTurn,
            setCommanderZoneTurn,
            setXValuePick,
            setXValueTurn,
            setOrderTriggersPick,
            setOrderTriggersTurn,
            setSearchPick,
            setSearchTurn,
            setDigPick,
            setDigTurn,
            setExploreRevealTurn,
            setPhyrexianPick,
            setPhyrexianTurn,
          }),
        );
        runnerRef.current = runner;
        setPhase("running");
        await runner.run();
        if (!cancelled) setPhase("done");
      } catch (e) {
        if (!cancelled) {
          setPhase("error");
          setMessage(describeRunError(e, t));
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

  function pauseGame() {
    if (paused) return;
    runnerRef.current?.pause();
    setPaused(true);
  }

  function changeSpeed(s: Speed) {
    const runner = runnerRef.current;
    setSpeed(s);
    runner?.setPace(PACE_MS[s]);
    if (paused) {
      runner?.resume();
      setPaused(false);
    }
  }

  // Reset any in-flight drag / ability pick when the priority window changes.
  useEffect(() => {
    setDragging(null);
    setAbilityPick(null);
    setManaSourcePick(null);
    setNinjutsuSource(null);
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

  // Begin auto-advancing through the rest of your own turn.
  function beginPassTurn(ht: HumanTurn) {
    setPassingTurn(true);
    const pass = findPass(ht.legal.actions ?? []);
    ht.resolve(pass ? { action: pass } : { ai: true });
  }

  // Enter starts "pass turn" during your own turn; Esc stops it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && humanTurn?.myTurn && !passingTurn) {
        e.preventDefault();
        setPassingTurn(true);
        const pass = findPass(humanTurn.legal.actions ?? []);
        humanTurn.resolve(pass ? { action: pass } : { ai: true });
      } else if (e.key === "Escape" && passingTurn) {
        e.preventDefault();
        setPassingTurn(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [humanTurn, passingTurn]);

  // While passing the turn, auto-pass each priority window until the turn ends
  // or an opponent puts something on the stack (then pause so the user sees it).
  useEffect(() => {
    if (!passingTurn || !humanTurn) return;
    if (!humanTurn.myTurn || humanTurn.opponentActed) {
      setPassingTurn(false);
      return;
    }
    const pass = findPass(humanTurn.legal.actions ?? []);
    if (!pass) {
      setPassingTurn(false);
      return;
    }
    const id = setTimeout(
      () => humanTurn.resolve({ action: pass }),
      Math.max(180, PACE_MS[speed]),
    );
    return () => clearTimeout(id);
  }, [passingTurn, humanTurn, speed]);

  // Passing the turn skips your own combat (no attackers).
  useEffect(() => {
    if (!passingTurn || !attacking) return;
    const id = setTimeout(
      () => attacking.resolve({ action: declareAttackersAction([]) }),
      Math.max(180, PACE_MS[speed]),
    );
    return () => clearTimeout(id);
  }, [passingTurn, attacking, speed]);

  // Any other decision that needs the human pauses the pass-turn flow.
  useEffect(() => {
    if (
      passingTurn &&
      (targeting ||
        manaTurn ||
        blockingTurn ||
        creatureTypeTurn ||
        modesTurn ||
        scryTurn ||
        resolutionOptionalPaymentTurn ||
        optionalCostTurn ||
        commanderZoneTurn ||
        xValueTurn ||
        orderTriggersTurn ||
        searchTurn ||
        digTurn ||
        exploreRevealTurn ||
        phyrexianTurn)
    ) {
      setPassingTurn(false);
    }
  }, [
    passingTurn,
    targeting,
    manaTurn,
    blockingTurn,
    creatureTypeTurn,
    modesTurn,
    scryTurn,
    resolutionOptionalPaymentTurn,
    optionalCostTurn,
    commanderZoneTurn,
    xValueTurn,
    orderTriggersTurn,
    searchTurn,
    digTurn,
    exploreRevealTurn,
    phyrexianTurn,
  ]);

  // Map draggable hand cards to their play actions for the current window.
  // With manual mana on, a normal cast is offered only when the floating reserve
  // already covers it, so casting never taps extra lands (the player floats mana
  // by tapping sources first).
  const play: PlayInteraction | undefined = useMemo(() => {
    if (!humanTurn) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = new Map<number, any>();
    for (const a of humanTurn.legal.actions ?? []) {
      if (!PLAYABLE_TYPES.has(a?.type)) continue;
      const id = actionObjectId(a);
      if (id == null || map.has(id)) continue;
      if (
        settings.manualMana &&
        a.type === "CastSpell" &&
        !canPayFromPool(humanTurn.manaPool, humanTurn.objects[id]?.mana_cost)
      ) {
        continue;
      }
      map.set(id, a);
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
  }, [humanTurn, dragging, settings.manualMana]);

  const hasPlayable = (play?.playableIds.size ?? 0) > 0;

  // Group ActivateAbility actions by their source permanent for click-to-activate.
  const ability: AbilityInteraction | undefined = useMemo(() => {
    if (!humanTurn) return undefined;
    const map = abilitiesBySource(humanTurn.legal.actions);
    if (map.size === 0) return undefined;
    return {
      objectIds: new Set(map.keys()),
      onActivate: (objId: number) => {
        const list = map.get(objId);
        if (!list || list.length === 0) return;
        if (list.length === 1) humanTurn.resolve({ action: list[0] });
        else setAbilityPick({ objId, actions: list });
      },
    };
  }, [humanTurn]);

  // Ninjutsu: pick a ninja (hand or command zone), then which unblocked
  // attacker it returns. The engine enumerates one action per (ninja, attacker).
  const ninjutsu: NinjutsuInteraction | undefined = useMemo(() => {
    if (!humanTurn) return undefined;
    const bySource = ninjutsuBySource(humanTurn.legal.actions);
    if (bySource.size === 0) return undefined;
    const chosen =
      ninjutsuSource != null && bySource.has(ninjutsuSource)
        ? ninjutsuSource
        : null;
    const returnable = new Set(
      chosen != null ? bySource.get(chosen)!.map((o) => o.creatureId) : [],
    );
    return {
      sourceIds: new Set(bySource.keys()),
      chosenSource: chosen,
      returnableIds: returnable,
      onChooseSource: (objId: number) => {
        const opts = bySource.get(objId);
        if (!opts || opts.length === 0) return;
        if (opts.length === 1) humanTurn.resolve({ action: opts[0].action });
        else setNinjutsuSource(objId);
      },
      onChooseReturn: (creatureId: number) => {
        if (chosen == null) return;
        const opt = bySource.get(chosen)?.find((o) => o.creatureId === creatureId);
        if (opt) humanTurn.resolve({ action: opt.action });
      },
    };
  }, [humanTurn, ninjutsuSource]);

  // Highlight legal targets for the current slot and collect the human's picks.
  const target: TargetInteraction | undefined = useMemo(() => {
    if (!targeting) return undefined;
    const { prompt } = targeting;
    const slotIdx = prompt.multi
      ? 0
      : Math.min(chosen.length, prompt.slots.length - 1);
    const pool = prompt.slots[slotIdx]?.legalTargets ?? [];

    const { chosenObjIds, chosenSeats } = partitionChosenRefs(chosen);
    const { objectIds, playerSeats } = partitionTargetPool(
      pool,
      prompt.multi,
      chosenObjIds,
      chosenSeats,
    );

    const pick = (ref: TargetRef) =>
      resolveTargetPick(targeting, chosen, ref, setChosen);

    return {
      objectIds,
      playerSeats,
      chosenObjIds,
      chosenSeats,
      onChooseObject: (id) => pick({ Object: id }),
      onChoosePlayer: (seat) => pick({ Player: seat }),
    };
  }, [targeting, chosen]);

  const targetOptional = isTargetOptional(targeting, chosen);
  const canConfirmMulti =
    !!targeting && targeting.prompt.multi && chosen.length >= targeting.prompt.min;

  // Toggle attackers and, in multiplayer, aim each one at its own defender:
  // focus a declared attacker, then click a defending player to assign it.
  const attack: AttackInteraction | undefined = useMemo(() => {
    if (!attacking) return undefined;
    const { prompt } = attacking;
    const attackerIds = new Set(prompt.attackers.map((a) => a.attackerId));
    const declaredIds = new Set(attacks.keys());
    const allDefenders = new Set<number>();
    for (const a of prompt.attackers) {
      for (const tgt of a.targets) {
        if (tgt?.type === "Player") allDefenders.add(tgt.data);
      }
    }
    const multiDefender = allDefenders.size > 1;

    const assignments = new Map<number, number>();
    for (const [id, ref] of attacks) {
      if (ref?.type === "Player") assignments.set(id, ref.data);
    }
    const defenderNames = new Map<number, string>();
    for (const seat of allDefenders) {
      defenderNames.set(
        seat,
        seatMeta[seat]?.name || t("board.player", { n: seat + 1 }),
      );
    }

    const apply = (draft: AttackDraft) => {
      setAttacks(draft.attacks);
      setSelectedAttacker(draft.selected);
    };
    const draft: AttackDraft = { attacks, selected: selectedAttacker };

    return {
      attackerIds,
      declaredIds,
      multiDefender,
      selectedAttackerId: multiDefender ? selectedAttacker : null,
      assignments,
      defenderNames,
      onAttackerClick: (id: number) =>
        apply(clickAttacker(draft, id, prompt, multiDefender)),
      // A defender is clickable only once an attacker is focused to receive it.
      defenderSeats:
        multiDefender && selectedAttacker != null && attacks.has(selectedAttacker)
          ? allDefenders
          : new Set<number>(),
      onChooseDefender: (seat: number) =>
        apply(aimAtDefender(draft, seat, prompt)),
    };
  }, [attacking, attacks, selectedAttacker, seatMeta, t]);

  // Pick a blocker, then click the attacker it should block.
  const block: BlockInteraction | undefined = useMemo(() => {
    if (!blockingTurn) return undefined;
    const { prompt } = blockingTurn;
    return {
      blockerIds: new Set(prompt.blockers.keys()),
      assignedIds: new Set(blockAssign.keys()),
      selectedBlocker,
      assignableAttackerIds:
        selectedBlocker !== null
          ? new Set(prompt.blockers.get(selectedBlocker) ?? [])
          : new Set<number>(),
      onSelectBlocker: (id: number) => {
        if (blockAssign.has(id)) {
          setBlockAssign((prev) => {
            const next = new Map(prev);
            next.delete(id);
            return next;
          });
          setSelectedBlocker(null);
        } else {
          setSelectedBlocker((cur) => (cur === id ? null : id));
        }
      },
      onAssignAttacker: (attackerId: number) => {
        if (selectedBlocker === null) return;
        setBlockAssign((prev) => new Map(prev).set(selectedBlocker, attackerId));
        setSelectedBlocker(null);
      },
    };
  }, [blockingTurn, blockAssign, selectedBlocker]);

  // Two ways a source gets tapped: the engine asking which source to use for a
  // payment (ManaSourceSelection), or — with manual mana on — the player pooling
  // mana at their own priority before casting. A source that makes more than one
  // color opens a small color picker first.
  const mana: ManaInteraction | undefined = useMemo(() => {
    if (manaTurn?.prompt.kind === "source") {
      const { prompt } = manaTurn;
      return {
        sourceIds: new Set(prompt.sources.map((s) => s.objectId)),
        onTapSource: (objId: number) => {
          const src = prompt.sources.find((s) => s.objectId === objId);
          if (src) manaTurn.resolve({ action: tapManaSourceAction(src) });
        },
      };
    }
    if (settings.manualMana && humanTurn) {
      const sources = priorityManaSources(humanTurn.legal);
      if (sources.size === 0) return undefined;
      return {
        sourceIds: new Set(sources.keys()),
        onTapSource: (objId: number) => {
          const options = sources.get(objId);
          if (!options || options.length === 0) return;
          if (options.length === 1) {
            humanTurn.resolve({ action: options[0].action });
          } else {
            setManaSourcePick({ objId, options });
          }
        },
      };
    }
    return undefined;
  }, [manaTurn, humanTurn, settings.manualMana]);

  // Name a declared attacker (always one of the human seat's permanents).
  const attackerName = (id: number): string => {
    const you = board?.seats.find((s) => s.seat === 0);
    const owned = you
      ? [...you.creatures, ...you.commanders, ...you.others, ...you.lands]
      : [];
    return owned.find((o) => o.id === id)?.name ?? `#${id}`;
  };

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
                <button
                  className={`btn btn--ghost btn--sm btn--icon has-tooltip ${paused ? "btn--active" : ""}`}
                  onClick={pauseGame}
                  aria-pressed={paused}
                  aria-label={t("run.pause")}
                  data-tooltip={t("run.pause")}
                >
                  <PauseGlyph size={16} />
                </button>
                <div className="seg">
                  {(["slow", "normal", "fast"] as Speed[]).map((s) => (
                    <button
                      key={s}
                      className={`seg__btn seg__btn--speed has-tooltip ${speed === s && !paused ? "seg__btn--active" : ""}`}
                      onClick={() => changeSpeed(s)}
                      aria-pressed={speed === s && !paused}
                      aria-label={SPEED_LABEL[s][lang]}
                      data-tooltip={SPEED_LABEL[s][lang]}
                    >
                      {Array.from({ length: SPEED_TICKS[s] }).map((_, i) => (
                        <PlayGlyph key={i} />
                      ))}
                    </button>
                  ))}
                </div>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => setSidebarOpen((v) => !v)}
                >
                  {sidebarOpen ? t("sidebar.hide") : t("sidebar.show")}
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

      <div className="run-layout">
        <div className="run-main">
      {board && (
        <section className="panel play-controls">
          <div className="panel__head">
            <h2 className="match-status">
              <MatchStatusHeading board={board} />
            </h2>
            {humanTurn && !compact && (
              <span className="hint">
                {humanTurn.myTurn ? t("turn.keyHints") : t("turn.spaceHint")}
              </span>
            )}
          </div>

          {humanTurn && passingTurn && (
            <>
              <p className="hint">{t("turn.passingTurn")}</p>
              <div className="import__row">
                <button
                  className="btn btn--ghost"
                  onClick={() => setPassingTurn(false)}
                >
                  {t("turn.stopPass")}
                </button>
              </div>
            </>
          )}

          {humanTurn && !passingTurn && (
            <>
              {hasPlayable && <p className="hint">{t("turn.dragHint")}</p>}
              {ability && <p className="hint">{t("turn.abilityHint")}</p>}
              {ninjutsu && (
                <p className="hint">
                  {ninjutsu.chosenSource != null
                    ? t("turn.ninjutsuReturnHint")
                    : t("turn.ninjutsuHint")}
                </p>
              )}
              {settings.manualMana && mana && (
                <p className="hint">{t("turn.floatManaHint")}</p>
              )}
              {!hasPlayable &&
                !ability &&
                !ninjutsu &&
                !(settings.manualMana && mana) && (
                  <p className="hint">{t("turn.nothingToPlay")}</p>
                )}
              {abilityPick && (
                <div className="import__row">
                  {abilityPick.actions.map((a, i) => (
                    <button
                      key={i}
                      className="btn"
                      onClick={() => humanTurn.resolve({ action: a })}
                    >
                      {t("turn.abilityN", {
                        n: (a.data?.ability_index ?? i) + 1,
                      })}
                    </button>
                  ))}
                  <button
                    className="btn btn--ghost"
                    onClick={() => setAbilityPick(null)}
                  >
                    {t("turn.cancel")}
                  </button>
                </div>
              )}
              {manaSourcePick && (
                <div className="import__row">
                  {manaSourcePick.options.map((opt, i) => (
                    <button
                      key={i}
                      className="btn"
                      onClick={() => humanTurn.resolve({ action: opt.action })}
                    >
                      {t(`mana.color.${opt.manaType}` as Parameters<typeof t>[0])}
                    </button>
                  ))}
                  <button
                    className="btn btn--ghost"
                    onClick={() => setManaSourcePick(null)}
                  >
                    {t("turn.cancel")}
                  </button>
                </div>
              )}
              <div className="import__row">
                <button
                  className="btn"
                  onClick={() => {
                    const pass = findPass(humanTurn.legal.actions ?? []);
                    humanTurn.resolve(pass ? { action: pass } : { ai: true });
                  }}
                >
                  {compact ? t("turn.passShort") : t("turn.pass")}
                </button>
                {humanTurn.myTurn && (
                  <button
                    className="btn"
                    onClick={() => beginPassTurn(humanTurn)}
                  >
                    {compact ? t("turn.passTurnShort") : t("turn.passTurn")}
                  </button>
                )}
                <button
                  className="btn btn--ghost"
                  onClick={() => humanTurn.resolve({ ai: true })}
                >
                  {t("turn.letAi")}
                </button>
              </div>
            </>
          )}

          {targeting && (
            <>
              <div className="control-title">
                <strong>{t("target.title")}</strong>
                {targeting.prompt.multi && (
                  <span className="hint">
                    {t("target.progress", {
                      n: chosen.length,
                      min: targeting.prompt.min,
                      max: targeting.prompt.max,
                    })}
                  </span>
                )}
              </div>
              <p className="hint">
                {targeting.prompt.description || t("target.generic")}
              </p>
              <p className="hint">{t("target.instruction")}</p>
              <div className="import__row">
                {canConfirmMulti && (
                  <button
                    className="btn"
                    onClick={() =>
                      targeting.resolve({ action: selectTargetsAction(chosen) })
                    }
                  >
                    {t("target.confirm")}
                  </button>
                )}
                {targetOptional && (
                  <button
                    className="btn btn--ghost"
                    onClick={() =>
                      targeting.resolve({ action: selectTargetsAction(chosen) })
                    }
                  >
                    {t("target.none")}
                  </button>
                )}
                <button
                  className="btn btn--ghost"
                  onClick={() => targeting.resolve({ ai: true })}
                >
                  {t("target.letAi")}
                </button>
              </div>
            </>
          )}

          {attacking && (
            <>
              <div className="control-title">
                <strong>{t("attack.title")}</strong>
                <span className="hint">
                  {t("attack.count", { n: attacks.size })}
                </span>
              </div>
              <p className="hint">{t("attack.instruction")}</p>
              {attack?.multiDefender && (
                <p className="hint">{t("attack.defenderHint")}</p>
              )}
              {attack?.multiDefender && attacks.size > 0 && (
                <ul className="attack-summary">
                  {[...attacks.entries()].map(([id, ref]) => {
                    const seat = ref?.type === "Player" ? ref.data : undefined;
                    const def =
                      seat !== undefined
                        ? attack.defenderNames.get(seat)
                        : undefined;
                    return (
                      <li
                        key={id}
                        className={
                          selectedAttacker === id
                            ? "attack-summary__row attack-summary__row--sel"
                            : "attack-summary__row"
                        }
                      >
                        <span className="attack-summary__from">
                          {attackerName(id)}
                        </span>
                        <span className="attack-summary__arrow">→</span>
                        <span
                          className="attack-summary__to"
                          style={
                            seat !== undefined
                              ? { color: seatColor(seat) }
                              : undefined
                          }
                        >
                          {def ?? t("attack.noTarget")}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="import__row">
                <button
                  className="btn"
                  disabled={attacks.size === 0}
                  onClick={() =>
                    attacking.resolve({
                      action: declareAttackersAction([...attacks.entries()]),
                    })
                  }
                >
                  {t("attack.confirm")}
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() =>
                    attacking.resolve({ action: declareAttackersAction([]) })
                  }
                >
                  {t("attack.none")}
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() => attacking.resolve({ ai: true })}
                >
                  {t("attack.letAi")}
                </button>
              </div>
            </>
          )}

          {blockingTurn && (
            <>
              <div className="control-title">
                <strong>{t("block.title")}</strong>
                <span className="hint">
                  {t("block.count", { n: blockAssign.size })}
                </span>
              </div>
              <p className="hint">
                {selectedBlocker !== null
                  ? t("block.chooseAttacker")
                  : t("block.chooseBlocker")}
              </p>
              <div className="import__row">
                <button
                  className="btn"
                  onClick={() =>
                    blockingTurn.resolve({
                      action: declareBlockersAction([...blockAssign.entries()]),
                    })
                  }
                >
                  {t("block.confirm")}
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() =>
                    blockingTurn.resolve({ action: declareBlockersAction([]) })
                  }
                >
                  {t("block.none")}
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() => blockingTurn.resolve({ ai: true })}
                >
                  {t("block.letAi")}
                </button>
              </div>
            </>
          )}

          {manaTurn && (
            <>
              <div className="control-title">
                <strong>{t("mana.title")}</strong>
              </div>
              {manaTurn.prompt.kind === "color" ? (
                <>
                  <p className="hint">{t("mana.chooseColor")}</p>
                  <div className="import__row">
                    {manaTurn.prompt.options.map((color) => (
                      <button
                        key={color}
                        className="btn"
                        onClick={() =>
                          manaTurn.resolve({
                            action: chooseManaColorAction(color),
                          })
                        }
                      >
                        {t(`mana.color.${color}` as Parameters<typeof t>[0])}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="hint">{t("mana.chooseSource")}</p>
              )}
              <div className="import__row">
                <button
                  className="btn btn--ghost"
                  onClick={() => manaTurn.resolve({ ai: true })}
                >
                  {t("mana.letAi")}
                </button>
              </div>
            </>
          )}

          {creatureTypeTurn && (
            <>
              <div className="control-title">
                <strong>{t("creatureType.title")}</strong>
              </div>
              {creatureTypeTurn.prompt.sourceName && (
                <p className="hint">
                  {t("creatureType.source", {
                    name: creatureTypeTurn.prompt.sourceName,
                  })}
                </p>
              )}
              <div className="import__row">
                <SearchableSelect
                  options={creatureTypeTurn.prompt.options}
                  value={creatureTypePick}
                  onChange={setCreatureTypePick}
                  placeholder={t("creatureType.search")}
                  emptyLabel={t("select.noResults")}
                />
              </div>
              {creatureTypeTurn.prompt.aiChoice && (
                <p className="hint">
                  {t("creatureType.aiHint", {
                    choice: creatureTypeTurn.prompt.aiChoice,
                  })}
                </p>
              )}
              <div className="import__row">
                <button
                  className="btn"
                  disabled={!creatureTypePick}
                  onClick={() =>
                    creatureTypeTurn.resolve({
                      action: chooseOptionAction(creatureTypePick),
                    })
                  }
                >
                  {t("creatureType.confirm")}
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() => creatureTypeTurn.resolve({ ai: true })}
                >
                  {t("creatureType.letAi")}
                </button>
              </div>
            </>
          )}

          {resolutionOptionalPaymentTurn && (
            <>
              <div className="control-title">
                <strong>{t("resolutionOptionalPayment.title")}</strong>
              </div>
              {resolutionOptionalPaymentTurn.prompt.sourceName && (
                <p className="hint">
                  {t("resolutionOptionalPayment.source", {
                    name: resolutionOptionalPaymentTurn.prompt.sourceName,
                  })}
                </p>
              )}
              <div className="import__row">
                {resolutionOptionalPaymentTurn.prompt.options.map((opt) => (
                  <button
                    key={opt.index}
                    className="btn"
                    onClick={() =>
                      resolutionOptionalPaymentTurn.resolve({
                        action: payResolutionOptionalPaymentAction(opt.index),
                      })
                    }
                  >
                    {t("resolutionOptionalPayment.pay", { cost: opt.label })}
                  </button>
                ))}
                <button
                  className="btn btn--ghost"
                  onClick={() =>
                    resolutionOptionalPaymentTurn.resolve({
                      action: declineResolutionOptionalPaymentAction(),
                    })
                  }
                >
                  {t("resolutionOptionalPayment.decline")}
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() => resolutionOptionalPaymentTurn.resolve({ ai: true })}
                >
                  {t("resolutionOptionalPayment.letAi")}
                </button>
              </div>
            </>
          )}

          {optionalCostTurn && (
            <>
              <div className="control-title">
                <strong>{t("optionalCost.title")}</strong>
              </div>
              <p className="hint">
                {t("optionalCost.prompt", {
                  name:
                    optionalCostTurn.prompt.sourceName ||
                    t("optionalCost.spellFallback"),
                })}
              </p>
              {optionalCostTurn.prompt.repeatable &&
                optionalCostTurn.prompt.timesKicked > 0 && (
                  <p className="hint">
                    {t("optionalCost.timesPaid", {
                      count: optionalCostTurn.prompt.timesKicked,
                    })}
                  </p>
                )}
              <div className="import__row">
                <button
                  className="btn"
                  onClick={() =>
                    optionalCostTurn.resolve({
                      action: decideOptionalCostAction(true),
                    })
                  }
                >
                  {t("optionalCost.pay")}
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() =>
                    optionalCostTurn.resolve({
                      action: decideOptionalCostAction(false),
                    })
                  }
                >
                  {t("optionalCost.decline")}
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() => optionalCostTurn.resolve({ ai: true })}
                >
                  {t("optionalCost.letAi")}
                </button>
              </div>
            </>
          )}

          {commanderZoneTurn && (
            <>
              <div className="control-title">
                <strong>{t("commanderZone.title")}</strong>
              </div>
              <p className="hint">
                {t("commanderZone.prompt", {
                  name:
                    commanderZoneTurn.prompt.commanderName ||
                    t("commanderZone.commanderFallback"),
                  zone: formatZoneLabel(commanderZoneTurn.prompt.currentZone),
                })}
              </p>
              <div className="import__row">
                <button
                  className="btn"
                  onClick={() =>
                    commanderZoneTurn.resolve({
                      action: commanderZoneAction(true),
                    })
                  }
                >
                  {t("commanderZone.commandZone")}
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() =>
                    commanderZoneTurn.resolve({
                      action: commanderZoneAction(false),
                    })
                  }
                >
                  {t("commanderZone.leave", {
                    zone: formatZoneLabel(commanderZoneTurn.prompt.currentZone),
                  })}
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() => commanderZoneTurn.resolve({ ai: true })}
                >
                  {t("commanderZone.letAi")}
                </button>
              </div>
            </>
          )}

          {xValueTurn && (
            <>
              <div className="control-title">
                <strong>{t("xValue.title")}</strong>
              </div>
              <p className="hint">
                {t("xValue.source", {
                  name: xValueTurn.prompt.sourceName || t("xValue.spellFallback"),
                })}
              </p>
              <div className="import__row">
                <input
                  className="input"
                  type="number"
                  min={xValueTurn.prompt.min}
                  max={xValueTurn.prompt.max}
                  value={xValuePick}
                  onChange={(e) => {
                    const { min, max } = xValueTurn.prompt;
                    const n = Math.round(Number(e.target.value));
                    setXValuePick(
                      Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min,
                    );
                  }}
                />
              </div>
              <p className="hint">
                {t("xValue.range", {
                  min: xValueTurn.prompt.min,
                  max: xValueTurn.prompt.max,
                })}
              </p>
              <div className="import__row">
                <button
                  className="btn"
                  disabled={
                    !Number.isInteger(xValuePick) ||
                    xValuePick < xValueTurn.prompt.min ||
                    xValuePick > xValueTurn.prompt.max
                  }
                  onClick={() =>
                    xValueTurn.resolve({ action: chooseXAction(xValuePick) })
                  }
                >
                  {t("xValue.confirm")}
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() => xValueTurn.resolve({ ai: true })}
                >
                  {t("xValue.letAi")}
                </button>
              </div>
            </>
          )}

          {orderTriggersTurn && (
            <>
              <div className="control-title">
                <strong>{t("orderTriggers.title")}</strong>
              </div>
              <p className="hint">{t("orderTriggers.resolvesLast")}</p>
              {orderTriggersPick.map((triggerIndex, position) => {
                const trigger = orderTriggersTurn.prompt.triggers[triggerIndex];
                return (
                  <div className="import__row" key={triggerIndex}>
                    <div>
                      <strong>
                        {trigger.sourceName ||
                          t("orderTriggers.triggerFallback", {
                            number: triggerIndex + 1,
                          })}
                      </strong>
                      {trigger.description && (
                        <p className="hint">{trigger.description}</p>
                      )}
                    </div>
                    <button
                      className="btn btn--ghost"
                      aria-label={t("orderTriggers.moveUp")}
                      disabled={position === 0}
                      onClick={() =>
                        setOrderTriggersPick((prev) => {
                          const next = [...prev];
                          [next[position - 1], next[position]] = [
                            next[position],
                            next[position - 1],
                          ];
                          return next;
                        })
                      }
                    >
                      ▲
                    </button>
                    <button
                      className="btn btn--ghost"
                      aria-label={t("orderTriggers.moveDown")}
                      disabled={position === orderTriggersPick.length - 1}
                      onClick={() =>
                        setOrderTriggersPick((prev) => {
                          const next = [...prev];
                          [next[position], next[position + 1]] = [
                            next[position + 1],
                            next[position],
                          ];
                          return next;
                        })
                      }
                    >
                      ▼
                    </button>
                  </div>
                );
              })}
              <div className="import__row">
                <button
                  className="btn"
                  onClick={() =>
                    orderTriggersTurn.resolve({
                      action: orderTriggersAction(orderTriggersPick),
                    })
                  }
                >
                  {t("orderTriggers.confirm")}
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() => orderTriggersTurn.resolve({ ai: true })}
                >
                  {t("orderTriggers.letAi")}
                </button>
              </div>
            </>
          )}

          {searchTurn && (
            <SearchPanel
              turn={searchTurn}
              pick={searchPick}
              onTogglePick={(key) =>
                setSearchPick((prev) => {
                  if (prev.includes(key)) return prev.filter((k) => k !== key);
                  if (prev.length >= searchTurn.prompt.count) return prev;
                  return [...prev, key];
                })
              }
              onConfirm={() =>
                searchTurn.resolve({
                  action: searchConfirmAction(searchTurn.prompt, searchPick),
                })
              }
              onLetAi={() => searchTurn.resolve({ ai: true })}
            />
          )}

          {digTurn && (
            <DigPanel
              turn={digTurn}
              pick={digPick}
              onTogglePick={(id) =>
                setDigPick((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) {
                    next.delete(id);
                  } else if (next.size < digTurn.prompt.keepCount) {
                    next.add(id);
                  }
                  return next;
                })
              }
              onConfirm={() =>
                digTurn.resolve({
                  action: keepDigCardsAction([...digPick]),
                })
              }
              onLetAi={() => digTurn.resolve({ ai: true })}
            />
          )}

          {exploreRevealTurn && <ExploreRevealPanel turn={exploreRevealTurn} />}

          {phyrexianTurn && (
            <PhyrexianPanel
              turn={phyrexianTurn}
              pick={phyrexianPick}
              onTogglePick={(index) =>
                setPhyrexianPick((prev) =>
                  prev.map((choice, i) => {
                    if (i !== index) return choice;
                    return choice === "PayLife" ? "PayMana" : "PayLife";
                  }),
                )
              }
              onConfirm={() =>
                phyrexianTurn.resolve({
                  action: submitPhyrexianAction(phyrexianPick),
                })
              }
              onLetAi={() => phyrexianTurn.resolve({ ai: true })}
            />
          )}
        </section>
      )}

      {board && (
        <section className="panel">
          <Board
            view={board}
            images={images}
            play={play}
            target={target}
            ability={ability}
            ninjutsu={ninjutsu}
            attack={attack}
            block={block}
            mana={mana}
          />
        </section>
      )}
        </div>
        {board && (
          <GameSidebar
            stack={board.stack}
            log={logEntries}
            images={images}
            humanSeat={config.mode === "play" ? 0 : null}
            revealAll={config.revealHands || config.mode === "watch"}
            open={sidebarOpen}
            onToggle={() => setSidebarOpen((v) => !v)}
          />
        )}
      </div>

      {mulliganTurn && (
        <MulliganModal
          prompt={mulliganTurn.prompt}
          images={images}
          bottomPick={bottomPick}
          onToggleBottom={(id) =>
            setBottomPick((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else if (next.size < mulliganTurn.prompt.bottomCount) next.add(id);
              return next;
            })
          }
          onKeep={() =>
            mulliganTurn.resolve({ action: mulliganKeepAction() })
          }
          onMulligan={() =>
            mulliganTurn.resolve({ action: mulliganTakeAction() })
          }
          onConfirmBottom={() =>
            mulliganTurn.resolve({ action: bottomCardsAction([...bottomPick]) })
          }
          onLetAi={() => mulliganTurn.resolve({ ai: true })}
        />
      )}

      {discardTurn && (
        <DiscardModal
          prompt={discardTurn.prompt}
          images={images}
          pick={discardPick}
          onTogglePick={(id) =>
            setDiscardPick((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else if (next.size < discardTurn.prompt.count) next.add(id);
              return next;
            })
          }
          onConfirm={() =>
            discardTurn.resolve({ action: discardCardsAction([...discardPick]) })
          }
          onLetAi={() => discardTurn.resolve({ ai: true })}
        />
      )}

      {modesTurn && (
        <ModesModal
          prompt={modesTurn.prompt}
          pick={modesPick}
          onAdd={(i) =>
            setModesPick((prev) => {
              if (prev.length >= modesTurn.prompt.maxChoices) return prev;
              if (!modesTurn.prompt.allowRepeatModes && prev.includes(i)) {
                return prev;
              }
              return [...prev, i];
            })
          }
          onRemove={(i) =>
            setModesPick((prev) => {
              const idx = prev.lastIndexOf(i);
              if (idx === -1) return prev;
              return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
            })
          }
          onConfirm={() =>
            modesTurn.resolve({ action: selectModesAction(modesPick) })
          }
          onLetAi={() => modesTurn.resolve({ ai: true })}
        />
      )}

      {scryTurn && (
        <ScryWindow
          prompt={scryTurn.prompt}
          images={images}
          onSubmit={(keptOnTop) =>
            scryTurn.resolve({ action: scryAction(keptOnTop) })
          }
          onLetAi={() => scryTurn.resolve({ ai: true })}
        />
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

/** Opening-hand popup: keep or mulligan, then pick London bottoms if any. */
function MulliganModal({
  prompt,
  images,
  bottomPick,
  onToggleBottom,
  onKeep,
  onMulligan,
  onConfirmBottom,
  onLetAi,
}: {
  prompt: MulliganPrompt;
  images: Record<string, string>;
  bottomPick: Set<number>;
  onToggleBottom: (id: number) => void;
  onKeep: () => void;
  onMulligan: () => void;
  onConfirmBottom: () => void;
  onLetAi: () => void;
}) {
  const { t } = useI18n();
  const bottoming = prompt.stage === "bottom";
  const modalRef = useRef<HTMLDivElement>(null);

  // Move focus into the dialog, trap Tab within it, and restore focus on close.
  useFocusTrap(modalRef);

  const { cardProps, overlay } = useCardPreview({
    images,
    selectable: bottoming,
    onToggle: onToggleBottom,
  });

  let instruction: string;
  if (bottoming) {
    instruction = t("mulligan.bottomInstruction", { n: prompt.bottomCount });
  } else if (prompt.mulliganCount === 0 && prompt.freeFirstMulligan) {
    instruction = t("mulligan.freeHint", { n: prompt.nextKeepSize });
  } else {
    instruction = t("mulligan.takenHint", {
      n: prompt.mulliganCount,
      keep: prompt.keepSize,
    });
  }

  return (
    <div className="mull-overlay" role="dialog" aria-modal="true" aria-labelledby="mull-title">
      <div className="mull-modal" ref={modalRef}>
        <div className="mull-modal__head">
          <h2 id="mull-title">{bottoming ? t("mulligan.bottomTitle") : t("mulligan.title")}</h2>
          <p className="hint">{instruction}</p>
        </div>

        <div className="mull-hand">
          {prompt.hand.map((c) => {
            const url = c.name ? images[c.name.toLowerCase()] : undefined;
            const picked = bottomPick.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className={`mull-card${bottoming ? " mull-card--selectable" : ""}${
                  picked ? " mull-card--picked" : ""
                }`}
                {...cardProps(c)}
                title={c.name}
              >
                {url ? (
                  <img src={url} alt={c.name} loading="lazy" />
                ) : (
                  <span className="mull-card__name">{c.name || "?"}</span>
                )}
                {picked && <span className="mull-card__badge">↓</span>}
              </button>
            );
          })}
        </div>

        <div className="mull-actions">
          {bottoming ? (
            <>
              <span className="hint">
                {t("mulligan.bottomProgress", {
                  n: bottomPick.size,
                  max: prompt.bottomCount,
                })}
              </span>
              <button
                className="btn"
                disabled={bottomPick.size !== prompt.bottomCount}
                onClick={onConfirmBottom}
              >
                {t("mulligan.bottomConfirm")}
              </button>
              <button className="btn btn--ghost" onClick={onLetAi}>
                {t("mulligan.letAi")}
              </button>
            </>
          ) : (
            <>
              <button className="btn" onClick={onKeep}>
                {prompt.keepSize < prompt.hand.length
                  ? t("mulligan.keepCount", { n: prompt.keepSize })
                  : t("mulligan.keepAll")}
              </button>
              <button className="btn btn--ghost" onClick={onMulligan}>
                {prompt.mulliganCount === 0 && prompt.freeFirstMulligan
                  ? t("mulligan.free")
                  : t("mulligan.take", { n: prompt.nextKeepSize })}
              </button>
              <button className="btn btn--ghost" onClick={onLetAi}>
                {t("mulligan.letAi")}
              </button>
            </>
          )}
        </div>
      </div>

      {overlay}
    </div>
  );
}

/** Forced-discard popup: pick exactly `count` cards to discard. */
function DiscardModal({
  prompt,
  images,
  pick,
  onTogglePick,
  onConfirm,
  onLetAi,
}: {
  prompt: DiscardPrompt;
  images: Record<string, string>;
  pick: Set<number>;
  onTogglePick: (id: number) => void;
  onConfirm: () => void;
  onLetAi: () => void;
}) {
  const { t } = useI18n();
  const modalRef = useRef<HTMLDivElement>(null);

  // Move focus into the dialog, trap Tab within it, and restore focus on close.
  useFocusTrap(modalRef);

  const { cardProps, overlay } = useCardPreview({
    images,
    selectable: true,
    onToggle: onTogglePick,
  });

  return (
    <div
      className="mull-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="discard-title"
    >
      <div className="mull-modal" ref={modalRef}>
        <div className="mull-modal__head">
          <h2 id="discard-title">{t("discard.title")}</h2>
          <p className="hint">{t("discard.instruction", { n: prompt.count })}</p>
        </div>

        <div className="mull-hand">
          {prompt.cards.map((c) => {
            const url = c.name ? images[c.name.toLowerCase()] : undefined;
            const picked = pick.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className={`mull-card mull-card--selectable${
                  picked ? " mull-card--picked" : ""
                }`}
                {...cardProps(c)}
                title={c.name}
              >
                {url ? (
                  <img src={url} alt={c.name} loading="lazy" />
                ) : (
                  <span className="mull-card__name">{c.name || "?"}</span>
                )}
                {picked && <span className="mull-card__badge">✕</span>}
              </button>
            );
          })}
        </div>

        <div className="mull-actions">
          <span className="hint">
            {t("discard.progress", { n: pick.size, max: prompt.count })}
          </span>
          <button
            className="btn"
            disabled={pick.size !== prompt.count}
            onClick={onConfirm}
          >
            {t("discard.confirm")}
          </button>
          <button className="btn btn--ghost" onClick={onLetAi}>
            {t("mulligan.letAi")}
          </button>
        </div>
      </div>

      {overlay}
    </div>
  );
}

function modesInstruction(
  prompt: ModesPrompt,
  t: (key: MsgKey, vars?: Vars) => string,
): string {
  if (prompt.minChoices === prompt.maxChoices) {
    return prompt.maxChoices <= 1
      ? t("modes.instructionOne")
      : t("modes.instructionExact", { n: prompt.maxChoices });
  }
  return t("modes.instructionRange", {
    min: prompt.minChoices,
    max: prompt.maxChoices,
  });
}

/**
 * Modal spell/ability popup: the board dims behind it so a mode must be
 * chosen before play continues. The eye button lets the player peek at the
 * board (e.g. to check a target's stats) without losing their picks.
 */
function ModesModal({
  prompt,
  pick,
  onAdd,
  onRemove,
  onConfirm,
  onLetAi,
}: {
  prompt: ModesPrompt;
  pick: number[];
  onAdd: (index: number) => void;
  onRemove: (index: number) => void;
  onConfirm: () => void;
  onLetAi: () => void;
}) {
  const { t } = useI18n();
  const modalRef = useRef<HTMLDivElement>(null);
  const [peeking, setPeeking] = useState(false);

  // Move focus into the dialog, trap Tab within it, and restore focus on close.
  useFocusTrap(modalRef);

  return (
    <div
      className={`mull-overlay${peeking ? " mull-overlay--peeking" : ""}`}
      role="dialog"
      aria-modal={!peeking}
      aria-labelledby="modes-title"
    >
      <div className="mull-modal modes-modal" ref={modalRef}>
        <button
          type="button"
          className="modes-peek"
          onClick={() => setPeeking((v) => !v)}
          aria-pressed={peeking}
          aria-label={peeking ? t("modes.hide") : t("modes.peek")}
          title={peeking ? t("modes.hide") : t("modes.peek")}
        >
          {peeking ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>

        <div className="modes-modal__body">
          <div className="mull-modal__head">
            <h2 id="modes-title">{t("modes.title")}</h2>
            {prompt.sourceName && (
              <p className="hint">
                {t("modes.source", { name: prompt.sourceName })}
              </p>
            )}
            <p className="hint">{modesInstruction(prompt, t)}</p>
          </div>

          <div className="modes-list">
            {prompt.modes.map((mode, i) => {
              const count = pick.filter((p) => p === i).length;
              const canAddMore =
                pick.length < prompt.maxChoices &&
                (prompt.allowRepeatModes || count === 0);

              if (!prompt.allowRepeatModes) {
                return (
                  <button
                    key={i}
                    type="button"
                    className={`modes-choice${count > 0 ? " modes-choice--picked" : ""}`}
                    onClick={() => (count > 0 ? onRemove(i) : onAdd(i))}
                  >
                    {mode}
                  </button>
                );
              }

              return (
                <div
                  key={i}
                  className={`modes-choice modes-choice--stepper${
                    count > 0 ? " modes-choice--picked" : ""
                  }`}
                >
                  <span className="modes-choice__text">{mode}</span>
                  <span className="modes-stepper">
                    <button
                      type="button"
                      className="modes-stepper__btn"
                      disabled={count === 0}
                      onClick={() => onRemove(i)}
                      aria-label={t("modes.removeOne")}
                    >
                      −
                    </button>
                    <span className="modes-stepper__count">{count}</span>
                    <button
                      type="button"
                      className="modes-stepper__btn"
                      disabled={!canAddMore}
                      onClick={() => onAdd(i)}
                      aria-label={t("modes.addOne")}
                    >
                      +
                    </button>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mull-actions">
            <span className="hint">
              {t("modes.progress", { n: pick.length, max: prompt.maxChoices })}
            </span>
            <button
              className="btn"
              disabled={pick.length < prompt.minChoices}
              onClick={onConfirm}
            >
              {t("modes.confirm")}
            </button>
            <button className="btn btn--ghost" onClick={onLetAi}>
              {t("modes.letAi")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Scry/Surveil floating window: place each looked-at card, top of library first. */
function ScryWindow({
  prompt,
  images,
  onSubmit,
  onLetAi,
}: {
  prompt: ScryPrompt;
  images: Record<string, string>;
  onSubmit: (keptOnTop: number[]) => void;
  onLetAi: () => void;
}) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [kept, setKept] = useState<number[]>([]);

  const card = prompt.cards[index];
  const url = card?.name ? images[card.name.toLowerCase()] : undefined;

  const advance = (keepOnTop: boolean) => {
    const nextKept = keepOnTop ? [...kept, card.id] : kept;
    const nextIndex = index + 1;
    if (nextIndex >= prompt.cards.length) {
      onSubmit(nextKept);
    } else {
      setKept(nextKept);
      setIndex(nextIndex);
    }
  };

  const awayLabel =
    prompt.mode === "scry" ? t("scry.toBottom") : t("surveil.toGrave");

  return (
    <XpWindow
      title={prompt.mode === "scry" ? t("scry.title") : t("surveil.title")}
      onClose={onLetAi}
    >
      <div className="scry-window">
        <p className="hint">
          {t("scry.progress", { n: index + 1, max: prompt.cards.length })}
        </p>
        {card &&
          (url ? (
            <div className="card scry-window__card">
              <img className="card__img" src={url} alt={card.name} />
            </div>
          ) : (
            <div className="card card--text scry-window__card">
              <span className="card__name">{card.name || "?"}</span>
            </div>
          ))}
        <div className="scry-window__actions">
          <button className="btn" onClick={() => advance(true)}>
            {t("scry.keepTop")}
          </button>
          <button className="btn" onClick={() => advance(false)}>
            {awayLabel}
          </button>
          <button className="btn btn--ghost" onClick={onLetAi}>
            {t("scry.letAi")}
          </button>
        </div>
      </div>
    </XpWindow>
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
          {results.map((r) => {
            let winnerLabel: string;
            if (r.stopped) winnerLabel = "—";
            else if (r.winner === null) winnerLabel = t("board.draw");
            else winnerLabel = seatName(r.winner);
            return (
              <tr key={r.matchIndex}>
                <td>{r.matchIndex + 1}</td>
                <td>{winnerLabel}</td>
                <td>{r.turns}</td>
                <td>{r.seconds.toFixed(0)}s</td>
              </tr>
            );
          })}
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
