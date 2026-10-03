export interface DraftCustomization {
  planeswalkers: boolean;
  dungeons: boolean;
}

export const DEFAULT_CUSTOMIZATION: DraftCustomization = {
  planeswalkers: false,
  dungeons: false,
};

const DUNGEON_TEXT = /\bdungeons?\b|\binitiative\b/i;

export function isPlaneswalkerCard(typeLine: string): boolean {
  return /\bPlaneswalker\b/.test(typeLine);
}

export function usesDungeons(oracleText: string): boolean {
  return DUNGEON_TEXT.test(oracleText);
}

export function isSuggestable(
  card: { typeLine: string; oracleText: string },
  customization: DraftCustomization,
): boolean {
  if (!customization.planeswalkers && isPlaneswalkerCard(card.typeLine)) return false;
  if (!customization.dungeons && usesDungeons(card.oracleText)) return false;
  return true;
}
