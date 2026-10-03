import type { CardFaceData } from "../engine/draftQueries";
import type { DecklistEntry } from "../lib/types";
import { COMMANDER_WEIGHT } from "./themes";

export const DRAFT_CARD_TYPES = [
  "land",
  "creature",
  "instant",
  "sorcery",
  "artifact",
  "enchantment",
  "planeswalker",
] as const;

export type DraftCardType = (typeof DRAFT_CARD_TYPES)[number];

export type TypeCounts = Record<DraftCardType, number>;

export interface TypeBalance {
  target: TypeCounts;
  nonbasicLandTarget: number;
  have: TypeCounts;
  basicLands: number;
}

const NON_LAND_TYPES = DRAFT_CARD_TYPES.filter((type) => type !== "land");

const PRIMARY_TYPE_ORDER: Array<[DraftCardType, RegExp]> = [
  ["land", /\bLand\b/],
  ["creature", /\bCreature\b/],
  ["planeswalker", /\bPlaneswalker\b/],
  ["instant", /\bInstant\b/],
  ["sorcery", /\bSorcery\b/],
  ["artifact", /\bArtifact\b/],
  ["enchantment", /\bEnchantment\b/],
];

const BASELINE_NON_LAND: Record<Exclude<DraftCardType, "land">, number> = {
  creature: 27.4,
  instant: 10.3,
  sorcery: 7.9,
  artifact: 10.0,
  enchantment: 7.5,
  planeswalker: 0.8,
};

const BASE_LANDS = 35;
const LAND_BONUS_MAX = 4;
const LAND_SIGNAL_SCALE = 3;
const FOCUS_MAX = 0.5;
const FOCUS_SIGNAL_SCALE = 4;
const DECK_SIGNAL_CAP = 6;
const STRONG_SIGNAL = 3;
const MEDIUM_SIGNAL = 1;
// Share of the land target drafted as nonbasic lands, by colour count. One
// colour keeps a few utility lands; the rest are basics (`deck-draft/ADR-0007`).
const NONBASIC_LAND_SHARE_BY_COLORS = [0.75, 0.15, 0.45, 0.6, 0.65, 0.7];

const NONCREATURE_SPELL_TYPES: DraftCardType[] = [
  "instant",
  "sorcery",
  "artifact",
  "enchantment",
];

export const BASIC_LAND_BY_COLOR: Record<string, string> = {
  W: "Plains",
  U: "Island",
  B: "Swamp",
  R: "Mountain",
  G: "Forest",
};

const COLORLESS_BASIC_LAND = "Wastes";

const BASIC_LAND_NAMES = new Set(
  [...Object.values(BASIC_LAND_BY_COLOR), COLORLESS_BASIC_LAND].map((name) =>
    name.toLowerCase(),
  ),
);

export function zeroCounts(): TypeCounts {
  return {
    land: 0,
    creature: 0,
    instant: 0,
    sorcery: 0,
    artifact: 0,
    enchantment: 0,
    planeswalker: 0,
  };
}

function isDraftCardType(value: string): value is DraftCardType {
  return (DRAFT_CARD_TYPES as readonly string[]).includes(value);
}

export function primaryType(typeLine: string): DraftCardType | null {
  const types = typeLine.split("//")[0].split("—")[0];
  for (const [type, pattern] of PRIMARY_TYPE_ORDER) {
    if (pattern.test(types)) return type;
  }
  return null;
}

export function isBasicLandName(name: string): boolean {
  return BASIC_LAND_NAMES.has(name.trim().toLowerCase());
}

type NodeAccepts = (node: Record<string, unknown>) => boolean;

function filterTypes(
  filter: unknown,
  subtypeTypes: ReadonlyMap<string, DraftCardType>,
): DraftCardType[] {
  if (typeof filter === "string") {
    const type = filter.toLowerCase();
    return isDraftCardType(type) ? [type] : [];
  }
  if (!filter || typeof filter !== "object") return [];
  const entry = filter as Record<string, unknown>;
  if (typeof entry.Subtype === "string") {
    const type = subtypeTypes.get(entry.Subtype.toLowerCase());
    return type ? [type] : [];
  }
  if (entry.Non === "Creature") return NONCREATURE_SPELL_TYPES;
  if (Array.isArray(entry.AnyOf)) {
    return entry.AnyOf.flatMap((inner) => filterTypes(inner, subtypeTypes));
  }
  return [];
}

function collectFilterLabels(
  node: unknown,
  accepts: NodeAccepts,
  out: Map<string, DraftCardType[]>,
  subtypeTypes: ReadonlyMap<string, DraftCardType>,
): void {
  if (Array.isArray(node)) {
    for (const child of node) collectFilterLabels(child, accepts, out, subtypeTypes);
    return;
  }
  if (!node || typeof node !== "object") return;
  const record = node as Record<string, unknown>;
  if (Array.isArray(record.type_filters) && accepts(record)) {
    for (const filter of record.type_filters) {
      const types = filterTypes(filter, subtypeTypes);
      if (types.length > 0) out.set(JSON.stringify(filter), types);
    }
  }
  for (const child of Object.values(record)) {
    collectFilterLabels(child, accepts, out, subtypeTypes);
  }
}

function strongSources(face: CardFaceData): unknown[] {
  const sources: unknown[] = [];
  for (const trigger of face.triggers ?? []) {
    if (
      typeof trigger.mode === "string" &&
      trigger.mode.startsWith("SpellCast") &&
      trigger.valid_target?.type === "Controller"
    ) {
      sources.push(trigger.valid_card);
    }
  }
  for (const ability of face.static_abilities ?? []) {
    const costChange =
      ability.mode && typeof ability.mode === "object" ? ability.mode.ModifyCost : undefined;
    if (costChange?.mode === "Reduce" && ability.affected?.controller === "You") {
      sources.push(costChange.spell_filter);
    }
  }
  return sources;
}

export function cardTypeSignals(
  face: CardFaceData,
  subtypeTypes: ReadonlyMap<string, DraftCardType>,
): TypeCounts {
  const signals = zeroCounts();
  const notOpponents: NodeAccepts = (node) => node.controller !== "Opponent";

  for (const source of strongSources(face)) {
    const labels = new Map<string, DraftCardType[]>();
    collectFilterLabels(source, notOpponents, labels, subtypeTypes);
    for (const types of labels.values()) {
      for (const type of new Set(types)) signals[type] += STRONG_SIGNAL;
    }
  }

  const ownLabels = new Map<string, DraftCardType[]>();
  collectFilterLabels(
    [face.triggers, face.static_abilities, face.abilities, face.replacements],
    (node) => node.controller === "You",
    ownLabels,
    subtypeTypes,
  );
  const ownTypes = new Set([...ownLabels.values()].flat());
  for (const type of ownTypes) {
    if (signals[type] === 0) signals[type] = MEDIUM_SIGNAL;
  }
  return signals;
}

export function typeWeights(
  commanderSignals: TypeCounts[],
  deckSignals: TypeCounts[],
): TypeCounts {
  const weights = zeroCounts();
  for (const signals of commanderSignals) {
    for (const type of DRAFT_CARD_TYPES) weights[type] += COMMANDER_WEIGHT * signals[type];
  }
  if (DRAFT_CARD_TYPES.some((type) => weights[type] > 0)) return weights;

  const deck = zeroCounts();
  for (const signals of deckSignals) {
    for (const type of DRAFT_CARD_TYPES) {
      if (signals[type] >= STRONG_SIGNAL) deck[type] += signals[type] / STRONG_SIGNAL;
    }
  }
  for (const type of DRAFT_CARD_TYPES) {
    weights[type] = Math.min(DECK_SIGNAL_CAP, deck[type]);
  }
  return weights;
}

function signalStrength(weight: number, scale: number): number {
  return 1 - Math.exp(-weight / scale);
}

function largestRemainder(shares: number[], total: number): number[] {
  const raw = shares.map((share) => share * total);
  const counts = raw.map(Math.floor);
  let left = total - counts.reduce((sum, n) => sum + n, 0);
  const order = raw
    .map((value, i) => ({ i, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    counts[i]++;
    left--;
  }
  return counts;
}

export function targetMix(
  weights: TypeCounts,
  colorCount: number,
  deckSize: number,
): { counts: TypeCounts; nonbasicLands: number } {
  const lands = Math.round(
    BASE_LANDS + LAND_BONUS_MAX * signalStrength(weights.land, LAND_SIGNAL_SCALE),
  );
  const nonLandSlots = Math.max(0, deckSize - lands);

  const baselineTotal = NON_LAND_TYPES.reduce(
    (sum, type) => sum + BASELINE_NON_LAND[type],
    0,
  );
  const focusTotal = NON_LAND_TYPES.reduce((sum, type) => sum + weights[type], 0);
  const strongest = Math.max(...NON_LAND_TYPES.map((type) => weights[type]));
  const focus = focusTotal > 0 ? FOCUS_MAX * signalStrength(strongest, FOCUS_SIGNAL_SCALE) : 0;

  const shares = NON_LAND_TYPES.map(
    (type) =>
      (1 - focus) * (BASELINE_NON_LAND[type] / baselineTotal) +
      (focusTotal > 0 ? focus * (weights[type] / focusTotal) : 0),
  );
  const nonLandCounts = largestRemainder(shares, nonLandSlots);

  const counts = zeroCounts();
  counts.land = lands;
  NON_LAND_TYPES.forEach((type, i) => {
    counts[type] = nonLandCounts[i];
  });

  const share =
    NONBASIC_LAND_SHARE_BY_COLORS[
      Math.min(colorCount, NONBASIC_LAND_SHARE_BY_COLORS.length - 1)
    ];
  return { counts, nonbasicLands: Math.round(lands * share) };
}

export function allocateSlots(
  balance: TypeBalance,
  count: number,
  eligible: readonly DraftCardType[],
): DraftCardType[] {
  // Once the lands reach their target (basics filled), rounds stop offering lands.
  const landFull = balance.have.land >= balance.target.land;
  eligible = landFull ? eligible.filter((type) => type !== "land") : eligible;
  if (eligible.length === 0) return [];
  const slotTarget = { ...balance.target, land: balance.nonbasicLandTarget };
  const drafted = { ...balance.have, land: balance.have.land - balance.basicLands };
  const targetTotal = DRAFT_CARD_TYPES.reduce((sum, type) => sum + slotTarget[type], 0);
  const draftedTotal = DRAFT_CARD_TYPES.reduce((sum, type) => sum + drafted[type], 0);
  const pace = targetTotal > 0 ? (draftedTotal + 1) / targetTotal : 1;

  const deficit = zeroCounts();
  for (const type of DRAFT_CARD_TYPES) {
    deficit[type] = slotTarget[type] * pace - drafted[type];
  }

  const slots: DraftCardType[] = [];
  for (let i = 0; i < count; i++) {
    let best = eligible[0];
    for (const type of eligible.slice(1)) {
      if (
        deficit[type] > deficit[best] ||
        (deficit[type] === deficit[best] && slotTarget[type] > slotTarget[best])
      ) {
        best = type;
      }
    }
    slots.push(best);
    deficit[best] -= 1;
  }
  return slots;
}

/**
 * How many basic lands the fill adds: every land still missing from the target
 * once the nonbasic lands already drafted are counted, never past the deck's
 * open slots (`deck-draft/ADR-0007`).
 */
export function basicLandCount(balance: TypeBalance, openSlots: number): number {
  const nonbasicLands = balance.have.land - balance.basicLands;
  const missing = balance.target.land - nonbasicLands;
  return Math.max(0, Math.min(missing, openSlots));
}

export function basicLandSplit(
  count: number,
  identity: string[],
  colorWeights: Record<string, number>,
): DecklistEntry[] {
  if (count <= 0) return [];
  const colors = identity.filter((color) => BASIC_LAND_BY_COLOR[color]);
  if (colors.length === 0) return [{ quantity: count, name: COLORLESS_BASIC_LAND }];

  const weights = colors.map((color) => colorWeights[color] ?? 0);
  const total = weights.reduce((sum, w) => sum + w, 0);
  const shares =
    total > 0 ? weights.map((w) => w / total) : colors.map(() => 1 / colors.length);
  const counts = largestRemainder(shares, count);
  return colors.flatMap((color, i) =>
    counts[i] > 0 ? [{ quantity: counts[i], name: BASIC_LAND_BY_COLOR[color] }] : [],
  );
}
