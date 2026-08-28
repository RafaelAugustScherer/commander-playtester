import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  Ban,
  Biohazard,
  Circle,
  Cog,
  Hand,
  Layers,
  PawPrint,
  Skull,
  Sparkles,
  Square,
  Swords,
  Trees,
  Wand2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { GameObject } from "../engine/types";
import type { BoardView, SeatView } from "./boardView";
import { seatColor } from "./seatColor";
import { CardPreview, type Preview } from "./CardPreview";
import { tokenImageUrl } from "./tokenArt";
import { useI18n } from "../i18n/I18nContext";
import { categoryLabel } from "../i18n/messages";
import { XpScroll } from "../components/XpScroll";
import { XpWindow } from "../components/XpWindow";

/** A shared zone with a floating card-list window (graveyard, exile). */
type ZoneKind = "graveyard" | "exile";
/** One open zone window: which seat, which of that seat's shared zones. */
interface ZoneRef {
  kind: ZoneKind;
  seat: number;
}

/** Play-mode interaction for the human's seat: drag a hand card to a slot, or
 * click the commander in the command zone to cast it. */
export interface PlayInteraction {
  /** Object ids that have a legal play action right now (hand or command zone). */
  playableIds: Set<number>;
  /** Object id currently being dragged, or null. */
  dragging: number | null;
  setDragging: (id: number | null) => void;
  /** Play the object with this id (dropped on a valid slot, or clicked to cast). */
  onPlay: (objId: number) => void;
}

/** Target-selection interaction: click a legal target object or player. */
export interface TargetInteraction {
  /** Object ids that are legal targets for the current slot. */
  objectIds: Set<number>;
  /** Player seats that are legal targets for the current slot. */
  playerSeats: Set<number>;
  /** Object ids already chosen (highlighted as selected). */
  chosenObjIds: Set<number>;
  /** Player seats already chosen. */
  chosenSeats: Set<number>;
  onChooseObject: (id: number) => void;
  onChoosePlayer: (seat: number) => void;
}

function targetProps(
  o: GameObject,
  target?: TargetInteraction,
): { targetable?: boolean; targeted?: boolean; onChoose?: () => void } {
  if (!target) return {};
  if (target.objectIds.has(o.id)) {
    return {
      targetable: true,
      targeted: target.chosenObjIds.has(o.id),
      onChoose: () => target.onChooseObject(o.id),
    };
  }
  if (target.chosenObjIds.has(o.id)) return { targeted: true };
  return {};
}

/** Ability activation: click one of your permanents to activate an ability. */
export interface AbilityInteraction {
  /** Object ids of your permanents with at least one activatable ability. */
  objectIds: Set<number>;
  onActivate: (objId: number) => void;
}

function abilityProps(
  o: GameObject,
  ability?: AbilityInteraction,
): { activatable?: boolean; onActivate?: () => void } {
  if (!ability || !ability.objectIds.has(o.id)) return {};
  return { activatable: true, onActivate: () => ability.onActivate(o.id) };
}

/** Ninjutsu: click a ninja (hand or command zone), then an unblocked attacker
 * you control to return in its place. */
export interface NinjutsuInteraction {
  /** Ninja object ids playable via ninjutsu now (in hand or the command zone). */
  sourceIds: Set<number>;
  /** The ninja chosen, awaiting a creature to return (null before a pick). */
  chosenSource: number | null;
  /** Unblocked-attacker ids returnable for the chosen ninja. */
  returnableIds: Set<number>;
  onChooseSource: (objId: number) => void;
  onChooseReturn: (creatureId: number) => void;
}

function ninjutsuSourceProps(
  o: GameObject,
  ninjutsu?: NinjutsuInteraction,
): { ninjutsuSource?: boolean; ninjutsuChosen?: boolean; onNinjutsu?: () => void } {
  if (!ninjutsu || !ninjutsu.sourceIds.has(o.id)) return {};
  return {
    ninjutsuSource: true,
    ninjutsuChosen: ninjutsu.chosenSource === o.id,
    onNinjutsu: () => ninjutsu.onChooseSource(o.id),
  };
}

function ninjutsuReturnProps(
  o: GameObject,
  ninjutsu?: NinjutsuInteraction,
): { ninjutsuReturn?: boolean; onNinjutsuReturn?: () => void } {
  if (
    !ninjutsu ||
    ninjutsu.chosenSource === null ||
    !ninjutsu.returnableIds.has(o.id)
  ) {
    return {};
  }
  return {
    ninjutsuReturn: true,
    onNinjutsuReturn: () => ninjutsu.onChooseReturn(o.id),
  };
}

/** Declare-attackers interaction: toggle your creatures, aim each at a defender. */
export interface AttackInteraction {
  /** Your creatures that may attack (click to toggle). */
  attackerIds: Set<number>;
  /** Attackers currently declared (highlighted). */
  declaredIds: Set<number>;
  /** Whether multiple defenders make per-attacker aiming meaningful. */
  multiDefender: boolean;
  /** The declared attacker focused for re-aiming (multiplayer), or null. */
  selectedAttackerId: number | null;
  /** attackerId -> the seat it is aimed at. */
  assignments: Map<number, number>;
  /** seat -> short display name, for the on-card target badge. */
  defenderNames: Map<number, string>;
  /** Click one of your creatures (toggles it, or focuses it for aiming). */
  onAttackerClick: (id: number) => void;
  /** Opponent seats you may aim the focused attacker at (multiplayer choice). */
  defenderSeats: Set<number>;
  onChooseDefender: (seat: number) => void;
}

function attackProps(
  o: GameObject,
  attack?: AttackInteraction,
): {
  attacker?: boolean;
  attacking?: boolean;
  attackerSelected?: boolean;
  attackTarget?: string;
  attackTargetColor?: string;
  onToggleAttack?: () => void;
} {
  if (!attack || !attack.attackerIds.has(o.id)) return {};
  const declared = attack.declaredIds.has(o.id);
  const seat = attack.assignments.get(o.id);
  const aimed = attack.multiDefender && declared && seat !== undefined;
  return {
    attacker: true,
    attacking: declared,
    attackerSelected: attack.multiDefender && attack.selectedAttackerId === o.id,
    attackTarget: aimed ? attack.defenderNames.get(seat!) : undefined,
    attackTargetColor: aimed ? seatColor(seat!) : undefined,
    onToggleAttack: () => attack.onAttackerClick(o.id),
  };
}

/** Declare-blockers interaction: pick a blocker, then the attacker it blocks. */
export interface BlockInteraction {
  /** Your creatures that may block (click to select). */
  blockerIds: Set<number>;
  /** Blockers already assigned to an attacker (highlighted). */
  assignedIds: Set<number>;
  /** The blocker awaiting an attacker, or null. */
  selectedBlocker: number | null;
  onSelectBlocker: (id: number) => void;
  /** Attacker ids the selected blocker may block (highlighted while selecting). */
  assignableAttackerIds: Set<number>;
  onAssignAttacker: (attackerId: number) => void;
}

/** Props for the human's own creatures (candidate blockers). */
function blockerProps(
  o: GameObject,
  block?: BlockInteraction,
): {
  blocker?: boolean;
  blocking?: boolean;
  blockSelected?: boolean;
  onSelectBlock?: () => void;
} {
  if (!block || !block.blockerIds.has(o.id)) return {};
  return {
    blocker: true,
    blocking: block.assignedIds.has(o.id),
    blockSelected: block.selectedBlocker === o.id,
    onSelectBlock: () => block.onSelectBlocker(o.id),
  };
}

/** Props for an opponent's attacking creatures (assignment targets). */
function blockTargetProps(
  o: GameObject,
  block?: BlockInteraction,
): { blockTarget?: boolean; onAssignBlock?: () => void } {
  if (
    !block ||
    block.selectedBlocker === null ||
    !block.assignableAttackerIds.has(o.id)
  ) {
    return {};
  }
  return {
    blockTarget: true,
    onAssignBlock: () => block.onAssignAttacker(o.id),
  };
}

/** Mana-payment interaction: tap one of your sources to pay. */
export interface ManaInteraction {
  /** Object ids of your permanents that can be tapped for the current payment. */
  sourceIds: Set<number>;
  onTapSource: (objId: number) => void;
}

function manaProps(
  o: GameObject,
  mana?: ManaInteraction,
): { manaSource?: boolean; onTapSource?: () => void } {
  if (!mana || !mana.sourceIds.has(o.id)) return {};
  return { manaSource: true, onTapSource: () => mana.onTapSource(o.id) };
}

/** Command-zone cast: click your commander when the engine offers its cast. */
function commanderCastProps(
  o: GameObject,
  play?: PlayInteraction,
): { castable?: boolean; onCast?: () => void } {
  if (!play || !play.playableIds.has(o.id)) return {};
  return { castable: true, onCast: () => play.onPlay(o.id) };
}

const MANA_COLOR: Record<string, string> = {
  White: "#efe9c8",
  Blue: "#4a90e2",
  Black: "#6b7280",
  Red: "#ef4444",
  Green: "#38a169",
  Colorless: "#9aa2b1",
};

const PERMANENT_TYPES = [
  "Land",
  "Creature",
  "Artifact",
  "Enchantment",
  "Planeswalker",
  "Battle",
];
const SLOT_ICON: Record<string, LucideIcon> = {
  Land: Trees,
  Creature: PawPrint,
  Artifact: Cog,
  Enchantment: Sparkles,
  Planeswalker: Wand2,
  Battle: Swords,
  Spell: Zap,
};

function coreTypes(o: GameObject): string[] {
  return o.card_types?.core_types ?? [];
}
function isPermanent(o: GameObject): boolean {
  const ct = coreTypes(o);
  return PERMANENT_TYPES.some((t) => ct.includes(t));
}
/** Drop-slot categories to offer while dragging a given card. */
function slotsFor(o: GameObject): string[] {
  const slots = ["Land", "Creature", "Artifact", "Enchantment", "Planeswalker"];
  if (coreTypes(o).includes("Battle")) slots.push("Battle");
  if (!isPermanent(o)) slots.push("Spell");
  return slots;
}
function slotAccepts(cat: string, o: GameObject): boolean {
  if (cat === "Spell") return !isPermanent(o);
  return coreTypes(o).includes(cat);
}

function classList(
  base: string,
  flags: Record<string, boolean | undefined>,
): string {
  return [base, ...Object.keys(flags).filter((k) => flags[k])].join(" ");
}

/** Render opponents (top) with the human seat centered and larger at the bottom. */
export function Board({
  view,
  images,
  play,
  target,
  ability,
  ninjutsu,
  attack,
  block,
  mana,
}: {
  view: BoardView;
  images?: Record<string, string>;
  play?: PlayInteraction;
  target?: TargetInteraction;
  ability?: AbilityInteraction;
  ninjutsu?: NinjutsuInteraction;
  attack?: AttackInteraction;
  block?: BlockInteraction;
  mana?: ManaInteraction;
}) {
  const { t } = useI18n();
  const [preview, setPreview] = useState<Preview | null>(null);
  // Every zone window currently open (a seat's graveyard or exile). Each is
  // independent, so several can be open — even several at once for the same
  // seat, or the same zone kind across different seats.
  const [openZones, setOpenZones] = useState<ZoneRef[]>([]);
  const oppScrollRef = useRef<HTMLDivElement | null>(null);

  const you = view.seats.find((s) => s.seat === 0);
  const opponents = view.seats.filter((s) => s.seat !== 0);

  function openZone(kind: ZoneKind, seat: number) {
    setOpenZones((prev) =>
      prev.some((z) => z.kind === kind && z.seat === seat)
        ? prev
        : [...prev, { kind, seat }],
    );
  }
  function closeZone(kind: ZoneKind, seat: number) {
    setOpenZones((prev) => prev.filter((z) => z.kind !== kind || z.seat !== seat));
  }
  const openGraveyard = (seat: number) => openZone("graveyard", seat);
  const openExile = (seat: number) => openZone("exile", seat);

  // In the mobile opponents gallery, follow the active opponent into view. When
  // the human (seat 0) is active, leave the gallery on the last-shown opponent.
  const activePlayer = view.activePlayer;
  useEffect(() => {
    const container = oppScrollRef.current;
    if (!container || activePlayer === 0) return;
    if (container.scrollWidth <= container.clientWidth) return;
    const el = container.querySelector<HTMLElement>(
      `[data-seat="${activePlayer}"]`,
    );
    if (!el) return;
    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    const delta =
      eRect.left - cRect.left - (container.clientWidth - el.clientWidth) / 2;
    container.scrollBy({ left: delta, behavior: "auto" });
  }, [activePlayer]);

  const onHover = play?.dragging != null ? undefined : setPreview;
  const seatName = (s: SeatView) => s.name || t("board.player", { n: s.seat + 1 });

  return (
    <div className="board">
      <XpScroll
        axis="x"
        wrapperClassName="board__opponents-frame"
        className={`board__opponents board__opponents--n${opponents.length}`}
        viewRef={oppScrollRef}
      >
        {opponents.map((seat) => (
          <Seat
            key={seat.seat}
            seat={seat}
            you={false}
            name={seatName(seat)}
            gameOver={view.gameOver}
            winner={view.winner}
            images={images}
            onHover={onHover}
            onOpenGraveyard={openGraveyard}
            onOpenExile={openExile}
            target={target}
            attack={attack}
            block={block}
          />
        ))}
      </XpScroll>

      {you && (
        <div className="board__self">
          <Seat
            seat={you}
            you
            name={seatName(you)}
            gameOver={view.gameOver}
            winner={view.winner}
            images={images}
            onHover={onHover}
            onOpenGraveyard={openGraveyard}
            onOpenExile={openExile}
            play={play}
            target={target}
            ability={ability}
            ninjutsu={ninjutsu}
            attack={attack}
            block={block}
            mana={mana}
          />
        </div>
      )}

      {openZones.map(({ kind, seat }) => {
        const seatView = view.seats.find((s) => s.seat === seat);
        if (!seatView) return null;
        const cards = kind === "graveyard" ? seatView.graveyard : seatView.exile;
        if (cards.length === 0) return null;
        const title =
          kind === "graveyard"
            ? t("board.graveyardOf", { name: seatName(seatView) })
            : t("board.exileOf", { name: seatName(seatView) });
        return (
          <ZoneWindow
            key={`${kind}-${seat}`}
            title={title}
            cards={cards}
            images={images}
            onHover={onHover}
            onClose={() => closeZone(kind, seat)}
          />
        );
      })}

      {preview && play?.dragging == null && <CardPreview preview={preview} />}
    </div>
  );
}

/** A floating window listing a seat's cards in a shared zone (graveyard, exile). */
function ZoneWindow({
  title,
  cards,
  images,
  onHover,
  onClose,
}: {
  title: string;
  cards: GameObject[];
  images?: Record<string, string>;
  onHover?: (p: Preview | null) => void;
  onClose: () => void;
}) {
  return (
    <XpWindow title={title} onClose={onClose}>
      <XpScroll axis="x" wrapperClassName="zone-window" className="zone-window__row">
        {cards.map((o) => (
          <Card key={o.id} obj={o} images={images} onHover={onHover} />
        ))}
      </XpScroll>
    </XpWindow>
  );
}

function Seat({
  seat,
  you,
  name,
  gameOver,
  winner,
  images,
  onHover,
  onOpenGraveyard,
  onOpenExile,
  play,
  target,
  ability,
  ninjutsu,
  attack,
  block,
  mana,
}: {
  seat: SeatView;
  you: boolean;
  name: string;
  gameOver: boolean;
  winner: number | null;
  images?: Record<string, string>;
  onHover?: (p: Preview | null) => void;
  onOpenGraveyard?: (seat: number) => void;
  onOpenExile?: (seat: number) => void;
  play?: PlayInteraction;
  target?: TargetInteraction;
  ability?: AbilityInteraction;
  ninjutsu?: NinjutsuInteraction;
  attack?: AttackInteraction;
  block?: BlockInteraction;
  mana?: ManaInteraction;
}) {
  const { t } = useI18n();
  const won = gameOver && winner === seat.seat;
  const seatTargetable = target?.playerSeats.has(seat.seat) ?? false;
  const seatTargeted = target?.chosenSeats.has(seat.seat) ?? false;
  const seatDefender = attack?.defenderSeats.has(seat.seat) ?? false;
  const cls = classList("seat", {
    "seat--you": you,
    "seat--active": seat.isActive && !gameOver,
    "seat--out": seat.isEliminated,
    "seat--won": won,
    "seat--targetable": seatTargetable,
    "seat--targeted": seatTargeted,
    "seat--defender": seatDefender,
  });

  const dragCard = play?.dragging != null
    ? seat.hand.find((o) => o.id === play.dragging)
    : undefined;

  const seatClick = seatClickHandler(
    seat,
    seatTargetable,
    seatDefender,
    target,
    attack,
  );

  const youPlay = you ? play : undefined;
  const youAttack = you ? attack : undefined;
  const youMana = you ? mana : undefined;
  const youNinjutsu = you ? ninjutsu : undefined;

  return (
    <div className={cls} onClick={seatClick} data-seat={seat.seat}>
      <SeatHead seat={seat} you={you} name={name} />

      <SeatZones seat={seat} onOpenGraveyard={onOpenGraveyard} onOpenExile={onOpenExile} />

      <div className="seat__field">
        {seat.commanders.length > 0 && (
          <CommandZone
            commanders={seat.commanders}
            images={images}
            onHover={onHover}
            target={target}
            ability={ability}
            attack={youAttack}
            block={block}
            mana={youMana}
            play={youPlay}
            ninjutsu={youNinjutsu}
            you={you}
          />
        )}

        <Row label={t("board.rowCreatures")} cards={seat.creatures} images={images} onHover={onHover} target={target} ability={ability} ninjutsu={youNinjutsu} attack={youAttack} block={block} you={you} mana={youMana} />
        <Row label={t("board.rowOthers")} cards={seat.others} images={images} onHover={onHover} target={target} ability={ability} mana={youMana} />
        <Row label={t("board.rowLands")} cards={seat.lands} images={images} onHover={onHover} target={target} ability={ability} mana={youMana} />

        {play && dragCard && <DropLane card={dragCard} play={play} />}
      </div>

      {seat.hand.length > 0 && (
        <HandRow seat={seat} images={images} onHover={onHover} play={play} target={target} ninjutsu={youNinjutsu} />
      )}
    </div>
  );
}

function seatClickHandler(
  seat: SeatView,
  seatTargetable: boolean,
  seatDefender: boolean,
  target?: TargetInteraction,
  attack?: AttackInteraction,
): (() => void) | undefined {
  if (seatTargetable) return () => target!.onChoosePlayer(seat.seat);
  if (seatDefender) return () => attack!.onChooseDefender(seat.seat);
  return undefined;
}

function SeatHead({
  seat,
  you,
  name,
}: {
  seat: SeatView;
  you: boolean;
  name: string;
}) {
  const { t } = useI18n();
  return (
    <div className="seat__head">
      <div className="seat__id">
        <span
          className="seat__name"
          style={you ? undefined : { color: seatColor(seat.seat) }}
        >
          {name}
          {you && <span className="seat__tag">{t("board.you")}</span>}
        </span>
        <span className="seat__commander">{seat.commander}</span>
      </div>
      <div className="seat__life-wrap">
        {seat.manaPool.length > 0 && (
          <span className="seat__mana" title="Mana disponível">
            {seat.manaPool.map((pip) => {
              const color = MANA_COLOR[pip.color] ?? MANA_COLOR.Colorless;
              return Array.from({ length: pip.count }, (_, i) => (
                <Circle
                  key={`${pip.color}-${i}`}
                  size={11}
                  color={color}
                  fill={color}
                />
              ));
            })}
          </span>
        )}
        <span className="seat__life">
          {seat.isEliminated ? <Skull size={22} /> : seat.life}
        </span>
      </div>
    </div>
  );
}

/** A zone count in the seat header: a button when there's something to open. */
function ZoneCount({
  icon: Icon,
  count,
  onOpen,
  title,
}: {
  icon: LucideIcon;
  count: number;
  onOpen?: () => void;
  title: string;
}) {
  if (count > 0 && onOpen) {
    return (
      <button
        type="button"
        className="seat__zone-btn"
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        title={title}
      >
        <Icon size={13} /> {count}
      </button>
    );
  }
  return (
    <span>
      <Icon size={13} /> {count}
    </span>
  );
}

function SeatZones({
  seat,
  onOpenGraveyard,
  onOpenExile,
}: {
  seat: SeatView;
  onOpenGraveyard?: (seat: number) => void;
  onOpenExile?: (seat: number) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="seat__zones">
      <span>
        <Hand size={13} /> {seat.handCount}
      </span>
      <span>
        <Layers size={13} /> {seat.librarySize}
      </span>
      <ZoneCount
        icon={Skull}
        count={seat.graveyardSize}
        onOpen={onOpenGraveyard ? () => onOpenGraveyard(seat.seat) : undefined}
        title={t("board.graveyardOpen")}
      />
      <ZoneCount
        icon={Ban}
        count={seat.exileSize}
        onOpen={onOpenExile ? () => onOpenExile(seat.seat) : undefined}
        title={t("board.exileOpen")}
      />
      {seat.poison > 0 && (
        <span>
          <Biohazard size={13} /> {seat.poison}
        </span>
      )}
    </div>
  );
}

function CommandZone({
  commanders,
  images,
  onHover,
  target,
  ability,
  attack,
  block,
  mana,
  play,
  ninjutsu,
  you,
}: {
  commanders: GameObject[];
  images?: Record<string, string>;
  onHover?: (p: Preview | null) => void;
  target?: TargetInteraction;
  ability?: AbilityInteraction;
  attack?: AttackInteraction;
  block?: BlockInteraction;
  mana?: ManaInteraction;
  play?: PlayInteraction;
  ninjutsu?: NinjutsuInteraction;
  you: boolean;
}) {
  return (
    <div className="seat__cmd">
      {commanders.map((c) => (
        <Card
          key={c.id}
          obj={c}
          images={images}
          onHover={onHover}
          {...targetProps(c, target)}
          {...abilityProps(c, ability)}
          {...attackProps(c, attack)}
          {...(you ? blockerProps(c, block) : blockTargetProps(c, block))}
          {...manaProps(c, mana)}
          {...commanderCastProps(c, play)}
          {...ninjutsuSourceProps(c, ninjutsu)}
        />
      ))}
    </div>
  );
}

function DropLane({ card, play }: { card: GameObject; play: PlayInteraction }) {
  const { lang } = useI18n();
  return (
    <div className="droplane">
      {slotsFor(card).map((cat) => {
        const ok = slotAccepts(cat, card);
        const SlotIcon = SLOT_ICON[cat] ?? Square;
        return (
          <div
            key={cat}
            className={`slot ${ok ? "slot--ok" : "slot--no"}`}
            onClick={() => {
              if (!ok || play.dragging == null) return;
              play.onPlay(play.dragging);
              play.setDragging(null);
            }}
            onDragOver={(e) => {
              if (ok) e.preventDefault();
            }}
            onDrop={(e) => {
              if (!ok || play.dragging == null) return;
              e.preventDefault();
              play.onPlay(play.dragging);
              play.setDragging(null);
            }}
          >
            <span className="slot__icon" aria-hidden>
              <SlotIcon size={22} />
            </span>
            <span className="slot__label">{categoryLabel(lang, cat)}</span>
          </div>
        );
      })}
    </div>
  );
}

function HandRow({
  seat,
  images,
  onHover,
  play,
  target,
  ninjutsu,
}: {
  seat: SeatView;
  images?: Record<string, string>;
  onHover?: (p: Preview | null) => void;
  play?: PlayInteraction;
  target?: TargetInteraction;
  ninjutsu?: NinjutsuInteraction;
}) {
  const { t } = useI18n();
  return (
    <div className="seat__row seat__row--muted seat__hand">
      <span className="seat__row-label">{t("board.rowHand")}</span>
      <div className="seat__cards">
        {seat.hand.map((o) => {
          const playable = play?.playableIds.has(o.id) ?? false;
          return (
            <Card
              key={o.id}
              obj={o}
              images={images}
              onHover={onHover}
              draggable={playable}
              playable={play ? playable : undefined}
              selected={play?.dragging === o.id}
              onTapPlay={
                playable && play
                  ? () => play.setDragging(play.dragging === o.id ? null : o.id)
                  : undefined
              }
              onDragStart={
                playable && play
                  ? () => {
                      onHover?.(null);
                      play.setDragging(o.id);
                    }
                  : undefined
              }
              onDragEnd={play ? () => play.setDragging(null) : undefined}
              {...targetProps(o, target)}
              {...ninjutsuSourceProps(o, ninjutsu)}
            />
          );
        })}
      </div>
    </div>
  );
}

function Row({
  label,
  cards,
  images,
  onHover,
  target,
  ability,
  ninjutsu,
  attack,
  block,
  you,
  mana,
}: {
  label: string;
  cards: GameObject[];
  images?: Record<string, string>;
  onHover?: (p: Preview | null) => void;
  target?: TargetInteraction;
  ability?: AbilityInteraction;
  ninjutsu?: NinjutsuInteraction;
  attack?: AttackInteraction;
  block?: BlockInteraction;
  you?: boolean;
  mana?: ManaInteraction;
}) {
  if (cards.length === 0) return null;
  return (
    <div className="seat__row">
      <span className="seat__row-label">{label}</span>
      <div className="seat__cards">
        {cards.map((o) => (
          <Card
            key={o.id}
            obj={o}
            images={images}
            onHover={onHover}
            {...targetProps(o, target)}
            {...abilityProps(o, ability)}
            {...ninjutsuReturnProps(o, ninjutsu)}
            {...attackProps(o, attack)}
            {...(you ? blockerProps(o, block) : blockTargetProps(o, block))}
            {...manaProps(o, mana)}
          />
        ))}
      </div>
    </div>
  );
}

function Card({
  obj,
  images,
  onHover,
  draggable,
  playable,
  selected,
  onTapPlay,
  onDragStart,
  onDragEnd,
  targetable,
  targeted,
  onChoose,
  activatable,
  onActivate,
  ninjutsuSource,
  ninjutsuChosen,
  onNinjutsu,
  ninjutsuReturn,
  onNinjutsuReturn,
  attacker,
  attacking,
  attackerSelected,
  attackTarget,
  attackTargetColor,
  onToggleAttack,
  blocker,
  blocking,
  blockSelected,
  onSelectBlock,
  blockTarget,
  onAssignBlock,
  manaSource,
  onTapSource,
  castable,
  onCast,
}: {
  obj: GameObject;
  images?: Record<string, string>;
  onHover?: (p: Preview | null) => void;
  draggable?: boolean;
  playable?: boolean;
  selected?: boolean;
  onTapPlay?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  targetable?: boolean;
  targeted?: boolean;
  onChoose?: () => void;
  activatable?: boolean;
  onActivate?: () => void;
  ninjutsuSource?: boolean;
  ninjutsuChosen?: boolean;
  onNinjutsu?: () => void;
  ninjutsuReturn?: boolean;
  onNinjutsuReturn?: () => void;
  attacker?: boolean;
  attacking?: boolean;
  attackerSelected?: boolean;
  attackTarget?: string;
  attackTargetColor?: string;
  onToggleAttack?: () => void;
  blocker?: boolean;
  blocking?: boolean;
  blockSelected?: boolean;
  onSelectBlock?: () => void;
  blockTarget?: boolean;
  onAssignBlock?: () => void;
  manaSource?: boolean;
  onTapSource?: () => void;
  castable?: boolean;
  onCast?: () => void;
}) {
  const url =
    (obj.name ? images?.[obj.name.toLowerCase()] : undefined) ??
    tokenImageUrl(obj);
  const isCreature = obj.card_types?.core_types?.includes("Creature") ?? false;
  const cls = classList("card", {
    "card--tapped": obj.tapped,
    "card--draggable": draggable,
    "card--selected": selected,
    "card--unplayable": playable === false,
    "card--targetable": targetable,
    "card--targeted": targeted,
    "card--activatable": activatable,
    "card--ninjutsu": ninjutsuSource,
    "card--ninjutsu-chosen": ninjutsuChosen,
    "card--ninjutsu-return": ninjutsuReturn,
    "card--attacker": attacker,
    "card--attacking": attacking,
    "card--attacker-selected": attackerSelected,
    "card--blocker": blocker,
    "card--blocking": blocking,
    "card--block-selected": blockSelected,
    "card--block-target": blockTarget,
    "card--mana-source": manaSource,
    "card--castable": castable,
  });

  const enter = (e: ReactMouseEvent) =>
    onHover?.({
      url,
      name: obj.name ?? "?",
      power: obj.power,
      toughness: obj.toughness,
      isCreature,
      rect: (e.currentTarget as HTMLElement).getBoundingClientRect(),
    });
  const leave = () => onHover?.(null);

  const pt = isCreature ? (
    <span className="card__pt">
      {obj.power ?? 0}/{obj.toughness ?? 0}
    </span>
  ) : null;

  const targetBadge = attackTarget ? (
    <span
      className="card__attack-target"
      title={attackTarget}
      style={
        attackTargetColor
          ? { background: attackTargetColor, color: "#1b1206" }
          : undefined
      }
    >
      ⚔ {attackTarget}
    </span>
  ) : null;

  const click =
    onChoose ??
    onNinjutsuReturn ??
    onNinjutsu ??
    onCast ??
    onActivate ??
    onToggleAttack ??
    onSelectBlock ??
    onAssignBlock ??
    onTapSource ??
    onTapPlay;
  const common = {
    className: url ? cls : `${cls} card--text`,
    title: obj.name,
    draggable,
    onMouseEnter: enter,
    onMouseLeave: leave,
    onClick: click
      ? (e: ReactMouseEvent) => {
          e.stopPropagation();
          leave();
          click();
        }
      : undefined,
    onDragStart,
    onDragEnd: onDragEnd
      ? () => {
          leave();
          onDragEnd();
        }
      : undefined,
  };

  if (url) {
    return (
      <div {...common}>
        <img className="card__img" src={url} alt={obj.name ?? ""} loading="lazy" />
        {pt}
        {targetBadge}
      </div>
    );
  }
  return (
    <div {...common}>
      <span className="card__name">{obj.name ?? "?"}</span>
      {pt}
      {targetBadge}
    </div>
  );
}

