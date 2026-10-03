import { describe, it, expect } from "vitest";
import { createDraftRanker } from "./draftRanking";
import type { CardFaceData, DraftQueryExports, SearchCardRow } from "./draftQueries";
import { extractThemeProfile } from "../draft/themes";
import { draftCandidateCard } from "../draft/localCandidates";

interface FakeCard {
  name: string;
  supertypes?: string[];
  coreTypes: string[];
  subtypes?: string[];
  oracleText: string;
  printings: number;
}

const HYLDA: FakeCard = {
  name: "Hylda of the Icy Crown",
  supertypes: ["Legendary"],
  coreTypes: ["Creature"],
  subtypes: ["Human", "Warlock"],
  oracleText:
    "Whenever you tap an untapped creature an opponent controls, you may pay {1}. When you do, choose one —\n• Create a 4/4 white and blue Elemental creature token.\n• Put a +1/+1 counter on each creature you control.\n• Scry 2, then draw a card.",
  printings: 1,
};

const TAPPER: FakeCard = {
  name: "Frost Warden",
  coreTypes: ["Creature"],
  subtypes: ["Bird"],
  oracleText: "When this creature enters, tap target creature an opponent controls.",
  printings: 1,
};

// More than a theme pool holds: popular cards whose names contain "tap" but
// whose rules text taps nothing.
const FILLERS: FakeCard[] = Array.from({ length: 300 }, (_, i) => ({
  name: `Tapestry Weaver ${i}`,
  coreTypes: ["Creature"],
  subtypes: ["Bear"],
  oracleText: "Vigilance",
  printings: 20,
}));

function face(card: FakeCard): CardFaceData {
  return {
    name: card.name,
    card_type: {
      supertypes: card.supertypes ?? [],
      core_types: card.coreTypes,
      subtypes: card.subtypes ?? [],
    },
    oracle_text: card.oracleText,
    triggers: [],
  };
}

function fakeEngine(cards: FakeCard[]) {
  const searchedTexts: string[] = [];
  const byName = new Map(cards.map((card) => [card.name.toLowerCase(), card]));
  const row = (card: FakeCard): SearchCardRow => ({
    name: card.name,
    oracle_id: card.name,
    mana_value: 2,
    color_identity: ["W"],
    legalities: { commander: "legal" },
  });
  const queries: DraftQueryExports = {
    search_cards_js: ({ text, type_line }) => {
      if (text) searchedTexts.push(text);
      const results = cards
        .filter((card) => {
          if (text) {
            const haystack = `${card.name} ${card.oracleText}`.toLowerCase();
            if (!text.toLowerCase().split(/\s+/).every((word) => haystack.includes(word))) {
              return false;
            }
          }
          if (type_line) {
            const words = [...(card.supertypes ?? []), ...card.coreTypes, ...(card.subtypes ?? [])];
            if (!words.includes(type_line)) return false;
          }
          return true;
        })
        .map(row);
      return { results, total: results.length };
    },
    get_card_face_data: (name) => {
      const card = byName.get(name.toLowerCase());
      return card ? face(card) : null;
    },
    estimate_bracket_for_deck: () => null,
    classify_deck_js: () => ({ archetype: "", confidence: "" }),
    is_card_commander_eligible: () => true,
  };
  const cardDataJson = JSON.stringify(
    Object.fromEntries(
      cards.map((card) => [
        card.name.toLowerCase(),
        {
          card_type: face(card).card_type,
          metadata: { source_printing_ids: Array(card.printings).fill("id") },
        },
      ]),
    ),
  );
  return { queries, cardDataJson, searchedTexts };
}

function hyldaProfile() {
  const commander = draftCandidateCard({
    name: HYLDA.name,
    manaValue: 3,
    typeLine: "Legendary Creature — Human Warlock",
    oracleText: HYLDA.oracleText,
    colorIdentity: ["W"],
  });
  const profile = extractThemeProfile([commander], []);
  return {
    ...profile,
    tokenWeights: [...profile.tokenWeights],
    creatureTypes: [...profile.creatureTypes],
  };
}

describe("createDraftRanker theme pools", () => {
  it("reaches a commander's trigger mechanic past popular cards that only share a word", () => {
    const { queries, cardDataJson, searchedTexts } = fakeEngine([HYLDA, TAPPER, ...FILLERS]);
    const ranker = createDraftRanker(queries, cardDataJson);

    const { candidates } = ranker.rankCardCandidates({
      commanders: [HYLDA.name],
      mainboard: [],
      profile: hyldaProfile(),
      target: "focused",
      exclude: [HYLDA.name.toLowerCase()],
      slotTypes: ["creature"],
    });

    expect(searchedTexts).toContain("tap");
    expect(searchedTexts).not.toContain("tap creature");
    expect(candidates.map((c) => c.name)).toEqual([TAPPER.name]);
  });
});

describe("createDraftRanker tribal mode", () => {
  const ELF: FakeCard = {
    name: "Quiet Elf",
    coreTypes: ["Creature"],
    subtypes: ["Elf"],
    oracleText: "",
    printings: 1,
  };

  it("offers only creatures of the chosen tribes in a creature slot", () => {
    const { queries, cardDataJson } = fakeEngine([HYLDA, TAPPER, ELF, ...FILLERS]);
    const ranker = createDraftRanker(queries, cardDataJson);
    const profile = { ...hyldaProfile(), tribes: ["elf"] };

    const { candidates } = ranker.rankCardCandidates({
      commanders: [HYLDA.name],
      mainboard: [],
      profile,
      target: "focused",
      exclude: [HYLDA.name.toLowerCase()],
      slotTypes: ["creature", "creature"],
    });

    expect(candidates.map((c) => c.name)).toEqual([ELF.name]);
  });
});

