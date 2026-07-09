import type { RawInput } from '@dyel/pipeline';

export interface CachedSheetData {
  sheetKey: string;
  raw: RawInput[];
}

export function serializeSheetCache(data: CachedSheetData): string {
  return JSON.stringify(data);
}

export function deserializeSheetCache(raw: string): CachedSheetData {
  const parsed: unknown = JSON.parse(raw);
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as CachedSheetData).sheetKey !== 'string' ||
    !Array.isArray((parsed as CachedSheetData).raw)
  ) {
    throw new Error('Malformed cached sheet data');
  }
  return parsed as CachedSheetData;
}
