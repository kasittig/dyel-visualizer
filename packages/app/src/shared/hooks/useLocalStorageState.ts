import { useState, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';

/**
 * `useState` that lazily reads its initial value from `localStorage` and persists every
 * update back to it. Tolerates unavailable or corrupt storage (quota errors, private
 * browsing, malformed JSON) by silently falling back to `initialValue`. Pass `serialize`/
 * `deserialize` for values that aren't JSON-safe as-is (e.g. containing `Date`s).
 */
export function useLocalStorageState<T>(
  key: string,
  initialValue: T | (() => T),
  options?: { serialize?: (value: T) => string; deserialize?: (raw: string) => T }
): [T, Dispatch<SetStateAction<T>>] {
  const serialize = options?.serialize ?? JSON.stringify;
  const deserialize = options?.deserialize ?? (JSON.parse as (raw: string) => T);

  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        return deserialize(raw);
      }
    } catch {
      // Corrupt JSON or storage unavailable: fall through to initialValue.
    }
    return initialValue instanceof Function ? initialValue() : initialValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, serialize(value));
    } catch {
      // Quota exceeded or storage unavailable (e.g. private browsing): ignore.
    }
    // `serialize`/`deserialize` are expected to be stable (module-level or memoized by the
    // caller); only `key`/`value` changes should trigger a write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, value]);

  return [value, setValue];
}
