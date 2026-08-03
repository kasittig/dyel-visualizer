import { useCallback, useSyncExternalStore } from 'react';

export const MOBILE_LAYOUT_QUERY = '(max-width: 640px)';
export const TOUCH_EXPLORATION_QUERY = '(hover: none), (pointer: coarse)';

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (typeof window.matchMedia !== 'function') {
        return () => undefined;
      }
      const media = window.matchMedia(query);
      media.addEventListener('change', callback);
      return () => media.removeEventListener('change', callback);
    },
    [query]
  );
  const snapshot = useCallback(() => window.matchMedia?.(query).matches ?? false, [query]);

  return useSyncExternalStore(subscribe, snapshot, () => false);
}
