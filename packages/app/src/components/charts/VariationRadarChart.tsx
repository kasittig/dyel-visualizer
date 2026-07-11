import { useMemo } from 'react';
import { usePipelineVariationRadarData } from '../../hooks/pipeline/usePipelineVariationRadarData';
import { BaseRadarChart } from './BaseRadarChart';
import { ChartTooltip, type TooltipLine } from './TooltipCard';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { roundWeight } from '@dyel/api';
import styles from './VariationRadarChart.module.css';

const MIN_VARIATIONS = 3;

export function VariationRadarChart({
  liftType,
  unit,
  targetName,
  onVariationClick,
}: {
  liftType: string;
  unit: 'lbs' | 'kg';
  targetName: string;
  onVariationClick?: (variation: string) => void;
}) {
  const { normalizedSnapshot, lastSessionByLabel, targetLabel } = usePipelineVariationRadarData(
    liftType,
    unit,
    targetName
  );

  // Radar spokes show each variation's cross-exercise-normalized e1RM (normalized to the
  // model's fixed lift-family baseline canonical) rather than raw last-session e1RM. Labels
  // with no fitted normalization factor are silently excluded (see
  // snapshotNormalizedVariationsFromPipeline's omission rule) rather than shown with a
  // misleading raw value.
  const data = useMemo(() => {
    const targetE1rm = targetLabel ? normalizedSnapshot[targetLabel] : undefined;
    const variationNames = Object.keys(normalizedSnapshot).sort();

    return variationNames
      .map((name) => ({
        variation: name,
        e1rm: normalizedSnapshot[name],
        targetE1rm,
      }))
      .filter(
        (d): d is { variation: string; e1rm: number; targetE1rm: number | undefined } =>
          d.e1rm !== undefined
      );
  }, [normalizedSnapshot, targetLabel]);

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
                const lastSession = lastSessionByLabel.get(name);
                const dateStr = lastSession
                  ? new Date(lastSession.date + 'T00:00:00').toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Never';
                const displayWeight = lastSession ? roundWeight(lastSession.weight, unit) : 0;
                const lines: TooltipLine[] = [
                  {
                    key: name,
                    name,
                    detail: `Normalized e1RM: ${Number(item.value).toFixed(2)} ${unit}`,
                    extra: (
                      <>
                        Last session: {dateStr}
                        {lastSession
                          ? ` · ${lastSession.sets}×${lastSession.reps} @ ${displayWeight} ${unit}${lastSession.rpe != null ? ` · RPE ${lastSession.rpe}` : ''}`
                          : ''}
                      </>
                    ),
                  },
                ];
                return <ChartTooltip lines={lines} />;
              },
            }}
          />
        </div>
      </CollapsibleSection>
    </div>
  );
}
