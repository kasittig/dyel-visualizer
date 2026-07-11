import { usePipelineVariationRadarData } from './usePipelineVariationRadarData';
import { BaseRadarChart } from '../../shared/charts/BaseRadarChart';
import { ChartTooltip, type TooltipLine } from '../../shared/charts/TooltipCard';
import { CollapsibleSection } from '../../shared/components/CollapsibleSection';
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
  const { lastSessionByLabel, data } = usePipelineVariationRadarData(liftType, unit, targetName);

  // Radar spokes show each variation's cross-exercise-normalized e1RM (normalized to the
  // model's fixed lift-family baseline canonical) rather than raw last-session e1RM. Labels
  // with no fitted normalization factor are silently excluded (see
  // snapshotNormalizedVariationsFromPipeline's omission rule) rather than shown with a
  // misleading raw value.

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
