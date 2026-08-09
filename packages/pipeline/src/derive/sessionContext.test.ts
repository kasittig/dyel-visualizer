import { describe, expect, it } from 'vitest';
import type { DayContext } from './dayContext';
import { extractSessionContexts, type SessionContext } from './sessionContext';

const day = (notes: string[]): DayContext => ({
  date: Date.UTC(2026, 0, 2),
  bodyweightKg: null,
  notes,
  findings: [],
});

describe('extractSessionContexts', () => {
  it.each<[string, string, SessionContext, string]>([
    ['deload alias', 'Starting a de-load week', 'deload', 'de-load'],
    ['deload casing', 'DELOADING today', 'deload', 'DELOADING'],
    ['illness alias', 'Feeling under the weather', 'illness', 'under the weather'],
    ['illness casing', 'Was SICK yesterday', 'illness', 'SICK'],
    ['poor sleep alias', 'I slept poorly', 'poor-sleep', 'slept poorly'],
    ['poor sleep casing', 'BAD SLEEP last night', 'poor-sleep', 'BAD SLEEP'],
    ['positive readiness alias', 'Warmups felt good', 'positive-readiness', 'felt good'],
    ['positive readiness casing', 'FELT GREAT today', 'positive-readiness', 'FELT GREAT'],
  ])('extracts %s', (_, sourceText, context, matchedText) => {
    expect(extractSessionContexts([day([sourceText])])[0].findings).toEqual([
      { type: 'session-context', context, sourceText, matchedText },
    ]);
  });

  it.each([
    ['unrecognized note', 'Left knee 3/10'],
    ['negated illness', 'I am not sick'],
    ['negated illness state', 'I am not feeling sick'],
    ['contracted negation', "I wasn't ill"],
    ['negated readiness', 'I did not feel great'],
    ['substring only', 'uploaded loading plan'],
  ])('ignores %s', (_, sourceText) => {
    const input = day([sourceText]);

    expect(extractSessionContexts([input])).toEqual([input]);
  });

  it('preserves notes and existing findings while finding each explicit context', () => {
    const input: DayContext = {
      ...day(['poor sleep, but felt great once warm', 'unrelated note']),
      bodyweightKg: 80,
      findings: [{ type: 'conflicting-bodyweights', valuesKg: [80, 81] }],
    };

    expect(extractSessionContexts([input])).toEqual([
      {
        ...input,
        findings: [
          input.findings[0],
          {
            type: 'session-context',
            context: 'poor-sleep',
            sourceText: input.notes[0],
            matchedText: 'poor sleep',
          },
          {
            type: 'session-context',
            context: 'positive-readiness',
            sourceText: input.notes[0],
            matchedText: 'felt great',
          },
        ],
      },
    ]);
    expect(input.notes).toEqual(['poor sleep, but felt great once warm', 'unrelated note']);
  });
});
