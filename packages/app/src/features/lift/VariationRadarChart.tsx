import { usePipelineVariationRadarData } from './usePipelineVariationRadarData';
import { BaseRadarChart } from '../../shared/charts/BaseRadarChart';
import { ChartTooltip, type TooltipLine } from '../../shared/charts/TooltipCard';
import { CollapsibleSection } from '../../shared/components/CollapsibleSection';
import { roundWeight, type RadarRow } from '@dyel/api';
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
      <CollapsibleSection label="Normalized e1RM by variation">
        <div className={styles.card}>
          <span className={styles.sectionLabel}>Variation Breakdown</span>
          <BaseRadarChart
            data={data}
            angleKey="variation"
            unit={unit}
            chartKey={targetName}
            overlayDataKey={hasRing ? 'targetE1rm' : undefined}
            onClick={onVariationClick}
            tooltip={{
              content: ({ payload }) => {
                const item = payload?.find((p) => p.dataKey === 'e1rm');
                if (!item) {
                  return null;
                }
                const name = (item.payload as RadarRow).variation;
                const last = lastSessionByLabel.get(name);
                const dStr = last
                  ? new Date(`${last.date}T00:00:00`).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Never';

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
