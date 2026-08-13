import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";

/**
 * React state synchronised to localStorage. Hydrates lazily with validation;
 * every change is written back on the next effect run.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  validate?: (raw: unknown) => T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof localStorage === "undefined") return initialValue;
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return initialValue;
      const parsed: unknown = JSON.parse(raw);
      return validate ? validate(parsed) : (parsed as T);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable — non-fatal, in-memory state still works.
    }
  }, [key, value]);

  return [value, setValue];
}
