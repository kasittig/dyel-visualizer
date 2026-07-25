import { fetchSheetCsv } from '../data-source';

// Read-through/write-through localStorage cache for CSV text fetched by useTeamViewData, keyed by
// sheet URL. Unlike usePipelineOrchestration's single-sheet cache (sheetCacheUtils.ts, which
// caches a built RawInput[] with Date round-tripping), this cache stores raw CSV text for
// potentially many URLs (the index sheet plus every lifter's sheet) — CSV text is trivially
// JSON-safe and cheap to re-parse, so there's no need to cache anything past the fetch itself.
// This means /team and /team/summary (which share useTeamViewData) don't re-download every
// lifter's sheet on every mount/navigation.
const CACHE_KEY = 'dyel:teamCsvCache';

function readCsvCache(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeCsvCacheEntry(url: string, csv: string): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...readCsvCache(), [url]: csv }));
  } catch {
    // Quota exceeded or storage unavailable (e.g. private browsing): ignore, cache is best-effort.
  }
}

export function cachedFetchSheetCsv(url: string, signal?: AbortSignal): Promise<string> {
  const cached = readCsvCache()[url];
  if (cached !== undefined) {
    return Promise.resolve(cached);
  }
  return fetchSheetCsv(url, signal).then((csv) => {
    writeCsvCacheEntry(url, csv);
    return csv;
  });
}
