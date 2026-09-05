import { useEffect, useId, useRef, useState } from "react";
import { fetchCardNameSuggestions } from "../lib/scryfall";
import { XpScroll } from "./XpScroll";

interface CardNameInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

const DEBOUNCE_MS = 200;

/**
 * A free-text card-name input with live suggestions from Scryfall's
 * autocomplete: as you type, the cards whose name contains the text drop down
 * below. Picking one fills the field; the typed text is always kept otherwise.
 */
export function CardNameInput({
  value,
  onChange,
  placeholder,
  id,
  disabled,
  className,
}: CardNameInputProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const reqSeq = useRef(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!open) return;
    const query = value.trim();
    if (query.length < 2) {
      setItems([]);
      return;
    }
    const seq = ++reqSeq.current;
    const timer = setTimeout(() => {
      fetchCardNameSuggestions(query)
        .then((names) => {
          if (seq === reqSeq.current) {
            setItems(names);
            setActive(0);
          }
        })
        .catch(() => {
          if (seq === reqSeq.current) setItems([]);
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, open]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function select(name: string) {
    onChange(name);
    setOpen(false);
    setItems([]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      setActive((a) => Math.min(a + 1, items.length - 1));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setActive((a) => Math.max(a - 1, 0));
      e.preventDefault();
    } else if (e.key === "Enter") {
      if (items[active]) {
        select(items[active]);
        e.preventDefault();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="combobox" ref={rootRef}>
      <input
        id={id}
        className={className ?? "input"}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && items.length > 0 && (
        <XpScroll wrapperClassName="combobox__list">
          <ul
            className="combobox__options"
            id={listId}
            role="listbox"
            ref={listRef}
          >
            {items.map((name, i) => (
              <li
                key={name}
                role="option"
                aria-selected={name === value}
                className={`combobox__option ${i === active ? "combobox__option--active" : ""}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(name);
                }}
              >
                {name}
              </li>
            ))}
          </ul>
        </XpScroll>
      )}
    </div>
  );
}
