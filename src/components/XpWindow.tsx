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
 * Drag it anywhere by holding the title bar; Escape or the close button shuts it.
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

  function onBarDown(e: React.MouseEvent) {
    const el = ref.current;
    if (!el || (e.target as HTMLElement).closest(".xpwin__close")) return;
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;
    const maxX = Math.max(0, window.innerWidth - rect.width);
    const maxY = Math.max(0, window.innerHeight - rect.height);
    function move(ev: MouseEvent) {
      setPos({
        x: Math.min(Math.max(0, ev.clientX - offX), maxX),
        y: Math.min(Math.max(0, ev.clientY - offY), maxY),
      });
    }
    function up() {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.body.classList.remove("xpscroll-dragging");
    }
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
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
      <div className="xpwin__bar" onMouseDown={onBarDown}>
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
