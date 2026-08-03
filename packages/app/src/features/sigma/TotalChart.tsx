import { useCallback, useState } from 'react';
import { Line, Tooltip } from 'recharts';
import type { ChartPoint } from '@dyel/api';
import { DateLineChart, ChartEmpty } from '../../shared/charts/DateLineChart';
import { ChartTooltip } from '../../shared/charts/TooltipCard';
import { ChartLegend } from '../../shared/charts/ChartLegend';
import { TOUCH_EXPLORATION_QUERY, useMediaQuery } from '../../shared/hooks';
import styles from './TotalChart.module.css';
import {
  SQUAT_COLOR,
  BENCH_COLOR,
  DEADLIFT_COLOR,
  TOTAL_COLOR,
  PUSH_PULL_COLOR,
} from '../../shared/charts/colors.ts';

export function TotalChart({ chartData, unit }: { chartData: ChartPoint[]; unit: string }) {
  const touch = useMediaQuery(TOUCH_EXPLORATION_QUERY);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(() => new Set());
  const toggleKey = useCallback((key: string) => {
    setHiddenKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);
  if (chartData.length === 0) {
    return <ChartEmpty />;
  }

  return (
    <div className={styles.card}>
      <span className={styles.sectionLabel}>e1RM over time</span>
      <ChartLegend
        items={[
          { key: 'squat', label: 'Squat', color: SQUAT_COLOR, dash: 'short' },
          { key: 'bench', label: 'Bench', color: BENCH_COLOR },
          { key: 'deadlift', label: 'Deadlift', color: DEADLIFT_COLOR, dash: 'long' },
          { key: 'pushPull', label: 'Push/Pull', color: PUSH_PULL_COLOR, dash: 'long' },
          { key: 'total', label: 'Est. total', color: TOTAL_COLOR, dash: 'short' },
        ]}
        hiddenKeys={hiddenKeys}
        onToggle={toggleKey}
      />
      <DateLineChart
        data={chartData}
        unit={unit}
        yAxisWidth={55}
        summary={`Estimated one-rep max trends across ${chartData.length} training dates. Lines show squat, bench, deadlift, push/pull, and estimated total in ${unit}.`}
      >
        <Tooltip
          trigger={touch ? 'click' : 'hover'}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) {
              return null;
            }
            return (
              <ChartTooltip
                label={label}
                lines={payload.map((item) => ({
                  key: String(item.dataKey),
                  detail: (
                    <span style={{ color: item.color }}>
                      {item.name}: {item.value} {unit}
                    </span>
                  ),
                }))}
              />
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="squat"
          hide={hiddenKeys.has('squat')}
          name="Squat"
          stroke={SQUAT_COLOR}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          strokeDasharray="3 4"
          connectNulls
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="bench"
          hide={hiddenKeys.has('bench')}
          name="Bench"
          stroke={BENCH_COLOR}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          connectNulls
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="deadlift"
          hide={hiddenKeys.has('deadlift')}
          name="Deadlift"
          stroke={DEADLIFT_COLOR}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          strokeDasharray="7 7"
          connectNulls
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="pushPull"
          hide={hiddenKeys.has('pushPull')}
          name="Push/Pull"
          stroke={PUSH_PULL_COLOR}
          strokeDasharray="5 5"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          connectNulls
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="total"
          hide={hiddenKeys.has('total')}
          name="Est. Total"
          stroke={TOTAL_COLOR}
          strokeDasharray="3 3"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          connectNulls
          isAnimationActive={false}
        />
      </DateLineChart>
    </div>
  );
}
