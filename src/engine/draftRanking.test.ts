import { describe, it, expect } from "vitest";
import { DEFAULT_CUSTOMIZATION, type DraftCustomization } from "../draft/customization";
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
  power?: number;
  printings: number;
  printingSets?: number;
  colorIdentity?: string[];
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
    power: card.power === undefined ? undefined : { type: "Fixed", value: card.power },
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
    color_identity: card.colorIdentity ?? ["W"],
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
          metadata:
            card.printingSets === undefined
              ? { source_printing_ids: Array(card.printings).fill("id") }
              : undefined,
          printings: card.printingSets === undefined ? undefined : Array(card.printingSets).fill("SET"),
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
      customization: DEFAULT_CUSTOMIZATION,
      exclude: [HYLDA.name.toLowerCase()],
      slotTypes: ["creature"],
    });

    expect(searchedTexts).toContain("tap");
    expect(searchedTexts).not.toContain("tap creature");
    expect(candidates.map((c) => c.name)).toEqual([TAPPER.name]);
  });
});

describe("createDraftRanker printing counts", () => {
  it("counts a card's set-code list when it has no printing ids", () => {
    const withoutIds: FakeCard = { ...TAPPER, name: "Old Frost Warden", printingSets: 20 };
    const withIds: FakeCard = { ...TAPPER, name: "New Frost Warden", printings: 2 };
    const { queries, cardDataJson } = fakeEngine([HYLDA, withIds, withoutIds]);
    const { candidates } = createDraftRanker(queries, cardDataJson).rankCardCandidates({
      commanders: [HYLDA.name],
      mainboard: [],
      profile: hyldaProfile(),
      target: "focused",
      customization: DEFAULT_CUSTOMIZATION,
      exclude: [HYLDA.name.toLowerCase()],
      slotTypes: ["creature"],
    });
    expect(candidates.map((c) => c.name)).toEqual([withoutIds.name]);
  });
});

describe("createDraftRanker power pools", () => {
  const POWER_COMMANDER: FakeCard = {
    name: "Small Fry Captain",
    supertypes: ["Legendary"],
    coreTypes: ["Creature"],
    subtypes: ["Human"],
    oracleText: "Other creatures you control with base power 1 get +1/+1.",
    power: 2,
    printings: 1,
  };
  const BIG_FILLERS: FakeCard[] = FILLERS.map((filler) => ({ ...filler, power: 3 }));
  const RARE_SMALL: FakeCard = {
    name: "Rare Small Fry",
    coreTypes: ["Creature"],
    subtypes: ["Bird"],
    oracleText: "Vigilance",
    power: 1,
    printings: 1,
  };

  it("reaches a little-printed creature of the named power past popular ones of another", () => {
    const { queries, cardDataJson } = fakeEngine([POWER_COMMANDER, RARE_SMALL, ...BIG_FILLERS]);
    const ranker = createDraftRanker(queries, cardDataJson);
    const commander = draftCandidateCard({
      name: POWER_COMMANDER.name,
      manaValue: 3,
      typeLine: "Legendary Creature — Human",
      oracleText: POWER_COMMANDER.oracleText,
      power: 2,
      colorIdentity: ["W"],
    });
    const profile = extractThemeProfile([commander], []);

    const { candidates } = ranker.rankCardCandidates({
      commanders: [POWER_COMMANDER.name],
      mainboard: [],
      profile: {
        ...profile,
        tokenWeights: [...profile.tokenWeights],
        creatureTypes: [...profile.creatureTypes],
      },
      target: "focused",
      customization: DEFAULT_CUSTOMIZATION,
      exclude: [POWER_COMMANDER.name.toLowerCase()],
      slotTypes: ["creature"],
    });

    expect(candidates.map((c) => c.name)).toEqual([RARE_SMALL.name]);
  });
});

describe("createDraftRanker exclusion", () => {
  it("leaves out a two-sided card the deck stores under its full name", () => {
    const { queries, cardDataJson } = fakeEngine([HYLDA, TAPPER, ...FILLERS]);
    const ranker = createDraftRanker(queries, cardDataJson);

    const { candidates } = ranker.rankCardCandidates({
      commanders: [HYLDA.name],
      mainboard: [`${TAPPER.name} // Frost Wake`],
      profile: hyldaProfile(),
      target: "focused",
      customization: DEFAULT_CUSTOMIZATION,
      exclude: [HYLDA.name, `${TAPPER.name} // Frost Wake`].map((n) => n.toLowerCase()),
      slotTypes: ["creature"],
    });

    expect(candidates.map((c) => c.name)).not.toContain(TAPPER.name);
  });
});

describe("createDraftRanker theme pools by colour", () => {
  const OFF_COLOUR_TAPPERS: FakeCard[] = Array.from({ length: 300 }, (_, i) => ({
    name: `Goblin Tapper ${i}`,
    coreTypes: ["Creature"],
    subtypes: ["Goblin"],
    oracleText: "When this creature enters, tap target creature an opponent controls.",
    printings: 20,
    colorIdentity: ["R"],
  }));
  const RARE_TAPPER: FakeCard = { ...TAPPER, name: "Rare Frost Warden", printings: 1 };

  it("keeps a little-printed on-colour fit that popular off-colour matches would crowd out", () => {
    const { queries, cardDataJson } = fakeEngine([
      HYLDA,
      RARE_TAPPER,
      ...OFF_COLOUR_TAPPERS,
      ...FILLERS,
    ]);
    const ranker = createDraftRanker(queries, cardDataJson);

    const { candidates } = ranker.rankCardCandidates({
      commanders: [HYLDA.name],
      mainboard: [],
      profile: hyldaProfile(),
      target: "focused",
      customization: DEFAULT_CUSTOMIZATION,
      exclude: [HYLDA.name.toLowerCase()],
      slotTypes: ["creature"],
    });

    expect(candidates.map((c) => c.name)).toEqual([RARE_TAPPER.name]);
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
      customization: DEFAULT_CUSTOMIZATION,
      exclude: [HYLDA.name.toLowerCase()],
      slotTypes: ["creature", "creature"],
    });

    expect(candidates.map((c) => c.name)).toEqual([ELF.name]);
  });
});


describe("createDraftRanker land slots", () => {
  const COMMAND_TOWER: FakeCard = {
    name: "Command Tower",
    coreTypes: ["Land"],
    oracleText: "{T}: Add one mana of any color in your commander's color identity.",
    printings: 40,
  };
  const ROGUES_PASSAGE: FakeCard = {
    name: "Rogue's Passage",
    coreTypes: ["Land"],
    oracleText: "{T}: Add {C}.\n{4}, {T}: Target creature can't be blocked this turn.",
    printings: 2,
  };

  it("offers a one-colour deck utility lands, not colour fixers", () => {
    const { queries, cardDataJson } = fakeEngine([HYLDA, COMMAND_TOWER, ROGUES_PASSAGE]);
    const ranker = createDraftRanker(queries, cardDataJson);

    const { candidates } = ranker.rankCardCandidates({
      commanders: [HYLDA.name],
      mainboard: [],
      profile: hyldaProfile(),
      target: "focused",
      customization: DEFAULT_CUSTOMIZATION,
      exclude: [HYLDA.name.toLowerCase()],
      slotTypes: ["land", "land"],
    });

    expect(candidates.map((c) => c.name)).toEqual([ROGUES_PASSAGE.name]);
  });
});

describe("createDraftRanker customization", () => {
  const WALKER: FakeCard = {
    name: "Gideon of the Tests",
    supertypes: ["Legendary"],
    coreTypes: ["Planeswalker"],
    subtypes: ["Gideon"],
    oracleText: "+1: Tap target creature an opponent controls.",
    printings: 5,
  };
  const DELVER: FakeCard = {
    name: "Dungeon Delver",
    coreTypes: ["Creature"],
    subtypes: ["Dwarf"],
    oracleText: "When this creature enters, tap target creature and venture into the dungeon.",
    printings: 5,
  };

  function rank(customization: DraftCustomization) {
    const { queries, cardDataJson } = fakeEngine([HYLDA, TAPPER, WALKER, DELVER]);
    return createDraftRanker(queries, cardDataJson).rankCardCandidates({
      commanders: [HYLDA.name],
      mainboard: [],
      profile: hyldaProfile(),
      target: "focused",
      customization,
      exclude: [HYLDA.name.toLowerCase()],
      slotTypes: ["creature", "creature", "planeswalker"],
    });
  }

  it("offers no planeswalkers or dungeon cards by default", () => {
    const { candidates, balance } = rank(DEFAULT_CUSTOMIZATION);

    expect(candidates.map((c) => c.name)).toEqual([TAPPER.name]);
    expect(balance.target.planeswalker).toBe(0);
  });

  it("offers them once each is turned on", () => {
    const { candidates } = rank({ planeswalkers: true, dungeons: true, ramp: true });

    expect(candidates.map((c) => c.name).sort()).toEqual(
      [DELVER.name, TAPPER.name, WALKER.name].sort(),
    );
  });
});
