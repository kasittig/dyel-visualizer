import { useState, useMemo, useEffect, useRef } from 'react';
import {
  facetsFromTags,
  availableEquipmentMagnitudes,
  exercisesForLiftType,
  resolveEffectiveCanonical,
  predictWeightForReps,
  predictRepsForWeight,
  resolveE1RMEstimate,
  convertE1RMToDisplayUnit,
  roundTo5,
} from '@dyel/api';
import type {
  LiftType,
  SplitRows,
  ConjugateAddlWt,
  ConjugateBar,
  ConjugateEquipment,
  ConjugateStance,
} from '@dyel/api';
import { usePipelineModel } from '../../app/PipelineContext';

/**
 * Controller hook for the Rep Calculator: owns all interactive state (lift type, exercise
 * selection, conjugate facets, reps/weight inputs) and derives the effective e1RM estimate
 * from the shared pipeline model via `usePipelineModel()`.
 */
export function usePipelineRepCalculator(
  tabRows: Record<LiftType, SplitRows>,
  baselineNames: Partial<Record<LiftType, string>>
) {
  const [liftType, setLiftType] = useState<LiftType>('squat');
  const [selectedCanonical, setSelectedCanonical] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [selectedBar, setSelectedBar] = useState<ConjugateBar | null>(null);
  const [selectedStance, setSelectedStance] = useState<ConjugateStance | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<ConjugateEquipment | null>(null);
  const [selectedAddlWt, setSelectedAddlWt] = useState<ConjugateAddlWt | null>(null);
  const [selectedEquipmentMagnitude, setSelectedEquipmentMagnitude] = useState<string | null>(null);

  const { status: pipelineStatus, model: pipelineModel } = usePipelineModel();
  const records = tabRows[liftType].maxEffort;

  const unit = useMemo(() => {
    const found = records.find((r) => r.meta?.rawUnit);
    return (found?.meta?.rawUnit === 'lbs' ? 'lbs' : 'kg') as 'lbs' | 'kg';
  }, [records]);

  const availableMagnitudes = useMemo(
    () => availableEquipmentMagnitudes(records, selectedEquipment),
    [selectedEquipment, records]
  );

  const exercisesForType = useMemo(() => exercisesForLiftType(records), [records]);

  // Derive the active canonical key inline during render.
  // If the user's manual selection is no longer valid for this liftType, default to the first available exercise.
  const activeCanonical = records.some((r) => r.canonical === selectedCanonical)
    ? selectedCanonical
    : (exercisesForType[0]?.canonical ?? '');

  const selectedRecord = useMemo(
    () => records.find((r) => r.canonical === activeCanonical),
    [records, activeCanonical]
  );

  // Unified state updater used exclusively by user interactions
  const syncFacetsAndInputs = (canonical: string, rec?: (typeof records)[number]) => {
    const f = rec ? facetsFromTags(rec.tags) : null;
    setSelectedCanonical(canonical);
    setReps('');
    setWeight('');
    setSelectedBar(f?.bar ?? null);
    setSelectedStance(f?.stance ?? null);
    setSelectedEquipment(f?.equipment ?? null);
    setSelectedAddlWt(f?.addlWts?.[0] ?? null);
    setSelectedEquipmentMagnitude(f?.equipmentMagnitude ?? null);
  };

  function handleSelectedCanonicalChange(canonical: string) {
    syncFacetsAndInputs(
      canonical,
      records.find((r) => r.canonical === canonical)
    );
  }

  // Derive the effective canonical for e1RM lookup
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
    if (!effectiveCanonical || pipelineStatus !== 'success' || !pipelineModel) {
      return null;
    }

    return resolveE1RMEstimate({
      liftType,
      targetCanonical: effectiveCanonical,
      baselineName: baselineNames[liftType],
      today: new Date(),
      model: pipelineModel.model,
      e1rmPoints: pipelineModel.pointsByDeriver.get('e1rm-max-effort') ?? [],
    });
  }, [effectiveCanonical, pipelineStatus, pipelineModel, baselineNames, liftType]);

  // Ref safely managed via mutations during event handlers
  const repsRef = useRef(reps);

  const syncWeightFromReps = (rVal: string) => {
    const r = parseFloat(rVal);
    if (r > 0 && estimate) {
      const dispE1RM = convertE1RMToDisplayUnit(estimate.e1rm, unit);
      setWeight(String(roundTo5(predictWeightForReps(dispE1RM, r))));
    }
  };

  useEffect(() => {
    syncWeightFromReps(repsRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimate, unit]);

  function handleRepsChange(val: string) {
    repsRef.current = val;
    setReps(val);
    syncWeightFromReps(val);
  }

  function handleWeightChange(val: string) {
    setWeight(val);
    const w = parseFloat(val);
    if (w > 0 && estimate) {
      const dispE1RM = convertE1RMToDisplayUnit(estimate.e1rm, unit);
      setReps(predictRepsForWeight(dispE1RM, w).toFixed(1));
    }
  }

  return {
    liftType,
    setLiftType,
    exercisesForType,
    activeCanonical,
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
    handleRepsChange,
    handleWeightChange,
    handleSelectedCanonicalChange,
    unit,
    estimate,
  };
}
