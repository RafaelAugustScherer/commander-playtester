import type { Card, DecklistEntry } from "../lib/types";
import type { SavedDeck } from "../deck/model";
import { deckToText } from "../deck/model";
import { extractThemeProfile, type ThemeProfile } from "./themes";
import { cardSimilarity } from "./similarity";
import {
  suggestCandidates,
  suggestCommanders,
  createTokenSearchCache,
  type DraftEngine,
  type CardResolver,
  type RankedCandidate,
  type TokenSearchCache,
} from "./candidates";
import { DEFAULT_BRACKET_TARGET, type BracketTarget } from "./bracket";

export type DraftPhase = "commander-selection" | "drafting";

export type DraftSessionErrorKind =
  | "too-few-base-cards"
  | "commander-not-in-base-cards"
  | "commander-not-found"
  | "not-in-commander-selection"
  | "not-in-drafting"
  | "invalid-slot";

export class DraftSessionError extends Error {
  constructor(readonly kind: DraftSessionErrorKind) {
    super(kind);
    this.name = "DraftSessionError";
  }
}

const MIN_BASE_CARDS = 3;
const ROUND_SIZE = 3;

export interface DraftSessionDeps {
  engine: DraftEngine;
  resolver: CardResolver;
}

/**
 * The in-progress `draft session` state machine (`draft-a-deck`): base cards,
 * commander, bracket target, the deck so far, and the current suggestion
 * round. Engine/resolver access is injected so the whole pipeline runs
 * offline against fakes in tests.
 */
export class DraftSession {
  phase: DraftPhase = "commander-selection";
  commander: Card | null = null;
  target: BracketTarget = DEFAULT_BRACKET_TARGET;
  commanders: DecklistEntry[] = [];
  mainboard: DecklistEntry[] = [];
  round: RankedCandidate[] = [];
  profile: ThemeProfile = extractThemeProfile([], []);

  /** Every card resolved so far this session, by lowercase name — avoids re-fetching. */
  private resolved = new Map<string, Card>();
  /** The current round's full ranked pool, for refreshes to draw from without a re-query. */
  private pool: RankedCandidate[] = [];
  /** Names shown in the current round (refreshes included) — never repeated within it. */
  private shown = new Set<string>();
  private readonly tokenCache: TokenSearchCache = createTokenSearchCache();

  constructor(private readonly deps: DraftSessionDeps) {}

  private mainboardCards(): Card[] {
    return this.mainboard
      .map((entry) => this.resolved.get(entry.name.toLowerCase()))
      .filter((c): c is Card => c !== undefined);
  }

  private deckNames(): { commanders: string[]; mainboard: string[] } {
    return {
      commanders: this.commanders.map((e) => e.name),
      mainboard: this.mainboard.map((e) => e.name),
    };
  }

  private rememberResolved(cards: Iterable<Card>): void {
    for (const card of cards) this.resolved.set(card.name.toLowerCase(), card);
  }

  private addToMainboard(card: Card): void {
    const key = card.name.toLowerCase();
    if (this.mainboard.some((e) => e.name.toLowerCase() === key)) return;
    this.mainboard.push({ quantity: 1, name: card.name });
  }

  /** Fetch a fresh round: clears shown-this-round and offers up to three cards. */
  private async openRound(): Promise<void> {
    this.shown = new Set();
    const deckNames = this.deckNames();

    this.pool =
      this.phase === "commander-selection"
        ? await suggestCommanders(this.mainboardCards(), {
            engine: this.deps.engine,
            resolver: this.deps.resolver,
            tokenCache: this.tokenCache,
          })
        : await suggestCandidates(deckNames, this.profile, {
            engine: this.deps.engine,
            resolver: this.deps.resolver,
            target: this.target,
            tokenCache: this.tokenCache,
          });

    this.rememberResolved(this.pool.map((c) => c.card));
    this.round = this.pool.slice(0, ROUND_SIZE);
    for (const candidate of this.round) this.shown.add(candidate.card.name.toLowerCase());
  }

  /** Re-fetch the ranked pool, excluding the deck and everything shown this round. */
  private async refillPool(): Promise<void> {
    const deckNames = this.deckNames();
    const exclude = new Set([
      ...deckNames.commanders,
      ...deckNames.mainboard,
      ...this.shown,
    ]);

    const fresh =
      this.phase === "commander-selection"
        ? await suggestCommanders(this.mainboardCards(), {
            engine: this.deps.engine,
            resolver: this.deps.resolver,
            exclude,
            tokenCache: this.tokenCache,
          })
        : await suggestCandidates(deckNames, this.profile, {
            engine: this.deps.engine,
            resolver: this.deps.resolver,
            target: this.target,
            exclude,
            tokenCache: this.tokenCache,
          });

    this.rememberResolved(fresh.map((c) => c.card));
    const seen = new Set(this.pool.map((c) => c.card.name.toLowerCase()));
    for (const candidate of fresh) {
      const key = candidate.card.name.toLowerCase();
      if (!seen.has(key)) {
        this.pool.push(candidate);
        seen.add(key);
      }
    }
  }

  /**
   * Start a draft from three or more base cards. If `commanderName` names one
   * of them, its color identity is fixed immediately and drafting opens;
   * otherwise the first round offers commander-eligible candidates.
   */
  async start(
    baseCardNames: string[],
    commanderName: string | null = null,
    target: BracketTarget = DEFAULT_BRACKET_TARGET,
  ): Promise<void> {
    const uniqueNames = [...new Set(baseCardNames.map((n) => n.trim()).filter(Boolean))];
    if (uniqueNames.length < MIN_BASE_CARDS) {
      throw new DraftSessionError("too-few-base-cards");
    }

    this.target = target;
    const resolvedMap = await this.deps.resolver.resolve(uniqueNames);
    this.rememberResolved(resolvedMap.values());

    const baseCards = uniqueNames
      .map((name) => resolvedMap.get(name.toLowerCase()))
      .filter((c): c is Card => c !== undefined);

    if (commanderName) {
      const key = commanderName.trim().toLowerCase();
      const commanderCard = baseCards.find((c) => c.name.toLowerCase() === key);
      if (!commanderCard) throw new DraftSessionError("commander-not-in-base-cards");

      const others = baseCards.filter((c) => c !== commanderCard);
      this.commander = commanderCard;
      this.commanders = [{ quantity: 1, name: commanderCard.name }];
      this.mainboard = others.map((c) => ({ quantity: 1, name: c.name }));
      this.phase = "drafting";
      this.profile = extractThemeProfile([commanderCard], others);
      await this.openRound();
    } else {
      this.commander = null;
      this.commanders = [];
      this.mainboard = baseCards.map((c) => ({ quantity: 1, name: c.name }));
      this.phase = "commander-selection";
      this.profile = extractThemeProfile([], baseCards);
      await this.openRound();
    }
  }

  /** Pick the commander from the commander-selection round, fixing color identity. */
  async pickCommander(name: string): Promise<void> {
    if (this.phase !== "commander-selection") {
      throw new DraftSessionError("not-in-commander-selection");
    }
    const key = name.trim().toLowerCase();
    let card =
      this.round.find((c) => c.card.name.toLowerCase() === key)?.card ??
      this.pool.find((c) => c.card.name.toLowerCase() === key)?.card ??
      this.resolved.get(key);
    if (!card) {
      const resolvedMap = await this.deps.resolver.resolve([name]);
      card = resolvedMap.get(key);
    }
    if (!card) throw new DraftSessionError("commander-not-found");

    this.commander = card;
    this.commanders = [{ quantity: 1, name: card.name }];
    this.rememberResolved([card]);
    this.phase = "drafting";
    this.profile = extractThemeProfile([card], this.mainboardCards());
    await this.openRound();
  }

  /** Replace one round slot with the closest unshown candidate. Never repeats within the round. */
  async refreshSlot(index: number): Promise<void> {
    if (index < 0 || index >= this.round.length) {
      throw new DraftSessionError("invalid-slot");
    }
    const replaced = this.round[index].card;

    let unshown = this.pool.filter((c) => !this.shown.has(c.card.name.toLowerCase()));
    if (unshown.length === 0) {
      await this.refillPool();
      unshown = this.pool.filter((c) => !this.shown.has(c.card.name.toLowerCase()));
    }
    if (unshown.length === 0) return;

    let best = unshown[0];
    let bestSimilarity = cardSimilarity(replaced, best.card);
    for (const candidate of unshown.slice(1)) {
      const similarity = cardSimilarity(replaced, candidate.card);
      if (similarity > bestSimilarity) {
        best = candidate;
        bestSimilarity = similarity;
      }
    }

    this.round[index] = best;
    this.shown.add(best.card.name.toLowerCase());
  }

  /** Add a round slot's card to the deck (the 99), end the round, and open a fresh one. */
  async addCard(index: number): Promise<void> {
    if (index < 0 || index >= this.round.length) {
      throw new DraftSessionError("invalid-slot");
    }
    if (this.phase !== "drafting") {
      throw new DraftSessionError("not-in-drafting");
    }
    const card = this.round[index].card;
    this.addToMainboard(card);
    this.profile = extractThemeProfile(
      this.commander ? [this.commander] : [],
      this.mainboardCards(),
    );
    await this.openRound();
  }

  /** Re-steer subsequent suggestion rounds toward a different bracket target. */
  setBracketTarget(target: BracketTarget): void {
    this.target = target;
  }

  /** The deck so far as paste-able decklist text (round-trips the parser). */
  exportText(): string {
    return deckToText({ commanders: this.commanders, mainboard: this.mainboard });
  }

  /** Build a `SavedDeck` from the current (possibly partial) deck. */
  toSavedDeck(name: string): SavedDeck {
    const now = Date.now();
    return {
      id: crypto.randomUUID(),
      name,
      commanders: this.commanders,
      mainboard: this.mainboard,
      createdAt: now,
      updatedAt: now,
    };
  }
}
