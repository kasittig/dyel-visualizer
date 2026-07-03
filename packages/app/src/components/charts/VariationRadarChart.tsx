import { useMemo } from 'react';
import type { ConjugateExercise } from '@dyel/core';
import { normalizeToBaseE1RM } from '@dyel/core';
import type { ConjugateDataPair } from '../../hooks/conjugate/useConjugateData';
import type { SessionStats } from '../../hooks/data/useLastSessionStats';
import { BaseRadarChart } from './BaseRadarChart';
import { TooltipCard } from './TooltipCard';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { distinctDisplayNames } from '../../utils/appUtils';
import styles from './VariationRadarChart.module.css';

const MIN_VARIATIONS = 3;

export function VariationRadarChart({
  rows,
  stats,
  targetName,
  baselineName,
  onVariationClick,
}: {
  rows: ConjugateDataPair[];
  stats: SessionStats;
  targetName: string;
  baselineName?: string;
  onVariationClick?: (variation: string) => void;
}) {
  const unit = rows[0]?.[1].unit ?? 'lbs';

  const data = useMemo(() => {
    const exerciseByName = new Map<string, ConjugateExercise>(
      rows.map(([ex]) => [ex.displayName, ex])
    );
    const targetEx = exerciseByName.get(targetName);
    const baselineEx = baselineName ? exerciseByName.get(baselineName) : undefined;
    const targetE1rm = stats.lastSession.get(targetName)?.e1rm;

    return distinctDisplayNames(rows)
      .map((name) => {
        const sourceEx = exerciseByName.get(name);
        const lastSess = stats.lastSession.get(name);
        if (!sourceEx || !lastSess || !targetEx) {
          return { variation: name, e1rm: undefined, targetE1rm };
        }
        return {
          variation: name,
          e1rm: normalizeToBaseE1RM(lastSess, sourceEx, targetEx, stats, baselineEx) ?? undefined,
          targetE1rm,
        };
      })
      .filter(
        (d): d is { variation: string; e1rm: number; targetE1rm: number | undefined } =>
          d.e1rm !== undefined
      );
  }, [rows, stats, targetName, baselineName]);

  if (data.length < MIN_VARIATIONS) {
    return null;
  }

  const showTargetRing = data.some((d) => d.targetE1rm !== undefined);

  return (
    <div className={styles.section}>
      <CollapsibleSection label="Normalized e1RM by variation">
        <div className={styles.card}>
          <span className={styles.sectionLabel}>Variation Breakdown</span>
          <BaseRadarChart
            data={data}
            angleKey="variation"
            unit={unit}
            chartKey={targetName}
            overlayDataKey={showTargetRing ? 'targetE1rm' : undefined}
            onClick={onVariationClick}
            tooltip={{
              content: ({ payload }) => {
                const item = payload?.find((p) => p.dataKey === 'e1rm');
                if (!item) {
                  return null;
                }
                const name = (item.payload as { variation: string }).variation;
                const last = stats.lastSession.get(name);
                const lastDate = last?.date;
                const lastE1RM = last?.e1rm;
                const bestSet = last;
                const dateStr = lastDate
                  ? lastDate.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Never';
                return (
                  <TooltipCard>
                    <div className={styles.tooltipName}>{name}</div>
                    <div>
                      Normalized e1RM: {Number(item.value).toFixed(2)} {unit}
                    </div>
                    <div className={styles.tooltipMuted}>
                      Last session:{' '}
                      {lastE1RM !== undefined ? `${lastE1RM.toFixed(2)} ${unit} · ` : ''}
                      {dateStr}
                      {bestSet
                        ? ` · ${bestSet.sets}×${bestSet.reps} @ ${bestSet.weight} ${unit}${bestSet.rpe != null ? ` · RPE ${bestSet.rpe}` : ''}`
                        : ''}
                    </div>
                  </TooltipCard>
                );
              },
            }}
          />
        </div>
      </CollapsibleSection>
    </div>
  );
}
