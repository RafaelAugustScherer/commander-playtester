import { useEffect, useId, useRef, useState } from "react";
import { XpScroll } from "./XpScroll";

export interface XpSelectOption {
  value: string;
  label: string;
}

interface XpSelectProps {
  options: XpSelectOption[];
  value: string;
  onChange: (value: string) => void;
  id?: string;
  ariaLabel?: string;
}

/** XP "classic" dropdown: a beveled field that opens a list of options below it. */
export function XpSelect({
  options,
  value,
  onChange,
  id,
  ariaLabel,
}: XpSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const selected = options.find((o) => o.value === value);

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

  function openList() {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }

  function select(option: XpSelectOption) {
    onChange(option.value);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (options[active]) select(options[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="xp-select" ref={rootRef}>
      <button
        type="button"
        id={id}
        className="xp-select__field"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <span className="xp-select__value">{selected?.label ?? ""}</span>
        <span className="xp-select__caret" aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open && (
        <XpScroll wrapperClassName="xp-select__list">
          <ul
            className="xp-select__options"
            id={listId}
            role="listbox"
            ref={listRef}
          >
            {options.map((opt, i) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                className={`xp-select__option ${
                  opt.value === value ? "xp-select__option--selected" : ""
                } ${i === active ? "xp-select__option--active" : ""}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(opt);
                }}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        </XpScroll>
      )}
    </div>
  );
}
