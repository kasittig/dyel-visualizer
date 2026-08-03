import { useSyncExternalStore } from 'react';

const MOBILE_CHART_QUERY = '(max-width: 639px)';

const subscribe = (callback: () => void) => {
  if (typeof window.matchMedia !== 'function') {
    return () => undefined;
  }
  const query = window.matchMedia(MOBILE_CHART_QUERY);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
};

export const useMobileChart = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(MOBILE_CHART_QUERY).matches ?? false,
    () => false
  );

export function formatMobileChartDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
