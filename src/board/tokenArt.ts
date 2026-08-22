import type { GameObject } from "../engine/types";

/**
 * Scryfall's image CDN lays cards out by the first two hex digits of the
 * printing id, matching the `image_uris` URLs the deck path already uses.
 */
export function tokenImageUrl(obj: GameObject): string | undefined {
  if (!obj.is_token) return undefined;
  const id = obj.token_image_ref?.scryfall_id;
  if (!id) return undefined;
  return `https://cards.scryfall.io/normal/front/${id[0]}/${id[1]}/${id}.jpg`;
}
