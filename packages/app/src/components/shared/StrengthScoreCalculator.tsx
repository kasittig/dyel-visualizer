import { useState, useMemo } from 'react';
import clsx from 'clsx';
import { calculateMetrics } from '@dyel/core';
import { CollapsibleSection } from './CollapsibleSection';
import styles from './StrengthScoreCalculator.module.css';

type Gender = 'male' | 'female';

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function tierInfo(score: number): { label: string; color: string } {
  if (score >= 500) {
    return { label: 'World class', color: 'var(--text-h)' };
  }
  if (score >= 400) {
    return { label: 'Elite', color: 'var(--accent)' };
  }
  if (score >= 300) {
    return { label: 'Advanced', color: 'var(--success)' };
  }
  if (score >= 200) {
    return { label: 'Intermediate', color: 'var(--warning)' };
  }
  return { label: 'Novice', color: 'var(--text)' };
}

const METRICS = [
  { key: 'wilks' as const, label: 'Wilks', barColor: '#9b59b6' },
  { key: 'dots' as const, label: 'DOTS', barColor: '#3498db' },
  { key: 'schwartzmalone' as const, label: 'Schwartz-Malone', barColor: '#e74c3c' },
];

export function StrengthScoreCalculator({
  competitionTotal,
  unit: dataUnit,
}: {
  competitionTotal: number | null;
  unit: 'lbs' | 'kg';
}) {
  const [bodyweight, setBodyweight] = useState('');
  const [unit, setUnit] = useState<'lbs' | 'kg'>('lbs');
  const [gender, setGender] = useState<Gender>('female');

  const bodyweightNum = parseFloat(bodyweight);

  const scores = useMemo(() => {
    if (competitionTotal === null || !bodyweight || bodyweightNum <= 0 || isNaN(bodyweightNum)) {
      return null;
    }
    return calculateMetrics(bodyweightNum, competitionTotal, gender === 'female', unit);
  }, [competitionTotal, bodyweight, bodyweightNum, unit, gender]);

  const totalDisplay =
    competitionTotal !== null ? `${Math.round(competitionTotal)} ${dataUnit}` : '—';

  return (
    <CollapsibleSection label="Strength Score Calculator">
      <div className={styles.card}>
        <div className={styles.leftCol}>
          <span className={styles.sectionLabel}>Score Calculator</span>

          <div className={styles.field}>
            <div className={styles.fieldLabel}>Gender</div>
            <div className={styles.chipGroup}>
              {(['male', 'female'] as Gender[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={clsx(styles.chip, gender === g && styles.chipActive)}
                >
                  {g === 'male' ? 'Male' : 'Female'}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLabel}>Unit</div>
            <div className={styles.chipGroup}>
              {(['lbs', 'kg'] as ('lbs' | 'kg')[]).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className={clsx(styles.chip, unit === u && styles.chipActive)}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLabel}>Bodyweight</div>
            <input
              type="number"
              min="0"
              value={bodyweight}
              onChange={(e) => setBodyweight(e.target.value)}
              placeholder="—"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLabel}>Competition Total</div>
            <input type="text" value={totalDisplay} readOnly disabled className={styles.input} />
          </div>
        </div>

        <div className={styles.rightCol}>
          {METRICS.map(({ key, label, barColor }, i) => {
            const score = scores?.[key] ?? null;
            const isLast = i === METRICS.length - 1;
            const tier = score !== null ? tierInfo(score) : null;
            const pct =
              scores !== null
                ? (scores[`${key}Percentile` as keyof typeof scores] as number)
                : null;
            const barWidth = score !== null ? Math.min(100, (score / 600) * 100) : 0;

            return (
              <div key={key} className={clsx(styles.scoreRow, isLast && styles.scoreRowLast)}>
                <div className={styles.scoreHeader}>
                  <span className={styles.metricLabel}>{label}</span>
                  <span
                    className={styles.tierLabel}
                    style={{ color: tier ? tier.color : 'transparent' }}
                  >
                    {tier ? tier.label : 'Novice'}
                  </span>
                </div>
                <div
                  className={styles.scoreNumber}
                  style={{ color: score !== null ? 'var(--text-h)' : '#d0cfd3' }}
                >
                  {score !== null ? score.toFixed(2) : '—'}
                </div>
                <div
                  className={styles.percentile}
                  style={{ color: pct !== null ? 'var(--text)' : 'transparent' }}
                >
                  {pct !== null ? `${ordinal(pct)} percentile` : '0th percentile'}
                </div>
                <div className={styles.bar}>
                  <div
                    className={styles.barFill}
                    style={{ width: `${barWidth}%`, background: barColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </CollapsibleSection>
  );
}
