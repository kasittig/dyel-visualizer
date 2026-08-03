import type { PipelineModel, PipelinePointStore, Point, VariantAssessment } from '@dyel/api';

type DiagnosticsReport = PipelineModel['diagnostics'];

/**
 * Factory for creating a single VariantAssessment with sensible defaults.
 * Use shallow overrides for realistic test scenarios.
 */
export const variantAssessmentMock = (
  overrides?: Partial<VariantAssessment>
): VariantAssessment => ({
  canonical: 'squat',
  displayName: 'squat',
  lift: 'lift:squat',
  expectedE1rmKg: 100,
  actualE1rmKg: 102,
  baselineE1rmKg: 100,
  expectedFactor: 1,
  latestAt: Date.UTC(2026, 0, 10),
  previousE1rmKg: 100,
  observationCount: 4,
  comparisonCount: null,
  ratio: 1.02,
  status: 'optimal',
  fittedStatus: 'optimal',
  averageIndex: 100,
  expectedBaseline: '90-110%',
  staleDays: 3,
  effects: ['hypertrophy'],
  addlWtOffset: { offsetKg: 5, n: 10 },
  isCompLift: false,
  ...overrides,
});

/**
 * Factory for creating a DiagnosticsReport with sensible defaults.
 * Use shallow overrides to customize variants, weaknesses, and unassessed.
 */
export const diagnosticsMock = (overrides?: Partial<DiagnosticsReport>): DiagnosticsReport => ({
  variants: [],
  weaknesses: [],
  unassessed: [],
  ...overrides,
});

export const pointStoreMock = (
  canonical: Map<string, Point[]> = new Map(),
  label = canonical,
  adjustedCanonical = canonical,
  adjustedLabel = label
): PipelinePointStore => ({
  get: (deriverId, options) =>
    (options?.adjusted
      ? options.groupBy === 'label'
        ? adjustedLabel
        : adjustedCanonical
      : options?.groupBy === 'label'
        ? label
        : canonical
    ).get(deriverId) ?? [],
  has: (deriverId) => canonical.has(deriverId),
});

/**
 * Factory for creating a full PipelineModel mock.
 * Useful for tests that need to mock the complete model shape.
 */
export const pipelineModelMock = (overrides?: Partial<PipelineModel>): PipelineModel => ({
  model: { baseline: {}, variantFactor: {}, addlWtOffset: {}, fittedAt: Date.now() },
  diagnostics: { variants: [], weaknesses: [], unassessed: [] },
  unknownExercises: [],
  unnormalized: [],
  parseErrors: [],
  points: pointStoreMock(),
  tagged: [],
  athlete: { sex: 'M', bodyweight: 90 },
  ...overrides,
});
