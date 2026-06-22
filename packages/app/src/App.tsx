import { useState, useMemo, useEffect } from 'react';
import { useConjugateData } from './hooks/conjugate/useConjugateData';
import { useLastSessionStats } from './hooks/data/useLastSessionStats';
import { ExerciseFilters } from './components/shared/ExerciseFilters';
import { RepCalculator } from './components/shared/RepCalculator';
import { SigmaTab } from './components/pages/SigmaTab';
import { LiftTabPanel } from './components/pages/LiftTabPanel';
import { SheetUrlPanel } from './components/shared/SheetUrlPanel';
import { GettingStarted } from './components/pages/GettingStarted';
import {
  applyFilters,
  defaultBaselineName,
  defaultCompExerciseName,
  emptyFilters,
} from '@dyel/core';
import type { ConjugateDataPair } from './hooks/conjugate/useConjugateData';
import type {
  DeadliftStancePreference,
  FilterState,
  LiftType,
  GroupedConjugatePairs,
} from '@dyel/core';
import {
  extractSheetRef,
  initialTabState,
  toggleInSet,
  LIFT_TABS,
  MAIN_TABS,
  ACCESSORY_TAB,
} from './utils/appUtils';
import type { PageTab, TabState } from './utils/appUtils';

export function App() {
  const [url, setUrl] = useState(
    () =>
      new URLSearchParams(window.location.search).get('sheet') ??
      import.meta.env.VITE_SHEET_URL ??
      ''
  );
  const [panelForcedOpen, setPanelForcedOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PageTab>('sigma');
  const [shownResetToken, setShownResetToken] = useState(0);
  const [tabState, setTabState] = useState<Record<LiftType, TabState>>(initialTabState);
  const [deadliftStance, setDeadliftStance] = useState<DeadliftStancePreference>('sumo');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (url) {
      params.set('sheet', url);
    } else {
      params.delete('sheet');
    }
    history.replaceState(null, '', '?' + params.toString());
  }, [url]);

  const sheetRef = extractSheetRef(url);
  const invalidUrl = url.length > 0 && !sheetRef;

  const state = useConjugateData(sheetRef);

  const showUrlPanel = panelForcedOpen || state.status !== 'success';

  const pairs = useMemo(() => (state.status === 'success' ? state.pairs : []), [state]);
  const dataMap = useMemo<Partial<GroupedConjugatePairs>>(
    () => Object.groupBy(pairs, (pair) => pair[0].type),
    [pairs]
  );

  const tabRows = useMemo<Record<LiftType, ConjugateDataPair[]>>(
    () => ({
      squat: dataMap['squat'] ?? [],
      bench: dataMap['bench'] ?? [],
      deadlift: dataMap['deadlift'] ?? [],
      accessory: dataMap['accessory'] ?? [],
    }),
    [dataMap]
  );

  const { effectiveBaselineNames, effectiveTargetNames } = useMemo(() => {
    const baseline: Partial<Record<LiftType, string>> = {};
    const target: Partial<Record<LiftType, string>> = {};
    for (const tab of LIFT_TABS) {
      const baselineName = defaultBaselineName(tabRows[tab]);
      if (baselineName) {
        baseline[tab] = baselineName;
      }
      const t = tabState[tab].targetName ?? defaultCompExerciseName(tabRows[tab]);
      if (t) {
        target[tab] = t;
      }
    }
    return { effectiveBaselineNames: baseline, effectiveTargetNames: target };
  }, [tabRows, tabState]);

  const stats = useLastSessionStats(pairs, effectiveBaselineNames);

  const tabs = [...MAIN_TABS, ...(tabRows.accessory.length > 0 ? [ACCESSORY_TAB] : [])];

  const liftTab: LiftType | null =
    activeTab !== 'calculator' && activeTab !== 'sigma' ? activeTab : null;

  const activeRows = useMemo(() => (liftTab ? tabRows[liftTab] : []), [liftTab, tabRows]);

  const calcPairs = useMemo(
    () => LIFT_TABS.flatMap((tab) => applyFilters(tabRows[tab], tabState[tab].filters)),
    [tabRows, tabState]
  );

  const filteredRows = useMemo(
    () => (liftTab ? calcPairs.filter(([ex]) => ex.type === liftTab) : []),
    [calcPairs, liftTab]
  );

  const chartStats = useLastSessionStats(filteredRows, effectiveBaselineNames);

  function handleUrlChange(newUrl: string) {
    setUrl(newUrl);
    setPanelForcedOpen(false);
    setShownResetToken((t) => t + 1);
    setTabState(initialTabState());
  }

  function toggleFilter(facet: keyof FilterState, value: string) {
    if (!liftTab) {
      return;
    }
    setTabState((prev) => ({
      ...prev,
      [liftTab]: {
        ...prev[liftTab],
        filters: {
          ...prev[liftTab].filters,
          [facet]: toggleInSet(prev[liftTab].filters[facet], value),
        },
      },
    }));
  }

  function clearFilters() {
    if (!liftTab) {
      return;
    }
    setTabState((prev) => ({
      ...prev,
      [liftTab]: { ...prev[liftTab], filters: emptyFilters() },
    }));
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'left' }}>
      <SheetUrlPanel
        showUrlPanel={showUrlPanel}
        url={url}
        loaded={state.status === 'success'}
        invalidUrl={invalidUrl}
        onUrlChange={handleUrlChange}
        onForceOpen={() => setPanelForcedOpen(true)}
        onCancel={() => setPanelForcedOpen(false)}
      />

      <div style={{ marginTop: '1rem' }}>
        {url.length === 0 && <GettingStarted />}
        {state.status === 'loading' && <p>Loading…</p>}
        {state.status === 'error' && (
          <p style={{ color: 'red' }}>
            {state.message}{' '}
            <a href="?page=validator" style={{ color: 'var(--accent)' }}>
              Check your spreadsheet format
            </a>
          </p>
        )}
        {state.status === 'success' && (
          <>
            <div
              style={{
                display: 'flex',
                gap: '1.5rem',
                borderBottom: '2px solid var(--border)',
                marginBottom: '1rem',
              }}
            >
              {[
                { id: 'sigma' as const, label: 'Σ' },
                ...tabs,
                { id: 'calculator' as const, label: 'Calculator' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom:
                      activeTab === id ? '2px solid var(--accent)' : '2px solid transparent',
                    marginBottom: '-2px',
                    padding: '0.4rem 0',
                    cursor: 'pointer',
                    fontWeight: activeTab === id ? 700 : 400,
                    fontSize: '1rem',
                    color: activeTab === id ? 'var(--accent)' : 'var(--text-h)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {activeTab === 'calculator' ? (
              <>
                <RepCalculator
                  pairs={calcPairs}
                  baselineNames={effectiveBaselineNames}
                  stats={stats}
                />
              </>
            ) : activeTab === 'sigma' ? (
              <SigmaTab
                pairs={pairs}
                effectiveBaselineNames={effectiveBaselineNames}
                effectiveTargetNames={effectiveTargetNames}
              />
            ) : liftTab !== null ? (
              <>
                <ExerciseFilters
                  rows={activeRows}
                  filters={tabState[liftTab].filters}
                  onToggle={toggleFilter}
                  onClearAll={clearFilters}
                />
                <LiftTabPanel
                  key={shownResetToken}
                  filteredRows={filteredRows}
                  effectiveBaselineNames={effectiveBaselineNames}
                  chartStats={chartStats}
                  targetName={effectiveTargetNames[liftTab] ?? null}
                  onTargetChange={(name) =>
                    setTabState((prev) => ({
                      ...prev,
                      [liftTab]: { ...prev[liftTab], targetName: name ?? undefined },
                    }))
                  }
                  deadliftStance={deadliftStance}
                  onDeadliftStanceChange={setDeadliftStance}
                />
              </>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
