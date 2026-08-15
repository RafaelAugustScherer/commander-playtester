import { useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { GameObject } from "../engine/types";
import type { BoardView, SeatView } from "./boardView";
import { useI18n } from "../i18n/I18nContext";
import { phaseLabel, categoryLabel } from "../i18n/messages";

/** Play-mode interaction for the human's seat: drag a hand card to a slot. */
export interface PlayInteraction {
  /** Hand object ids that have a legal play action right now. */
  playableIds: Set<number>;
  /** Object id currently being dragged, or null. */
  dragging: number | null;
  setDragging: (id: number | null) => void;
  /** Play the hand card with this object id (drag dropped on a valid slot). */
  onPlay: (objId: number) => void;
}

const PERMANENT_TYPES = [
  "Land",
  "Creature",
  "Artifact",
  "Enchantment",
  "Planeswalker",
  "Battle",
];
const SLOT_ICON: Record<string, string> = {
  Land: "🌄",
  Creature: "🐾",
  Artifact: "⚙️",
  Enchantment: "✨",
  Planeswalker: "🔮",
  Battle: "⚔️",
  Spell: "🎇",
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
}: {
  view: BoardView;
  images?: Record<string, string>;
  play?: PlayInteraction;
}) {
  const { t, lang } = useI18n();
  const [preview, setPreview] = useState<Preview | null>(null);

  const active = view.seats[view.activePlayer];
  const you = view.seats.find((s) => s.seat === 0);
  const opponents = view.seats.filter((s) => s.seat !== 0);

  const onHover = play?.dragging != null ? undefined : setPreview;
  const seatName = (s: SeatView) => s.name || t("board.player", { n: s.seat + 1 });

  return (
    <div className="board">
      <div className="board__status">
        <span className="board__turn">{t("board.turn", { n: view.turn })}</span>
        <span className="board__phase">{phaseLabel(lang, view.phase)}</span>
        {!view.gameOver && active && (
          <span className="board__active">
            {t("board.activeTurn", { name: seatName(active) })}
          </span>
        )}
        {view.gameOver && (
          <span className="board__winner">
            {view.winner === null
              ? t("board.draw")
              : t("board.winner", {
                  name:
                    view.seats[view.winner]?.name ||
                    t("board.player", { n: view.winner + 1 }),
                })}
          </span>
        )}
      </div>

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
}: {
  seat: SeatView;
  you: boolean;
  name: string;
  gameOver: boolean;
  winner: number | null;
  images?: Record<string, string>;
  onHover?: (p: Preview | null) => void;
  play?: PlayInteraction;
}) {
  const { t } = useI18n();
  const won = gameOver && winner === seat.seat;
  const cls = [
    "seat",
    you ? "seat--you" : "",
    seat.isActive && !gameOver ? "seat--active" : "",
    seat.isEliminated ? "seat--out" : "",
    won ? "seat--won" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const dragCard = play?.dragging != null
    ? seat.hand.find((o) => o.id === play.dragging)
    : undefined;

  return (
    <div className={cls}>
      <div className="seat__head">
        <div className="seat__id">
          <span className="seat__name">
            {name}
            {you && <span className="seat__tag">{t("board.you")}</span>}
          </span>
          <span className="seat__commander">{seat.commander}</span>
        </div>
        <div className="seat__life">{seat.isEliminated ? "💀" : seat.life}</div>
      </div>

      <div className="seat__zones">
        <span>🂠 {seat.handCount}</span>
        <span>📚 {seat.librarySize}</span>
        <span>⚰️ {seat.graveyardSize}</span>
        {seat.poison > 0 && <span>☠️ {seat.poison}</span>}
      </div>

      <div className="seat__field">
        {seat.commanders.length > 0 && (
          <div className="seat__cmd">
            {seat.commanders.map((c) => (
              <Card key={c.id} obj={c} images={images} onHover={onHover} />
            ))}
          </div>
        )}

        <Row label={t("board.rowCreatures")} cards={seat.creatures} images={images} onHover={onHover} />
        <Row label={t("board.rowOthers")} cards={seat.others} images={images} onHover={onHover} />
        <Row label={t("board.rowLands")} cards={seat.lands} images={images} onHover={onHover} />

        {play && dragCard && <DropLane card={dragCard} play={play} />}
      </div>

      {seat.hand.length > 0 && (
        <HandRow seat={seat} images={images} onHover={onHover} play={play} />
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
        return (
          <div
            key={cat}
            className={`slot ${ok ? "slot--ok" : "slot--no"}`}
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
              {SLOT_ICON[cat] ?? "▢"}
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
}: {
  seat: SeatView;
  images?: Record<string, string>;
  onHover?: (p: Preview | null) => void;
  play?: PlayInteraction;
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
              onDragStart={
                playable && play
                  ? () => {
                      onHover?.(null);
                      play.setDragging(o.id);
                    }
                  : undefined
              }
              onDragEnd={play ? () => play.setDragging(null) : undefined}
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
}: {
  label: string;
  cards: GameObject[];
  images?: Record<string, string>;
  onHover?: (p: Preview | null) => void;
}) {
  if (cards.length === 0) return null;
  return (
    <div className="seat__row">
      <span className="seat__row-label">{label}</span>
      <div className="seat__cards">
        {cards.map((o) => (
          <Card key={o.id} obj={o} images={images} onHover={onHover} />
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
  onDragStart,
  onDragEnd,
}: {
  obj: GameObject;
  images?: Record<string, string>;
  onHover?: (p: Preview | null) => void;
  draggable?: boolean;
  playable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const url = obj.name ? images?.[obj.name.toLowerCase()] : undefined;
  const isCreature = obj.card_types?.core_types?.includes("Creature") ?? false;
  const cls = [
    "card",
    obj.tapped ? "card--tapped" : "",
    draggable ? "card--draggable" : "",
    playable === false ? "card--unplayable" : "",
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

  const common = {
    className: url ? cls : `${cls} card--text`,
    title: obj.name,
    draggable,
    onMouseEnter: enter,
    onMouseLeave: leave,
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
  const width = 260;
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
