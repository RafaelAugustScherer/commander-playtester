import type { Card } from "../lib/types";
import { rulesLines } from "./lands";

const X_ACTIVATION_MANA = 3;
const ONE_SHOT_SPELL = /\b(?:Instant|Sorcery)\b/;
const LAND_TO_BATTLEFIELD = /\bsearch your library for\b[^.]*\bonto the battlefield\b/i;
const MANA_ABILITY = /\badd (?:\{[WUBRGC]|one mana|two mana|three mana|x mana|an amount of)/i;
const EXTRA_LAND = /\bplay (?:an|two|three) additional lands?\b/i;

export function activationMana(line: string): number {
  const colon = line.indexOf(":");
  if (colon < 0) return 0;
  const cost = line.slice(0, colon);
  if (/[."—•]/.test(cost)) return 0;
  let mana = 0;
  for (const symbol of cost.split("{").slice(1).map((part) => part.split("}")[0])) {
    if (/^\d+$/.test(symbol)) mana += Number(symbol);
    else if (symbol === "X") mana += X_ACTIVATION_MANA;
    else if (!/^[TQE]$/.test(symbol)) mana++;
  }
  return mana;
}

export function isLastingRamp(card: Card): boolean {
  if (!card.roles.includes("ramp")) return false;
  if (LAND_TO_BATTLEFIELD.test(card.oracleText)) return true;
  if (ONE_SHOT_SPELL.test(card.typeLine)) return false;
  return rulesLines(card).some(
    (line) => (MANA_ABILITY.test(line) && makesNetMana(line)) || EXTRA_LAND.test(line),
  );
}

function makesNetMana(line: string): boolean {
  const clause = line.slice(line.search(/\badd\b/i)).split(".")[0];
  const symbols = clause.split("{").length - 1;
  let produced = 1;
  if (symbols > 0) produced = symbols;
  else if (/\btwo\b|\bx\b|\ban amount\b/i.test(clause)) produced = 2;
  else if (/\bthree\b/i.test(clause)) produced = 3;
  return produced > activationMana(line);
}
