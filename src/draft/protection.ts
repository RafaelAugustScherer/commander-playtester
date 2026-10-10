import { rulesLines } from "../lib/rulesText";
import { isLand, type Card } from "../lib/types";
import { commanderThemeTokens } from "./tokens";

const KEEPS_ALIVE = String.raw`\b(?:hexproof|shroud|indestructible|protection from)\b`;
const GIVES = String.raw`\b(?:gain|gains|have|has|get|gets)\b[^.]*`;

/**
 * Wordings that keep your own things on the battlefield: a grant of hexproof,
 * shroud, indestructible or protection to what you control, to a target
 * creature, or to an equipped or enchanted creature; an umbra; or redirecting
 * a spell. Phasing your things out counts too (`isProtection`). A creature's
 * own keyword is not one.
 */
const PROTECTS = [
  new RegExp(
    String.raw`\b(?:creatures?|permanents?|artifacts?|planeswalkers?|commanders?) you control\b[^.]*${GIVES}${KEEPS_ALIVE}`,
    "i",
  ),
  new RegExp(String.raw`\byour commanders?\b[^.]*${GIVES}${KEEPS_ALIVE}`, "i"),
  new RegExp(
    String.raw`\btarget (?:legendary )?(?:creature|permanent|artifact)\b[^.]*${GIVES}${KEEPS_ALIVE}`,
    "i",
  ),
  new RegExp(String.raw`\b(?:equipped|enchanted) (?:creature|permanent)\b[^.]*${GIVES}${KEEPS_ALIVE}`, "i"),
  /\b(?:totem|umbra) armor\b/i,
  /\b(?:change the target of|choose new targets for) target spell\b/i,
];

const PHASES_OUT = /\bphases? out\b/i;
const NOT_YOURS = /\b(?:an opponent controls|you don't control|target opponent|each opponent)\b/i;

const SELF_PROTECTED = /\b(?:hexproof|shroud|indestructible|ward|protection from)\b/i;

/**
 * Ways a commander comes back without paying commander tax, or works without
 * its body: commander ninjutsu, dash (it returns to your hand), eminence, and
 * an ability that puts it onto the battlefield from the command zone (Derevi).
 */
const TAX_FREE = [
  /\bcommander ninjutsu\b/i,
  /^dash\b/im,
  /\beminence\b/i,
  /\bonto the battlefield from the command zone\b|\bfrom the command zone onto the battlefield\b/i,
];

// A commander that wants to connect: it triggers on attacking or on its own
// combat damage, or it cares about Auras or Equipment.
const CONNECTS = /\bwhenever (?:~|this creature) [^.,]*\b(?:attacks|deals combat damage)\b|\battacks alone\b/i;
const CONNECT_TOKENS = ["aura", "equipment"];

const CHEAP_COMMANDER_MV = 3;
const PRICEY_COMMANDER_MV = 6;
/** A commander that protects itself or dodges the tax needs this share of the protection. */
export const SHIELDED_NEED = 0.25;
/** Protection pieces every deck aims for: the Greaves, Boots or Heroic Intervention most decks run. */
export const PROTECTION_FLOOR = 2;
/** Protection pieces a deck adds on top of the floor at full need. */
export const PROTECTION_EXTRA = 6;

function rulesText(card: Pick<Card, "oracleText">): string {
  return rulesLines(card).join("\n");
}

const NOT_A_SHORT_NAME = new Set(["The", "A", "An"]);

/**
 * Rules text with the card's own name read as "~": in full, before its comma
 * ("Kroxa"), or by first name, as Oracle text now shortens legends ("Edgar").
 */
function selfReferencing(card: Card): string {
  let text = rulesText(card);
  for (const face of card.name.split("//")) {
    const full = face.trim();
    const firstName = full.split(/[\s,]/)[0];
    const names = [full, full.split(",")[0]];
    if (!NOT_A_SHORT_NAME.has(firstName)) names.push(firstName);
    for (const name of names) {
      if (name) text = text.split(name).join("~");
    }
  }
  return text;
}

/** Whether a nonland card keeps your commander or creatures on the battlefield. */
export function isProtection(card: Card): boolean {
  if (isLand(card)) return false;
  const text = rulesText(card);
  if (PROTECTS.some((pattern) => pattern.test(text))) return true;
  // Phasing your own things out, not an opponent's.
  return text
    .split(/[.\n]/)
    .some((sentence) => PHASES_OUT.test(sentence) && !NOT_YOURS.test(sentence));
}

/** Whether a commander wants to connect: voltron, Auras, Equipment, attack triggers. */
export function wantsToConnect(commander: Card): boolean {
  const tokens = commanderThemeTokens(commander);
  return CONNECTS.test(selfReferencing(commander)) || CONNECT_TOKENS.some((t) => tokens.has(t));
}

/**
 * How costly losing this commander is, 0 to 1: none at mana value 3 or less,
 * rising to full at 6, and a quarter of that when the commander has hexproof,
 * shroud, indestructible, ward or protection, or comes back without commander
 * tax.
 */
export function commanderCostNeed(commander: Card): number {
  const cost = Math.max(
    0,
    Math.min(1, (commander.manaValue - CHEAP_COMMANDER_MV) / (PRICEY_COMMANDER_MV - CHEAP_COMMANDER_MV)),
  );
  const text = rulesText(commander);
  const shielded = SELF_PROTECTED.test(text) || TAX_FREE.some((pattern) => pattern.test(text));
  return shielded ? cost * SHIELDED_NEED : cost;
}

/**
 * How much a deck wants protection for this commander, 0 to 1: the larger of
 * wanting to connect (full) and what losing it costs.
 */
export function commanderProtectionNeed(commander: Card): number {
  return Math.max(wantsToConnect(commander) ? 1 : 0, commanderCostNeed(commander));
}

/**
 * The protection pieces a whole deck aims for: `PROTECTION_FLOOR`, plus up to
 * `PROTECTION_EXTRA` with its commanders' greatest need. No commander, no target.
 */
export function protectionTarget(commanders: Card[]): number {
  if (commanders.length === 0) return 0;
  const need = Math.max(...commanders.map(commanderProtectionNeed));
  return PROTECTION_FLOOR + PROTECTION_EXTRA * need;
}
