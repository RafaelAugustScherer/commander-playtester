import { rulesLines } from "./rulesText";
import { cardKey } from "./types";

export type RampKind = "mana" | "land search" | "extra land" | "treasure";

interface RampCard {
  typeLine: string;
  oracleText: string;
}

const X_ACTIVATION_MANA = 3;
const ONE_SHOT_SPELL = /\b(?:Instant|Sorcery)\b/;
const MANA_WORDING =
  /\badds? (?:an additional )?(?:\{[WUBRGC]|(?:one|two|three|x) mana\b|an amount of\b)/i;
const LAND_WORD = /\b(?:lands?|forests?|plains|islands?|swamps?|mountains?)\b/i;
const EXTRA_LAND = /\bplay (?:an|two|three) additional lands?\b/i;
const TREASURE = /\bcreates? [^.]*\btreasure tokens?\b/i;
const KEYWORD_WITH_COST = /^[A-Z][a-z]+(?: [a-z]+)?$/;
const FROM_HAND_COST = /\bdiscard this card\b/i;

function costMana(cost: string): number {
  let mana = 0;
  for (const symbol of cost.split("{").slice(1).map((part) => part.split("}")[0])) {
    if (/^\d+$/.test(symbol)) mana += Number(symbol);
    else if (symbol === "X") mana += X_ACTIVATION_MANA;
    else if (!/^[TQE]$/.test(symbol)) mana++;
  }
  return mana;
}

function keywordCostMana(line: string): number {
  const brace = line.indexOf("{");
  if (brace <= 0) return 0;
  const keyword = line.slice(0, brace).trim();
  if (!KEYWORD_WITH_COST.test(keyword) || keyword === "Ward") return 0;
  return costMana(line.slice(brace));
}

function activationCost(line: string): string | null {
  const colon = line.indexOf(":");
  if (colon < 0) return null;
  const cost = line.slice(0, colon).split("—").pop() ?? "";
  return /[."•]/.test(cost) ? null : cost;
}

export function activationMana(line: string): number {
  if (line.indexOf(":") < 0) return keywordCostMana(line);
  const cost = activationCost(line);
  return cost === null ? 0 : costMana(cost);
}

export function manaSpent(card: { manaValue: number; oracleText: string }): number {
  let spent = card.manaValue;
  for (const line of rulesLines(card)) {
    spent = Math.max(spent, activationMana(line));
  }
  return spent;
}

function manaProduced(line: string): number {
  const clause = line.slice(line.search(MANA_WORDING)).split(".")[0];
  return Math.max(
    ...clause.split(/\bor\b/i).map((option) => {
      const symbols = option.split("{").length - 1;
      if (symbols > 0) return symbols;
      if (/\btwo\b|\bx\b|\ban amount\b/i.test(option)) return 2;
      if (/\bthree\b/i.test(option)) return 3;
      return 1;
    }),
  );
}

function makesNetMana(line: string): boolean {
  if (FROM_HAND_COST.test(activationCost(line) ?? "")) return false;
  return manaProduced(line) > activationMana(line);
}

export function manaAbilityLines(card: RampCard): string[] {
  if (ONE_SHOT_SPELL.test(card.typeLine)) return [];
  return rulesLines(card).filter((line) => MANA_WORDING.test(line) && makesNetMana(line));
}

function searchesLandOntoBattlefield(line: string): boolean {
  return line
    .split(".")
    .some(
      (sentence) =>
        /\bsearch your library for\b/i.test(sentence) &&
        LAND_WORD.test(sentence) &&
        /\bonto the battlefield\b/i.test(sentence),
    );
}

export function rampKind(card: RampCard): RampKind | null {
  if (/\bLand\b/.test(card.typeLine)) return null;
  const lines = rulesLines(card);
  if (lines.some(searchesLandOntoBattlefield)) return "land search";
  if (manaAbilityLines(card).length > 0) return "mana";
  if (lines.some((line) => EXTRA_LAND.test(line))) return "extra land";
  if (lines.some((line) => TREASURE.test(line))) return "treasure";
  return null;
}

const lastingRampCache = new Map<string, boolean>();

export function isLastingRamp(card: RampCard): boolean {
  const key = cardKey(card);
  let lasting = lastingRampCache.get(key);
  if (lasting === undefined) {
    const kind = rampKind(card);
    lasting =
      kind === "extra land"
        ? !ONE_SHOT_SPELL.test(card.typeLine)
        : kind === "land search" || kind === "mana";
    lastingRampCache.set(key, lasting);
  }
  return lasting;
}
