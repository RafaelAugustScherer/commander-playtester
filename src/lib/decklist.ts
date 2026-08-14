import type { DecklistEntry, ParsedDecklist } from "./types";

/**
 * Parse a raw decklist pasted from Moxfield, Archidekt, or plain text.
 *
 * Supported line shapes:
 *   "1 Sol Ring"
 *   "1x Sol Ring"
 *   "1 Sol Ring (C21) 263"      (Moxfield export with set + collector)
 *   "1 Sol Ring (C21) 263 *F*"  (foil marker)
 *   "Sol Ring"                  (quantity defaults to 1)
 *
 * Section headers group cards. A "Commander" (or "Commanders") header marks
 * the commander zone; "Sideboard"/"Maybeboard"/"Considering" sections and
 * their cards are ignored. Blank lines and "//" or "#" comments are skipped.
 */
export function parseDecklist(raw: string): ParsedDecklist {
  const commanders: DecklistEntry[] = [];
  const mainboard: DecklistEntry[] = [];
  const warnings: string[] = [];

  type Section = "main" | "commander" | "ignored";
  let section: Section = "main";

  const lines = raw.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "") continue;
    if (line.startsWith("//") || line.startsWith("#")) continue;

    // Section header, e.g. "Commander", "Commander (1)", "Deck", "Sideboard".
    const header = detectSectionHeader(line);
    if (header) {
      section = header;
      continue;
    }

    if (section === "ignored") continue;

    const entry = parseLine(line);
    if (!entry) {
      warnings.push(line);
      continue;
    }

    if (section === "commander") {
      commanders.push(entry);
    } else {
      mainboard.push(entry);
    }
  }

  return { commanders, mainboard, warnings };
}

const COMMANDER_HEADER = /^commanders?\b/i;
const IGNORED_HEADER = /^(sideboard|maybeboard|considering|tokens?|planes?)\b/i;
const MAIN_HEADER = /^(deck|mainboard|creatures?|lands?|instants?|sorceries|artifacts?|enchantments?|planeswalkers?|other|nonlands?)\b/i;

function detectSectionHeader(line: string): "main" | "commander" | "ignored" | null {
  // A header has no leading quantity and no set/collector metadata.
  if (/^\d+\s*x?\s+/i.test(line)) return null;
  if (COMMANDER_HEADER.test(line)) return "commander";
  if (IGNORED_HEADER.test(line)) return "ignored";
  if (MAIN_HEADER.test(line)) return "main";
  return null;
}

/** Parse a single "N Card Name (SET) 123 *F*" line into an entry. */
function parseLine(line: string): DecklistEntry | null {
  // Leading quantity: "1", "1x", "10 x". Optional — defaults to 1.
  const qtyMatch = line.match(/^(\d+)\s*x?\s+(.*)$/i);
  let quantity = 1;
  let rest = line;
  if (qtyMatch) {
    quantity = parseInt(qtyMatch[1], 10);
    rest = qtyMatch[2];
  }

  const name = cleanCardName(rest);
  if (!name) return null;
  if (!Number.isFinite(quantity) || quantity < 1) return null;

  return { quantity, name };
}

/**
 * Strip trailing set/collector/foil metadata and normalize a card name.
 * Handles Moxfield's "(SET) 123 *F*" suffix and Archidekt's "(SET)" suffix.
 */
export function cleanCardName(input: string): string {
  let name = input.trim();

  // Remove a trailing foil/etched marker like "*F*" or "*E*".
  name = name.replace(/\s*\*[a-z]\*\s*$/i, "");

  // Remove a trailing "(SET) collector" block. Set codes are 3-5 alnum chars.
  name = name.replace(/\s*\([0-9a-z]{2,6}\)\s*[0-9a-z-]*\s*$/i, "");

  // Archidekt sometimes appends category tags in square brackets.
  name = name.replace(/\s*\[[^\]]*\]\s*$/g, "");

  // Collapse a modal/split "Name // Other" to the front face for lookup
  // safety is NOT applied here — Scryfall resolves full DFC names, so keep it.

  return name.trim();
}
