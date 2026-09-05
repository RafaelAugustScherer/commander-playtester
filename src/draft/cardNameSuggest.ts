import type { SearchCardRow } from "../engine/draftQueries";

const NAME_SUGGEST_LIMIT = 15;

/** How well a card name matches the query: lower is a stronger match. */
function nameMatchRank(lowerName: string, query: string): number | null {
  const idx = lowerName.indexOf(query);
  if (idx < 0) return null;
  if (lowerName === query) return 0;
  if (idx === 0) return 1;
  return /[a-z0-9]/.test(lowerName[idx - 1]) ? 3 : 2;
}

/**
 * Turn raw `search_cards_js` rows into card-name suggestions. That search
 * matches name *and* oracle text and sorts alphabetically, so a raw call is a
 * poor name autocomplete ("sol" buries "Sol Ring" under A-Sizzling-Soloist-style
 * hits). Keep only rows whose *name* contains the query, drop Alchemy "A-"
 * rebalances, and re-rank so exact, then prefix, then word-start names come
 * first (alphabetical within a tier).
 */
export function rankNameSuggestions(rows: SearchCardRow[], rawQuery: string): string[] {
  const query = rawQuery.trim().toLowerCase();
  if (query.length < 2) return [];
  const ranked: Array<{ name: string; rank: number }> = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.name.startsWith("A-") || seen.has(row.name)) continue;
    const rank = nameMatchRank(row.name.toLowerCase(), query);
    if (rank === null) continue;
    seen.add(row.name);
    ranked.push({ name: row.name, rank });
  }
  ranked.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  return ranked.slice(0, NAME_SUGGEST_LIMIT).map((r) => r.name);
}
