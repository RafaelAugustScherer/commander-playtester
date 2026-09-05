import { useEffect, useId, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { XpScroll } from "./XpScroll";

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  /** Show an X inside the field to clear the selection back to empty. */
  clearable?: boolean;
  clearLabel?: string;
  id?: string;
}

/** A compact combobox: shows the selected value, filters options as you type. */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  emptyLabel,
  disabled,
  clearable,
  clearLabel,
  id,
}: SearchableSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
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

  function openList() {
    if (disabled) return;
    setOpen(true);
    setQuery("");
    setActive(Math.max(0, options.indexOf(value)));
  }

  function select(option: string) {
    onChange(option);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      openList();
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowDown") {
      setActive((a) => Math.min(a + 1, filtered.length - 1));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setActive((a) => Math.max(a - 1, 0));
      e.preventDefault();
    } else if (e.key === "Enter") {
      if (filtered[active]) select(filtered[active]);
      e.preventDefault();
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  const showClear = clearable && !!value && !open && !disabled;

  return (
    <div className="combobox" ref={rootRef}>
      <input
        id={id}
        className={`input ${showClear ? "input--has-clear" : ""}`}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={open ? query : value}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={openList}
        onKeyDown={onKeyDown}
      />
      {showClear && (
        <button
          type="button"
          className="combobox__clear"
          aria-label={clearLabel}
          onMouseDown={(e) => {
            e.preventDefault();
            onChange("");
          }}
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
      {open && (
        <XpScroll wrapperClassName="combobox__list">
          <ul
            className="combobox__options"
            id={listId}
            role="listbox"
            ref={listRef}
          >
            {filtered.length === 0 ? (
              <li className="combobox__empty">{emptyLabel}</li>
            ) : (
              filtered.map((opt, i) => (
                <li
                  key={opt}
                  role="option"
                  aria-selected={opt === value}
                  className={`combobox__option ${i === active ? "combobox__option--active" : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    select(opt);
                  }}
                >
                  {opt}
                </li>
              ))
            )}
          </ul>
        </XpScroll>
      )}
    </div>
  );
}
