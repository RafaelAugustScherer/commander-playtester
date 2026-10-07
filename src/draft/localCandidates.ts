import type { DraftCandidateData } from "../engine/draftQueries";
import { classifyRoles } from "../lib/roles";
import { cardKey, type Card } from "../lib/types";
import { scoreCandidate, type CandidateScore } from "./scoring";
import type { ThemeProfile } from "./themes";

export interface LocallyRankedCandidate {
  card: Card;
  score: CandidateScore;
}

const candidateCards = new Map<string, Card>();

export function draftCandidateCard(candidate: DraftCandidateData): Card {
  const key = cardKey(candidate);
  let card = candidateCards.get(key);
  if (!card) {
    card = buildCandidateCard(candidate);
    candidateCards.set(key, card);
  }
  return card;
}

function buildCandidateCard(candidate: DraftCandidateData): Card {
  const input = {
    typeLine: candidate.typeLine,
    oracleText: candidate.oracleText,
    manaValue: candidate.manaValue,
    producedMana: [],
  };
  return {
    name: candidate.name,
    ...input,
    power: candidate.power,
    colors: [],
    colorIdentity: candidate.colorIdentity,
    roles: classifyRoles(input),
  };
}

export function rankLocalCandidates(
  candidates: DraftCandidateData[],
  profile: ThemeProfile,
  excluded: Set<string>,
  popularityBonus: (name: string) => number = () => 0,
): LocallyRankedCandidate[] {
  return candidates
    .map(draftCandidateCard)
    .filter(
      (card) =>
        !excluded.has(card.name.toLowerCase()) &&
        card.colorIdentity.every((color) => profile.colorIdentity.includes(color)),
    )
    .map((card) => {
      const score = scoreCandidate(card, profile);
      return { card, score, rank: score.total + popularityBonus(card.name) };
    })
    .sort((a, b) => b.rank - a.rank)
    .map(({ card, score }) => ({ card, score }));
}
