import { useMemo, useState } from "react";
import { parseDecklist } from "../lib/decklist";
import { SAMPLE_DECK } from "../lib/sampleDeck";
import type { SavedDeck } from "./model";
import { deckToText } from "./model";
import { useI18n } from "../i18n/I18nContext";

function newId(): string {
  return crypto.randomUUID();
}

/** Create or edit a named deck from pasted decklist text. */
export function DeckEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: SavedDeck;
  onSave: (deck: SavedDeck) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(initial?.name ?? "");
  const [text, setText] = useState(initial ? deckToText(initial) : "");

  const parsed = useMemo(() => parseDecklist(text), [text]);
  const commanderCount = parsed.commanders.reduce((n, e) => n + e.quantity, 0);
  const mainboardCount = parsed.mainboard.reduce((n, e) => n + e.quantity, 0);
  const total = commanderCount + mainboardCount;

  function handleSave() {
    const now = Date.now();
    const deck: SavedDeck = {
      id: initial?.id ?? newId(),
      name: name.trim() || t("editor.untitled"),
      commanders: parsed.commanders,
      mainboard: parsed.mainboard,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(deck);
  }

  return (
    <section className="panel">
      <h2>{initial ? t("editor.editTitle") : t("editor.newTitle")}</h2>

      <label className="field">
        <span className="field__label">{t("editor.nameLabel")}</span>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("editor.namePlaceholder")}
        />
      </label>

      <label className="field">
        <span className="field__label">{t("editor.decklistLabel")}</span>
        <p className="hint">{t("editor.decklistHint")}</p>
        <textarea
          className="import__textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            "Commander\n1 Atraxa, Praetors' Voice\n\nDeck\n1 Sol Ring\n1 Arcane Signet\n..."
          }
          spellCheck={false}
        />
      </label>

      <div className="chips">
        <span className="chip">
          {parsed.commanders.map((e) => e.name).join(", ") ||
            t("deck.noCommander")}
        </span>
        <span className="chip">{t("deck.cards", { n: total })}</span>
        {parsed.warnings.length > 0 && (
          <span className="chip" style={{ color: "var(--bad)" }}>
            {t("editor.linesUnread", { n: parsed.warnings.length })}
          </span>
        )}
      </div>
      {parsed.warnings.length > 0 && (
        <p className="hint">
          {t("editor.unread", {
            list:
              parsed.warnings.slice(0, 5).join(" · ") +
              (parsed.warnings.length > 5 ? "…" : ""),
          })}
        </p>
      )}

      <div className="import__row">
        <button className="btn" onClick={handleSave} disabled={total === 0}>
          {t("editor.save")}
        </button>
        <button className="btn btn--ghost" onClick={onCancel}>
          {t("editor.cancel")}
        </button>
        {!initial && (
          <button
            className="btn btn--ghost"
            onClick={() => setText(SAMPLE_DECK)}
          >
            {t("editor.loadSample")}
          </button>
        )}
      </div>
    </section>
  );
}
