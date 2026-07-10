import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import type { ChartPoint } from '@dyel/api';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { BaseRadarChart } from './BaseRadarChart';
import { ChartTooltip } from './TooltipCard';
import { SQUAT_COLOR, BENCH_COLOR, DEADLIFT_COLOR } from './colors';
import styles from './SigmaChart.module.css';

const LIFT_COLORS: Record<string, string> = {
  Squat: SQUAT_COLOR,
  Bench: BENCH_COLOR,
  Deadlift: DEADLIFT_COLOR,
};

export function SigmaChart({ chartData, unit }: { chartData: ChartPoint[]; unit: string }) {
  const data = useMemo(() => {
    if (chartData.length === 0) {
      return [];
    }

    let lastSquat: number | undefined;
    let lastBench: number | undefined;
    let lastDeadlift: number | undefined;
    for (const point of chartData) {
      if (point.squat !== undefined) {
        lastSquat = point.squat as number;
      }
      if (point.bench !== undefined) {
        lastBench = point.bench as number;
      }
      if (point.deadlift !== undefined) {
        lastDeadlift = point.deadlift as number;
      }
    }

    const points = [
      lastSquat !== undefined ? { lift: 'Squat', e1rm: lastSquat } : null,
      lastBench !== undefined ? { lift: 'Bench', e1rm: lastBench } : null,
      lastDeadlift !== undefined ? { lift: 'Deadlift', e1rm: lastDeadlift } : null,
    ].filter((p): p is { lift: string; e1rm: number } => p !== null);

    return points;
  }, [chartData]);

  if (data.length === 0) {
    return null;
  }

  const label = data.length < 3 ? 'Combined Total' : 'Current e1RM by lift (normalized)';

  return (
    <CollapsibleSection label={label}>
      <div className={styles.card}>
        <span className={styles.sectionLabel}>Lift Balance</span>
        {data.length < 3 && (
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <PieChart width={300} height={300}>
              <Pie
                data={data}
                dataKey="e1rm"
                nameKey="lift"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {data.map((entry) => (
                  <Cell key={entry.lift} fill={LIFT_COLORS[entry.lift]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) {
                    return null;
                  }
                  const item = payload[0];
                  return (
                    <ChartTooltip
                      lines={[
                        {
                          key: String(item.name),
                          name: String(item.name),
                          color: item.color,
                          detail: `e1RM: ${item.value} ${unit}`,
                        },
                      ]}
                    />
                  );
                }}
              />
              <Legend />
            </PieChart>
          </div>
        )}
        {data.length >= 3 && (
          <BaseRadarChart
            data={data}
            angleKey="lift"
            unit={unit}
            tooltip={{
              content: ({ payload }) => {
                const item = payload?.find((p) => p.dataKey === 'e1rm');
                if (!item) {
                  return null;
                }
                const name = (item.payload as { lift: string }).lift;
                return (
                  <ChartTooltip
                    lines={[
                      {
                        key: name,
                        name,
                        color: LIFT_COLORS[name],
                        detail: `e1RM: ${item.value} ${unit}`,
                      },
                    ]}
                  />
                );
              },
            }}
          />
        )}
      </div>
    </CollapsibleSection>
  );
}
