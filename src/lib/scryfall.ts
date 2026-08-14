import type { Card, DecklistEntry, ParsedDecklist, ResolvedDeck } from "./types";
import { classifyRoles } from "./roles";

const SCRYFALL_COLLECTION_URL = "https://api.scryfall.com/cards/collection";
const BATCH_SIZE = 75; // Scryfall's documented max identifiers per request.

/** Shape of the fields we read from a Scryfall card object. */
interface ScryfallCard {
  name: string;
  cmc?: number;
  type_line?: string;
  oracle_text?: string;
  colors?: string[];
  produced_mana?: string[];
  image_uris?: { normal?: string };
  card_faces?: Array<{
    type_line?: string;
    oracle_text?: string;
    colors?: string[];
    image_uris?: { normal?: string };
  }>;
}

interface CollectionResponse {
  data: ScryfallCard[];
  not_found?: Array<{ name?: string }>;
}

/** Allow injecting fetch for tests; defaults to the global. */
export type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/** Convert a raw Scryfall card into our normalized Card. */
export function toCard(sc: ScryfallCard): Card {
  const typeLine = sc.type_line ?? sc.card_faces?.[0]?.type_line ?? "";
  // Join both faces' oracle text so DFCs classify from all their abilities.
  const oracleText =
    sc.oracle_text ??
    (sc.card_faces ?? [])
      .map((f) => f.oracle_text ?? "")
      .filter(Boolean)
      .join("\n") ??
    "";
  const colors = sc.colors ?? sc.card_faces?.[0]?.colors ?? [];
  const producedMana = sc.produced_mana ?? [];
  const manaValue = sc.cmc ?? 0;
  const imageUrl =
    sc.image_uris?.normal ?? sc.card_faces?.[0]?.image_uris?.normal;

  return {
    name: sc.name,
    manaValue,
    typeLine,
    oracleText,
    colors,
    producedMana,
    imageUrl,
    roles: classifyRoles({ typeLine, oracleText, manaValue, producedMana }),
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * Resolve a list of unique card names against Scryfall.
 * Returns a name -> Card map (keyed by the *requested* name, lowercased) plus
 * the list of names Scryfall could not find.
 */
export async function fetchCards(
  names: string[],
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<{ cards: Map<string, Card>; notFound: string[] }> {
  const uniqueNames = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  const cards = new Map<string, Card>();
  const notFound: string[] = [];

  for (const batch of chunk(uniqueNames, BATCH_SIZE)) {
    const body = JSON.stringify({
      identifiers: batch.map((name) => ({ name })),
    });
    const res = await fetchImpl(SCRYFALL_COLLECTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (!res.ok) {
      throw new Error(`Scryfall request failed (HTTP ${res.status})`);
    }
    const json = (await res.json()) as CollectionResponse;

    for (const sc of json.data ?? []) {
      const card = toCard(sc);
      cards.set(card.name.toLowerCase(), card);
    }
    for (const nf of json.not_found ?? []) {
      if (nf.name) notFound.push(nf.name);
    }
  }

  return { cards, notFound };
}

/** Look a resolved card up by requested name, tolerant of case + DFC front. */
function lookup(cards: Map<string, Card>, name: string): Card | undefined {
  const direct = cards.get(name.toLowerCase());
  if (direct) return direct;
  // DFC / split: requested "Front" but Scryfall returned "Front // Back".
  for (const card of cards.values()) {
    const front = card.name.split(" // ")[0];
    if (front.toLowerCase() === name.toLowerCase()) return card;
  }
  return undefined;
}

/** Expand entries by quantity into a flat array of Card refs. */
function expand(
  entries: DecklistEntry[],
  cards: Map<string, Card>,
  unresolved: string[],
): Card[] {
  const out: Card[] = [];
  for (const entry of entries) {
    const card = lookup(cards, entry.name);
    if (!card) {
      unresolved.push(entry.name);
      continue;
    }
    for (let i = 0; i < entry.quantity; i++) out.push(card);
  }
  return out;
}

/** Resolve a parsed decklist into a deck with full card data. */
export async function resolveDeck(
  parsed: ParsedDecklist,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<ResolvedDeck> {
  const allNames = [
    ...parsed.commanders.map((e) => e.name),
    ...parsed.mainboard.map((e) => e.name),
  ];
  const { cards } = await fetchCards(allNames, fetchImpl);

  const unresolved: string[] = [];
  const commanders = expand(parsed.commanders, cards, unresolved);
  const library = expand(parsed.mainboard, cards, unresolved);

  return { commanders, library, unresolved };
}
