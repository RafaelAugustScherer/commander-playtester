import { useEffect, useRef, useState } from "react";
import type { FocusEvent, MouseEvent } from "react";
import { CardPreview, type Preview } from "../board/CardPreview";

interface PickCard {
  id: number;
  name: string;
}

/**
 * Shared card-preview interaction for the mulligan and discard popups. A pointer
 * device previews a card on hover or focus (an enlarged copy beside it); touch
 * opens a centred overlay — on tap when the card has no other action, or on
 * long-press when a tap already selects the card, so selection still works.
 *
 * Returns `cardProps(card)` to spread onto each card button, and `overlay` to
 * render at the popup-overlay level (above the modal).
 */
export function useCardPreview({
  images,
  selectable,
  onToggle,
}: {
  images: Record<string, string>;
  selectable: boolean;
  onToggle?: (id: number) => void;
}) {
  const canHover =
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;

  const [preview, setPreview] = useState<Preview | null>(null);
  const [zoomed, setZoomed] = useState<PickCard | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);

  const previewFor = (c: PickCard, rect: DOMRect): Preview => ({
    url: c.name ? images[c.name.toLowerCase()] : undefined,
    name: c.name || "?",
    isCreature: false,
    rect,
  });

  const cancelLongPress = () => {
    if (longPressTimer.current != null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  useEffect(() => cancelLongPress, []);

  const startLongPress = (c: PickCard) => {
    longPressFired.current = false;
    cancelLongPress();
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      setZoomed(c);
    }, 500);
  };

  const onCardClick = (c: PickCard) => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    if (selectable) onToggle?.(c.id);
    else if (!canHover) setZoomed(c);
  };

  const hoverHandlers = (c: PickCard) => ({
    onMouseEnter: (e: MouseEvent) =>
      setPreview(previewFor(c, e.currentTarget.getBoundingClientRect())),
    onMouseLeave: () => setPreview(null),
    onFocus: (e: FocusEvent) =>
      setPreview(previewFor(c, e.currentTarget.getBoundingClientRect())),
    onBlur: () => setPreview(null),
  });

  const touchHandlers = (c: PickCard) => ({
    onTouchStart: () => startLongPress(c),
    onTouchEnd: cancelLongPress,
    onTouchMove: cancelLongPress,
    onContextMenu: (e: MouseEvent) => e.preventDefault(),
  });

  const cardProps = (c: PickCard) => ({
    onClick: () => onCardClick(c),
    onMouseEnter: undefined,
    onMouseLeave: undefined,
    onFocus: undefined,
    onBlur: undefined,
    onTouchStart: undefined,
    onTouchEnd: undefined,
    onTouchMove: undefined,
    onContextMenu: undefined,
    ...(canHover ? hoverHandlers(c) : touchHandlers(c)),
  });

  const overlay = (
    <>
      {preview && <CardPreview preview={preview} />}
      {zoomed && (
        <div
          className="mull-zoom"
          onClick={() => setZoomed(null)}
          role="dialog"
          aria-modal="true"
        >
          {(() => {
            const url = zoomed.name
              ? images[zoomed.name.toLowerCase()]
              : undefined;
            return url ? (
              <img src={url} alt={zoomed.name} className="mull-zoom__img" />
            ) : (
              <div className="mull-zoom__text">{zoomed.name || "?"}</div>
            );
          })()}
        </div>
      )}
    </>
  );

  return { cardProps, overlay };
}
