import type { DayContext } from './dayContext';

export type SessionContext = 'deload' | 'illness' | 'poor-sleep' | 'positive-readiness';

export interface SessionContextFinding {
  type: 'session-context';
  context: SessionContext;
  sourceText: string;
  matchedText: string;
}

const CONTEXT_PATTERNS: ReadonlyArray<readonly [SessionContext, RegExp]> = [
  ['deload', /\b(?:de[- ]?load(?:ing)?|recovery week)\b/giu],
  ['illness', /\b(?:sick|ill(?:ness)?|under the weather)\b/giu],
  ['poor-sleep', /\b(?:poor sleep|bad sleep|slept poorly|did(?:n't| not) sleep well)\b/giu],
  [
    'positive-readiness',
    /\b(?:felt great|feeling great|felt good|feeling good|well[- ]rested)\b/giu,
  ],
];

const isNegated = (sourceText: string, matchIndex: number) =>
  /\b(?:not|never|wasn't|was not|isn't|is not|don't feel|do not feel)\s+(?:feeling\s+)?(?:very\s+)?$/iu.test(
    sourceText.slice(Math.max(0, matchIndex - 24), matchIndex)
  );

/** Adds deterministic, explicitly stated session context without changing source notes. */
export function extractSessionContexts(dayContexts: DayContext[]): DayContext[] {
  return dayContexts.map((dayContext) => {
    const findings: SessionContextFinding[] = [];

    for (const sourceText of dayContext.notes) {
      for (const [context, pattern] of CONTEXT_PATTERNS) {
        for (const match of sourceText.matchAll(pattern)) {
          if (!isNegated(sourceText, match.index)) {
            findings.push({
              type: 'session-context',
              context,
              sourceText,
              matchedText: match[0],
            });
          }
        }
      }
    }

    return findings.length
      ? { ...dayContext, findings: [...dayContext.findings, ...findings] }
      : dayContext;
  });
}
