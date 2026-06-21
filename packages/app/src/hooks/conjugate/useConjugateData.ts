import { parseConjugateData } from '@dyel/core';
import type { ConjugateDataPair } from '@dyel/core';
import type { SheetRef } from '../../utils/appUtils';
import { sheetCsvUrl } from '../../utils/sheetFetch';
import { useCsvResource } from '../infra/useCsvResource';

export type { ConjugateDataPair } from '@dyel/core';

type ConjugateDataState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; pairs: ConjugateDataPair[] };

export function useConjugateData(sheetRef: SheetRef | null, gid = '0'): ConjugateDataState {
  const url = sheetRef ? sheetCsvUrl(sheetRef, gid) : null;
  const resource = useCsvResource(url, parseConjugateData);
  return resource.status === 'success' ? { status: 'success', pairs: resource.data } : resource;
}
