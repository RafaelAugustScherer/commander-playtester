import { useEffect, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";
import type { DraftSession } from "./draftSession";
import { useI18n } from "../i18n/I18nContext";

type SwipeDirection = "left" | "right";

const SWIPE_THRESHOLD = 0.25;
const EXIT_MS = 250;
const STAMP_FULL_PX = 100;

export function QuickDraftToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const { t } = useI18n();
  return (
    <label className="checkbox">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{t("draft.quick.toggle")}</span>
    </label>
  );
}

export function QuickDraft({
  session,
  busy,
  error,
  onAdd,
  onSkip,
  onClose,
}: {
  session: DraftSession;
  busy: boolean;
  error: string | null;
  onAdd: () => Promise<void>;
  onSkip: () => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [drag, setDrag] = useState<{ startX: number; dx: number } | null>(null);
  const [exit, setExit] = useState<{ name: string; direction: SwipeDirection } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const picking = session.phase === "commander-selection";
  const addLabel = t(picking ? "draft.commander.choose" : "draft.round.add");
  const skipLabel = t("draft.quick.skip");
  const card = session.round[0]?.card;
  const leaving = card && exit?.name === card.name ? exit.direction : null;
  const locked = busy || exit !== null || !card;

  async function swipe(direction: SwipeDirection) {
    if (!card || locked) return;
    setDrag(null);
    setExit({ name: card.name, direction });
    await new Promise((resolve) => setTimeout(resolve, EXIT_MS));
    await (direction === "right" ? onAdd() : onSkip());
    setExit(null);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (locked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ startX: e.clientX, dx: 0 });
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const x = e.clientX;
    setDrag((current) => current && { startX: current.startX, dx: x - current.startX });
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const width = e.currentTarget.getBoundingClientRect().width;
    if (Math.abs(dx) < width * SWIPE_THRESHOLD) {
      setDrag(null);
      return;
    }
    void swipe(dx > 0 ? "right" : "left");
  }

  function stampOpacity(direction: SwipeDirection) {
    if (leaving === direction) return 1;
    if (!drag) return 0;
    const pull = direction === "right" ? drag.dx : -drag.dx;
    return Math.min(Math.max(pull / STAMP_FULL_PX, 0), 1);
  }

  const cardClassName = leaving
    ? `quick-draft__card quick-draft__card--${leaving}`
    : "quick-draft__card";

  const dragStyle = drag
    ? {
        transform: `translateX(${drag.dx}px) rotate(${drag.dx * 0.05}deg)`,
        transition: "none",
      }
    : undefined;

  return createPortal(
    <div
      className="quick-draft"
      role="dialog"
      aria-modal="true"
      aria-label={t("draft.quick.toggle")}
    >
      <button
        type="button"
        className="btn btn--icon quick-draft__close"
        onClick={onClose}
        aria-label={t("common.close")}
      >
        <X size={18} aria-hidden="true" />
      </button>
      <div className="quick-draft__deck">
        <div className="quick-draft__stage">
          {busy && <p className="quick-draft__message">{t("draft.round.loadingNext")}</p>}
          {!busy && !card && (
            <p className="quick-draft__message">
              {t(picking ? "draft.commander.empty" : "draft.round.empty")}
            </p>
          )}
          {card && (
            <div
              key={card.name}
              className={cardClassName}
              style={dragStyle}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={() => setDrag(null)}
            >
              {card.imageUrl ? (
                <img
                  className="quick-draft__img"
                  src={card.imageUrl}
                  alt={card.name}
                  draggable={false}
                />
              ) : (
                <div className="quick-draft__img quick-draft__img--placeholder">{card.name}</div>
              )}
              <span
                className="quick-draft__stamp quick-draft__stamp--add"
                style={{ opacity: stampOpacity("right") }}
                aria-hidden="true"
              >
                {addLabel}
              </span>
              <span
                className="quick-draft__stamp quick-draft__stamp--skip"
                style={{ opacity: stampOpacity("left") }}
                aria-hidden="true"
              >
                {skipLabel}
              </span>
            </div>
          )}
        </div>
        <div className="quick-draft__actions">
          <button
            type="button"
            className="btn quick-draft__skip"
            onClick={() => void swipe("left")}
            disabled={locked}
          >
            <X size={18} aria-hidden="true" /> {skipLabel}
          </button>
          <button
            type="button"
            className="btn quick-draft__add"
            onClick={() => void swipe("right")}
            disabled={locked}
          >
            <Plus size={18} aria-hidden="true" /> {addLabel}
          </button>
        </div>
        <p className="quick-draft__hint">
          ← {skipLabel} · {addLabel} →
        </p>
        {error && <p className="quick-draft__message quick-draft__message--error">{error}</p>}
      </div>
    </div>,
    document.body,
  );
}
