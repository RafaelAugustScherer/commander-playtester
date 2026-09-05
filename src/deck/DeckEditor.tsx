import { useMemo, useState } from "react";
import { parseDecklist } from "../lib/decklist";
import { SAMPLE_DECK } from "../lib/sampleDeck";
import {
  importDeck,
  DeckImportError,
  type ImportErrorKind,
} from "../lib/deckImport";
import type { SavedDeck } from "./model";
import { deckToText } from "./model";
import { useI18n } from "../i18n/I18nContext";

function newId(): string {
  return crypto.randomUUID();
}

const IMPORT_ERROR_KEY = {
  "not-a-url": "import.errNotAUrl",
  unsupported: "import.errUnsupported",
  "no-id": "import.errNoId",
  network: "import.errNetwork",
  "not-found": "import.errNotFound",
  empty: "import.errEmpty",
} as const satisfies Record<ImportErrorKind, string>;

/** Create or edit a named deck from pasted decklist text. */
export function DeckEditor({
  initial,
  onSave,
  onCancel,
  onDraft,
}: {
  initial?: SavedDeck;
  onSave: (deck: SavedDeck) => void;
  onCancel: () => void;
  onDraft: (names: string[], commander: string | null) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(initial?.name ?? "");
  const [text, setText] = useState(initial ? deckToText(initial) : "");
  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importDone, setImportDone] = useState<string | null>(null);

  async function handleImport() {
    setImporting(true);
    setImportError(null);
    setImportDone(null);
    try {
      const deck = await importDeck(url);
      setText(deckToText(deck));
      setName((prev) => prev.trim() || deck.name);
      setImportDone(t("import.done", { name: deck.name }));
    } catch (err) {
      const kind = err instanceof DeckImportError ? err.kind : "network";
      setImportError(t(IMPORT_ERROR_KEY[kind]));
    } finally {
      setImporting(false);
    }
  }

  const parsed = useMemo(() => parseDecklist(text), [text]);
  const commanderName = parsed.commanders.map((e) => e.name).join(" & ");
  const commanderCount = parsed.commanders.reduce((n, e) => n + e.quantity, 0);
  const mainboardCount = parsed.mainboard.reduce((n, e) => n + e.quantity, 0);
  const total = commanderCount + mainboardCount;
  const isHundred = total === 100;

  const draftNames = [
    ...parsed.commanders.map((e) => e.name),
    ...parsed.mainboard.map((e) => e.name),
  ];
  const canDraft = new Set(draftNames.map((n) => n.toLowerCase())).size >= 3;

  function handleDraft() {
    onDraft(draftNames, parsed.commanders[0]?.name ?? null);
  }

  function handleSave() {
    const now = Date.now();
    const deck: SavedDeck = {
      id: initial?.id ?? newId(),
      name: name.trim() || commanderName || t("editor.untitled"),
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
        <span className="field__label">{t("import.label")}</span>
        <div className="import-url">
          <input
            className="input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("import.placeholder")}
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === "Enter" && url.trim() && !importing) {
                e.preventDefault();
                void handleImport();
              }
            }}
          />
          <button
            type="button"
            className="btn"
            onClick={() => void handleImport()}
            disabled={importing || url.trim() === ""}
          >
            {importing ? t("import.importing") : t("import.button")}
          </button>
        </div>
        <p className="hint">{t("import.hint")}</p>
        {importError && <p className="error">{importError}</p>}
        {importDone && !importError && (
          <p className="hint" style={{ color: "var(--good)" }}>
            {importDone}
          </p>
        )}
      </label>

      <label className="field">
        <span className="field__label">{t("editor.nameLabel")}</span>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={commanderName || t("editor.namePlaceholder")}
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
        <span
          className="chip"
          style={total > 0 && !isHundred ? { color: "var(--warn)" } : undefined}
        >
          {t("deck.cards", { n: total })}
        </span>
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
      {total > 0 && !isHundred && (
        <p className="hint" style={{ color: "var(--warn)" }}>
          {t("editor.needHundredWarning", { n: total })}
        </p>
      )}

      <div className="import__row">
        <button className="btn" onClick={handleSave}>
          {t("editor.save")}
        </button>
        <button className="btn btn--ghost" onClick={onCancel}>
          {t("editor.cancel")}
        </button>
        {canDraft && (
          <button className="btn btn--ghost" onClick={handleDraft}>
            {t("editor.draftFromDeck")}
          </button>
        )}
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
