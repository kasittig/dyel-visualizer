import { emptyFilters } from "@dyel/core";
import type { FilterState } from "@dyel/core";
import type { ConjugateDataPair } from "../hooks/useConjugateData";

export type SheetRef = { id: string; published: boolean };
export type LiftType = "squat" | "bench" | "deadlift" | "accessory";
export type PageTab = LiftType | "calculator" | "sigma";

export const LIFT_TABS: LiftType[] = ["squat", "bench", "deadlift", "accessory"];

export const MAIN_TABS = [
  { id: "squat" as LiftType, label: "Squat" },
  { id: "bench" as LiftType, label: "Bench" },
  { id: "deadlift" as LiftType, label: "Deadlift" },
];

export const ACCESSORY_TAB = { id: "accessory" as LiftType, label: "Accessories" };

export const EXAMPLE_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRPu7N-kHeJeUVhjbL0Q9xDLXEPeC3GsvnAE4HXj2-q9pIjM25BxUwUVxHYqxVR-9uQvW9MKM4l9xNI/pub?gid=1297658251&single=true&output=csv";
export const EXAMPLE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1Uwfzrb4wjYcBisTPdNEUGJyvfKRLwpN0tm8ciRPHB0c/edit?gid=1297658251#gid=1297658251";
export const EXAMPLE_VISUALIZER_URL = `?sheet=${encodeURIComponent(EXAMPLE_CSV_URL)}`;

export type TabState = {
  filters: FilterState;
  baselineName?: string;
  targetName?: string;
};

export function toggleInSet<T>(set: Set<T>, item: T): Set<T> {
  const next = new Set(set);
  if (next.has(item)) next.delete(item);
  else next.add(item);
  return next;
}

export function defaultBaselineName(rows: ConjugateDataPair[]): string | null {
  let first: string | null = null;
  const lastDate = new Map<string, Date>();
  const lastE1RM = new Map<string, number>();
  for (const [ex, session] of rows) {
    if (first === null) first = ex.displayName;
    const prev = lastDate.get(ex.displayName);
    if (!prev || session.date > prev) {
      lastDate.set(ex.displayName, session.date);
      lastE1RM.set(ex.displayName, session.e1rm);
    } else if (session.date.getTime() === prev.getTime()) {
      const prevE1RM = lastE1RM.get(ex.displayName) ?? 0;
      if (session.e1rm > prevE1RM) lastE1RM.set(ex.displayName, session.e1rm);
    }
  }

  let bestName: string | null = null;
  let bestDate: Date | null = null;
  let bestE1RM = -Infinity;
  for (const [name, date] of lastDate) {
    const e1rm = lastE1RM.get(name) ?? 0;
    if (
      !bestDate ||
      date > bestDate ||
      (date.getTime() === bestDate.getTime() && e1rm > bestE1RM)
    ) {
      bestName = name;
      bestDate = date;
      bestE1RM = e1rm;
    }
  }
  return bestName ?? first;
}

export function defaultTargetName(rows: ConjugateDataPair[]): string | null {
  let first: string | null = null;
  const seen = new Set<string>();
  for (const [ex] of rows) {
    if (seen.has(ex.displayName)) continue;
    seen.add(ex.displayName);
    if (first === null) first = ex.displayName;
    if (
      ex.bar === "standard" &&
      ex.stance === "competition" &&
      ex.equipment === null &&
      ex.addlWts.length === 0
    )
      return ex.displayName;
  }
  return first;
}

export function extractSheetRef(input: string): SheetRef | null {
  // Published web URL: .../d/e/PUBLISHED_ID/pubhtml (may have /u/N/ before /d/)
  const publishedMatch = input.match(/\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (publishedMatch) return { id: publishedMatch[1], published: true };
  // Edit/view URL: .../d/SHEET_ID/
  const regularMatch = input.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (regularMatch) return { id: regularMatch[1], published: false };
  // Bare ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(input.trim())) return { id: input.trim(), published: false };
  return null;
}

export function initialTabState(): Record<LiftType, TabState> {
  return Object.fromEntries(LIFT_TABS.map((t) => [t, { filters: emptyFilters() }])) as Record<
    LiftType,
    TabState
  >;
}
