import { describe, it, expect } from "vitest";
import { tokenImageUrl } from "./tokenArt";
import type { GameObject } from "../engine/types";

function token(overrides: Partial<GameObject> = {}): GameObject {
  return {
    id: 1,
    name: "Wall",
    zone: "Battlefield",
    is_token: true,
    token_image_ref: {
      scryfall_id: "9b154f90-cc26-4e45-b751-854e2017cd40",
    },
    ...overrides,
  };
}

describe("tokenImageUrl", () => {
  it("builds a CDN url sharded by the first two id digits", () => {
    expect(tokenImageUrl(token())).toBe(
      "https://cards.scryfall.io/normal/front/9/b/9b154f90-cc26-4e45-b751-854e2017cd40.jpg",
    );
  });

  it("returns undefined for non-token objects", () => {
    expect(tokenImageUrl(token({ is_token: false }))).toBeUndefined();
  });

  it("returns undefined when the token carries no printing", () => {
    expect(tokenImageUrl(token({ token_image_ref: null }))).toBeUndefined();
  });
});
