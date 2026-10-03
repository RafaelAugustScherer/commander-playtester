import type { Card, DecklistEntry } from "../lib/types";
import { isLand } from "../lib/types";
import type { SavedDeck } from "../deck/model";
import { deckToText } from "../deck/model";
import { extractThemeProfile, type ThemeProfile } from "./themes";
import { cardSimilarity } from "./similarity";
import {
  suggestCandidates,
  suggestCommanders,
  hasChooseABackground,
  singleBackgroundAmong,
  type DraftEngine,
  type CardResolver,
  type RankedCandidate,
} from "./candidates";
import { DEFAULT_BRACKET_TARGET, type BracketTarget } from "./bracket";
import { draftCandidateCard } from "./localCandidates";
import {
  basicLandCount,
  basicLandSplit,
  isBasicLandName,
  type DraftCardType,
  type TypeBalance,
} from "./typeBalance";

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

export interface TribalMode {
  enabled: boolean;
  /** Creature types, lowercase. */
  tribes: string[];
}

function normalizeTribal({ enabled, tribes }: TribalMode): TribalMode {
  const unique = new Set(tribes.map((tribe) => tribe.trim().toLowerCase()).filter(Boolean));
  return { enabled, tribes: [...unique] };
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
  /** The Background paired with `commander` via "Choose a Background", if any. */
  background: Card | null = null;
  target: BracketTarget = DEFAULT_BRACKET_TARGET;
  /**
   * Tribal mode: when on, creature slots offer only creatures of `tribes` and
   * cards that name them rank higher. The tribes are kept while it is off.
   */
  tribal: TribalMode = { enabled: false, tribes: [] };
  commanders: DecklistEntry[] = [];
  mainboard: DecklistEntry[] = [];
  round: RankedCandidate[] = [];
  profile: ThemeProfile = extractThemeProfile([], []);
  balance: TypeBalance | null = null;

  /** Every card resolved so far this session, by lowercase name — avoids re-fetching. */
  private resolved = new Map<string, Card>();
  /** The current round's full ranked pool, for refreshes to draw from without a re-query. */
  private pool: RankedCandidate[] = [];
  /** Names shown in the current round (refreshes included) — never repeated within it. */
  private shown = new Set<string>();
  private blacklist = new Set<string>();
  constructor(private readonly deps: DraftSessionDeps) {}

  private mainboardCards(): Card[] {
    return this.mainboard
      .map((entry) => this.resolved.get(entry.name.toLowerCase()))
      .filter((c): c is Card => c !== undefined);
  }

  /** The tribes tribal mode steers by: none while it is off. */
  private activeTribes(): string[] {
    return this.tribal.enabled ? this.tribal.tribes : [];
  }

  private rebuildProfile(): void {
    this.profile = extractThemeProfile(
      this.commanderCards(),
      this.mainboardCards(),
      this.activeTribes(),
    );
  }

  /** `commander` plus `background`, when paired — for `extractThemeProfile`. */
  private commanderCards(): Card[] {
    return [this.commander, this.background].filter((c): c is Card => c !== null);
  }

  mainboardNames(): string[] {
    return this.mainboard.flatMap((entry) => Array<string>(entry.quantity).fill(entry.name));
  }

  cardCount(): number {
    return [...this.commanders, ...this.mainboard].reduce((sum, e) => sum + e.quantity, 0);
  }

  private deckNames(): { commanders: string[]; mainboard: string[] } {
    return {
      commanders: this.commanders.map((e) => e.name),
      mainboard: this.mainboardNames(),
    };
  }

  private colorWeights(): Record<string, number> {
    const weights: Record<string, number> = {};
    for (const card of [...this.commanderCards(), ...this.mainboardCards()]) {
      if (isLand(card)) continue;
      const colors = card.colorIdentity.filter((c) => this.profile.colorIdentity.includes(c));
      for (const color of colors) weights[color] = (weights[color] ?? 0) + 1 / colors.length;
    }
    return weights;
  }

  private rememberResolved(cards: Iterable<Card>): void {
    for (const card of cards) this.resolved.set(card.name.toLowerCase(), card);
  }

  private addToMainboard(card: Card): void {
    const key = card.name.toLowerCase();
    if (this.mainboard.some((e) => e.name.toLowerCase() === key)) return;
    this.mainboard.push({ quantity: 1, name: card.name });
  }

  /** Fetch a fresh round: clears shown-this-round and offers three cards. */
  private async openRound(): Promise<void> {
    this.shown = new Set();
    const deckNames = this.deckNames();

    if (this.phase === "commander-selection") {
      this.pool = await suggestCommanders(this.mainboardCards(), {
        engine: this.deps.engine,
        resolver: this.deps.resolver,
        exclude: this.blacklist,
      });
    } else {
      const round = await suggestCandidates(deckNames, this.profile, {
        engine: this.deps.engine,
        resolver: this.deps.resolver,
        target: this.target,
        exclude: this.blacklist,
      });
      this.pool = round.candidates;
      this.balance = round.balance;
    }

    this.rememberResolved(this.pool.map((c) => c.card));
    this.round = this.pool.slice(0, ROUND_SIZE);
    for (const candidate of this.round) this.shown.add(candidate.card.name.toLowerCase());
  }

  /** Re-fetch the ranked pool, excluding the deck, the blacklist and everything shown this round. */
  private async refillPool(slotType: DraftCardType | undefined): Promise<void> {
    const deckNames = this.deckNames();
    const exclude = new Set([
      ...deckNames.commanders,
      ...deckNames.mainboard,
      ...this.shown,
      ...this.blacklist,
    ]);

    const fresh =
      this.phase === "commander-selection"
        ? await suggestCommanders(this.mainboardCards(), {
            engine: this.deps.engine,
            resolver: this.deps.resolver,
            exclude,
          })
        : (
            await suggestCandidates(deckNames, this.profile, {
              engine: this.deps.engine,
              resolver: this.deps.resolver,
              target: this.target,
              exclude,
              slotTypes: slotType ? Array<DraftCardType>(ROUND_SIZE).fill(slotType) : undefined,
            })
          ).candidates;

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
    tribal: TribalMode = { enabled: false, tribes: [] },
  ): Promise<void> {
    this.tribal = normalizeTribal(tribal);
    const uniqueNames = [...new Set(baseCardNames.map((n) => n.trim()).filter(Boolean))];
    if (uniqueNames.length < MIN_BASE_CARDS) {
      throw new DraftSessionError("too-few-base-cards");
    }

    this.target = target;
    const resolved = await this.deps.engine.resolveCards(uniqueNames);
    const baseCards = resolved.map(draftCandidateCard);
    this.rememberResolved(baseCards);

    if (commanderName) {
      const key = commanderName.trim().toLowerCase();
      const commanderCard = baseCards.find((c) => c.name.toLowerCase() === key);
      if (!commanderCard) throw new DraftSessionError("commander-not-in-base-cards");

      const others = baseCards.filter((c) => c !== commanderCard);
      const background = hasChooseABackground(commanderCard)
        ? singleBackgroundAmong(others)
        : null;
      const mainboardCards = background ? others.filter((c) => c !== background) : others;

      this.commander = commanderCard;
      this.background = background;
      this.commanders = background
        ? [
            { quantity: 1, name: commanderCard.name },
            { quantity: 1, name: background.name },
          ]
        : [{ quantity: 1, name: commanderCard.name }];
      this.mainboard = mainboardCards.map((c) => ({ quantity: 1, name: c.name }));
      this.phase = "drafting";
      this.profile = extractThemeProfile(
        this.commanderCards(),
        mainboardCards,
        this.activeTribes(),
      );
      await this.openRound();
    } else {
      this.commander = null;
      this.background = null;
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
    this.rememberResolved([card]);

    const background = hasChooseABackground(card)
      ? singleBackgroundAmong(this.mainboardCards())
      : null;

    this.commander = card;
    this.background = background;
    if (background) {
      this.commanders = [
        { quantity: 1, name: card.name },
        { quantity: 1, name: background.name },
      ];
      this.mainboard = this.mainboard.filter(
        (e) => e.name.toLowerCase() !== background.name.toLowerCase(),
      );
    } else {
      this.commanders = [{ quantity: 1, name: card.name }];
    }
    this.phase = "drafting";
    this.rebuildProfile();
    await this.openRound();
  }

  /** Replace one round slot with the closest unshown candidate. Never repeats within the round. */
  async refreshSlot(index: number): Promise<void> {
    if (index < 0 || index >= this.round.length) {
      throw new DraftSessionError("invalid-slot");
    }
    const replaced = this.round[index];
    const isReplacement = (c: RankedCandidate) =>
      !this.shown.has(c.card.name.toLowerCase()) && c.slotType === replaced.slotType;

    let unshown = this.pool.filter(isReplacement);
    if (unshown.length === 0) {
      await this.refillPool(replaced.slotType);
      unshown = this.pool.filter(isReplacement);
    }
    if (unshown.length === 0) return;

    let best = unshown[0];
    let bestSimilarity = cardSimilarity(replaced.card, best.card);
    for (const candidate of unshown.slice(1)) {
      const similarity = cardSimilarity(replaced.card, candidate.card);
      if (similarity > bestSimilarity) {
        best = candidate;
        bestSimilarity = similarity;
      }
    }

    this.round[index] = best;
    this.shown.add(best.card.name.toLowerCase());
    this.blacklist.add(replaced.card.name.toLowerCase());
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
    this.rebuildProfile();
    await this.openRound();
  }

  async fillBasicLands(): Promise<void> {
    if (this.phase !== "drafting") {
      throw new DraftSessionError("not-in-drafting");
    }
    if (!this.balance) return;
    const balance = this.balance;
    this.mainboard = this.mainboard.filter((entry) => !isBasicLandName(entry.name));
    const openSlots = 100 - this.cardCount();
    const count = basicLandCount(balance, openSlots);
    this.mainboard.push(
      ...basicLandSplit(count, this.profile.colorIdentity, this.colorWeights()),
    );
    await this.openRound();
  }

  /**
   * Turn tribal mode on or off, or change its tribes. While drafting, a change
   * to the tribes it steers by re-offers the current round at once, so its
   * creatures follow them.
   */
  async setTribal(tribal: TribalMode): Promise<void> {
    const before = this.activeTribes().join("|");
    this.tribal = normalizeTribal(tribal);
    if (this.phase !== "drafting" || this.activeTribes().join("|") === before) return;
    this.rebuildProfile();
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
