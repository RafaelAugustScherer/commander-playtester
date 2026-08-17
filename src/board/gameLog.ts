import type { LogEntry, LogSegment } from "../engine/types";

export function isCurated(entry: LogEntry): boolean {
  const { importance, visibility } = entry.presentation;
  if (importance === "Context") return false;
  if (entry.category === "Turn" && importance === "Detail") return false;
  if (entry.category === "State") return false;
  if (entry.category === "Mana") return false;
  if (entry.category === "Special" && importance === "Detail") return false;
  if (entry.category === "Zone" && visibility === "HiddenInformation") {
    return false;
  }
  return true;
}

/** A turn header ("Turn N — Player") that reads better as a divider than a row. */
export function isTurnMarker(entry: LogEntry): boolean {
  return entry.presentation.boundary === "Turn";
}

/**
 * Hidden-info lines leak nothing when public; otherwise show them only when
 * hands are revealed or the line is strictly about the human's own seat.
 */
export function isVisibleTo(
  entry: LogEntry,
  humanSeat: number | null,
  revealAll: boolean,
): boolean {
  if (entry.presentation.visibility === "Public") return true;
  if (revealAll) return true;
  if (humanSeat == null) return false;
  const players = entry.segments.filter(
    (s): s is Extract<LogSegment, { type: "PlayerName" }> =>
      s.type === "PlayerName",
  );
  return players.length > 0 && players.every((s) => s.value.player_id === humanSeat);
}

export interface EntryCard {
  name: string;
  objectId: number;
}

/** The card(s) a log entry refers to, for the expand-to-thumbnail affordance. */
export function entryCards(entry: LogEntry): EntryCard[] {
  const seen = new Set<number>();
  const cards: EntryCard[] = [];
  for (const s of entry.segments) {
    if (s.type === "CardName" && !seen.has(s.value.object_id)) {
      seen.add(s.value.object_id);
      cards.push({ name: s.value.name, objectId: s.value.object_id });
    }
  }
  return cards;
}

export function prettyKeyword(k: string): string {
  if (k === "Plus1Plus1") return "+1/+1";
  if (k === "Minus1Minus1") return "-1/-1";
  return k.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function segmentText(s: LogSegment): string {
  switch (s.type) {
    case "Text":
      return s.value;
    case "CardName":
      return s.value.name;
    case "PlayerName":
      return s.value.name;
    case "Zone":
      return s.value;
    case "Number":
      return String(s.value);
    case "Mana":
      return s.value;
    case "Keyword":
      return prettyKeyword(s.value);
  }
}

export function entryText(entry: LogEntry): string {
  return entry.segments.map(segmentText).join("");
}
