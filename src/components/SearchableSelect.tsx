import { useEffect, useId, useMemo, useRef, useState } from "react";

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  id?: string;
}

/** A compact combobox: shows the selected value, filters options as you type. */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  emptyLabel,
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

  return (
    <div className="combobox" ref={rootRef}>
      <input
        id={id}
        className="input"
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        autoComplete="off"
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
      {open && (
        <ul className="combobox__list" id={listId} role="listbox" ref={listRef}>
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
      )}
    </div>
  );
}
