import { useMemo, useState } from 'react';
import { generateDiagnostics, parseModifierEffectsCsv } from '@dyel/core';
import type { DeadliftStancePreference, EffectEnum } from '@dyel/core';
import type { ConjugateDataPair } from '../hooks/useConjugateData';
import { useCsvResource } from '../hooks/useCsvResource';
import { SHEETS_BASE } from '../utils/sheetFetch';

const MODIFIER_EFFECTS_URL = `${SHEETS_BASE}/d/e/2PACX-1vTmiDdFL3yDqnm-sK2KvbljacO6Rq9KltzzoOJY1aFu6B2tWPejLDH4XqKW0su0j1IFSI7iA4IGmGbU/pub?gid=266804592&single=true&output=csv`;

function formatEffect(effect: string): string {
  return effect
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const cellStyle: React.CSSProperties = { padding: '0.5rem 0.75rem' };
const monoStyle: React.CSSProperties = {
  ...cellStyle,
  fontFamily: 'var(--mono)',
  textAlign: 'right',
};

function EffectPill({ effect, color }: { effect: EffectEnum; color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        marginRight: '0.4rem',
        marginBottom: '0.25rem',
        padding: '0.15rem 0.5rem',
        borderRadius: '0.75rem',
        fontSize: '0.8rem',
        color,
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
      }}
    >
      {formatEffect(effect)}
    </span>
  );
}

export function DiagnosticsPanel({ rows }: { rows: ConjugateDataPair[] }) {
  const [deadliftStance, setDeadliftStance] = useState<DeadliftStancePreference | undefined>(
    undefined
  );

  const hasDeadlift = useMemo(() => rows.some(([ex]) => ex.type === 'deadlift'), [rows]);

  const effectsResource = useCsvResource(MODIFIER_EFFECTS_URL, parseModifierEffectsCsv);

  const results = useMemo(
    () =>
      generateDiagnostics(rows, {
        deadliftStance,
        modifierEffects:
          effectsResource.status === 'success' && effectsResource.data !== null
            ? effectsResource.data
            : undefined,
      }),
    [rows, deadliftStance, effectsResource]
  );

  const effectsSummary = useMemo(() => {
    const counts = {
      weakness: new Map<EffectEnum, number>(),
      optimal: new Map<EffectEnum, number>(),
      overtrained: new Map<EffectEnum, number>(),
    };
    for (const r of results) {
      const map = counts[r.status];
      for (const e of r.effects) {
        map.set(e, (map.get(e) ?? 0) + 1);
      }
    }
    const THRESHOLD = 2;
    const filter = (m: Map<EffectEnum, number>) =>
      [...m.entries()].filter(([, n]) => n >= THRESHOLD).map(([e]) => e);
    return {
      weaknesses: filter(counts.weakness),
      onTarget: filter(counts.optimal),
      overtrained: filter(counts.overtrained),
    };
  }, [results]);

  if (results.length === 0 && !hasDeadlift) {
    return null;
  }

  const hasSummary =
    effectsSummary.weaknesses.length > 0 ||
    effectsSummary.onTarget.length > 0 ||
    effectsSummary.overtrained.length > 0;

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <h2>Diagnostics</h2>
      {hasDeadlift && (
        <div style={{ marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--text)' }}>
          <span>Primary pull: </span>
          {(['conventional', 'sumo'] as const).map((s) => (
            <label key={s} style={{ marginRight: '1rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="deadlift-stance"
                checked={(deadliftStance ?? 'conventional') === s}
                onChange={() => setDeadliftStance(s)}
                style={{ marginRight: '0.3rem' }}
              />
              {s[0].toUpperCase() + s.slice(1)}
            </label>
          ))}
        </div>
      )}
      {hasSummary && (
        <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }}>
          {effectsSummary.weaknesses.length > 0 && (
            <div style={{ marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--text)', marginRight: '0.5rem' }}>Weakness areas:</span>
              {effectsSummary.weaknesses.map((e) => (
                <EffectPill key={e} effect={e} color="var(--danger)" />
              ))}
            </div>
          )}
          {effectsSummary.onTarget.length > 0 && (
            <div style={{ marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--text)', marginRight: '0.5rem' }}>On target:</span>
              {effectsSummary.onTarget.map((e) => (
                <EffectPill key={e} effect={e} color="var(--success)" />
              ))}
            </div>
          )}
          {effectsSummary.overtrained.length > 0 && (
            <div style={{ marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--text)', marginRight: '0.5rem' }}>Overtrained:</span>
              {effectsSummary.overtrained.map((e) => (
                <EffectPill key={e} effect={e} color="var(--warning)" />
              ))}
            </div>
          )}
        </div>
      )}
      {results.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--border)',
                color: 'var(--text)',
                fontWeight: 600,
              }}
            >
              <th style={{ ...cellStyle, textAlign: 'left' }}>Variation</th>
              <th style={{ ...monoStyle }}>Avg Index</th>
              <th style={{ ...monoStyle }}>Baseline Range</th>
              <th style={{ ...cellStyle, textAlign: 'left' }}>Diagnostic</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const { status } = r;
              const diagnosticColor =
                status === 'optimal'
                  ? 'var(--success)'
                  : status === 'overtrained'
                    ? 'var(--warning)'
                    : 'var(--danger)';
              const diagnosticLabel =
                status === 'optimal'
                  ? 'Optimal'
                  : status === 'overtrained'
                    ? 'Overtrained'
                    : 'Weakness';
              return (
                <tr key={r.name} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={cellStyle}>{r.name}</td>
                  <td style={monoStyle}>{r.averageIndex.toFixed(1)}%</td>
                  <td style={monoStyle}>{r.expectedBaseline}</td>
                  <td
                    style={{
                      ...cellStyle,
                      color: diagnosticColor,
                      fontWeight: 600,
                    }}
                  >
                    {diagnosticLabel}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
