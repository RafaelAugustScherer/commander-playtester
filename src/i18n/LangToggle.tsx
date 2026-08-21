import { useEffect, useRef, useState } from "react";
import { LANGS, LANG_LABEL } from "./messages";
import { useI18n } from "./I18nContext";

/** XP taskbar language switch: a beveled button that opens a small menu upward. */
export function LangToggle() {
  const { lang, setLang, t } = useI18n();
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
    <div className="xp-lang" ref={rootRef}>
      <button
        type="button"
        className="xp-lang__btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("lang.aria")}
      >
        {LANG_LABEL[lang]}
        <span className="xp-lang__caret" aria-hidden>
          {open ? "▾" : "▴"}
        </span>
      </button>
      {open && (
        <ul className="xp-lang__menu" role="listbox" aria-label={t("lang.aria")}>
          {LANGS.map((l) => (
            <li
              key={l}
              role="option"
              aria-selected={lang === l}
              className={`xp-lang__item ${lang === l ? "xp-lang__item--active" : ""}`}
              onClick={() => {
                setLang(l);
                setOpen(false);
              }}
            >
              {LANG_LABEL[l]}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
