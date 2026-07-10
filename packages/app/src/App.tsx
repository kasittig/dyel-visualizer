import { useState, useMemo, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import type { AthleteContext } from '@dyel/pipeline';
import { runPipelineModel } from '@dyel/pipeline';
import clsx from 'clsx';
import { PipelineProvider } from './context/PipelineContext';
import { RepCalculator } from './components/shared/RepCalculator';
import { StrengthScoreCalculator } from './components/shared/StrengthScoreCalculator';
import { SigmaTab } from './components/pages/SigmaTab';
import { LiftTabPanel } from './components/pages/LiftTabPanel';
import { SheetUrlPanel } from './components/shared/SheetUrlPanel';
import { GettingStarted } from './components/pages/GettingStarted';
import { DateRangePicker } from './components/shared/DateRangePicker';
import {
  calculateVolumeCorrelationFromTagged,
  parseTextData,
  groupByLiftType,
  defaultCompExerciseCanonical,
} from '@dyel/api';
import type { LiftType } from '@dyel/api';
import { useLocalStorageState } from './hooks/infra/useLocalStorageState';
import { extractSheetRef, MAIN_TABS, LIFT_TABS } from './utils/appUtils';
import type { InputMode, PageTab, DeadliftStancePreference } from './utils/appUtils';
import { useResolvedRawInput } from './utils/rawInputUtils';
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
  const [deadliftStance, setDeadliftStance] = useLocalStorageState<DeadliftStancePreference>(
    'dyel:deadliftStance',
    'sumo'
  );

  const athlete: AthleteContext = useMemo(
    () => ({
      sex: 'M',
      bodyweight: 80,
      deadliftStance,
    }),
    [deadliftStance]
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

  // Resolve raw input (CSV fetch or pasted text)
  const { status: rawStatus, raw } = useResolvedRawInput(inputMode, url, pastedText, refreshToken);

  // Compute pipeline model from resolved raw input
  const { status: pipelineStatus, model } = useMemo(() => {
    if (rawStatus === 'idle' || rawStatus === 'loading') {
      return { status: rawStatus as Extract<typeof rawStatus, 'idle' | 'loading'>, model: null };
    }
    if (rawStatus === 'error') {
      return { status: 'error', model: null };
    }

    // status === 'success'
    try {
      const pipelineModel = runPipelineModel(raw, athlete);
      return { status: 'success', model: pipelineModel };
    } catch {
      return { status: 'error', model: null };
    }
  }, [raw, athlete, rawStatus]);

  // Cache resolved raw input for instant restore on revisit
  useEffect(() => {
    if (pipelineStatus === 'success' && raw.length > 0 && sheetRef && inputMode === 'url') {
      setCachedSheetData({ sheetKey: url, raw });
    }
  }, [pipelineStatus, raw, sheetRef, url, inputMode, setCachedSheetData]);

  // Use cached raw if available for URL mode and current fetch hasn't completed yet
  const effectiveRaw = useMemo(() => {
    if (rawStatus === 'success' || rawStatus === 'loading' || inputMode === 'text') {
      return raw;
    }
    if (cachedSheetData && cachedSheetData.sheetKey === url) {
      return cachedSheetData.raw;
    }
    return raw;
  }, [rawStatus, raw, cachedSheetData, url, inputMode]);

  // Recompute model if using cached raw
  const effectiveModel = useMemo(() => {
    if (pipelineStatus === 'success') {
      return model;
    }
    if (
      (rawStatus === 'idle' || rawStatus === 'loading') &&
      effectiveRaw !== raw &&
      effectiveRaw.length > 0
    ) {
      try {
        return runPipelineModel(effectiveRaw, athlete);
      } catch {
        return null;
      }
    }
    return null;
  }, [pipelineStatus, model, rawStatus, effectiveRaw, raw, athlete]);

  let effectiveStatus: 'idle' | 'loading' | 'success' | 'error';
  if (pipelineStatus === 'success') {
    effectiveStatus = 'success';
  } else if (effectiveModel !== null) {
    // Use cached model if pipeline hasn't completed yet
    effectiveStatus = 'success';
  } else if (pipelineStatus === 'error') {
    effectiveStatus = 'error';
  } else {
    // idle or loading
    effectiveStatus = pipelineStatus as 'idle' | 'loading';
  }

  // Handle text mode with parseTextData for validation messaging
  const textValidation = useMemo(() => {
    if (inputMode !== 'text' || pastedText.trim().length === 0) {
      return { hasText: false, isValid: false };
    }
    const textPairs = parseTextData(pastedText);
    return { hasText: true, isValid: textPairs.length > 0 };
  }, [inputMode, pastedText]);

  const showUrlPanel = panelForcedOpen || effectiveStatus !== 'success';

  // Build tabRows from pipeline model
  const tabRows = useMemo(() => {
    const tagged = effectiveModel?.tagged ?? [];
    return groupByLiftType(tagged);
  }, [effectiveModel]);

  // Compute effective baseline/target names using new pipeline-native function
  const effectiveBaselineCanonicals = useMemo(() => {
    const baseline: Partial<Record<LiftType, string>> = {};
    for (const liftType of LIFT_TABS) {
      const canonical = defaultCompExerciseCanonical(tabRows[liftType].all, deadliftStance);
      if (canonical) {
        baseline[liftType] = canonical;
      }
    }
    return baseline;
  }, [tabRows, deadliftStance]);

  const effectiveTargetCanonicals = useMemo(() => {
    const target: Partial<Record<LiftType, string>> = {};
    for (const liftType of LIFT_TABS) {
      const canonical = defaultCompExerciseCanonical(tabRows[liftType].all, deadliftStance);
      if (canonical) {
        target[liftType] = canonical;
      }
    }
    return target;
  }, [tabRows, deadliftStance]);

  // Filter visible tabs based on date range
  const tabs = MAIN_TABS.filter(({ id }) => {
    const records = tabRows[id].all;
    // Convert epoch ms dates to Date objects for filterByDateRange
    const datesInRange = records.filter((rec) => {
      const recDate = new Date(rec.date);
      if (dateRange.from && recDate < dateRange.from) {
        return false;
      }
      if (dateRange.to) {
        const dayEnd = new Date(
          dateRange.to.getFullYear(),
          dateRange.to.getMonth(),
          dateRange.to.getDate(),
          23,
          59,
          59,
          999
        );
        if (recDate > dayEnd) {
          return false;
        }
      }
      return true;
    });
    return datesInRange.length > 0;
  });

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

  // Compute volume by date
  const volumeRecords = useMemo(() => {
    return [
      ...tabRows.squat.volume,
      ...tabRows.bench.volume,
      ...tabRows.deadlift.volume,
      ...tabRows.accessory.volume,
    ];
  }, [tabRows]);

  // Determine display unit from first record's raw unit (metadata)
  const dataUnit = useMemo(() => {
    for (const liftType of LIFT_TABS) {
      for (const rec of tabRows[liftType].all) {
        if (rec.meta?.rawUnit) {
          return (rec.meta.rawUnit === 'lbs' ? 'lbs' : 'kg') as 'lbs' | 'kg';
        }
      }
    }
    return 'lbs';
  }, [tabRows]);

  const volumeByDate = useMemo(() => {
    return calculateVolumeCorrelationFromTagged(volumeRecords, dataUnit);
  }, [volumeRecords, dataUnit]);

  // Collect all maxEffort records and session dates for sigma tab
  const { allSessionDates, lastSessionDate } = useMemo(() => {
    const allRecords = [
      ...tabRows.squat.maxEffort,
      ...tabRows.bench.maxEffort,
      ...tabRows.deadlift.maxEffort,
      ...tabRows.accessory.maxEffort,
    ];
    const seen = new Set<string>();
    const dates: Date[] = [];
    let last: Date | null = null;

    for (const rec of allRecords) {
      const recDate = new Date(rec.date);
      if (!last || recDate > last) {
        last = recDate;
      }
      const key = recDate.toDateString();
      if (!seen.has(key)) {
        seen.add(key);
        dates.push(recDate);
      }
    }

    return { allSessionDates: dates, lastSessionDate: last };
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

  function handleUrlChange(newUrl: string) {
    setUrl(newUrl);
    setPanelForcedOpen(false);
    setShownResetToken((t) => t + 1);
  }

  function handleTextChange(newText: string) {
    setPastedText(newText);
    setPanelForcedOpen(false);
    setShownResetToken((t) => t + 1);
  }

  function handleModeChange(newMode: InputMode) {
    setInputMode(newMode);
    setShownResetToken((t) => t + 1);
  }

  return (
    <main className={styles.main}>
      <SheetUrlPanel
        showUrlPanel={showUrlPanel}
        url={url}
        loaded={effectiveStatus === 'success'}
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

      <PipelineProvider status={effectiveStatus} model={effectiveModel}>
        <div className={styles.content}>
          {inputMode === 'url' && url.length === 0 && <GettingStarted mode="url" />}
          {inputMode === 'text' && pastedText.length === 0 && <GettingStarted mode="text" />}
          {effectiveStatus === 'loading' && <p>Loading…</p>}
          {effectiveStatus === 'error' && (
            <p className={styles.errorMsg}>
              {inputMode === 'text' && !textValidation.isValid
                ? 'No usable exercise lines found. Try one exercise per line, e.g. "comp squat 1rm 300lbs".'
                : 'Failed to load data — check the URL and try again.'}
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
          {effectiveStatus === 'success' && (
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
                    <RepCalculator tabRows={tabRows} baselineNames={effectiveBaselineCanonicals} />
                  </div>
                  <div>
                    <StrengthScoreCalculator dateRange={dateRange} unit={dataUnit} />
                  </div>
                </div>
              ) : effectiveActiveTab === 'sigma' ? (
                <SigmaTab
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  unit={dataUnit}
                  volumeByDate={volumeByDate}
                />
              ) : liftTab !== null ? (
                <LiftTabPanel
                  key={shownResetToken}
                  liftType={liftTab}
                  targetName={effectiveTargetCanonicals[liftTab]!}
                  deadliftStance={deadliftStance}
                  onDeadliftStanceChange={setDeadliftStance}
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  unit={dataUnit}
                />
              ) : null}
            </>
          )}
        </div>
      </PipelineProvider>
    </main>
  );
}
