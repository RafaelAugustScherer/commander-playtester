import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useSettings } from "./SettingsContext";

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
            <span className="xp-settings__check" aria-hidden />
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
