import type { DraftCandidateData } from "../engine/draftQueries";
import { classifyRoles } from "../lib/roles";
import type { Card } from "../lib/types";
import { scoreCandidate, type CandidateScore } from "./scoring";
import type { ThemeProfile } from "./themes";

export interface LocallyRankedCandidate {
  card: Card;
  score: CandidateScore;
}

export function draftCandidateCard(candidate: DraftCandidateData): Card {
  const input = {
    typeLine: candidate.typeLine,
    oracleText: candidate.oracleText,
    manaValue: candidate.manaValue,
    producedMana: [],
  };
  return {
    name: candidate.name,
    ...input,
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
    .map((card) => ({ card, score: scoreCandidate(card, profile) }))
    .sort(
      (a, b) =>
        b.score.total +
        popularityBonus(b.card.name) -
        (a.score.total + popularityBonus(a.card.name)),
    );
}
