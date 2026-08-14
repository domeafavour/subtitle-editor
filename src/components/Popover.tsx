import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

interface PopoverProps {
  /** Renders the trigger — receives the open state and a toggle callback. */
  button: (state: { open: boolean; toggle: () => void }) => ReactNode;
  /** The panel content; a function receives a `close` callback. */
  children: ReactNode | ((close: () => void) => ReactNode);
  /** Panel positioning (right-aligned below the trigger by default). */
  align?: "right" | "left";
  /** Extra classes for the positioned wrapper (children own their box). */
  panelClassName?: string;
}

/**
 * Minimal dependency-free popover: click the trigger to toggle, click outside
 * or press Escape to close. The panel is positioned below the trigger; the
 * children decide their own visual box (card, menu list, …).
 */
export function Popover({
  button,
  children,
  align = "right",
  panelClassName = "",
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      // Clicks inside the popover (e.g. the settings inputs) don't close it.
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const toggle = () => setOpen((prev) => !prev);
  const close = () => setOpen(false);

  return (
    <div ref={rootRef} className="relative">
      {button({ open, toggle })}
      {open && (
        <div
          className={`absolute top-full z-20 mt-1 ${align === "right" ? "right-0" : "left-0"} ${panelClassName}`}
        >
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </div>
  );
}
