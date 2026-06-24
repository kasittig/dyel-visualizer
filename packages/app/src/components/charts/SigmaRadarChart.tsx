import { useMemo, useState } from 'react';
import type { ChartPoint } from '@dyel/core';
import { BaseRadarChart } from './BaseRadarChart';

export function SigmaRadarChart({ chartData, unit }: { chartData: ChartPoint[]; unit: string }) {
  const data = useMemo(() => {
    if (chartData.length === 0) {
      return null;
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

    return points.length === 3 ? points : null;
  }, [chartData]);

  const [isExpanded, setIsExpanded] = useState(true);

  if (!data) {
    return null;
  }

  return (
    <>
      <button className="tab-title" onClick={() => setIsExpanded((v) => !v)}>
        <span className="tab-title-toggle">{isExpanded ? '▾' : '▸'}</span>
        <span className="tab-title-label">Current e1RM by lift (normalized)</span>
      </button>
      {isExpanded && (
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
