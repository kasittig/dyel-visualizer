export const LINE_COLORS = [
  "var(--accent)",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
  "#84cc16",
  "#14b8a6",
];

export function formatDate(str: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(str) ? new Date(str + "T00:00:00") : new Date(str);
  return isNaN(d.getTime())
    ? str
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
}
