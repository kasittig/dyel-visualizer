import { parseIndexCsv, type IndexEntry } from '../../utils/parseIndexCsv';
import { publishedCsvUrl } from '../../utils/sheetFetch';
import { useCsvResource } from '../infra/useCsvResource';

export type { IndexEntry };

const INDEX_SHEET_ID =
  '2PACX-1vTmiDdFL3yDqnm-sK2KvbljacO6Rq9KltzzoOJY1aFu6B2tWPejLDH4XqKW0su0j1IFSI7iA4IGmGbU';

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
