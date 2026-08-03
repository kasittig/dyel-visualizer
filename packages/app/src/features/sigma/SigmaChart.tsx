import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ChartPoint } from '@dyel/api';
import { useLatestLiftE1RMs } from './useLatestLiftE1RMs';
import { CollapsibleSection } from '../../shared/components/CollapsibleSection';
import { BaseRadarChart } from '../../shared/charts/BaseRadarChart';
import { ChartTooltip } from '../../shared/charts/TooltipCard';
import { SQUAT_COLOR, BENCH_COLOR, DEADLIFT_COLOR } from '../../shared/charts/colors';
import styles from './SigmaChart.module.css';
import { MOBILE_LAYOUT_QUERY, useMediaQuery } from '../../shared/hooks';

const LIFT_COLORS: Record<string, string> = {
  Squat: SQUAT_COLOR,
  Bench: BENCH_COLOR,
  Deadlift: DEADLIFT_COLOR,
};

export function SigmaChart({ chartData, unit }: { chartData: ChartPoint[]; unit: string }) {
  const mobile = useMediaQuery(MOBILE_LAYOUT_QUERY);
  const latest = useLatestLiftE1RMs(chartData);
  const data = [
    latest.squat !== undefined ? { lift: 'Squat', e1rm: latest.squat } : null,
    latest.bench !== undefined ? { lift: 'Bench', e1rm: latest.bench } : null,
    latest.deadlift !== undefined ? { lift: 'Deadlift', e1rm: latest.deadlift } : null,
  ].filter((p): p is { lift: string; e1rm: number } => p !== null);

  if (data.length === 0) {
    return null;
  }

  return (
    <CollapsibleSection
      label={data.length < 3 ? 'Combined Total' : 'Current e1RM by lift (normalized)'}
      persistenceId="visualizer:sigma:lift-balance"
    >
      <div className={styles.card}>
        <span className={styles.sectionLabel}>Lift Balance</span>
        {mobile && data.length === 3 ? (
          <div
            className={styles.comparison}
            role="img"
            aria-label={`Current normalized one-rep max by lift: ${data.map((item) => `${item.lift} ${item.e1rm} ${unit}`).join(', ')}.`}
          >
            {data.map((item) => (
              <div className={styles.comparisonRow} key={item.lift}>
                <span className={styles.comparisonLabel}>{item.lift}</span>
                <span className={styles.comparisonTrack} aria-hidden="true">
                  <span
                    className={styles.comparisonFill}
                    style={{
                      width: `${(item.e1rm / Math.max(...data.map((point) => point.e1rm))) * 100}%`,
                      backgroundColor: LIFT_COLORS[item.lift],
                    }}
                  />
                </span>
                <strong>
                  {item.e1rm} {unit}
                </strong>
              </div>
            ))}
          </div>
        ) : data.length < 3 ? (
          <div
            className={styles.pie}
            role="img"
            aria-label={`Current normalized one-rep max by lift: ${data.map((item) => `${item.lift} ${item.e1rm} ${unit}`).join(', ')}.`}
          >
            <ResponsiveContainer width="100%" height={mobile ? 260 : 300}>
              <PieChart>
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
                  trigger={mobile ? 'click' : 'hover'}
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
            </ResponsiveContainer>
          </div>
        ) : (
          <BaseRadarChart
            data={data}
            angleKey="lift"
            unit={unit}
            summary={`Current normalized one-rep max by lift: ${data.map((item) => `${item.lift} ${item.e1rm} ${unit}`).join(', ')}.`}
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
