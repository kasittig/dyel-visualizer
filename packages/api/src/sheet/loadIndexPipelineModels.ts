import type { AthleteContext, PipelineModel } from '@dyel/pipeline';
import { parseIndexCsv } from './parseIndexCsv';
import { buildPipelineModel } from '../pipeline/buildPipelineModel';

export type LifterPipelineResult =
  | { status: 'success'; name: string; url: string; model: PipelineModel }
  | { status: 'error'; name: string; url: string; message: string };

/**
 * Raw-input entry point: parses an index CSV (name/url pairs), fetches each linked sheet's CSV
 * via the injected fetcher, and runs each through the pipeline independently. A single lifter's
 * fetch/parse failure does not abort the batch — it surfaces as a `status: 'error'` result
 * alongside the other lifters' `status: 'success'` results.
 *
 * `fetchCsv` is injected because @dyel/api has no DOM/fetch dependency (see CLAUDE.md) —
 * packages/app supplies its existing `fetchSheetCsv`.
 */
export async function loadIndexPipelineModels(
  indexCsv: string,
  athlete: AthleteContext,
  fetchCsv: (url: string) => Promise<string>
): Promise<LifterPipelineResult[]> {
  const entries = parseIndexCsv(indexCsv);
  return Promise.all(
    entries.map(async ({ name, url }): Promise<LifterPipelineResult> => {
      try {
        const csv = await fetchCsv(url);
        const model = buildPipelineModel([{ name: `${name}.csv`, content: csv }], athlete);
        return { status: 'success', name, url, model };
      } catch (err) {
        return {
          status: 'error',
          name,
          url,
          message: err instanceof Error ? err.message : String(err),
        };
      }
    })
  );
}
