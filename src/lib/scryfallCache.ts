import type { Card, ParsedDecklist, ResolvedDeck, DecklistEntry } from "./types";
import { fetchCards, lookup, type FetchLike } from "./scryfall";

const CACHE_KEY = "commander-playtester/scryfall-cache/v2";

/** Card metadata cache keyed by the *requested* name, lowercased. */
type Cache = Record<string, Card>;

function loadCache(): Cache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Cache) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: Cache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Cache is best-effort; ignore quota/serialization failures.
  }
}

/**
 * Like {@link fetchCards} but backed by a localStorage cache so a card is
 * fetched from Scryfall at most once across every deck and session. Returns a
 * map keyed by the requested name (lowercased) plus the names Scryfall could
 * not find.
 */
export async function fetchCardsCached(
  names: string[],
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<{ cards: Map<string, Card>; notFound: string[] }> {
  const cache = loadCache();
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  const cards = new Map<string, Card>();
  const misses: string[] = [];

  for (const name of unique) {
    const hit = cache[name.toLowerCase()];
    if (hit) {
      cards.set(name.toLowerCase(), hit);
    } else {
      misses.push(name);
    }
  }

  if (misses.length === 0) return { cards, notFound: [] };

  const { cards: fetched, notFound } = await fetchCards(misses, fetchImpl);
  for (const name of misses) {
    const card = lookup(fetched, name);
    if (card) {
      cards.set(name.toLowerCase(), card);
      cache[name.toLowerCase()] = card;
    }
  }
  saveCache(cache);
  return { cards, notFound };
}

function expand(
  entries: DecklistEntry[],
  cards: Map<string, Card>,
  unresolved: string[],
): Card[] {
  const out: Card[] = [];
  for (const entry of entries) {
    const card = cards.get(entry.name.toLowerCase());
    if (!card) {
      unresolved.push(entry.name);
      continue;
    }
    for (let i = 0; i < entry.quantity; i++) out.push(card);
  }
  return out;
}

/** Resolve a parsed decklist into full card data, using the cache. */
export async function resolveDeckCached(
  parsed: ParsedDecklist,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<ResolvedDeck> {
  const allNames = [
    ...parsed.commanders.map((e) => e.name),
    ...parsed.mainboard.map((e) => e.name),
  ];
  const { cards } = await fetchCardsCached(allNames, fetchImpl);

  const unresolved: string[] = [];
  const commanders = expand(parsed.commanders, cards, unresolved);
  const library = expand(parsed.mainboard, cards, unresolved);

  return { commanders, library, unresolved };
}
