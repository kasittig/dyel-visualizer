import { parseIndexCsv, type IndexEntry } from '@dyel/api';
import { publishedCsvUrl, INDEX_SHEET_ID } from '../data-source';
import { useCsvResource } from '../../shared/hooks/useCsvResource';

export type { IndexEntry };

type IndexDataState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; entries: IndexEntry[] };

export function useIndexData(): IndexDataState {
  const resource = useCsvResource(publishedCsvUrl(INDEX_SHEET_ID), parseIndexCsv);
  if (resource.status === 'success') {
    return { status: 'success', entries: resource.data };
  }
  if (resource.status === 'error') {
    return resource;
  }
  return { status: 'loading' };
}
