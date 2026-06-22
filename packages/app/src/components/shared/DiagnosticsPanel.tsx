import { useMemo } from 'react';
import { generateDiagnostics } from '@dyel/core';
import type { DeadliftStancePreference } from '@dyel/core';
import type { ConjugateDataPair } from '../../hooks/conjugate/useConjugateData';

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

export function DiagnosticsPanel({
  rows,
  targetName,
  deadliftStance,
  onDeadliftStanceChange,
}: {
  rows: ConjugateDataPair[];
  targetName: string;
  onTargetChange: (name: string | null) => void;
  deadliftStance: DeadliftStancePreference;
  onDeadliftStanceChange: (s: DeadliftStancePreference) => void;
}) {
  const hasDeadlift = useMemo(() => rows.some(([ex]) => ex.type === 'deadlift'), [rows]);

  const results = useMemo(
    () => generateDiagnostics(rows, targetName, deadliftStance),
    [rows, targetName, deadliftStance]
  );

  if (results.length === 0) {
    return null;
  }

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
                checked={deadliftStance === s}
                onChange={() => onDeadliftStanceChange(s)}
                style={{ marginRight: '0.3rem' }}
              />
              {s[0].toUpperCase() + s.slice(1)}
            </label>
          ))}
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
              <th style={{ ...cellStyle, textAlign: 'left' }}>Effects</th>
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
                <tr key={r.displayName} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={cellStyle}>{r.displayName}</td>
                  <td style={{ ...cellStyle, color: 'var(--text)' }}>
                    {r.effects.map(formatEffect).join(', ')}
                  </td>
                  <td style={monoStyle}>{r.averageIndex?.toFixed(1) ?? '-'}%</td>
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
