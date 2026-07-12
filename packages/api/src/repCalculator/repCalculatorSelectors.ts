import type { TaggedSetRecord, ConjugateAddlWt } from '@dyel/pipeline';
import { facetsFromTags, facetFamilyKey } from '../conjugate/facets';

export function availableEquipmentMagnitudes(
  records: TaggedSetRecord[],
  selectedEquipment: string | null
): string[] {
  if (!selectedEquipment || !['board', 'blocks', 'deficit'].includes(selectedEquipment)) {
    return [];
  }

  const mags = records
    .map((r) => facetsFromTags(r.tags))
    .filter((f) => f.equipment === selectedEquipment && f.equipmentMagnitude)
    .map((f) => f.equipmentMagnitude!);

  return Array.from(new Set(mags)).sort((a, b) => {
    const nA = parseInt(a, 10),
      nB = parseInt(b, 10);
    return isNaN(nA) || isNaN(nB) ? a.localeCompare(b) : nA - nB;
  });
}

export function exercisesForLiftType(
  records: TaggedSetRecord[]
): { canonical: string; label: string }[] {
  const seen = new Map<string, { canonical: string; label: string }>();
  for (const r of records) {
    if (!seen.has(r.canonical)) {
      seen.set(r.canonical, { canonical: r.canonical, label: r.meta?.rawExercise ?? r.exercise });
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export function resolveEffectiveCanonical(
  records: TaggedSetRecord[],
  params: {
    liftType: string;
    selectedRecord: TaggedSetRecord | undefined;
    selectedBar: string | null;
    selectedStance: string | null;
    selectedEquipment: string | null;
    selectedEquipmentMagnitude: string | null;
    selectedAddlWt: string | null;
  }
): string | null {
  const {
    liftType,
    selectedRecord,
    selectedBar,
    selectedStance,
    selectedEquipment,
    selectedEquipmentMagnitude,
    selectedAddlWt,
  } = params;
  if (!selectedRecord) {
    return null;
  }
  if (liftType === 'accessory') {
    return selectedRecord.canonical;
  }

  const candidateKey = [
    liftType,
    selectedBar,
    selectedStance !== 'competition' && selectedStance,
    selectedEquipment,
  ]
    .filter(Boolean)
    .join('-');

  const match = records.find((rec) => {
    const f = facetsFromTags(rec.tags);
    const keyMatch =
      facetFamilyKey(rec.canonical) === candidateKey ||
      (f.bar === selectedBar &&
        f.stance === selectedStance &&
        f.equipment === selectedEquipment &&
        f.equipmentMagnitude === selectedEquipmentMagnitude);

    if (!keyMatch) {
      return false;
    }
    return selectedAddlWt
      ? f.addlWts.includes(selectedAddlWt as ConjugateAddlWt)
      : f.addlWts.length === 0;
  });

  if (match) {
    return match.canonical;
  }
  const knownSelected = records.some((r) => r.canonical === selectedRecord.canonical);
  return knownSelected ? selectedRecord.canonical : candidateKey;
}
