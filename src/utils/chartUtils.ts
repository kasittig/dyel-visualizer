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
  const d = new Date(str);
  return isNaN(d.getTime())
    ? str
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
}
