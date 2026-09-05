import { describe, it, expect } from "vitest";
import { rankNameSuggestions } from "./cardNameSuggest";
import type { SearchCardRow } from "../engine/draftQueries";

/** A minimal search row — only `name` matters to the ranker. */
function row(name: string): SearchCardRow {
  return { name, oracle_id: name, mana_value: 0, color_identity: [], legalities: {} };
}

describe("rankNameSuggestions", () => {
  it("drops rows that match only in oracle text, keeping name matches", () => {
    // "sol" appears in the name of some and (imagine) the oracle text of others;
    // the search hands back both, we keep only the name matches.
    const rows = [row("Sol Ring"), row("Lightning Bolt"), row("Solemn Simulacrum")];
    expect(rankNameSuggestions(rows, "sol")).toEqual(["Sol Ring", "Solemn Simulacrum"]);
  });

  it("ranks exact, then prefix, then word-start, then interior matches", () => {
    const rows = [
      row("Absolute Grace"), // interior "sol"
      row("Krenko, Sol Boss"), // word-start "sol"
      row("Sol"), // exact
      row("Sol Ring"), // prefix
    ];
    expect(rankNameSuggestions(rows, "sol")).toEqual([
      "Sol",
      "Sol Ring",
      "Krenko, Sol Boss",
      "Absolute Grace",
    ]);
  });

  it("skips Alchemy A- rebalances and de-duplicates names", () => {
    const rows = [row("A-Krenko, Mob Boss"), row("Krenko, Mob Boss"), row("Krenko, Mob Boss")];
    expect(rankNameSuggestions(rows, "krenko")).toEqual(["Krenko, Mob Boss"]);
  });

  it("returns nothing for queries shorter than two characters", () => {
    expect(rankNameSuggestions([row("Sol Ring")], "s")).toEqual([]);
  });
});
