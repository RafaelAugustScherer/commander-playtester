import { describe, it, expect } from "vitest";
import { toCard, resolveDeck, type FetchLike } from "./scryfall";
import { parseDecklist } from "./decklist";

describe("toCard", () => {
  it("normalizes a Scryfall card and infers roles", () => {
    const card = toCard({
      name: "Sol Ring",
      cmc: 1,
      type_line: "Artifact",
      oracle_text: "{T}: Add {C}{C}.",
      produced_mana: ["C"],
    });
    expect(card.manaValue).toBe(1);
    expect(card.roles).toContain("ramp");
  });

  it("carries a fixed printed power, from the card or its front face", () => {
    expect(toCard({ name: "Bear", cmc: 2, type_line: "Creature — Bear", power: "2" }).power).toBe(2);
    expect(
      toCard({
        name: "Front // Back",
        cmc: 3,
        card_faces: [{ type_line: "Creature — Human", power: "1" }, { type_line: "Land" }],
      }).power,
    ).toBe(1);
  });

  it("marks an {X} in the mana cost, from the card or its front face", () => {
    expect(toCard({ name: "Blaze", cmc: 1, mana_cost: "{X}{R}", type_line: "Sorcery" }).hasXCost).toBe(true);
    expect(
      toCard({
        name: "Front // Back",
        cmc: 2,
        card_faces: [{ mana_cost: "{X}{X}{G}", type_line: "Sorcery" }, { mana_cost: "{2}", type_line: "Instant" }],
      }).hasXCost,
    ).toBe(true);
    expect(toCard({ name: "Bear", cmc: 2, mana_cost: "{1}{G}", type_line: "Creature — Bear" }).hasXCost).toBe(false);
  });

  it("leaves power unset when it is not a fixed number", () => {
    expect(toCard({ name: "Star", cmc: 3, type_line: "Creature — Elemental", power: "*" }).power).toBeUndefined();
    expect(toCard({ name: "Sol Ring", cmc: 1, type_line: "Artifact" }).power).toBeUndefined();
  });

  it("merges oracle text from both faces of a DFC", () => {
    const card = toCard({
      name: "Front // Back",
      cmc: 3,
      card_faces: [
        { type_line: "Sorcery", oracle_text: "Draw two cards." },
        { type_line: "Land", oracle_text: "{T}: Add {G}." },
      ],
    });
    expect(card.oracleText).toContain("Draw two cards");
    expect(card.oracleText).toContain("Add {G}");
  });

  it("carries color_identity as colorIdentity, distinct from colors", () => {
    const card = toCard({
      name: "Dryad Arbor",
      cmc: 0,
      type_line: "Land Creature — Dryad",
      colors: [],
      color_identity: ["G"],
    });
    expect(card.colors).toEqual([]);
    expect(card.colorIdentity).toEqual(["G"]);
  });

  it("defaults colorIdentity to an empty array when Scryfall omits it", () => {
    const card = toCard({ name: "No Identity Field", cmc: 0 });
    expect(card.colorIdentity).toEqual([]);
  });
});

/** A fake fetch that returns a canned collection response. */
function fakeFetch(byName: Record<string, object>): FetchLike {
  return async (_url, init) => {
    const body = JSON.parse(init?.body ?? "{}") as {
      identifiers: { name: string }[];
    };
    const data: object[] = [];
    const notFound: { name: string }[] = [];
    for (const id of body.identifiers) {
      const hit = byName[id.name];
      if (hit) data.push(hit);
      else notFound.push({ name: id.name });
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ data, not_found: notFound }),
    };
  };
}

describe("resolveDeck", () => {
  it("resolves names, expands quantities, and reports unresolved", async () => {
    const parsed = parseDecklist(
      "Commander\n1 Atraxa, Praetors' Voice\n\nDeck\n2 Forest\n1 Nonexistent Card",
    );
    const fetchImpl = fakeFetch({
      "Atraxa, Praetors' Voice": {
        name: "Atraxa, Praetors' Voice",
        cmc: 4,
        type_line: "Legendary Creature — Phyrexian Angel Horror",
        oracle_text: "Flying, vigilance, deathtouch, lifelink.",
      },
      Forest: {
        name: "Forest",
        cmc: 0,
        type_line: "Basic Land — Forest",
        oracle_text: "{T}: Add {G}.",
        produced_mana: ["G"],
      },
    });

    const deck = await resolveDeck(parsed, fetchImpl);
    expect(deck.commanders).toHaveLength(1);
    expect(deck.library).toHaveLength(2); // two Forests
    expect(deck.library.every((c) => c.name === "Forest")).toBe(true);
    expect(deck.unresolved).toEqual(["Nonexistent Card"]);
  });

});

describe("resolveDeck (two-sided)", () => {
  it("resolves a stored two-sided name by querying its front face", async () => {
    const parsed = parseDecklist("Deck\n1 Commit // Memory");
    // Scryfall knows the card only under the front face "Commit"; it echoes the
    // full name back on the returned card.
    const fetchImpl = fakeFetch({
      Commit: {
        name: "Commit // Memory",
        cmc: 4,
        type_line: "Instant // Sorcery",
      },
    });

    const deck = await resolveDeck(parsed, fetchImpl);
    expect(deck.library.map((c) => c.name)).toEqual(["Commit // Memory"]);
    expect(deck.unresolved).toEqual([]);
  });
});
