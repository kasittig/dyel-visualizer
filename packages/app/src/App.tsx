import { useState, useMemo, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import clsx from 'clsx';
import { useConjugateData } from './hooks/conjugate/useConjugateData';
import type { ConjugateDataState } from './hooks/conjugate/useConjugateData';
import { RepCalculator } from './components/shared/RepCalculator';
import { StrengthScoreCalculator } from './components/shared/StrengthScoreCalculator';
import { SigmaTab } from './components/pages/SigmaTab';
import { LiftTabPanel } from './components/pages/LiftTabPanel';
import { SheetUrlPanel } from './components/shared/SheetUrlPanel';
import { GettingStarted } from './components/pages/GettingStarted';
import { DateRangePicker } from './components/shared/DateRangePicker';
import {
  filterByDateRange,
  buildChartData,
  calculateVolumeCorrelation,
  parseTextData,
} from '@dyel/core';
import type { DeadliftStancePreference, LiftType } from '@dyel/core';
import { useLastSessionStats } from './hooks/data/useLastSessionStats';
import { useBaselineTargetExercises } from './hooks/data/useBaselineTargetExercises';
import { useLocalStorageState } from './hooks/infra/useLocalStorageState';
import { extractSheetRef, initialTabState, MAIN_TABS } from './utils/appUtils';
import type { InputMode, PageTab, TabState } from './utils/appUtils';
import { buildTabRows, computeEffectiveNames, extractPairs } from './utils/appDataUtils';
import { serializeSheetCache, deserializeSheetCache } from './utils/sheetCacheUtils';
import type { CachedSheetData } from './utils/sheetCacheUtils';
import styles from './App.module.css';

export function App() {
  // Runs once, before the useLocalStorageState hooks below read from localStorage: an
  // explicit query param (e.g. a shared link) must override whatever was previously cached.
  useState(() => {
    const params = new URLSearchParams(window.location.search);
    const qUrl = params.get('sheet');
    const qMode = params.get('mode');
    const qText = params.get('text');
    if (qMode === 'text') {
      localStorage.setItem('dyel:inputMode', JSON.stringify('text'));
    } else if (qUrl !== null) {
      localStorage.setItem('dyel:inputMode', JSON.stringify('url'));
    }
    if (qUrl !== null) {
      localStorage.setItem('dyel:url', JSON.stringify(qUrl));
    }
    if (qText !== null) {
      localStorage.setItem('dyel:pastedText', JSON.stringify(qText));
    }
    return null;
  });

  const [url, setUrl] = useLocalStorageState<string>(
    'dyel:url',
    () => import.meta.env.VITE_SHEET_URL ?? ''
  );
  const [inputMode, setInputMode] = useLocalStorageState<InputMode>('dyel:inputMode', 'url');
  const [pastedText, setPastedText] = useLocalStorageState<string>('dyel:pastedText', '');
  const [panelForcedOpen, setPanelForcedOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [activeTab, setActiveTab] = useLocalStorageState<PageTab>('dyel:activeTab', 'sigma');
  const [shownResetToken, setShownResetToken] = useState(0);
  const [tabState, setTabState] = useLocalStorageState<Record<LiftType, TabState>>(
    'dyel:tabState',
    initialTabState
  );
  const [deadliftStance, setDeadliftStance] = useLocalStorageState<DeadliftStancePreference>(
    'dyel:deadliftStance',
    'sumo'
  );
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [cachedSheetData, setCachedSheetData] = useLocalStorageState<CachedSheetData | null>(
    'dyel:sheetDataCache',
    null,
    {
      serialize: (v) => (v === null ? 'null' : serializeSheetCache(v)),
      deserialize: (raw) => (raw === 'null' ? null : deserializeSheetCache(raw)),
    }
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (inputMode === 'text') {
      params.set('mode', 'text');
      params.delete('sheet');
      if (pastedText) {
        params.set('text', pastedText);
      } else {
        params.delete('text');
      }
    } else {
      params.delete('mode');
      params.delete('text');
      if (url) {
        params.set('sheet', url);
      } else {
        params.delete('sheet');
      }
    }
    history.replaceState(null, '', '?' + params.toString());
  }, [inputMode, url, pastedText]);

  const sheetRef = useMemo(() => extractSheetRef(url), [url]);
  const invalidUrl = url.length > 0 && !sheetRef;

  const sheetState = useConjugateData(sheetRef, '0', refreshToken);
  const loadedSheetPairs = sheetState.status === 'success' ? sheetState.pairs : null;

  useEffect(() => {
    if (loadedSheetPairs && sheetRef) {
      setCachedSheetData({ sheetKey: url, pairs: loadedSheetPairs });
    }
  }, [loadedSheetPairs, sheetRef, url, setCachedSheetData]);

  const effectiveSheetState: ConjugateDataState = useMemo(() => {
    if (sheetState.status === 'success' || sheetState.status === 'error') {
      return sheetState;
    }
    if (cachedSheetData && cachedSheetData.sheetKey === url) {
      return { status: 'success', pairs: cachedSheetData.pairs };
    }
    return sheetState;
  }, [sheetState, cachedSheetData, url]);

  const textPairs = useMemo(() => parseTextData(pastedText), [pastedText]);
  const textState: ConjugateDataState = useMemo(() => {
    if (pastedText.trim().length === 0) {
      return { status: 'idle' };
    }
    if (textPairs.length > 0) {
      return { status: 'success', pairs: textPairs };
    }
    return {
      status: 'error',
      message:
        'No usable exercise lines found. Try one exercise per line, e.g. "comp squat 1rm 300lbs".',
    };
  }, [pastedText, textPairs]);
  const state = inputMode === 'text' ? textState : effectiveSheetState;

  const showUrlPanel = panelForcedOpen || state.status !== 'success';

  const dataMap = useMemo(() => extractPairs(state), [state]);
  const tabRows = useMemo(() => buildTabRows(dataMap), [dataMap]);
  const { effectiveBaselineNames, effectiveTargetNames } = useMemo(
    () => computeEffectiveNames(tabRows, tabState, deadliftStance),
    [tabRows, tabState, deadliftStance]
  );

  const tabs = MAIN_TABS.filter(
    ({ id }) => filterByDateRange(tabRows[id].all, dateRange.from, dateRange.to).length > 0
  );

  const visibleLiftIds = new Set(tabs.map(({ id }) => id));
  const effectiveActiveTab: PageTab =
    activeTab !== 'sigma' &&
    activeTab !== 'calculator' &&
    !visibleLiftIds.has(activeTab as LiftType)
      ? 'sigma'
      : activeTab;

  const liftTab: LiftType | null =
    effectiveActiveTab !== 'calculator' && effectiveActiveTab !== 'sigma'
      ? effectiveActiveTab
      : null;

  const volumePairs = useMemo(() => {
    return [
      ...tabRows.squat.volume,
      ...tabRows.bench.volume,
      ...tabRows.deadlift.volume,
      ...tabRows.accessory.volume,
    ];
  }, [tabRows]);
  const volumeByDate = useMemo(() => {
    return calculateVolumeCorrelation(volumePairs);
  }, [volumePairs]);

  const { sigmaPairs, allSessionDates, lastSessionDate } = useMemo(() => {
    const allPairs = [
      ...tabRows.squat.maxEffort,
      ...tabRows.bench.maxEffort,
      ...tabRows.deadlift.maxEffort,
      ...tabRows.accessory.maxEffort,
    ];
    const seen = new Set<string>();
    const dates: Date[] = [];
    let last: Date | null = null;
    for (const [, session] of allPairs) {
      if (!last || session.date > last) {
        last = session.date;
      }
      const key = session.date.toDateString();
      if (!seen.has(key)) {
        seen.add(key);
        dates.push(session.date);
      }
    }
    return {
      sigmaPairs: [
        ...tabRows.squat.maxEffort,
        ...tabRows.bench.maxEffort,
        ...tabRows.deadlift.maxEffort,
      ],
      allSessionDates: dates,
      lastSessionDate: last,
    };
  }, [tabRows]);

  useEffect(() => {
    if (!lastSessionDate) {
      return;
    }
    const from = new Date(
      lastSessionDate.getFullYear(),
      lastSessionDate.getMonth() - 3,
      lastSessionDate.getDate()
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDateRange({ from, to: lastSessionDate });
  }, [lastSessionDate]);

  const filteredSigmaPairs = useMemo(
    () => filterByDateRange(sigmaPairs, dateRange.from, dateRange.to),
    [sigmaPairs, dateRange]
  );

  const sigmaStats = useLastSessionStats(filteredSigmaPairs, effectiveBaselineNames);
  const { baselineExByType, targetExByType } = useBaselineTargetExercises(
    filteredSigmaPairs,
    effectiveBaselineNames,
    effectiveTargetNames
  );

  const competitionTotal = useMemo(() => {
    const chartData = buildChartData(
      filteredSigmaPairs,
      baselineExByType,
      targetExByType,
      sigmaStats,
      volumeByDate
    );
    const last = [...chartData].reverse().find((p) => p.total !== undefined);
    return last !== undefined ? (last.total as number) : null;
  }, [filteredSigmaPairs, baselineExByType, targetExByType, sigmaStats, volumeByDate]);

  const dataUnit = filteredSigmaPairs[0]?.[1].unit ?? 'lbs';

  function handleUrlChange(newUrl: string) {
    setUrl(newUrl);
    setPanelForcedOpen(false);
    setShownResetToken((t) => t + 1);
    setTabState(initialTabState());
  }

  function handleTextChange(newText: string) {
    setPastedText(newText);
    setPanelForcedOpen(false);
    setShownResetToken((t) => t + 1);
    setTabState(initialTabState());
  }

  function handleModeChange(newMode: InputMode) {
    setInputMode(newMode);
    setShownResetToken((t) => t + 1);
    setTabState(initialTabState());
  }

  return (
    <main className={styles.main}>
      <SheetUrlPanel
        showUrlPanel={showUrlPanel}
        url={url}
        loaded={state.status === 'success'}
        invalidUrl={invalidUrl}
        onUrlChange={handleUrlChange}
        onForceOpen={() => setPanelForcedOpen(true)}
        onCancel={() => setPanelForcedOpen(false)}
        onRefresh={() => setRefreshToken((t) => t + 1)}
        mode={inputMode}
        onModeChange={handleModeChange}
        text={pastedText}
        onTextChange={handleTextChange}
      />

      <div className={styles.content}>
        {inputMode === 'url' && url.length === 0 && <GettingStarted mode="url" />}
        {inputMode === 'text' && pastedText.length === 0 && <GettingStarted mode="text" />}
        {state.status === 'loading' && <p>Loading…</p>}
        {state.status === 'error' && (
          <p className={styles.errorMsg}>
            {state.message}
            {inputMode === 'url' && (
              <>
                {' '}
                <a href="?page=validator" className={styles.accentLink}>
                  Check your spreadsheet format
                </a>
              </>
            )}
          </p>
        )}
        {state.status === 'success' && (
          <>
            <div className={styles.tabNav}>
              {[
                { id: 'sigma' as const, label: 'Σ' },
                ...tabs,
                { id: 'calculator' as const, label: 'Calculator' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={clsx(styles.tab, effectiveActiveTab === id && styles.tabActive)}
                >
                  {label}
                </button>
              ))}
              <div className={styles.tabSpacer} />
              <div className={styles.datePickerWrap}>
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  sessionDates={allSessionDates}
                />
              </div>
            </div>
            {effectiveActiveTab === 'calculator' ? (
              <div className={styles.calculatorRow}>
                <div>
                  <RepCalculator tabRows={tabRows} baselineNames={effectiveBaselineNames} />
                </div>
                <div>
                  <StrengthScoreCalculator competitionTotal={competitionTotal} unit={dataUnit} />
                </div>
              </div>
            ) : effectiveActiveTab === 'sigma' ? (
              <SigmaTab
                sigmaPairs={filteredSigmaPairs}
                sigmaStats={sigmaStats}
                volumeByDate={volumeByDate}
                effectiveBaselineNames={effectiveBaselineNames}
                effectiveTargetNames={effectiveTargetNames}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            ) : liftTab !== null ? (
              <LiftTabPanel
                key={shownResetToken}
                rows={tabRows[liftTab].maxEffort}
                effectiveBaselineNames={effectiveBaselineNames}
                liftType={liftTab}
                targetName={effectiveTargetNames[liftTab]!}
                baselineName={effectiveBaselineNames[liftTab]}
                deadliftStance={deadliftStance}
                onDeadliftStanceChange={setDeadliftStance}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                inputMode={inputMode}
                url={url}
                pastedText={pastedText}
                refreshToken={refreshToken}
                unit={dataUnit}
              />
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
