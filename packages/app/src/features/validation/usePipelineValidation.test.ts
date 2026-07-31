import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { PipelineResult } from '@dyel/api';
import { ParseError } from '@dyel/pipeline';
import { usePipelineValidation } from './usePipelineValidation';

vi.mock('../data-source', async () => {
  const actual = await vi.importActual<typeof import('../data-source')>('../data-source');
  return {
    ...actual,
    extractSheetRef: vi.fn(),
    sheetCsvUrl: vi.fn(),
    fetchSheetCsv: vi.fn(),
    buildRawInput: vi.fn(),
  };
});
vi.mock('@dyel/api', async () => ({
  ...(await vi.importActual<typeof import('@dyel/api')>('@dyel/api')),
  validatePipelineRun: vi.fn(),
  classifyPipelineVerdict: vi.fn(),
}));

const dataSourceModule = await import('../data-source');
const mockExtractSheetRef = vi.mocked(dataSourceModule.extractSheetRef);
const mockSheetCsvUrl = vi.mocked(dataSourceModule.sheetCsvUrl);
const mockFetchSheetCsv = vi.mocked(dataSourceModule.fetchSheetCsv);
const mockBuildRawInput = vi.mocked(dataSourceModule.buildRawInput);

const mockValidatePipelineRun = vi.mocked((await import('@dyel/api')).validatePipelineRun);
const mockClassifyPipelineVerdict = vi.mocked((await import('@dyel/api')).classifyPipelineVerdict);

const sheetRef = { id: 'sheet123', published: true };
const csvUrl = 'https://docs.google.com/spreadsheets/d/e/sheet123/pub?output=csv';
const url = 'https://docs.google.com/spreadsheets/d/sheet123/edit';

const mockPipelineResult = (overrides?: Partial<PipelineResult>): PipelineResult =>
  ({
    parseErrors: [],
    unknownExercises: [],
    unnormalized: [],
    model: { baseline: {}, variantFactor: {}, addlWtOffset: {} },
    diagnostics: { byCanonical: new Map(), allFindings: [] },
    athlete: { sex: 'M', bodyweight: 90 },
    ...overrides,
  }) as PipelineResult;

describe('usePipelineValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExtractSheetRef.mockReturnValue(sheetRef);
    mockSheetCsvUrl.mockReturnValue(csvUrl);
    mockFetchSheetCsv.mockResolvedValue('date,exercise,weight\n2024-01-01,squat,300');
    mockBuildRawInput.mockReturnValue({ name: 'test.csv', content: 'test' });
    mockValidatePipelineRun.mockReturnValue(mockPipelineResult());
    mockClassifyPipelineVerdict.mockReturnValue('ok');
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['text mode success', 'text', 'comp squat 1rm 300', 'ok'],
    ['text mode with warnings', 'text', 'comp bench 1rm 200', 'warning'],
    ['text mode with errors', 'text', 'bad data', 'error'],
  ] as const)('idle → success (sync): %s', async (_, mode, input, verdict) => {
    mockValidatePipelineRun.mockReturnValue(
      mockPipelineResult(
        verdict === 'error'
          ? { parseErrors: [new ParseError('test error')] }
          : verdict === 'warning'
            ? { unknownExercises: ['mystery lift'] }
            : {}
      )
    );
    mockClassifyPipelineVerdict.mockReturnValue(verdict);

    const { result } = renderHook(() => usePipelineValidation());
    expect(result.current.state.status).toBe('idle');

    result.current.validateText(input);
    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });
    expect(result.current.verdict).toBe(verdict);
  });

  it('idle → loading → success (URL mode)', async () => {
    mockValidatePipelineRun.mockReturnValue(mockPipelineResult());
    mockClassifyPipelineVerdict.mockReturnValue('ok');

    // Create a Promise we control - it won't resolve until we tell it to
    let resolveCSV: ((csv: string) => void) | null = null;
    const csvPromise = new Promise<string>((resolve) => {
      resolveCSV = resolve;
    });
    mockFetchSheetCsv.mockReturnValue(csvPromise);

    const { result } = renderHook(() => usePipelineValidation());
    expect(result.current.state.status).toBe('idle');

    result.current.validateUrl(url);
    await waitFor(() => {
      expect(result.current.state.status).toBe('loading');
    });

    // Now resolve the fetch and verify state becomes success
    if (resolveCSV) {
      resolveCSV('date,exercise,weight\n2024-01-01,squat,300');
    }

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });
    expect(result.current.verdict).toBe('ok');
  });

  it('idle → loading → fetch error', async () => {
    mockFetchSheetCsv.mockRejectedValue(new Error('Network timeout'));

    const { result } = renderHook(() => usePipelineValidation());
    result.current.validateUrl(url);

    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });
    expect(result.current.state.status === 'error' && result.current.state.message).toBe(
      'Network timeout'
    );
  });

  it('idle → error: invalid sheet URL', async () => {
    mockExtractSheetRef.mockReturnValue(null);

    const { result } = renderHook(() => usePipelineValidation());
    result.current.validateUrl('https://not-a-sheet');

    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });
    expect(result.current.state.status === 'error' && result.current.state.message).toContain(
      "doesn't look like a Google Sheet"
    );
  });

  it('idle → error: validation throws', async () => {
    mockValidatePipelineRun.mockImplementation(() => {
      throw new Error('Parse failure');
    });

    const { result } = renderHook(() => usePipelineValidation());
    result.current.validateText('bad\ndata\nformat');

    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });
    expect(result.current.state.status === 'error' && result.current.state.message).toContain(
      'Parse failure'
    );
  });

  it('validateText("") returns to idle without error state', async () => {
    mockValidatePipelineRun.mockReturnValue(mockPipelineResult({ unknownExercises: ['x'] }));
    mockClassifyPipelineVerdict.mockReturnValue('warning');

    const { result } = renderHook(() => usePipelineValidation());

    // Set to success state first
    result.current.validateText('some data');
    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });
    expect(result.current.verdict).toBe('warning');

    // validateText('') should reset to idle
    result.current.validateText('');
    await waitFor(() => {
      expect(result.current.state.status).toBe('idle');
    });
    expect(result.current.verdict).toBeNull();
  });

  it('mode-switching: URL in-flight → validateText interrupts', async () => {
    // Mock fetchSheetCsv to never resolve, simulating an in-flight request
    mockFetchSheetCsv.mockReturnValue(new Promise(() => {}));
    mockValidatePipelineRun.mockReturnValue(mockPipelineResult());
    mockClassifyPipelineVerdict.mockReturnValue('ok');

    const { result } = renderHook(() => usePipelineValidation());

    // Start URL validation
    result.current.validateUrl(url);
    await waitFor(() => {
      expect(result.current.state.status).toBe('loading');
    });

    // Switch to text mode before URL completes
    result.current.validateText('comp squat 1rm 300');

    // Text mode should take effect immediately
    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });
    expect(result.current.verdict).toBe('ok');
  });

  it('cancels previous fetch on new validateUrl call', async () => {
    let resolveFirst: ((v: string) => void) | null = null;
    mockFetchSheetCsv.mockReturnValueOnce(
      new Promise((r) => {
        resolveFirst = r;
      })
    );
    mockValidatePipelineRun.mockReturnValueOnce(mockPipelineResult({ unknownExercises: ['old'] }));

    const { result } = renderHook(() => usePipelineValidation());

    // Start first URL validation
    result.current.validateUrl(url);
    await waitFor(() => {
      expect(result.current.state.status).toBe('loading');
    });

    // Start second URL validation before first completes
    mockFetchSheetCsv.mockResolvedValueOnce('new csv data');
    mockValidatePipelineRun.mockReturnValueOnce(mockPipelineResult());
    result.current.validateUrl(url);

    // Second fetch should complete and overwrite first
    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });

    // Resolve the first fetch (which was aborted)
    if (resolveFirst) {
      resolveFirst('old csv data');
    }

    // State should not change because the fetch was aborted
    expect(result.current.state.status).toBe('success');
  });
});
