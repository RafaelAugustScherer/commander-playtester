import { readFileSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, it, expect } from "vitest";
import init, { init_panic_hook, load_card_database } from "../src/engine/vendor/engine_wasm.js";
import { draftQueries, type SearchCardRow } from "../src/engine/draftQueries";
import { candidateData, createDraftRanker, type DraftRanker } from "../src/engine/draftRanking";
import { DraftSession } from "../src/draft/draftSession";
import type { CardResolver, DraftEngine } from "../src/draft/candidates";
import { draftCandidateCard } from "../src/draft/localCandidates";
import type { DraftCustomization } from "../src/draft/customization";
import {
  DRAFT_CARD_TYPES,
  primaryType,
  targetMix,
  zeroCounts,
  type DraftCardType,
  type TypeCounts,
} from "../src/draft/typeBalance";
import type { Card } from "../src/lib/types";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WASM = resolve(ROOT, "public/engine/engine_wasm_bg.wasm");
const CARD_GZ = resolve(ROOT, "public/engine/card-data.json.gz");

const ENABLED = process.env.DRAFT_BALANCE === "1";
const ONLY = process.env.DRAFT_BALANCE_ONLY?.split("|");
const EVERYTHING_SUGGESTED: DraftCustomization = { planeswalkers: true, dungeons: true };
const SEED_CARDS = ["Sol Ring", "Arcane Signet"];

type Row = [string, number, number, number, number, number, number, number];

const EDHREC_AVERAGE_DECKS: Row[] = [
  ["Mizzix of the Izmagnus", 34, 11, 23, 19, 8, 3, 1],
  ["Ashling, Flame Dancer", 33, 15, 20, 17, 9, 4, 1],
  ["Talrand, Sky Summoner", 35, 11, 30, 10, 8, 5, 0],
  ["Lathril, Blade of the Elves", 34, 34, 8, 8, 7, 7, 1],
  ["Sythis, Harvest's Hand", 34, 22, 5, 4, 3, 31, 0],
  ["Urza, Lord High Artificer", 31, 17, 15, 5, 25, 4, 2],
  ["Atraxa, Praetors' Voice", 36, 24, 10, 8, 9, 7, 5],
  ["Teferi, Temporal Archmage", 33, 14, 17, 7, 18, 5, 5],
  ["Sram, Senior Edificer", 33, 15, 6, 4, 28, 13, 0],
  ["Wyleth, Soul of Steel", 35, 15, 11, 5, 24, 9, 0],
  ["Teysa Karlov", 34, 33, 9, 6, 8, 8, 1],
  ["Korvold, Fae-Cursed King", 35, 29, 10, 10, 9, 6, 0],
  ["Tatyova, Benthic Druid", 38, 25, 13, 10, 5, 7, 1],
  ["Lord Windgrace", 39, 26, 8, 13, 5, 6, 2],
  ["Commodore Guff", 36, 13, 7, 5, 12, 6, 20],
  ["Meren of Clan Nel Toth", 34, 36, 7, 9, 6, 6, 1],
  ["Muldrotha, the Gravetide", 36, 30, 6, 7, 9, 9, 2],
  ["Krenko, Mob Boss", 34, 31, 7, 8, 12, 7, 0],
];

const TRIBES: Record<string, string> = {
  "Lathril, Blade of the Elves": "Elf",
  "Krenko, Mob Boss": "Goblin",
};

function hasSubtype(typeLine: string, subtype: string): boolean {
  return (typeLine.split("—")[1] ?? "").trim().split(/\s+/).includes(subtype);
}

function counts(row: Row): TypeCounts {
  const [, land, creature, instant, sorcery, artifact, enchantment, planeswalker] = row;
  return { land, creature, instant, sorcery, artifact, enchantment, planeswalker };
}

function meanAbsError(a: TypeCounts, b: TypeCounts): number {
  return (
    DRAFT_CARD_TYPES.reduce((sum, type) => sum + Math.abs(a[type] - b[type]), 0) /
    DRAFT_CARD_TYPES.length
  );
}

function format(c: TypeCounts): string {
  return DRAFT_CARD_TYPES.map((type) => String(c[type]).padStart(3)).join("");
}

function seededRandom(text: string): () => number {
  let state = [...text].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 7);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nonLandLeader(deck: TypeCounts, among: DraftCardType[]): DraftCardType {
  return among.reduce((best, type) => (deck[type] > deck[best] ? type : best));
}

describe.skipIf(!ENABLED)("draft type balance against EDHREC average decks", () => {
  let ranker: DraftRanker;
  let cardRows: Map<string, SearchCardRow>;

  function rowOf(name: string): SearchCardRow | undefined {
    const key = name.toLowerCase();
    let row = cardRows.get(key);
    if (!row) {
      row = draftQueries
        .search_cards_js({ text: name, limit: 200 })
        .results.find((candidate) => candidate.name.toLowerCase() === key);
      if (row) cardRows.set(key, row);
      else if (process.env.DRAFT_BALANCE_TRACE) console.log(`unresolved ${name}`);
    }
    return row;
  }

  function cardOf(name: string): Card | null {
    const row = rowOf(name);
    const data = row ? candidateData(draftQueries, row) : null;
    return data ? draftCandidateCard(data) : null;
  }

  const engine: DraftEngine = {
    commanderCandidates: async () => [],
    rankCardCandidates: async (input) => ranker.rankCardCandidates(input),
    resolveCards: async (names) =>
      names.flatMap((name) => {
        const row = rowOf(name);
        const data = row ? candidateData(draftQueries, row) : null;
        return data ? [data] : [];
      }),
  };

  const resolver: CardResolver = {
    resolve: async (names) => {
      const out = new Map<string, Card>();
      for (const name of names) {
        const card = cardOf(name);
        if (card) out.set(name.toLowerCase(), card);
      }
      return out;
    },
  };

  async function draftDeck(commander: string): Promise<{ deck: TypeCounts; onTribe: number }> {
    const session = new DraftSession({ engine, resolver });
    await session.start(
      [commander, ...SEED_CARDS],
      commander,
      "focused",
      undefined,
      EVERYTHING_SUGGESTED,
    );
    const random = seededRandom(commander);
    for (let round = 0; round < 120; round++) {
      const balance = session.balance!;
      const nonbasicLands = balance.have.land - balance.basicLands;
      const plannedBasics =
        balance.target.land - Math.max(nonbasicLands, balance.nonbasicLandTarget);
      if (session.cardCount() + plannedBasics >= 100 || session.round.length === 0) break;
      const pick = Math.floor(random() * session.round.length);
      if (process.env.DRAFT_BALANCE_TRACE) {
        const offered = session.round.map((c) => c.slotType + ":" + c.card.name).join(" | ");
        console.log(
          `${round} ${offered} -> ${pick}  target ${format(balance.target)} have ${format(balance.have)}`,
        );
      }
      await session.addCard(pick);
    }
    await session.fillBasicLands();
    const tribe = TRIBES[commander];
    const deck = zeroCounts();
    let onTribe = 0;
    for (const entry of session.mainboard) {
      const card = cardOf(entry.name);
      const type = card ? primaryType(card.typeLine) : null;
      if (type) deck[type] += entry.quantity;
      if (card && tribe && type === "creature" && hasSubtype(card.typeLine, tribe)) {
        onTribe += entry.quantity;
      }
    }
    return { deck, onTribe };
  }

  it("boots the engine", { timeout: 120_000 }, async () => {
    expect(existsSync(WASM) && existsSync(CARD_GZ), "run `npm run fetch-engine` first").toBe(
      true,
    );
    await init({ module_or_path: new Uint8Array(readFileSync(WASM)) });
    init_panic_hook();
    const cardJson = gunzipSync(readFileSync(CARD_GZ)).toString("utf8");
    load_card_database(cardJson);
    ranker = createDraftRanker(draftQueries, cardJson);
    cardRows = new Map(
      draftQueries
        .search_cards_js({ limit: 100_000 })
        .results.map((row) => [row.name.toLowerCase(), row]),
    );
  });

  it("drafts decks whose type mix follows each commander", { timeout: 1_800_000 }, async () => {
    const rows = EDHREC_AVERAGE_DECKS.filter(([name]) => !ONLY || ONLY.includes(name));
    const lines = [`${"commander".padEnd(30)}      ${DRAFT_CARD_TYPES.map((t) => t.slice(0, 3).padStart(3)).join("")}`];
    const drafted = new Map<string, TypeCounts>();
    const tribal = new Map<string, { onTribe: number; creatures: number }>();
    let baselineError = 0;
    let targetError = 0;
    let deckError = 0;

    for (const row of rows) {
      const [name] = row;
      const reference = counts(row);
      const identity = cardRows.get(name.toLowerCase())?.color_identity ?? [];
      const baseline = targetMix(zeroCounts(), identity.length, 99, true).counts;
      const start = ranker.rankCardCandidates({
        commanders: [name],
        mainboard: [],
        profile: { tokenWeights: [], curve: [], roleCounts: { land: 0, ramp: 0, draw: 0, removal: 0, other: 0 }, colorIdentity: identity, creatureTypes: [], creatureCount: 0, tribes: [], manaAppetite: 0 },
        target: "focused",
        customization: EVERYTHING_SUGGESTED,
        exclude: [name.toLowerCase()],
      });
      const { deck, onTribe } = await draftDeck(name);
      drafted.set(name, deck);
      if (TRIBES[name]) tribal.set(name, { onTribe, creatures: deck.creature });
      baselineError += meanAbsError(baseline, reference);
      targetError += meanAbsError(start.balance.target, reference);
      deckError += meanAbsError(deck, reference);
      lines.push(
        `${name.slice(0, 30).padEnd(30)} edhrec${format(reference)}`,
        `${"".padEnd(30)} target${format(start.balance.target)}  mae ${meanAbsError(start.balance.target, reference).toFixed(1)}`,
        `${"".padEnd(30)} draft ${format(deck)}  mae ${meanAbsError(deck, reference).toFixed(1)}  (${DRAFT_CARD_TYPES.reduce((s, t) => s + deck[t], 0)} cards)`,
      );
    }
    for (const [name, { onTribe, creatures }] of tribal) {
      lines.push(`${name}: ${onTribe} of ${creatures} creatures have the ${TRIBES[name]} type`);
    }
    lines.push(
      `mean abs error per type — baseline ${(baselineError / rows.length).toFixed(2)}, target ${(targetError / rows.length).toFixed(2)}, drafted ${(deckError / rows.length).toFixed(2)}`,
    );
    console.log(lines.join("\n"));

    const spells: DraftCardType[] = ["artifact", "enchantment", "planeswalker"];
    const check = (name: string, assert: (deck: TypeCounts) => void) => {
      const deck = drafted.get(name);
      if (deck) assert(deck);
    };
    for (const name of ["Mizzix of the Izmagnus", "Ashling, Flame Dancer", "Talrand, Sky Summoner"]) {
      check(name, (deck) => expect(deck.instant + deck.sorcery, name).toBeGreaterThan(deck.creature));
    }
    check("Sythis, Harvest's Hand", (deck) =>
      expect(nonLandLeader(deck, ["instant", "sorcery", ...spells])).toBe("enchantment"),
    );
    for (const name of ["Urza, Lord High Artificer", "Sram, Senior Edificer"]) {
      check(name, (deck) =>
        expect(nonLandLeader(deck, ["instant", "sorcery", ...spells]), name).toBe("artifact"),
      );
    }
    for (const name of ["Lathril, Blade of the Elves", "Meren of Clan Nel Toth", "Krenko, Mob Boss"]) {
      check(name, (deck) =>
        expect(nonLandLeader(deck, ["creature", "instant", "sorcery", ...spells]), name).toBe(
          "creature",
        ),
      );
    }
    check("Commodore Guff", (deck) => expect(deck.planeswalker).toBeGreaterThanOrEqual(10));
    for (const [name, deck] of drafted) {
      const total = DRAFT_CARD_TYPES.reduce((sum, type) => sum + deck[type], 0);
      expect(total, name).toBeGreaterThanOrEqual(95);
      expect(total, name).toBeLessThanOrEqual(99);
    }
    expect(deckError).toBeLessThan(baselineError);
  });
});
