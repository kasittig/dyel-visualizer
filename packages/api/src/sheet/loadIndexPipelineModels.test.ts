import { describe, it, expect, vi } from 'vitest';
import { loadIndexPipelineModels } from './loadIndexPipelineModels';
import type { AthleteContext } from '@dyel/pipeline';

const athlete: AthleteContext = { sex: 'M', bodyweight: 90, deadliftStance: 'sumo' };

const aliceCsv = 'Date,Exercise,Reps,Weight (lbs),Sets,RPE\n2026-01-01,Squat,5,225,3,';
const bobCsv = 'Date,Exercise,Reps,Weight (lbs),Sets,RPE\n2026-01-02,Bench,8,185,4,';
const indexCsv = 'name,url\nAlice,https://example.com/alice\nBob,https://example.com/bob';

describe('loadIndexPipelineModels', () => {
  it('fetches and pipelines every entry in the index', async () => {
    const csvByUrl: Record<string, string> = {
      'https://example.com/alice': aliceCsv,
      'https://example.com/bob': bobCsv,
    };
    const fetchCsv = vi.fn(async (url: string) => csvByUrl[url]);

    const results = await loadIndexPipelineModels(indexCsv, athlete, fetchCsv);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      status: 'success',
      name: 'Alice',
      url: 'https://example.com/alice',
    });
    expect(results[1]).toMatchObject({
      status: 'success',
      name: 'Bob',
      url: 'https://example.com/bob',
    });
    expect(results[0].status === 'success' && results[0].model.tagged).toHaveLength(1);
    expect(results[1].status === 'success' && results[1].model.tagged).toHaveLength(1);
  });

  it('isolates a per-lifter fetch failure without aborting the batch', async () => {
    const fetchCsv = vi.fn(async (url: string) => {
      if (url === 'https://example.com/bob') {
        throw new Error('network error');
      }
      return aliceCsv;
    });

    const results = await loadIndexPipelineModels(indexCsv, athlete, fetchCsv);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('success');
    expect(results[1]).toMatchObject({ status: 'error', name: 'Bob', message: 'network error' });
  });

  it('returns an empty array without calling the fetcher when the index is empty', async () => {
    const fetchCsv = vi.fn();

    const results = await loadIndexPipelineModels('name,url', athlete, fetchCsv);

    expect(results).toEqual([]);
    expect(fetchCsv).not.toHaveBeenCalled();
  });
});
