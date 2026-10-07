import { isCreature, type Card } from "../lib/types";

const POWER_CONDITION = /(?<!\btotal )\b(base )?power (\d+)( or (?:less|greater))?\b/gi;
const POWER_TOKEN = /^(?:base power (\d+)|power (\d+) or (less|greater))$/;
const TOKEN_MAKER_POWER = /\bcreates?\b[^.]*?\b(\d+)\/\d+\b[^.]*?\btokens?\b/gi;
const NOT_A_CONDITION = /\btarget\b|\bopponents?\b|\bblock/i;

interface PowerCondition {
  wanted: number;
  direction: "less" | "greater" | null;
}

const parsedTokens = new Map<string, PowerCondition | null>();

function parsePowerToken(token: string): PowerCondition | null {
  let condition = parsedTokens.get(token);
  if (condition === undefined) {
    const parsed = POWER_TOKEN.exec(token);
    condition = parsed
      ? {
          wanted: Number(parsed[1] ?? parsed[2]),
          direction: (parsed[3] as PowerCondition["direction"]) ?? null,
        }
      : null;
    parsedTokens.set(token, condition);
  }
  return condition;
}

/** The power-condition tokens a text names, such as `base power 1`. */
export function powerConditions(text: string): string[] {
  const conditions: string[] = [];
  for (const sentence of text.split(/[.\n]/)) {
    if (NOT_A_CONDITION.test(sentence)) continue;
    for (const [, base, power, suffix] of sentence.matchAll(POWER_CONDITION)) {
      if (suffix) conditions.push(`power ${power}${suffix.toLowerCase()}`);
      else if (base) conditions.push(`base power ${power}`);
    }
  }
  return conditions;
}

/** Whether a theme token is a power condition such as `base power 1`. */
export function isPowerToken(token: string): boolean {
  return parsePowerToken(token) !== null;
}

/**
 * Whether a card has a creature of the power a power token names: its own
 * printed power, or that of a creature token its rules text creates.
 */
export function fitsPowerCondition(card: Card, token: string): boolean {
  const condition = parsePowerToken(token);
  if (!condition) return false;
  const powers: number[] = [];
  if (card.power !== undefined && isCreature(card)) powers.push(card.power);
  for (const [, power] of card.oracleText.matchAll(TOKEN_MAKER_POWER)) powers.push(Number(power));
  return powers.some((power) => {
    if (condition.direction === "less") return power <= condition.wanted;
    if (condition.direction === "greater") return power >= condition.wanted;
    return power === condition.wanted;
  });
}
