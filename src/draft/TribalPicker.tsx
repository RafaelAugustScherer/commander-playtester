import { useCallback, useState } from "react";
import { CardNameInput } from "../components/CardNameInput";
import { XpCheckbox } from "../components/XpCheckbox";
import { useI18n } from "../i18n/I18nContext";
import { CREATURE_TYPES } from "./creatureTypes";
import type { TribalMode } from "./draftSession";

const SUGGESTION_LIMIT = 12;

const DISPLAY_NAME = new Map(CREATURE_TYPES.map((type) => [type.toLowerCase(), type]));

function displayName(tribe: string): string {
  return DISPLAY_NAME.get(tribe) ?? tribe;
}

/** The toggle that turns tribal mode on or off, shown beside the bracket picker. */
export function TribalToggle({
  tribal,
  disabled,
  onChange,
}: {
  tribal: TribalMode;
  disabled?: boolean;
  onChange: (tribal: TribalMode) => void;
}) {
  const { t } = useI18n();
  return (
    <XpCheckbox
      label={t("draft.tribal.toggle")}
      checked={tribal.enabled}
      disabled={disabled}
      onChange={(enabled) => onChange({ ...tribal, enabled })}
    />
  );
}

/**
 * The tribes tribal mode steers by: one chip per chosen creature type, plus a
 * field that suggests creature types as they are typed. Shown only while
 * tribal mode is on.
 */
export function TribePicker({
  tribal,
  disabled,
  onChange,
}: {
  tribal: TribalMode;
  disabled?: boolean;
  onChange: (tribal: TribalMode) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");

  const fetchSuggestions = useCallback(
    async (text: string) => {
      const needle = text.toLowerCase();
      return CREATURE_TYPES.filter(
        (type) =>
          type.toLowerCase().includes(needle) && !tribal.tribes.includes(type.toLowerCase()),
      )
        .sort(
          (a, b) =>
            Number(!a.toLowerCase().startsWith(needle)) -
              Number(!b.toLowerCase().startsWith(needle)) || a.localeCompare(b),
        )
        .slice(0, SUGGESTION_LIMIT);
    },
    [tribal.tribes],
  );

  if (!tribal.enabled) return null;

  function add(type: string) {
    setQuery("");
    const tribe = type.toLowerCase();
    if (!tribal.tribes.includes(tribe)) {
      onChange({ ...tribal, tribes: [...tribal.tribes, tribe] });
    }
  }

  function remove(tribe: string) {
    onChange({ ...tribal, tribes: tribal.tribes.filter((t) => t !== tribe) });
  }

  return (
    <div className="field" style={{ marginTop: "0.5rem" }}>
      <span className="field__label">{t("draft.tribal.label")}</span>
      {tribal.tribes.length > 0 && (
        <div className="chips" style={{ marginTop: 0, marginBottom: "0.5rem" }}>
          {tribal.tribes.map((tribe) => (
            <button
              key={tribe}
              className="chip chip--btn"
              onClick={() => remove(tribe)}
              disabled={disabled}
              aria-label={t("draft.tribal.remove", { name: displayName(tribe) })}
            >
              {displayName(tribe)} ×
            </button>
          ))}
        </div>
      )}
      <CardNameInput
        value={query}
        onChange={setQuery}
        onSelect={add}
        fetchSuggestions={fetchSuggestions}
        placeholder={t("draft.tribal.placeholder")}
        disabled={disabled}
      />
      <p className="hint">
        {tribal.tribes.length > 0 ? t("draft.tribal.hint") : t("draft.tribal.empty")}
      </p>
    </div>
  );
}
