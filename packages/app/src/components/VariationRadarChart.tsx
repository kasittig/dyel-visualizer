import { useMemo } from 'react';
import type { ConjugateDataPair } from '../hooks/useConjugateData';
import type { SessionStats } from '../hooks/useLastSessionStats';
import { BaseRadarChart } from './BaseRadarChart';
import { TooltipCard } from './TooltipCard';
import { distinctDisplayNames } from '../utils/appUtils';

const MIN_VARIATIONS = 3;

export function VariationRadarChart({
  rows,
  stats,
  onVariationClick,
}: {
  rows: ConjugateDataPair[];
  stats: SessionStats;
  onVariationClick?: (variation: string) => void;
}) {
  const unit = rows[0]?.[1].unit ?? 'lbs';

  const data = useMemo(
    () =>
      distinctDisplayNames(rows)
        .map((name) => ({ variation: name, e1rm: stats.projectedE1RM.get(name) }))
        .filter((d): d is { variation: string; e1rm: number } => d.e1rm !== undefined),
    [rows, stats.projectedE1RM]
  );

  if (data.length < MIN_VARIATIONS) {
    return null;
  }

  return (
    <BaseRadarChart
      label="Projected e1RM by variation (today)"
      data={data}
      angleKey="variation"
      unit={unit}
      onClick={onVariationClick}
      tooltip={{
        content: ({ payload }) => {
          const item = payload?.[0];
          if (!item) {
            return null;
          }
          const name = (item.payload as { variation: string }).variation;
          const last = stats.lastSession.get(name);
          const lastDate = last?.date;
          const lastE1RM = last?.e1rm;
          const bestSet = last?.bestSet;
          const dateStr = lastDate
            ? lastDate.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Never';
          return (
            <TooltipCard>
              <div style={{ fontWeight: 600 }}>{name}</div>
              <div>
                Projected e1RM: {Number(item.value).toFixed(2)} {unit}
              </div>
              <div style={{ opacity: 0.7 }}>
                Last session: {lastE1RM !== undefined ? `${lastE1RM.toFixed(2)} ${unit} · ` : ''}
                {dateStr}
                {bestSet ? ` · ${bestSet.sets}×${bestSet.reps} @ ${bestSet.weight} ${unit}` : ''}
              </div>
            </TooltipCard>
          );
        },
      }}
    />
  );
}
