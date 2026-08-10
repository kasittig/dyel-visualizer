import { useState, useMemo, useEffect, useRef } from 'react';
import {
  facetsFromTags,
  availableEquipmentMagnitudes,
  exercisesForLiftType,
  resolveEffectiveCanonical,
  predictWeightForReps,
  predictRepsForWeight,
  resolveE1RMEstimate,
  resolveFamilyRecentE1RMEstimate,
  convertE1RMToDisplayUnit,
  roundTo5,
  selectBestE1RMPoint,
  formatWeight,
  formatE1RMSourceLabel,
} from '@dyel/api';
import type {
  LiftType,
  SplitRows,
  ConjugateAddlWt,
  ConjugateBar,
  ConjugateEquipment,
  ConjugateStance,
  Point,
} from '@dyel/api';
import { usePipelineModel } from '../../app/PipelineContext';

export function usePipelineRepCalculator(
  tabRows: Record<LiftType, SplitRows>,
  baselineNames: Partial<Record<LiftType, string>>,
  mode: 'manual' | 'connected' = 'connected'
) {
  const [liftType, setLiftType] = useState<LiftType>('squat');
  const [selectedCanonical, setSelectedCanonical] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [manualE1rm, setManualE1rm] = useState('');
  const [manualUnit, setManualUnit] = useState<'lbs' | 'kg'>('lbs');
  const [selectedBar, setSelectedBar] = useState<ConjugateBar | null>(null);
  const [selectedStance, setSelectedStance] = useState<ConjugateStance | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<ConjugateEquipment | null>(null);
  const [selectedAddlWt, setSelectedAddlWt] = useState<ConjugateAddlWt | null>(null);
  const [selectedEquipmentMagnitude, setSelectedEquipmentMagnitude] = useState<string | null>(null);

  const { status: pStatus, model: pModel } = usePipelineModel();
  const records = tabRows[liftType].maxEffort;
  const repsRef = useRef(reps);
  const weightRef = useRef(weight);
  const lastEditedRef = useRef<'reps' | 'weight'>('reps');
  const previousCalculationSourceRef = useRef<string | null>(null);
  const previousModeRef = useRef(mode);

  const unit = useMemo(
    () =>
      mode === 'manual'
        ? manualUnit
        : records.find((r) => r.meta?.rawUnit)?.meta?.rawUnit === 'lbs'
          ? 'lbs'
          : 'kg',
    [manualUnit, mode, records]
  );
  const availableMagnitudes = useMemo(
    () => availableEquipmentMagnitudes(records, selectedEquipment),
    [selectedEquipment, records]
  );
  const exercisesForType = useMemo(() => exercisesForLiftType(records), [records]);
  const canonicalByLabel = useMemo(
    () => new Map(exercisesForType.map((e) => [e.label, e.canonical])),
    [exercisesForType]
  );
  const exerciseLabels = useMemo(() => exercisesForType.map((e) => e.label), [exercisesForType]);
  const activeCanonical = records.some((r) => r.canonical === selectedCanonical)
    ? selectedCanonical
    : (exercisesForType[0]?.canonical ?? '');
  const activeLabel = exercisesForType.find((e) => e.canonical === activeCanonical)?.label ?? '';
  const selectedRecord = useMemo(
    () => records.find((r) => r.canonical === activeCanonical),
    [records, activeCanonical]
  );

  const effectiveCanonical = useMemo(
    () =>
      resolveEffectiveCanonical(records, {
        liftType,
        selectedRecord,
        selectedBar,
        selectedStance,
        selectedEquipment,
        selectedEquipmentMagnitude,
        selectedAddlWt,
      }),
    [
      selectedRecord,
      liftType,
      selectedBar,
      selectedStance,
      selectedEquipment,
      selectedEquipmentMagnitude,
      selectedAddlWt,
      records,
    ]
  );

  const estimate = useMemo(() => {
    if (!effectiveCanonical || pStatus !== 'success' || !pModel) {
      return null;
    }
    return resolveE1RMEstimate({
      liftType,
      targetCanonical: effectiveCanonical,
      baselineName: baselineNames[liftType],
      today: new Date(),
      model: pModel.model,
      e1rmPoints: pModel.points.get('e1rm-max-effort'),
    });
  }, [effectiveCanonical, pStatus, pModel, baselineNames, liftType]);

  const familyE1RMEstimate = useMemo(() => {
    if (!effectiveCanonical || pStatus !== 'success' || !pModel) {
      return null;
    }
    return resolveFamilyRecentE1RMEstimate(
      liftType,
      effectiveCanonical,
      pModel.points.get('e1rm-max-effort'),
      new Date(),
      pModel.model
    );
  }, [effectiveCanonical, pStatus, pModel, liftType]);

  const actualE1rmDisplay = useMemo(() => {
    if (pStatus !== 'success' || !pModel || !effectiveCanonical) {
      return null;
    }
    const points = pModel.points
      .get('e1rm-max-effort')
      .filter((p: Point) => p.series === effectiveCanonical);
    const actualE1rm = selectBestE1RMPoint(points);
    return actualE1rm ? formatWeight(actualE1rm.e1rm, unit) : null;
  }, [effectiveCanonical, pStatus, pModel, unit]);

  const projectedE1rmDisplay = useMemo(
    () => (estimate ? formatWeight(estimate.e1rm, unit) : null),
    [estimate, unit]
  );

  const e1rmSourceLabel = useMemo(() => formatE1RMSourceLabel(estimate), [estimate]);

  const e1rmFamilyRecentDisplay = useMemo(
    () => (familyE1RMEstimate ? formatWeight(familyE1RMEstimate.e1rm, unit) : null),
    [familyE1RMEstimate, unit]
  );

  const e1rmFamilyRecentSourceLabel = useMemo(
    () => formatE1RMSourceLabel(familyE1RMEstimate),
    [familyE1RMEstimate]
  );

  const calculationE1rm =
    mode === 'manual'
      ? parseFloat(manualE1rm)
      : estimate
        ? convertE1RMToDisplayUnit(estimate.e1rm, unit)
        : Number.NaN;

  const syncWeightFromReps = (rVal: string) => {
    const r = parseFloat(rVal);
    if (r > 0 && calculationE1rm > 0) {
      setWeight(String(roundTo5(predictWeightForReps(calculationE1rm, r))));
    }
  };

  const syncRepsFromWeight = (wVal: string) => {
    const w = parseFloat(wVal);
    if (w > 0 && calculationE1rm > 0) {
      setReps(predictRepsForWeight(calculationE1rm, w).toFixed(1));
    }
  };

  const calculationSource =
    mode === 'manual' ? `${manualE1rm}:${unit}` : `${effectiveCanonical}:${unit}`;

  useEffect(() => {
    const previousSource = previousCalculationSourceRef.current;
    const modeChanged = previousModeRef.current !== mode;
    previousCalculationSourceRef.current = calculationSource;
    previousModeRef.current = mode;
    if (previousSource === null || modeChanged || previousSource === calculationSource) {
      return;
    }
    if (lastEditedRef.current === 'weight') {
      syncRepsFromWeight(weightRef.current);
    } else {
      syncWeightFromReps(repsRef.current);
    }
    // The source key deliberately excludes the connected estimate value: data refreshes must not
    // silently change an in-progress calculation for the same exercise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculationSource, mode]);

  return {
    liftType,
    setLiftType,
    exercisesForType,
    activeCanonical,
    exerciseLabels,
    activeLabel,
    selectedRecord,
    selectedBar,
    setSelectedBar,
    selectedStance,
    setSelectedStance,
    selectedEquipment,
    setSelectedEquipment,
    selectedAddlWt,
    setSelectedAddlWt,
    selectedEquipmentMagnitude,
    setSelectedEquipmentMagnitude,
    availableMagnitudes,
    reps,
    weight,
    unit,
    mode,
    manualE1rm,
    manualUnit,
    setManualUnit,
    estimate,
    actualE1rmDisplay,
    projectedE1rmDisplay,
    e1rmSourceLabel,
    e1rmFamilyRecentDisplay,
    e1rmFamilyRecentSourceLabel,
    handleSelectedCanonicalChange: (label: string) => {
      const canonical = canonicalByLabel.get(label);
      if (!canonical) {
        return;
      }
      const f = facetsFromTags(records.find((r) => r.canonical === canonical)?.tags ?? new Set());
      setSelectedCanonical(canonical);
      setReps('');
      setWeight('');
      setSelectedBar(f.bar ?? null);
      setSelectedStance(f.stance ?? null);
      setSelectedEquipment(f.equipment ?? null);
      setSelectedAddlWt(f.addlWts?.[0] ?? null);
      setSelectedEquipmentMagnitude(f.equipmentMagnitude ?? null);
    },
    handleManualE1rmChange: (val: string) => {
      setManualE1rm(val);
    },
    handleRepsChange: (val: string) => {
      repsRef.current = val;
      lastEditedRef.current = 'reps';
      setReps(val);
      syncWeightFromReps(val);
    },
    handleWeightChange: (val: string) => {
      weightRef.current = val;
      lastEditedRef.current = 'weight';
      setWeight(val);
      syncRepsFromWeight(val);
    },
  };
}
