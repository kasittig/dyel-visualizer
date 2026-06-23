import { useMemo } from 'react';
import type React from 'react';
import type { ComponentProps } from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Text,
  Tooltip,
} from 'recharts';
import type { ConjugateExercise } from '@dyel/core';
import { normalizeToBaseE1RM } from '@dyel/core';
import type { ConjugateDataPair } from '../../hooks/conjugate/useConjugateData';
import type { SessionStats } from '../../hooks/data/useLastSessionStats';
import { TooltipCard } from './TooltipCard';
import { distinctDisplayNames } from '../../utils/appUtils';
import styles from './VariationRadarChart.module.css';

const MIN_VARIATIONS = 3;

interface CustomAxisTickProps {
  x: number;
  y: number;
  cx: number;
  cy: number;
  textAnchor: 'start' | 'middle' | 'end' | 'inherit';
  payload: { value: string; coordinate: number; index: number };
}

type RechartsTickParam = NonNullable<ComponentProps<typeof PolarAngleAxis>['tick']>;

const renderCustomAxis = (props: CustomAxisTickProps): React.JSX.Element => {
  const { payload, x, y, cx, cy, textAnchor } = props;
  const offsetX = x + (x - cx) / 10;
  const offsetY = y + (y - cy) / 10;
  return (
    <Text
      x={offsetX}
      y={offsetY}
      textAnchor={textAnchor}
      className="recharts-polar-angle-axis-tick-value"
      fontSize={11}
    >
      {payload.value}
    </Text>
  );
};

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
    <section className={styles.section}>
      <p className={styles.label}>Normalized e1RM by variation</p>
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={340}>
          <RadarChart
            key={targetName}
            data={data}
            onClick={
              onVariationClick
                ? (chartData) => {
                    const name = chartData?.activeLabel;
                    if (typeof name === 'string' && name) {
                      onVariationClick(name);
                    }
                  }
                : undefined
            }
            style={{ cursor: onVariationClick ? 'pointer' : undefined }}
          >
            <PolarGrid />
            <PolarAngleAxis
              dataKey="variation"
              tick={(props: RechartsTickParam) => renderCustomAxis(props as CustomAxisTickProps)}
            />
            <PolarRadiusAxis tick={{ fontSize: 10 }} unit={` ${unit}`} angle={90} />
            <Radar dataKey="e1rm" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
            {showTargetRing && (
              <Radar
                dataKey="targetE1rm"
                stroke="#f97316"
                fill="none"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
              />
            )}
            <Tooltip
              content={({ payload }) => {
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
                      Last session: {lastE1RM !== undefined ? `${lastE1RM.toFixed(2)} ${unit} · ` : ''}
                      {dateStr}
                      {bestSet
                        ? ` · ${bestSet.sets}×${bestSet.reps} @ ${bestSet.weight} ${unit}${bestSet.rpe != null ? ` · RPE ${bestSet.rpe}` : ''}`
                        : ''}
                    </div>
                  </TooltipCard>
                );
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
