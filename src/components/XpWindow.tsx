import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useI18n } from "../i18n/I18nContext";

interface XpWindowProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A floating Windows XP window: copper title bar, a close button, and a body.
 * Drag it anywhere by holding (or touching) the title bar; Escape or the
 * close button shuts it.
 */
export function XpWindow({ title, onClose, children }: XpWindowProps) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onBarDown(e: React.MouseEvent | React.TouchEvent) {
    const el = ref.current;
    if (!el || (e.target as HTMLElement).closest(".xpwin__close")) return;
    const point = "touches" in e ? e.touches[0] : e;
    if (!point) return;
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    const offX = point.clientX - rect.left;
    const offY = point.clientY - rect.top;
    const maxX = Math.max(0, window.innerWidth - rect.width);
    const maxY = Math.max(0, window.innerHeight - rect.height);
    function moveTo(clientX: number, clientY: number) {
      setPos({
        x: Math.min(Math.max(0, clientX - offX), maxX),
        y: Math.min(Math.max(0, clientY - offY), maxY),
      });
    }
    function onMouseMove(ev: MouseEvent) {
      moveTo(ev.clientX, ev.clientY);
    }
    function onTouchMove(ev: TouchEvent) {
      const t = ev.touches[0];
      if (!t) return;
      ev.preventDefault();
      moveTo(t.clientX, t.clientY);
    }
    function end() {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", end);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", end);
      document.body.classList.remove("xpscroll-dragging");
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", end);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", end);
    document.addEventListener("touchcancel", end);
    document.body.classList.add("xpscroll-dragging");
  }

  return createPortal(
    <div
      ref={ref}
      className={`xpwin${pos ? "" : " xpwin--center"}`}
      style={pos ? { left: pos.x, top: pos.y } : undefined}
      role="dialog"
      aria-label={title}
    >
      <div className="xpwin__bar" onMouseDown={onBarDown} onTouchStart={onBarDown}>
        <span className="xpwin__title">{title}</span>
        <button
          type="button"
          className="xpwin__close"
          onClick={onClose}
          aria-label={t("common.close")}
        >
          <X size={13} strokeWidth={3} />
        </button>
      </div>
      <div className="xpwin__body">{children}</div>
    </div>,
    document.body,
  );
}
