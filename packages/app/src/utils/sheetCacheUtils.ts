import type { ConjugateDataPair } from '@dyel/core';

export interface CachedSheetData {
  sheetKey: string;
  pairs: ConjugateDataPair[];
}

/** JSON-safe wire format: `TrainingSession.date` becomes an ISO string. */
interface SerializedCachedSheetData {
  sheetKey: string;
  pairs: [ConjugateDataPair[0], Omit<ConjugateDataPair[1], 'date'> & { date: string }][];
}

export function serializeSheetCache(data: CachedSheetData): string {
  const serialized: SerializedCachedSheetData = {
    sheetKey: data.sheetKey,
    pairs: data.pairs.map(([exercise, session]) => [
      exercise,
      { ...session, date: session.date.toISOString() },
    ]),
  };
  return JSON.stringify(serialized);
}

export function deserializeSheetCache(raw: string): CachedSheetData {
  const parsed: unknown = JSON.parse(raw);
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as SerializedCachedSheetData).sheetKey !== 'string' ||
    !Array.isArray((parsed as SerializedCachedSheetData).pairs)
  ) {
    throw new Error('Malformed cached sheet data');
  }
  const { sheetKey, pairs } = parsed as SerializedCachedSheetData;
  return {
    sheetKey,
    pairs: pairs.map(([exercise, session]) => [
      exercise,
      { ...session, date: new Date(session.date) },
    ]),
  };
}
