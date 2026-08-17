import { useEffect, useMemo, useRef, useState } from "react";
import type { GameObject, LogEntry, LogSegment } from "../engine/types";
import { useI18n } from "../i18n/I18nContext";
import {
  categoryIcon,
  entryCards,
  entryText,
  isCurated,
  isTurnMarker,
  isVisibleTo,
  prettyKeyword,
} from "./gameLog";

export interface LoggedEntry {
  id: number;
  entry: LogEntry;
}

interface GameSidebarProps {
  stack: GameObject[];
  log: LoggedEntry[];
  images?: Record<string, string>;
  humanSeat: number | null;
  revealAll: boolean;
  open: boolean;
  onToggle: () => void;
}

const MANA_ABBR: Record<string, string> = {
  White: "W",
  Blue: "U",
  Black: "B",
  Red: "R",
  Green: "G",
  Colorless: "C",
};

export function GameSidebar({
  stack,
  log,
  images,
  humanSeat,
  revealAll,
  open,
  onToggle,
}: GameSidebarProps) {
  const { t } = useI18n();
  const [detailed, setDetailed] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);

  const visible = useMemo(
    () =>
      log.filter(
        ({ entry }) =>
          isVisibleTo(entry, humanSeat, revealAll) &&
          (detailed || isCurated(entry)),
      ),
    [log, humanSeat, revealAll, detailed],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [visible.length, open]);

  if (!open) return null;

  const stackTopFirst = [...stack].reverse();

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <div className="sidebar-backdrop" onClick={onToggle} />
      <aside className="game-sidebar" aria-label={t("sidebar.title")}>
        <div className="game-sidebar__head">
          <strong>{t("sidebar.title")}</strong>
          <button
            className="chip chip--btn"
            onClick={onToggle}
            aria-label={t("sidebar.hide")}
          >
            ✕
          </button>
        </div>

        <section className="sidebar-section">
          <div className="sidebar-section__title">
            {t("sidebar.stack")}
            {stack.length > 0 && (
              <span className="sidebar-count">{stack.length}</span>
            )}
          </div>
          {stackTopFirst.length === 0 ? (
            <p className="hint sidebar-empty">{t("sidebar.stackEmpty")}</p>
          ) : (
            <ul className="stack-list">
              {stackTopFirst.map((o, i) => {
                const name = o.name ?? "";
                const img = name ? images?.[name.toLowerCase()] : undefined;
                return (
                <li key={o.id} className="stack-card">
                  {img ? (
                    <img className="stack-card__img" src={img} alt={name} />
                  ) : (
                    <div className="stack-card__img stack-card__img--none" />
                  )}
                  <div className="stack-card__meta">
                    <span className="stack-card__name">{name}</span>
                    {i === 0 && stackTopFirst.length > 1 && (
                      <span className="stack-card__tag">{t("sidebar.stackTop")}</span>
                    )}
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="sidebar-section sidebar-section--log">
          <div className="sidebar-section__title">
            {t("sidebar.log")}
            <label className="log-toggle">
              <input
                type="checkbox"
                checked={detailed}
                onChange={(e) => setDetailed(e.target.checked)}
              />
              {t("sidebar.detailed")}
            </label>
          </div>
          <div
            className="log-scroll"
            ref={scrollRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              atBottom.current =
                el.scrollHeight - el.scrollTop - el.clientHeight < 48;
            }}
          >
            {visible.length === 0 ? (
              <p className="hint sidebar-empty">{t("sidebar.logEmpty")}</p>
            ) : (
              visible.map(({ id, entry }) =>
                isTurnMarker(entry) ? (
                  <div key={id} className="log-turn">
                    {entryText(entry)}
                  </div>
                ) : (
                  <LogRow
                    key={id}
                    entry={entry}
                    images={images}
                    humanSeat={humanSeat}
                    expanded={expanded.has(id)}
                    onToggle={() => toggle(id)}
                  />
                ),
              )
            )}
          </div>
        </section>
      </aside>
    </>
  );
}

function LogRow({
  entry,
  images,
  humanSeat,
  expanded,
  onToggle,
}: {
  entry: LogEntry;
  images?: Record<string, string>;
  humanSeat: number | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  const cards = entryCards(entry);
  const hasCard = cards.length > 0;
  const tone = entry.presentation.tone.toLowerCase();
  return (
    <div className={`log-row log-row--${tone}`}>
      <button
        type="button"
        className="log-row__head"
        onClick={hasCard ? onToggle : undefined}
        disabled={!hasCard}
        title={entryText(entry)}
      >
        <span className="log-row__chevron">
          {hasCard ? (expanded ? "▾" : "▸") : ""}
        </span>
        <span className="log-row__icon" aria-hidden>
          {categoryIcon(entry.category)}
        </span>
        <span className="log-row__msg">
          {entry.segments.map((s, i) => (
            <Segment key={i} s={s} humanSeat={humanSeat} />
          ))}
        </span>
      </button>
      {expanded && hasCard && (
        <div className="log-row__cards">
          {cards.map((c) => {
            const url = images?.[c.name.toLowerCase()];
            return url ? (
              <img
                key={c.objectId}
                className="log-card__img"
                src={url}
                alt={c.name}
              />
            ) : (
              <div key={c.objectId} className="log-card__none">
                {c.name}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Segment({
  s,
  humanSeat,
}: {
  s: LogSegment;
  humanSeat: number | null;
}) {
  switch (s.type) {
    case "Text":
      return <>{s.value}</>;
    case "CardName":
      return <span className="seg-card">{s.value.name}</span>;
    case "PlayerName":
      return (
        <span
          className={`seg-player ${s.value.player_id === humanSeat ? "seg-player--you" : ""}`}
        >
          {s.value.name}
        </span>
      );
    case "Zone":
      return <span className="seg-zone">{s.value}</span>;
    case "Number":
      return <span className="seg-num">{s.value}</span>;
    case "Mana":
      return (
        <span className="seg-mana" title={s.value}>
          {MANA_ABBR[s.value] ?? s.value}
        </span>
      );
    case "Keyword":
      return <span className="seg-kw">{prettyKeyword(s.value)}</span>;
  }
}
