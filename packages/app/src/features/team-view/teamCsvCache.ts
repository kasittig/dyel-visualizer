import { fetchSheetCsv } from '../data-source';

// Read-through/write-through localStorage cache for CSV text fetched by useTeamViewData, keyed by
// sheet URL. Unlike usePipelineOrchestration's single-sheet cache (sheetCacheUtils.ts, which
// caches a built RawInput[] with Date round-tripping), this cache stores raw CSV text for
// potentially many URLs (the index sheet plus every lifter's sheet) — CSV text is trivially
// JSON-safe and cheap to re-parse, so there's no need to cache anything past the fetch itself.
// This means /team and /team/summary (which share useTeamViewData) don't re-download every
// lifter's sheet on every mount/navigation.
const CACHE_KEY = 'dyel:teamCsvCache';
const DEFAULT_MAX_AGE_MS = 15 * 60 * 1000;
const MAX_CACHE_ENTRIES = 50;

interface CsvCacheEntry {
  csv: string;
  fetchedAt: number;
}

interface CsvCacheOptions {
  forceRefresh?: boolean;
  maxAgeMs?: number;
  now?: number;
}

function readCsvCache(): Record<string, CsvCacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, CsvCacheEntry] =>
          typeof entry[1] === 'object' &&
          entry[1] !== null &&
          typeof (entry[1] as CsvCacheEntry).csv === 'string' &&
          typeof (entry[1] as CsvCacheEntry).fetchedAt === 'number'
      )
    );
  } catch {
    return {};
  }
}

function writeCsvCacheEntry(url: string, entry: CsvCacheEntry): void {
  try {
    const entries = Object.entries({ ...readCsvCache(), [url]: entry })
      .sort(([, a], [, b]) => b.fetchedAt - a.fetchedAt)
      .slice(0, MAX_CACHE_ENTRIES);
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Quota exceeded or storage unavailable (e.g. private browsing): ignore, cache is best-effort.
  }
}

export function cachedFetchSheetCsv(
  url: string,
  signal?: AbortSignal,
  options: CsvCacheOptions = {}
): Promise<string> {
  const now = options.now ?? Date.now();
  const cached = readCsvCache()[url];
  if (
    !options.forceRefresh &&
    cached &&
    now - cached.fetchedAt <= (options.maxAgeMs ?? DEFAULT_MAX_AGE_MS)
  ) {
    return Promise.resolve(cached.csv);
  }
  return fetchSheetCsv(url, signal).then((csv) => {
    writeCsvCacheEntry(url, { csv, fetchedAt: now });
    return csv;
  });
}
