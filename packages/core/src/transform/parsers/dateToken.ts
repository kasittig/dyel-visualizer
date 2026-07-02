const MONTH_NAMES = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';
const MONTH_INDEX: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const ISO_RE = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/;
const SLASH_RE = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;
const MONTH_DAY_RE = new RegExp(
  `\\b(${MONTH_NAMES})[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?\\b`,
  'i'
);
const DAY_MONTH_RE = new RegExp(
  `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_NAMES})[a-z]*\\.?(?:,?\\s*(\\d{4}))?\\b`,
  'i'
);

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toIsoString(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

function currentYear(): number {
  return new Date().getFullYear();
}

/**
 * Finds the first date-shaped substring anywhere in a pasted text line and normalizes it to
 * `YYYY-MM-DD`, so callers don't depend on native `Date` parsing quirks. Tries a bounded set of
 * shapes (ISO, `M/D[/YYYY]`, `Mon D[, YYYY]`, `D Mon[, YYYY]`) rather than full natural-language
 * parsing, since `@dyel/core` ships dependency-free. A missing year defaults to the current
 * calendar year, matching `parseSessionDate`'s existing "default missing info to now" behavior.
 *
 * Returns the line with the matched substring removed as `remainder`; if nothing matches,
 * `remainder` is the original line unchanged and `dateStr` is `null`.
 */
export function extractDateToken(line: string): { dateStr: string | null; remainder: string } {
  const isoMatch = ISO_RE.exec(line);
  if (isoMatch) {
    const [full, year, month, day] = isoMatch;
    const dateStr = toIsoString(Number(year), Number(month), Number(day));
    if (dateStr) {
      return { dateStr, remainder: removeMatch(line, full) };
    }
  }

  const slashMatch = SLASH_RE.exec(line);
  if (slashMatch) {
    const [full, month, day, yearRaw] = slashMatch;
    const year = yearRaw ? normalizeYear(yearRaw) : currentYear();
    const dateStr = toIsoString(year, Number(month), Number(day));
    if (dateStr) {
      return { dateStr, remainder: removeMatch(line, full) };
    }
  }

  const monthDayMatch = MONTH_DAY_RE.exec(line);
  if (monthDayMatch) {
    const [full, month, day, year] = monthDayMatch;
    const dateStr = toIsoString(
      year ? Number(year) : currentYear(),
      MONTH_INDEX[month.toLowerCase()],
      Number(day)
    );
    if (dateStr) {
      return { dateStr, remainder: removeMatch(line, full) };
    }
  }

  const dayMonthMatch = DAY_MONTH_RE.exec(line);
  if (dayMonthMatch) {
    const [full, day, month, year] = dayMonthMatch;
    const dateStr = toIsoString(
      year ? Number(year) : currentYear(),
      MONTH_INDEX[month.toLowerCase()],
      Number(day)
    );
    if (dateStr) {
      return { dateStr, remainder: removeMatch(line, full) };
    }
  }

  return { dateStr: null, remainder: line };
}

function normalizeYear(yearRaw: string): number {
  const year = Number(yearRaw);
  return yearRaw.length === 2 ? 2000 + year : year;
}

function removeMatch(line: string, match: string): string {
  return line.replace(match, ' ');
}
