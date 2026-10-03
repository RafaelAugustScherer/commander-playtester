import type { MouseEvent as ReactMouseEvent } from "react";
import { Plus, RefreshCw } from "lucide-react";
import type { RankedCandidate } from "./candidates";
import type { DraftCardType } from "./typeBalance";
import { useI18n } from "../i18n/I18nContext";
import type { MsgKey } from "../i18n/messages";
import type { Preview } from "../board/CardPreview";

const SLOT_LABEL: Record<DraftCardType, MsgKey> = {
  land: "draft.slot.land",
  creature: "draft.slot.creature",
  instant: "draft.slot.instant",
  sorcery: "draft.slot.sorcery",
  artifact: "draft.slot.artifact",
  enchantment: "draft.slot.enchantment",
  planeswalker: "draft.slot.planeswalker",
};

/** One suggested card in a `suggestion round`: art, rationale chips, and its actions. */
export function DraftCandidateCard({
  candidate,
  busy,
  primaryLabel,
  onPrimary,
  onRefresh,
  onHover,
  preview,
}: {
  candidate: RankedCandidate;
  busy: boolean;
  primaryLabel: string;
  onPrimary: () => void;
  onRefresh: () => void;
  onHover: (p: Preview | null) => void;
  preview: Preview | null;
}) {
  const { t } = useI18n();
  const { card, score, bracketTilt, slotType } = candidate;

  function enter(e: ReactMouseEvent) {
    onHover({
      url: card.imageUrl,
      name: card.name,
      isCreature: false,
      rect: (e.currentTarget as HTMLElement).getBoundingClientRect(),
    });
  }

  function toggle(e: ReactMouseEvent) {
    onHover(
      preview && preview.name === card.name && preview.url === card.imageUrl
        ? null
        : {
            url: card.imageUrl,
            name: card.name,
            isCreature: false,
            rect: (e.currentTarget as HTMLElement).getBoundingClientRect(),
          },
    );
  }

  return (
    <div className="draft-card">
      {card.imageUrl ? (
        <img
          className="draft-card__img"
          src={card.imageUrl}
          alt={card.name}
          loading="lazy"
          onMouseEnter={enter}
          onMouseLeave={() => onHover(null)}
          onClick={toggle}
        />
      ) : (
        <div className="draft-card__img draft-card__img--placeholder">
          {card.name}
        </div>
      )}
      {slotType && (
        <div className="chips draft-card__tags">
          <span className="chip">{t(SLOT_LABEL[slotType])}</span>
        </div>
      )}
      {score.matchedTokens.length > 0 && (
        <div className="chips draft-card__tags">
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
        <button
          className="btn btn--sm btn--icon has-tooltip"
          onClick={onPrimary}
          disabled={busy}
          aria-label={primaryLabel}
          data-tooltip={primaryLabel}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
        <button
          className="btn btn--ghost btn--sm btn--icon has-tooltip"
          onClick={onRefresh}
          disabled={busy}
          aria-label={t("draft.round.refresh")}
          data-tooltip={t("draft.round.refresh")}
        >
          <RefreshCw size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
