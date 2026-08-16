import type { GameObject, GameStateEnvelope } from "../engine/types";
import { readManaPool, type ManaPip } from "../sim/decisions/mana";

export interface SeatView {
  seat: number;
  name: string;
  commander: string;
  life: number;
  poison: number;
  /** Floating (unspent) mana in this player's pool. */
  manaPool: ManaPip[];
  handCount: number;
  /** Revealed hand cards (empty when hidden). */
  hand: GameObject[];
  librarySize: number;
  graveyardSize: number;
  lands: GameObject[];
  creatures: GameObject[];
  others: GameObject[];
  commanders: GameObject[];
  isActive: boolean;
  isEliminated: boolean;
}

export interface BoardView {
  turn: number;
  phase: string;
  activePlayer: number;
  gameOver: boolean;
  winner: number | null;
  seats: SeatView[];
}

export interface SeatMeta {
  name: string;
  commander: string;
}

function isLandType(o: GameObject): boolean {
  return o.card_types?.core_types?.includes("Land") ?? false;
}
function isCreatureType(o: GameObject): boolean {
  return o.card_types?.core_types?.includes("Creature") ?? false;
}

/** Project the raw engine state into a fixed per-seat board view. */
export function toBoardView(
  env: GameStateEnvelope,
  meta: SeatMeta[],
): BoardView {
  const st = env.state;
  const objects = st.objects ?? {};
  const all = Object.values(objects) as GameObject[];
  const eliminated = new Set<number>(st.eliminated_players ?? []);

  const seats: SeatView[] = st.players.map((p, seat) => {
    const controlled = all.filter(
      (o) => o.zone === "Battlefield" && o.controller === seat,
    );
    const lands = controlled.filter(isLandType);
    const creatures = controlled.filter(
      (o) => isCreatureType(o) && !isLandType(o),
    );
    const others = controlled.filter(
      (o) => !isLandType(o) && !isCreatureType(o),
    );
    const commanders = all.filter(
      (o) => o.is_commander && o.owner === seat && o.zone === "Command",
    );
    const handZone = all.filter((o) => o.zone === "Hand" && o.owner === seat);
    const hand = handZone.filter((o) => !o.face_down);

    return {
      seat,
      name: meta[seat]?.name ?? `Jogador ${seat + 1}`,
      commander: meta[seat]?.commander ?? "",
      life: p.life,
      poison: p.poison_counters ?? 0,
      manaPool: readManaPool(p),
      handCount: p.hand?.length ?? handZone.length,
      hand,
      librarySize: p.library?.length ?? 0,
      graveyardSize: p.graveyard?.length ?? 0,
      lands,
      creatures,
      others,
      commanders,
      isActive: st.active_player === seat,
      isEliminated: eliminated.has(seat) || (p.is_eliminated ?? false),
    };
  });

  const gameOver = st.waiting_for?.type === "GameOver";
  const turnNumber = st.turn_number ?? 0;
  const playerCount = st.players.length || 1;
  const round =
    turnNumber < 1 ? turnNumber : Math.floor((turnNumber - 1) / playerCount) + 1;
  return {
    turn: round,
    phase: st.phase ?? "",
    activePlayer: st.active_player ?? 0,
    gameOver,
    winner: gameOver ? (st.waiting_for?.data?.winner ?? null) : null,
    seats,
  };
}
