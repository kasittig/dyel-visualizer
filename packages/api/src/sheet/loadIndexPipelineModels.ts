import type { AthleteContext, PipelineModel } from '@dyel/pipeline';
import { parseIndexCsv } from './parseIndexCsv';
import { buildPipelineModel } from '../pipeline/buildPipelineModel';

export type LifterPipelineResult =
  | { status: 'success'; name: string; url: string; model: PipelineModel }
  | { status: 'error'; name: string; url: string; message: string };

/**
 * Parses an index CSV, fetches each sheet concurrently, and pipelines them.
 * A single failure yields an error result without breaking the batch.
 */
export async function loadIndexPipelineModels(
  indexCsv: string,
  athlete: AthleteContext,
  fetchCsv: (url: string) => Promise<string>
): Promise<LifterPipelineResult[]> {
  return Promise.all(
    parseIndexCsv(indexCsv).map(async ({ name, url }): Promise<LifterPipelineResult> => {
      try {
        const content = await fetchCsv(url);
        const model = buildPipelineModel([{ name: `${name}.csv`, content }], athlete);
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
