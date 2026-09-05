import type { SearchCardRow, CardFaceData } from "../engine/draftQueries";

/** A card is Commander-legal only when the engine marks it exactly "legal". */
export function isCommanderLegal(row: SearchCardRow | undefined): boolean {
  return row?.legalities?.commander === "legal";
}

/** A legendary creature, read from an engine card face's type. */
export function isLegendaryCreature(face: CardFaceData | null | undefined): boolean {
  const type = face?.card_type;
  if (!type) return false;
  return (
    (type.supertypes ?? []).includes("Legendary") &&
    (type.core_types ?? []).includes("Creature")
  );
}

/**
 * Whether a card may be a commander. The engine's `is_card_commander_eligible`
 * is the main signal but has false negatives — it rejects some legitimate
 * legendary creatures (e.g. Ancient Copper Dragon) — so a legendary-creature
 * type line also qualifies. The union keeps either gap from blocking a valid
 * commander while still rejecting non-legendary creatures, planeswalkers, etc.
 */
export function isCommanderEligible(engineEligible: boolean, face: CardFaceData | null): boolean {
  return engineEligible || isLegendaryCreature(face);
}
