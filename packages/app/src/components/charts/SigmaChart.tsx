import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import type { ChartPoint } from '@dyel/core';
import { BaseRadarChart } from './BaseRadarChart';

const LIFT_COLORS: Record<string, string> = {
  Squat: '#e67e22',
  Bench: '#3498db',
  Deadlift: '#2ecc71',
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

  const [isExpanded, setIsExpanded] = useState(true);

  if (data.length === 0) {
    return null;
  }

  return (
    <>
      <button className="tab-title" onClick={() => setIsExpanded((v) => !v)}>
        <span className="tab-title-toggle">{isExpanded ? '▾' : '▸'}</span>
        <span className="tab-title-label">
          {data.length < 3 ? 'Combined Total' : 'Current e1RM by lift (normalized)'}
        </span>
      </button>
      {isExpanded && data.length < 3 && (
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
            <Tooltip formatter={(v) => `${v} ${unit}`} />
            <Legend />
          </PieChart>
        </div>
      )}
      {isExpanded && data.length >= 3 && (
        <BaseRadarChart
          data={data}
          angleKey="lift"
          unit={unit}
          tooltip={{ formatter: (v) => [`${v} ${unit}`, 'e1RM'] }}
        />
      )}
    </>
  );
}
