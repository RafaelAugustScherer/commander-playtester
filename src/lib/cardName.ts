/**
 * Card-name adapter — the single anti-corruption point for card names.
 *
 * Turns a card name the way a deck platform writes it (a Moxfield or Archidekt
 * export line, a URL-import API payload, or a plain paste) into the canonical
 * name we persist in a deck. Both the pasted-decklist parser and the URL
 * importers run every name through {@link normalizeCardName}, so pasting an
 * exported decklist needs no hand-editing.
 *
 * A two-sided card (split, MDFC, transform, adventure) is stored in its full
 * "Front // Back" form with the spaced separator. Platforms write it two ways:
 * the spaced "Connive // Concoct" and Moxfield's bare-slash "Connive/Concoct"
 * shorthand; both normalize to the canonical " // ". A slash that is part of a
 * real name is left alone — such names are never a bare token/token pair
 * ("Summon: Choco/Mog", "SP//dr, Piloted by Peni").
 *
 * Scryfall's collection endpoint and the engine's card database both key on the
 * front face alone, so those boundaries collapse the stored name with
 * {@link frontFace} at the point they use it.
 *
 * We also strip the optional set/collector/foil/category decorations Moxfield
 * appends by default ("(C21) 263 *F*"); Archidekt's more decorated export is not
 * special-cased — its export dialog can emit plain card names.
 */
export function normalizeCardName(input: string): string {
  let name = input.trim();

  // Remove a trailing foil/etched marker like "*F*" or "*E*".
  name = name.replace(/\*[a-z]\*$/i, "").trimEnd();

  // Remove a trailing "(SET) collector" block. Set codes are 2-6 alnum chars.
  name = name.replace(/\([0-9a-z]{2,6}\)(?:\s+[0-9a-z-]+)?$/i, "").trimEnd();

  // Remove a trailing category tag in square brackets.
  name = name.replace(/\[[^[\]]*\]$/, "").trimEnd();

  name = name.trim();

  // Canonicalize a two-sided name to the spaced " // " separator. Moxfield's
  // bare-slash shorthand is a chain of space-free faces ("Commit/Memory"); no
  // real card name is shaped that way, so rewriting it is safe.
  if (/^[^\s/]+(?:\/[^\s/]+)+$/.test(name)) {
    name = name.split("/").join(" // ");
  } else {
    name = name
      .split(/(?<=\s)\/\/(?=\s)/)
      .map((face) => face.trim())
      .join(" // ");
  }

  return name.trim();
}

/**
 * The front face of a stored "Front // Back" name — the key Scryfall's
 * collection endpoint and the engine's card database resolve on. Plain names,
 * and real names that merely contain a slash, are returned unchanged.
 */
export function frontFace(name: string): string {
  return name.split(" // ")[0].trim();
}
