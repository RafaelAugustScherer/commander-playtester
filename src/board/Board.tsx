import { useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
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
import { useI18n } from "../i18n/I18nContext";
import { categoryLabel } from "../i18n/messages";

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

/** Declare-attackers interaction: toggle your creatures, aim at a defender. */
export interface AttackInteraction {
  /** Your creatures that may attack (click to toggle). */
  attackerIds: Set<number>;
  /** Attackers currently declared (highlighted). */
  declaredIds: Set<number>;
  onToggleAttacker: (id: number) => void;
  /** Opponent seats you may aim declared attackers at (multiplayer choice). */
  defenderSeats: Set<number>;
  onChooseDefender: (seat: number) => void;
}

function attackProps(
  o: GameObject,
  attack?: AttackInteraction,
): { attacker?: boolean; attacking?: boolean; onToggleAttack?: () => void } {
  if (!attack || !attack.attackerIds.has(o.id)) return {};
  return {
    attacker: true,
    attacking: attack.declaredIds.has(o.id),
    onToggleAttack: () => attack.onToggleAttacker(o.id),
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

interface Preview {
  url?: string;
  name: string;
  power?: number | null;
  toughness?: number | null;
  isCreature: boolean;
  rect: DOMRect;
}

/** Render opponents (top) with the human seat centered and larger at the bottom. */
export function Board({
  view,
  images,
  play,
  target,
  ability,
  attack,
  block,
  mana,
}: {
  view: BoardView;
  images?: Record<string, string>;
  play?: PlayInteraction;
  target?: TargetInteraction;
  ability?: AbilityInteraction;
  attack?: AttackInteraction;
  block?: BlockInteraction;
  mana?: ManaInteraction;
}) {
  const { t } = useI18n();
  const [preview, setPreview] = useState<Preview | null>(null);

  const you = view.seats.find((s) => s.seat === 0);
  const opponents = view.seats.filter((s) => s.seat !== 0);

  const onHover = play?.dragging != null ? undefined : setPreview;
  const seatName = (s: SeatView) => s.name || t("board.player", { n: s.seat + 1 });

  return (
    <div className="board">
      <div className={`board__opponents board__opponents--n${opponents.length}`}>
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
            target={target}
            attack={attack}
            block={block}
          />
        ))}
      </div>

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
            play={play}
            target={target}
            ability={ability}
            attack={attack}
            block={block}
            mana={mana}
          />
        </div>
      )}

      {preview && play?.dragging == null && <CardPreview preview={preview} />}
    </div>
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
  play,
  target,
  ability,
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
  play?: PlayInteraction;
  target?: TargetInteraction;
  ability?: AbilityInteraction;
  attack?: AttackInteraction;
  block?: BlockInteraction;
  mana?: ManaInteraction;
}) {
  const { t } = useI18n();
  const won = gameOver && winner === seat.seat;
  const seatTargetable = target?.playerSeats.has(seat.seat) ?? false;
  const seatTargeted = target?.chosenSeats.has(seat.seat) ?? false;
  const seatDefender = attack?.defenderSeats.has(seat.seat) ?? false;
  const cls = [
    "seat",
    you ? "seat--you" : "",
    seat.isActive && !gameOver ? "seat--active" : "",
    seat.isEliminated ? "seat--out" : "",
    won ? "seat--won" : "",
    seatTargetable ? "seat--targetable" : "",
    seatTargeted ? "seat--targeted" : "",
    seatDefender ? "seat--defender" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const dragCard = play?.dragging != null
    ? seat.hand.find((o) => o.id === play.dragging)
    : undefined;

  const seatClick = seatTargetable
    ? () => target!.onChoosePlayer(seat.seat)
    : seatDefender
      ? () => attack!.onChooseDefender(seat.seat)
      : undefined;

  return (
    <div className={cls} onClick={seatClick}>
      <div className="seat__head">
        <div className="seat__id">
          <span className="seat__name">
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

      <div className="seat__zones">
        <span>
          <Hand size={13} /> {seat.handCount}
        </span>
        <span>
          <Layers size={13} /> {seat.librarySize}
        </span>
        <span>
          <Skull size={13} /> {seat.graveyardSize}
        </span>
        {seat.poison > 0 && (
          <span>
            <Biohazard size={13} /> {seat.poison}
          </span>
        )}
      </div>

      <div className="seat__field">
        {seat.commanders.length > 0 && (
          <div className="seat__cmd">
            {seat.commanders.map((c) => (
              <Card
                key={c.id}
                obj={c}
                images={images}
                onHover={onHover}
                {...targetProps(c, target)}
                {...abilityProps(c, ability)}
                {...attackProps(c, you ? attack : undefined)}
                {...(you ? blockerProps(c, block) : blockTargetProps(c, block))}
                {...manaProps(c, you ? mana : undefined)}
                {...commanderCastProps(c, you ? play : undefined)}
              />
            ))}
          </div>
        )}

        <Row label={t("board.rowCreatures")} cards={seat.creatures} images={images} onHover={onHover} target={target} ability={ability} attack={you ? attack : undefined} block={block} you={you} mana={you ? mana : undefined} />
        <Row label={t("board.rowOthers")} cards={seat.others} images={images} onHover={onHover} target={target} ability={ability} mana={you ? mana : undefined} />
        <Row label={t("board.rowLands")} cards={seat.lands} images={images} onHover={onHover} target={target} ability={ability} mana={you ? mana : undefined} />

        {play && dragCard && <DropLane card={dragCard} play={play} />}
      </div>

      {seat.hand.length > 0 && (
        <HandRow seat={seat} images={images} onHover={onHover} play={play} target={target} />
      )}
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
}: {
  seat: SeatView;
  images?: Record<string, string>;
  onHover?: (p: Preview | null) => void;
  play?: PlayInteraction;
  target?: TargetInteraction;
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
  attacker,
  attacking,
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
  attacker?: boolean;
  attacking?: boolean;
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
  const url = obj.name ? images?.[obj.name.toLowerCase()] : undefined;
  const isCreature = obj.card_types?.core_types?.includes("Creature") ?? false;
  const cls = [
    "card",
    obj.tapped ? "card--tapped" : "",
    draggable ? "card--draggable" : "",
    selected ? "card--selected" : "",
    playable === false ? "card--unplayable" : "",
    targetable ? "card--targetable" : "",
    targeted ? "card--targeted" : "",
    activatable ? "card--activatable" : "",
    attacker ? "card--attacker" : "",
    attacking ? "card--attacking" : "",
    blocker ? "card--blocker" : "",
    blocking ? "card--blocking" : "",
    blockSelected ? "card--block-selected" : "",
    blockTarget ? "card--block-target" : "",
    manaSource ? "card--mana-source" : "",
    castable ? "card--castable" : "",
  ]
    .filter(Boolean)
    .join(" ");

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

  const click =
    onChoose ??
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
      </div>
    );
  }
  return (
    <div {...common}>
      <span className="card__name">{obj.name ?? "?"}</span>
      {pt}
    </div>
  );
}

/** Fixed-position enlarged card shown beside the hovered card. */
function CardPreview({ preview }: { preview: Preview }) {
  const width = 312;
  const height = Math.round(width / 0.716);
  const { rect } = preview;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const gap = 12;
  const fitsRight = rect.right + gap + width <= vw;
  const left = fitsRight
    ? rect.right + gap
    : Math.max(8, rect.left - gap - width);
  const top = Math.min(Math.max(8, rect.top - 20), Math.max(8, vh - height - 8));

  return (
    <div
      className="card-preview"
      style={{ left, top, width }}
    >
      {preview.url ? (
        <img src={preview.url} alt={preview.name} className="card-preview__img" />
      ) : (
        <div className="card-preview__text">
          <div className="card-preview__name">{preview.name}</div>
          {preview.isCreature && (
            <div className="card-preview__pt">
              {preview.power ?? 0}/{preview.toughness ?? 0}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
