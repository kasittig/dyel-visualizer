export const LINE_COLORS = [
  'var(--accent)',
  'var(--chart-1-cyan)',
  'var(--chart-2-pink)',
  'var(--chart-3-lime)',
  'var(--chart-4-purple)',
  'var(--chart-5-yellow)',
  'var(--chart-6-orange)',
  'var(--chart-7-magenta)',
  'var(--chart-8-teal)',
  'var(--chart-9-indigo)',
  'var(--chart-10-coral)',
];

export function formatDate(str: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(str) ? new Date(str + 'T00:00:00') : new Date(str);
  return isNaN(d.getTime())
    ? str
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}
