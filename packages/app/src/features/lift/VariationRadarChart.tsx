import { usePipelineVariationRadarData } from './usePipelineVariationRadarData';
import { BaseRadarChart } from '../../shared/charts/BaseRadarChart';
import { ChartTooltip, type TooltipLine } from '../../shared/charts/TooltipCard';
import { CollapsibleSection } from '../../shared/components/CollapsibleSection';
import { formatChartDate, roundWeight } from '@dyel/api/display';
import type { RadarRow } from '@dyel/api';
import styles from './VariationRadarChart.module.css';

export function VariationRadarChart({
  liftType,
  unit,
  targetName,
  onVariationClick,
}: {
  liftType: string;
  unit: 'lbs' | 'kg';
  targetName: string;
  onVariationClick?: (v: string) => void;
}) {
  const { lastSessionByLabel, data } = usePipelineVariationRadarData(liftType, unit, targetName);

  if (data.length < 3) {
    return null;
  }
  const hasRing = data.some((d) => d.targetE1rm !== undefined);

  return (
    <div className={styles.section}>
      <CollapsibleSection
        label="Normalized e1RM by variation"
        persistenceId={`visualizer:${liftType}:variation-radar`}
        summary={`${data.length} variations compared`}
      >
        <div className={styles.card}>
          <span className={styles.sectionLabel}>Variation Breakdown</span>
          <BaseRadarChart
            data={data}
            angleKey="variation"
            unit={unit}
            chartKey={targetName}
            overlayDataKey={hasRing ? 'targetE1rm' : undefined}
            onClick={onVariationClick}
            summary={`Normalized one-rep max comparison for ${data.length} ${liftType} variations in ${unit}. Tap a variation to inspect its latest result.`}
            tooltip={{
              content: ({ payload }) => {
                const item = payload?.find((p) => p.dataKey === 'e1rm');
                if (!item) {
                  return null;
                }
                const name = (item.payload as RadarRow).variation;
                const last = lastSessionByLabel.get(name);
                const dStr = last ? formatChartDate(last.date) : 'Never';

                const lines: TooltipLine[] = [
                  {
                    key: name,
                    name,
                    detail: `Normalized e1RM: ${Number(item.value).toFixed(2)} ${unit}`,
                    extra: (
                      <>
                        Last session: {dStr}
                        {last
                          ? ` · ${last.sets}×${last.reps} @ ${roundWeight(last.weight, unit)} ${unit}${last.rpe != null ? ` · RPE ${last.rpe}` : ''}`
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
