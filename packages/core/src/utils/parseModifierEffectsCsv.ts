import Papa from 'papaparse';
import type { EffectEnum } from '../types/conjugate';
import { MODIFIER_EFFECTS, type ModifierEffectsMap } from './diagnostics';
import { nameToModifierKey } from './parseConjugateData';

// Parses a two-column exercise,effects CSV and overlays the effects onto `base`,
// preserving min/max percentage ranges from `base`. Returns null when the CSV is
// missing the expected columns so callers can fall back to the base map unchanged.
export function parseModifierEffectsCsv(
  csv: string,
  base: ModifierEffectsMap = MODIFIER_EFFECTS
): ModifierEffectsMap | null {
  const { data, meta } = Papa.parse<{ exercise: string; effects: string }>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
    transform: (v) => v.trim(),
  });
  if (!meta.fields?.includes('exercise') || !meta.fields?.includes('effects')) {
    return null;
  }
  const map: ModifierEffectsMap = { ...base };
  for (const row of data) {
    const key = nameToModifierKey(row.exercise);
    if (!key || !(key in base)) {
      continue;
    }
    const effects = row.effects
      ? (row.effects
          .split(',')
          .map((e) => e.trim())
          .filter(Boolean) as EffectEnum[])
      : [];
    const baseEntry = base[key];
    map[key] =
      'min' in baseEntry ? { effects, min: baseEntry.min, max: baseEntry.max } : { effects };
  }
  return map;
}
