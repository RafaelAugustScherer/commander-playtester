import type { DecklistEntry } from "./types";
import { normalizeCardName } from "./cardName";

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
  init?: { signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/** One proxy hop: the request URL, plus how to unwrap the deck JSON from it. */
interface ProxyAttempt {
  url: string;
  unwrap: (body: unknown) => unknown;
}

const identity = (body: unknown): unknown => body;

/** allorigins `/get` returns `{ contents: "<json string>" }`; unpack it. */
function unwrapAllOriginsGet(body: unknown): unknown {
  const contents = (body as { contents?: unknown }).contents;
  if (typeof contents !== "string") throw new Error("unexpected proxy wrapper");
  return JSON.parse(contents);
}

/**
 * Deck sites block cross-origin browser requests, so a static build routes the
 * fetch through a proxy. `VITE_DECK_PROXY` pins a single proxy (set it to your
 * own deck-proxy worker for reliability, or to "" to fetch directly). Left
 * unset, the app tries a chain of public proxies in turn — each is
 * rate-limited and intermittently down, so trying several raises the odds one
 * answers. Deploy the worker (see deck-proxy/README) for dependable imports.
 */
function proxyAttempts(apiUrl: string): ProxyAttempt[] {
  const configured = import.meta.env.VITE_DECK_PROXY as string | undefined;
  if (configured !== undefined) {
    const base = configured.trim();
    return [
      { url: base ? base + encodeURIComponent(apiUrl) : apiUrl, unwrap: identity },
    ];
  }
  const enc = encodeURIComponent(apiUrl);
  return [
    { url: `https://api.allorigins.win/raw?url=${enc}`, unwrap: identity },
    { url: `https://api.codetabs.com/v1/proxy?quest=${apiUrl}`, unwrap: identity },
    { url: `https://api.allorigins.win/get?url=${enc}`, unwrap: unwrapAllOriginsGet },
  ];
}

const ATTEMPT_TIMEOUT_MS = 15000;

/** Run a fetch with a hard timeout so one hung proxy can't stall the chain. */
async function fetchWithTimeout(
  fetchImpl: FetchLike,
  url: string,
): Promise<Awaited<ReturnType<FetchLike>>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ATTEMPT_TIMEOUT_MS);
  try {
    return await fetchImpl(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
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
    if (name) entries.push({ quantity: c.quantity ?? 1, name: normalizeCardName(name) });
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
    const rawName = c.card?.oracleCard?.name;
    if (!rawName) continue;
    const cats = c.categories ?? [];
    if (cats.some((cat) => excluded.has(cat))) continue;
    const entry = { quantity: c.quantity ?? 1, name: normalizeCardName(rawName) };
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

  let json: unknown | undefined;
  for (const attempt of proxyAttempts(apiUrl)) {
    let res: Awaited<ReturnType<FetchLike>>;
    try {
      res = await fetchWithTimeout(fetchImpl, attempt.url);
    } catch {
      continue; // proxy hung or refused — try the next one
    }
    // A missing deck answers 404 through every proxy, so stop asking.
    if (res.status === 404) throw new DeckImportError("not-found", source);
    if (!res.ok) continue;
    try {
      json = attempt.unwrap(await res.json());
      break;
    } catch {
      continue; // proxy returned a non-JSON error/landing page
    }
  }
  if (json === undefined) throw new DeckImportError("network", source);

  const parsed =
    source === "moxfield" ? parseMoxfield(json) : parseArchidekt(json);
  if (parsed.commanders.length + parsed.mainboard.length === 0) {
    throw new DeckImportError("empty", source);
  }
  return { source, ...parsed };
}
