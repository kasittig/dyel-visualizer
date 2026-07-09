import { useMemo } from 'react';
import { usePipelineVariationRadarData } from '../../hooks/pipeline/usePipelineVariationRadarData';
import { BaseRadarChart } from './BaseRadarChart';
import { ChartTooltip } from './TooltipCard';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import styles from './VariationRadarChart.module.css';

const MIN_VARIATIONS = 3;
const KG_TO_LBS = 2.20462262185;

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
  const { snapshot, lastSessionByLabel } = usePipelineVariationRadarData(liftType, unit);

  const data = useMemo(() => {
    const targetE1rm = snapshot[targetName];
    const variationNames = Object.keys(snapshot).sort();

    return variationNames
      .map((name) => {
        const e1rm = snapshot[name];
        if (e1rm === undefined) {
          return { variation: name, e1rm: undefined, targetE1rm };
        }
        return {
          variation: name,
          e1rm,
          targetE1rm,
        };
      })
      .filter(
        (d): d is { variation: string; e1rm: number; targetE1rm: number | undefined } =>
          d.e1rm !== undefined
      );
  }, [snapshot, targetName]);

  if (data.length < MIN_VARIATIONS) {
    return null;
  }

  const showTargetRing = data.some((d) => d.targetE1rm !== undefined);

  return (
    <div className={styles.section}>
      <CollapsibleSection label="e1RM by variation">
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
                const displayWeight = lastSession
                  ? unit === 'lbs'
                    ? Math.round(lastSession.weight * KG_TO_LBS)
                    : lastSession.weight
                  : 0;
                return (
                  <ChartTooltip
                    lines={[
                      {
                        key: name,
                        name,
                        detail: `Raw e1RM: ${Number(item.value).toFixed(2)} ${unit}`,
                        extra: (
                          <>
                            Last session: {dateStr}
                            {lastSession
                              ? ` · ${lastSession.sets}×${lastSession.reps} @ ${displayWeight} ${unit}${lastSession.rpe != null ? ` · RPE ${lastSession.rpe}` : ''}`
                              : ''}
                          </>
                        ),
                      },
                    ]}
                  />
                );
              },
            }}
          />
        </div>
      </CollapsibleSection>
    </div>
  );
}
