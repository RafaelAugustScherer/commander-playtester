/**
 * Card-name adapter — the single anti-corruption point for card names.
 *
 * Turns a card name the way a deck platform writes it (a Moxfield or Archidekt
 * export line, a URL-import API payload, or a plain paste) into the canonical
 * name that Scryfall's collection endpoint and the engine's card database key
 * on. Both the pasted-decklist parser and the URL importers run every name
 * through here, so pasting an exported decklist needs no hand-editing.
 *
 * The one conversion the platforms always emit — and that the user cannot turn
 * off — is the two-sided "Front // Back" name (split, MDFC, transform,
 * adventure): Scryfall and the engine both key these on the front face alone,
 * so the full name resolves to nothing. We collapse it to the front face. A
 * slash that is part of the real name is preserved ("SP//dr, Piloted by Peni",
 * "Summon: Choco/Mog") because the double-faced separator is always the spaced
 * " // ".
 *
 * We also strip the optional set/collector/foil/category decorations Moxfield
 * appends by default ("(C21) 263 *F*"); Archidekt's more decorated export is not
 * special-cased — its export dialog can emit plain card names.
 */
export function normalizeCardName(input: string): string {
  let name = input.trim();

  // Remove a trailing foil/etched marker like "*F*" or "*E*".
  name = name.replace(/\s*\*[a-z]\*\s*$/i, "");

  // Remove a trailing "(SET) collector" block. Set codes are 2-6 alnum chars.
  name = name.replace(/\s*\([0-9a-z]{2,6}\)\s*[0-9a-z-]*\s*$/i, "");

  // Remove a trailing category tag in square brackets.
  name = name.replace(/\s*\[[^\]]*\]\s*$/g, "");

  // Collapse a two-sided "Front // Back" name to its front face.
  name = name.split(/\s+\/\/\s+/)[0];

  return name.trim();
}
