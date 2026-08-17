import type { DecklistEntry } from "./types";

export type DeckSource = "moxfield" | "archidekt" | "ligamagic";

/** A decklist pulled from a deck-hosting URL, ready to feed the editor. */
export interface ImportedDeck {
  source: DeckSource;
  name: string;
  commanders: DecklistEntry[];
  mainboard: DecklistEntry[];
}

export type ImportErrorKind =
  | "not-a-url"
  | "unsupported"
  | "no-id"
  | "network"
  | "not-found"
  | "empty";

export class DeckImportError extends Error {
  constructor(
    readonly kind: ImportErrorKind,
    readonly source?: DeckSource,
  ) {
    super(kind);
    this.name = "DeckImportError";
  }
}

/** Minimal fetch shape, so tests can inject a stub (mirrors scryfall.ts). */
export type FetchLike = (
  input: string,
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

const DEFAULT_PROXY = "https://api.allorigins.win/raw?url=";

/**
 * Deck sites block cross-origin browser requests, so a static build routes the
 * fetch through a proxy. `VITE_DECK_PROXY` overrides the default (set it to your
 * own deck-proxy worker for reliability, or to "" to fetch directly).
 */
function proxied(url: string): string {
  const configured = import.meta.env.VITE_DECK_PROXY as string | undefined;
  const base = configured === undefined ? DEFAULT_PROXY : configured.trim();
  return base ? base + encodeURIComponent(url) : url;
}

function normalizeUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  try {
    return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
}

/** Which deck site a URL points at, or null if it's not one we recognize. */
export function detectSource(raw: string): DeckSource | null {
  const url = normalizeUrl(raw);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  if (host.includes("moxfield")) return "moxfield";
  if (host.includes("archidekt")) return "archidekt";
  if (host.includes("ligamagic")) return "ligamagic";
  return null;
}

// ── Moxfield ────────────────────────────────────────────────────────────────

interface MoxfieldCard {
  quantity?: number;
  card?: { name?: string };
}
interface MoxfieldResponse {
  name?: string;
  boards?: Record<string, { cards?: Record<string, MoxfieldCard> }>;
}

function moxfieldEntries(board?: { cards?: Record<string, MoxfieldCard> }): DecklistEntry[] {
  const cards = board?.cards ?? {};
  const entries: DecklistEntry[] = [];
  for (const c of Object.values(cards)) {
    const name = c.card?.name;
    if (name) entries.push({ quantity: c.quantity ?? 1, name });
  }
  return entries;
}

export function parseMoxfield(json: unknown): Omit<ImportedDeck, "source"> {
  const d = json as MoxfieldResponse;
  return {
    name: d.name?.trim() || "Moxfield deck",
    commanders: moxfieldEntries(d.boards?.commanders),
    mainboard: moxfieldEntries(d.boards?.mainboard),
  };
}

// ── Archidekt ───────────────────────────────────────────────────────────────

interface ArchidektCard {
  quantity?: number;
  categories?: string[] | null;
  card?: { oracleCard?: { name?: string } };
}
interface ArchidektResponse {
  name?: string;
  categories?: Array<{ name?: string; includedInDeck?: boolean }> | null;
  cards?: ArchidektCard[];
}

const ARCHIDEKT_COMMANDER = "Commander";

export function parseArchidekt(json: unknown): Omit<ImportedDeck, "source"> {
  const d = json as ArchidektResponse;
  const excluded = new Set(
    (d.categories ?? [])
      .filter((c) => c.includedInDeck === false && c.name)
      .map((c) => c.name as string),
  );
  const commanders: DecklistEntry[] = [];
  const mainboard: DecklistEntry[] = [];
  for (const c of d.cards ?? []) {
    const name = c.card?.oracleCard?.name;
    if (!name) continue;
    const cats = c.categories ?? [];
    if (cats.some((cat) => excluded.has(cat))) continue;
    const entry = { quantity: c.quantity ?? 1, name };
    if (cats.includes(ARCHIDEKT_COMMANDER)) commanders.push(entry);
    else mainboard.push(entry);
  }
  return { name: d.name?.trim() || "Archidekt deck", commanders, mainboard };
}

// ── Orchestration ─────────────────────────────────────────────────────────────

function apiUrlFor(source: DeckSource, url: URL): string | null {
  if (source === "moxfield") {
    const id = url.pathname.match(/\/decks\/(?:all\/)?([A-Za-z0-9_-]+)/)?.[1];
    return id ? `https://api.moxfield.com/v3/decks/all/${id}` : null;
  }
  if (source === "archidekt") {
    const id = url.pathname.match(/\/(?:api\/)?decks\/(\d+)/)?.[1];
    return id ? `https://archidekt.com/api/decks/${id}/` : null;
  }
  return null;
}

/**
 * Fetch a deck from a Moxfield or Archidekt URL and return its commanders and
 * mainboard. Ligamagic gates its deck data behind a page session, so it can't
 * be imported from a static client; it is detected only to give a clear message.
 */
export async function importDeck(
  rawUrl: string,
  fetchImpl: FetchLike = fetch,
): Promise<ImportedDeck> {
  const source = detectSource(rawUrl);
  if (!source) throw new DeckImportError("not-a-url");
  if (source === "ligamagic") throw new DeckImportError("unsupported", source);

  const url = normalizeUrl(rawUrl)!;
  const apiUrl = apiUrlFor(source, url);
  if (!apiUrl) throw new DeckImportError("no-id", source);

  let res: Awaited<ReturnType<FetchLike>>;
  try {
    res = await fetchImpl(proxied(apiUrl));
  } catch {
    throw new DeckImportError("network", source);
  }
  if (!res.ok) {
    throw new DeckImportError(res.status === 404 ? "not-found" : "network", source);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new DeckImportError("network", source);
  }

  const parsed =
    source === "moxfield" ? parseMoxfield(json) : parseArchidekt(json);
  if (parsed.commanders.length + parsed.mainboard.length === 0) {
    throw new DeckImportError("empty", source);
  }
  return { source, ...parsed };
}
