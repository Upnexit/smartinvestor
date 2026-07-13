import { useEffect, useRef } from "react";

/**
 * Scrolls a matching admin card into view and adds a temporary highlight
 * ring when `?highlight=<id>` is present. Attach the returned callback ref
 * to each list row's outer element using `ref={setRowRef(row.id)}`.
 */
export function useSearchHighlight(highlightId: string | undefined, ready: boolean) {
  const rowsRef = useRef<Map<string, HTMLElement>>(new Map());
  const appliedRef = useRef<string | null>(null);

  const setRowRef = (id: string) => (el: HTMLElement | null) => {
    if (el) rowsRef.current.set(id, el);
    else rowsRef.current.delete(id);
  };

  useEffect(() => {
    if (!highlightId || !ready) return;
    if (appliedRef.current === highlightId) return;
    // wait a tick for rows to mount
    const t = setTimeout(() => {
      const el = rowsRef.current.get(highlightId);
      if (!el) return;
      appliedRef.current = highlightId;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("search-highlight");
      window.setTimeout(() => el.classList.remove("search-highlight"), 7500);
    }, 120);
    return () => clearTimeout(t);
  }, [highlightId, ready]);

  return { setRowRef };
}
