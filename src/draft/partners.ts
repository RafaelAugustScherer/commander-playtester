import type { Card } from "../lib/types";

export type PairingCard = Pick<Card, "name" | "typeLine" | "oracleText">;

type Pairing =
  | { kind: "partner"; variant: string }
  | { kind: "partner-with"; name: string }
  | { kind: "friends-forever" }
  | { kind: "choose-a-background" }
  | { kind: "doctors-companion" };

export function isBackground(card: Pick<Card, "typeLine">): boolean {
  return /\bBackground\b/.test(card.typeLine);
}

export function hasChooseABackground(card: Pick<Card, "oracleText">): boolean {
  return /\bchoose a background\b/i.test(card.oracleText);
}

/** A legendary Time Lord Doctor with no other creature types — what Doctor's companion pairs with. */
function isTheDoctor(card: PairingCard): boolean {
  return /^Legendary Creature — Time Lord Doctor$/.test(card.typeLine.trim());
}

function pairingsOf(card: PairingCard): Pairing[] {
  return card.oracleText.split("\n").flatMap((rawLine): Pairing[] => {
    const line = rawLine.split("(")[0].trim();
    const partnerWith = /^Partner with (.+)$/i.exec(line);
    if (partnerWith) return [{ kind: "partner-with", name: partnerWith[1].trim() }];
    const variant = /^Partner[—-](.+)$/i.exec(line);
    if (variant) return [{ kind: "partner", variant: variant[1].trim().toLowerCase() }];
    if (/^Partner$/i.test(line)) return [{ kind: "partner", variant: "" }];
    if (/^Friends forever$/i.test(line)) return [{ kind: "friends-forever" }];
    if (/^Choose a Background$/i.test(line)) return [{ kind: "choose-a-background" }];
    if (/^Doctor['’]s companion$/i.test(line)) return [{ kind: "doctors-companion" }];
    return [];
  });
}

function pairsWith(pairing: Pairing, card: PairingCard, other: PairingCard): boolean {
  const otherPairings = pairingsOf(other);
  switch (pairing.kind) {
    case "partner":
      return otherPairings.some((p) => p.kind === "partner" && p.variant === pairing.variant);
    case "partner-with":
      return (
        other.name.toLowerCase() === pairing.name.toLowerCase() &&
        otherPairings.some(
          (p) => p.kind === "partner-with" && p.name.toLowerCase() === card.name.toLowerCase(),
        )
      );
    case "friends-forever":
      return otherPairings.some((p) => p.kind === "friends-forever");
    case "choose-a-background":
      return isBackground(other);
    case "doctors-companion":
      return isTheDoctor(other);
  }
}

export function canPairAsCommanders(a: PairingCard, b: PairingCard): boolean {
  if (a.name.toLowerCase() === b.name.toLowerCase()) return false;
  return (
    pairingsOf(a).some((p) => pairsWith(p, a, b)) || pairingsOf(b).some((p) => pairsWith(p, b, a))
  );
}
