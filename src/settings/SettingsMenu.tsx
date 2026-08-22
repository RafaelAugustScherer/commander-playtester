import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useSettings } from "./SettingsContext";

function GearGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 8a4 4 0 100 8 4 4 0 000-8zm0 2.4a1.6 1.6 0 110 3.2 1.6 1.6 0 010-3.2z" />
      <path d="M10.6 2h2.8l.5 2.3a7.6 7.6 0 011.8.75l2-1.2 2 2-1.2 2c.32.56.57 1.16.75 1.8L23 12v.8l-2.3.5c-.18.64-.43 1.24-.75 1.8l1.2 2-2 2-2-1.2c-.56.32-1.16.57-1.8.75L13.4 22h-2.8l-.5-2.3a7.6 7.6 0 01-1.8-.75l-2 1.2-2-2 1.2-2a7.6 7.6 0 01-.75-1.8L1 12.8V12l2.3-.5c.18-.64.43-1.24.75-1.8l-1.2-2 2-2 2 1.2c.56-.32 1.16-.57 1.8-.75L10.6 2z" opacity="0.55" />
    </svg>
  );
}

/** XP taskbar settings popup: beveled button opening a small menu upward. */
export function SettingsMenu() {
  const { t } = useI18n();
  const { settings, setManualMana } = useSettings();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="xp-lang xp-settings" ref={rootRef}>
      <button
        type="button"
        className="xp-lang__btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("settings.title")}
      >
        <GearGlyph />
        {t("settings.title")}
        <span className="xp-lang__caret" aria-hidden>
          {open ? "▾" : "▴"}
        </span>
      </button>
      {open && (
        <div className="xp-lang__menu xp-settings__menu" role="menu" aria-label={t("settings.title")}>
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={settings.manualMana}
            className="xp-settings__item"
            onClick={() => setManualMana(!settings.manualMana)}
          >
            <span className="xp-settings__check" aria-hidden>
              {settings.manualMana ? "☑" : "☐"}
            </span>
            <span className="xp-settings__text">
              <span className="xp-settings__label">{t("settings.manualMana")}</span>
              <span className="xp-settings__desc">{t("settings.manualManaDesc")}</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
