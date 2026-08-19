import { describe, it, expect } from "vitest";
import {
  detectSource,
  parseArchidekt,
  parseMoxfield,
  importDeck,
  DeckImportError,
  type FetchLike,
} from "./deckImport";
import archidektFixture from "./__fixtures__/archidekt.json";
import moxfieldFixture from "./__fixtures__/moxfield.json";
import moxfieldCommanderFixture from "./__fixtures__/moxfield-commander.json";

function stubFetch(payload: unknown, ok = true, status = 200): FetchLike {
  return async () => ({ ok, status, json: async () => payload });
}

const qty = (entries: { name: string; quantity: number }[], name: string) =>
  entries.find((e) => e.name === name)?.quantity;

describe("detectSource", () => {
  it("recognizes each site by host, scheme-optional", () => {
    expect(detectSource("https://www.moxfield.com/decks/abc123")).toBe("moxfield");
    expect(detectSource("archidekt.com/decks/42-my-deck")).toBe("archidekt");
    expect(detectSource("https://www.ligamagic.com.br/?view=dks/deck&id=99")).toBe(
      "ligamagic",
    );
  });

  it("returns null for non-deck URLs and junk", () => {
    expect(detectSource("https://example.com/decks/1")).toBeNull();
    expect(detectSource("not a url")).toBeNull();
    expect(detectSource("")).toBeNull();
  });
});

describe("parseArchidekt", () => {
  const deck = parseArchidekt(archidektFixture);

  it("reads the deck name and routes the Commander category", () => {
    expect(deck.name).toBe("Fun With Fungus");
    expect(deck.commanders.map((e) => e.name)).toEqual(["Thelon of Havenwood"]);
  });

  it("keeps mainboard cards with their quantities", () => {
    expect(qty(deck.mainboard, "Mana Crypt")).toBe(1);
    expect(deck.mainboard.some((e) => e.name === "Thelon of Havenwood")).toBe(false);
  });

  it("drops cards in a not-included category (Maybeboard)", () => {
    const all = [...deck.commanders, ...deck.mainboard].map((e) => e.name);
    expect(all).not.toContain("Llanowar Elves");
  });
});

describe("parseMoxfield", () => {
  it("reads a real deck's mainboard and ignores the sideboard", () => {
    const deck = parseMoxfield(moxfieldFixture);
    expect(deck.name).toBe("CloudFlare Hammer");
    expect(qty(deck.mainboard, "Plains")).toBe(3);
    expect(qty(deck.mainboard, "Stoneforge Mystic")).toBe(4);
    const all = [...deck.commanders, ...deck.mainboard].map((e) => e.name);
    expect(all).not.toContain("Spell Pierce"); // sideboard
    expect(all).not.toContain("Grafdigger's Cage"); // sideboard
  });

  it("keeps a two-sided card name whole, canonicalized", () => {
    const deck = parseMoxfield({
      name: "DFC deck",
      boards: {
        mainboard: {
          cards: { a: { quantity: 1, card: { name: "Never // Return" } } },
        },
      },
    });
    expect(deck.mainboard.map((e) => e.name)).toEqual(["Never // Return"]);
  });

  it("routes the commanders board and ignores the maybeboard", () => {
    const deck = parseMoxfield(moxfieldCommanderFixture);
    expect(deck.commanders.map((e) => e.name)).toEqual(["Atraxa, Praetors' Voice"]);
    expect(deck.mainboard.map((e) => e.name).sort()).toEqual([
      "Arcane Signet",
      "Sol Ring",
    ]);
    const all = [...deck.commanders, ...deck.mainboard].map((e) => e.name);
    expect(all).not.toContain("Rhystic Study"); // maybeboard
  });
});

describe("importDeck", () => {
  it("fetches and parses an Archidekt URL", async () => {
    const deck = await importDeck(
      "https://archidekt.com/decks/1/fun",
      stubFetch(archidektFixture),
    );
    expect(deck.source).toBe("archidekt");
    expect(deck.name).toBe("Fun With Fungus");
    expect(deck.commanders).toHaveLength(1);
  });

  it("rejects Ligamagic as unsupported", async () => {
    await expect(
      importDeck("https://www.ligamagic.com.br/?view=dks/deck&id=99"),
    ).rejects.toMatchObject({ kind: "unsupported", source: "ligamagic" });
  });

  it("rejects an unrecognized URL", async () => {
    await expect(importDeck("https://example.com/x")).rejects.toBeInstanceOf(
      DeckImportError,
    );
  });

  it("falls through to the next proxy when the first one fails", async () => {
    let n = 0;
    const flaky: FetchLike = async () => {
      n += 1;
      if (n === 1) throw new Error("proxy hung");
      return { ok: true, status: 200, json: async () => archidektFixture };
    };
    const deck = await importDeck("https://archidekt.com/decks/1/fun", flaky);
    expect(n).toBe(2);
    expect(deck.name).toBe("Fun With Fungus");
  });

  it("maps a 404 to not-found", async () => {
    await expect(
      importDeck("https://moxfield.com/decks/nope", stubFetch(null, false, 404)),
    ).rejects.toMatchObject({ kind: "not-found" });
  });

  it("flags an empty deck", async () => {
    await expect(
      importDeck("https://moxfield.com/decks/empty", stubFetch({ name: "x", boards: {} })),
    ).rejects.toMatchObject({ kind: "empty" });
  });
});
