import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Axis = "x" | "y";

interface XpScrollProps {
  children: ReactNode;
  axis?: Axis;
  /** Classes applied to the inner scrolling viewport (keeps caller layout/CSS). */
  className?: string;
  /** Classes applied to the outer flex wrapper. */
  wrapperClassName?: string;
  /** Exposes the scrolling viewport node to the caller. */
  viewRef?: React.MutableRefObject<HTMLDivElement | null>;
  /** Notified after each scroll (in addition to the internal thumb sync). */
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

const BUTTON_STEP = 48;
const HORIZONTAL_PAGE_RATIO = 0.8;
const MIN_THUMB = 24;

/**
 * Windows XP scrollbar: a beveled track with arrow end-buttons and a raised,
 * draggable thumb — always visible, identical on every OS (unlike native
 * ::-webkit-scrollbar styling, which macOS renders as a fading overlay).
 */
export function XpScroll({
  children,
  axis = "y",
  className,
  wrapperClassName,
  viewRef,
  onScroll,
}: XpScrollProps) {
  const view = useRef<HTMLDivElement | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);
  const scrollableRef = useRef(false);
  const isY = axis === "y";

  const setView = useCallback(
    (node: HTMLDivElement | null) => {
      view.current = node;
      if (viewRef) viewRef.current = node;
    },
    [viewRef],
  );

  const recompute = useCallback(() => {
    const v = view.current;
    if (!v) return;
    const client = isY ? v.clientHeight : v.clientWidth;
    const scroll = isY ? v.scrollHeight : v.scrollWidth;
    const pos = isY ? v.scrollTop : v.scrollLeft;
    const canScroll = scroll - client > 1;
    if (canScroll !== scrollableRef.current) {
      scrollableRef.current = canScroll;
      setScrollable(canScroll);
    }
    const th = thumb.current;
    const tr = track.current;
    if (!canScroll || !th || !tr) return;
    const trackLen = isY ? tr.clientHeight : tr.clientWidth;
    const thumbLen = Math.max(MIN_THUMB, (client / scroll) * trackLen);
    const maxScroll = scroll - client;
    const maxThumb = trackLen - thumbLen;
    const offset = maxScroll > 0 ? (pos / maxScroll) * maxThumb : 0;
    if (isY) {
      th.style.height = `${thumbLen}px`;
      th.style.transform = `translateY(${offset}px)`;
    } else {
      th.style.width = `${thumbLen}px`;
      th.style.transform = `translateX(${offset}px)`;
    }
  }, [isY]);

  // Recompute on every render (content changes) and whenever the viewport or
  // window resizes (media-query layout switches, drawer open, etc.).
  useLayoutEffect(() => {
    recompute();
    const v = view.current;
    if (!v || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(recompute);
    ro.observe(v);
    return () => ro.disconnect();
  });

  function onThumbDown(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const v = view.current;
    const tr = track.current;
    const th = thumb.current;
    if (!v || !tr || !th) return;
    const startPointer = isY ? e.clientY : e.clientX;
    const startScroll = isY ? v.scrollTop : v.scrollLeft;
    const trackLen = isY ? tr.clientHeight : tr.clientWidth;
    const thumbLen = isY ? th.offsetHeight : th.offsetWidth;
    const maxScroll =
      (isY ? v.scrollHeight : v.scrollWidth) -
      (isY ? v.clientHeight : v.clientWidth);
    const maxThumb = trackLen - thumbLen;
    function move(ev: MouseEvent) {
      if (!v) return;
      const delta = (isY ? ev.clientY : ev.clientX) - startPointer;
      const next =
        startScroll + (maxThumb > 0 ? (delta / maxThumb) * maxScroll : 0);
      if (isY) v.scrollTop = next;
      else v.scrollLeft = next;
    }
    function up() {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.body.classList.remove("xpscroll-dragging");
    }
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    document.body.classList.add("xpscroll-dragging");
  }

  function onButtonDown(dir: 1 | -1) {
    const v = view.current;
    if (!v) return;
    const amount = isY
      ? BUTTON_STEP
      : Math.max(BUTTON_STEP, v.clientWidth * HORIZONTAL_PAGE_RATIO);
    const step = () => {
      if (isY) v.scrollTop += dir * amount;
      else v.scrollLeft += dir * amount;
    };
    step();
    let repeat: number | undefined;
    const hold = window.setTimeout(() => {
      repeat = window.setInterval(step, 50);
    }, 300);
    function up() {
      window.clearTimeout(hold);
      if (repeat) window.clearInterval(repeat);
      document.removeEventListener("mouseup", up);
    }
    document.addEventListener("mouseup", up);
  }

  function onTrackDown(e: React.MouseEvent) {
    const tr = track.current;
    const th = thumb.current;
    const v = view.current;
    if (!tr || !th || !v || e.target !== tr) return;
    const thumbRect = th.getBoundingClientRect();
    const click = isY ? e.clientY : e.clientX;
    const thumbMid = isY
      ? (thumbRect.top + thumbRect.bottom) / 2
      : (thumbRect.left + thumbRect.right) / 2;
    const page = (isY ? v.clientHeight : v.clientWidth) * 0.9;
    const dir = click < thumbMid ? -1 : 1;
    if (isY) v.scrollTop += dir * page;
    else v.scrollLeft += dir * page;
  }

  return (
    <div className={`xpscroll xpscroll--${axis} ${wrapperClassName ?? ""}`}>
      <div
        ref={setView}
        className={`xpscroll__view ${className ?? ""}`}
        onScroll={(e) => {
          recompute();
          onScroll?.(e);
        }}
      >
        {children}
      </div>
      {scrollable && (
        <div
          className="xpscroll__bar"
          role="scrollbar"
          aria-orientation={isY ? "vertical" : "horizontal"}
        >
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className="xpscroll__btn xpscroll__btn--dec"
            onMouseDown={(e) => {
              e.preventDefault();
              onButtonDown(-1);
            }}
          />
          <div className="xpscroll__track" ref={track} onMouseDown={onTrackDown}>
            <div
              className="xpscroll__thumb"
              ref={thumb}
              onMouseDown={onThumbDown}
            />
          </div>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className="xpscroll__btn xpscroll__btn--inc"
            onMouseDown={(e) => {
              e.preventDefault();
              onButtonDown(1);
            }}
          />
        </div>
      )}
    </div>
  );
}
