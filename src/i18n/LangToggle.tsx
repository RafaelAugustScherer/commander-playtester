import { Globe } from "lucide-react";
import { LANGS, LANG_LABEL } from "./messages";
import { useI18n } from "./I18nContext";

/** Always-visible PT/EN language switcher. */
export function LangToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="lang" role="group" aria-label={t("lang.aria")}>
      <span className="lang__globe" aria-hidden>
        <Globe size={14} />
      </span>
      {LANGS.map((l) => (
        <button
          key={l}
          className={`lang__btn ${lang === l ? "lang__btn--active" : ""}`}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
        >
          {LANG_LABEL[l]}
        </button>
      ))}
    </div>
  );
}
