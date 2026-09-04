import type { RankedCandidate } from "./candidates";
import { useI18n } from "../i18n/I18nContext";

/** One suggested card in a `suggestion round`: art, rationale chips, and its actions. */
export function DraftCandidateCard({
  candidate,
  busy,
  primaryLabel,
  onPrimary,
  onRefresh,
}: {
  candidate: RankedCandidate;
  busy: boolean;
  primaryLabel: string;
  onPrimary: () => void;
  onRefresh: () => void;
}) {
  const { t } = useI18n();
  const { card, score, bracketTilt } = candidate;

  return (
    <div className="draft-card">
      {card.imageUrl ? (
        <img
          className="draft-card__img"
          src={card.imageUrl}
          alt={card.name}
          loading="lazy"
        />
      ) : (
        <div className="draft-card__img draft-card__img--placeholder">
          {card.name}
        </div>
      )}
      <div className="draft-card__body">
        <span className="draft-card__name">{card.name}</span>
        {score.matchedTokens.length > 0 && (
          <div className="chips">
            {score.matchedTokens.map((token) => (
              <span className="chip" key={token}>
                {token}
              </span>
            ))}
          </div>
        )}
        {bracketTilt < 0 && (
          <p className="hint" style={{ color: "var(--warn)" }}>
            {t("draft.round.tiltNote")}
          </p>
        )}
        <div className="draft-card__actions">
          <button className="btn btn--sm" onClick={onPrimary} disabled={busy}>
            {primaryLabel}
          </button>
          <button
            className="btn btn--ghost btn--sm"
            onClick={onRefresh}
            disabled={busy}
          >
            {t("draft.round.refresh")}
          </button>
        </div>
      </div>
    </div>
  );
}
