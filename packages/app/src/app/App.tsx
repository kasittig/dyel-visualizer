import { useEffect } from 'react';
import clsx from 'clsx';
import { PipelineProvider } from './PipelineContext';
import { RepCalculator } from '../features/calculator/RepCalculator';
import { StrengthScoreCalculator } from '../features/calculator/StrengthScoreCalculator';
import { SigmaTab } from '../features/sigma/SigmaTab';
import { LiftTabPanel } from '../features/lift/LiftTabPanel';
import { SheetUrlPanel } from '../features/data-source/SheetUrlPanel';
import { GettingStarted } from '../features/data-source/GettingStarted';
import { DateRangePicker } from '../shared/components/DateRangePicker';
import { defaultDateRangeFromLastSession } from '@dyel/api';
import type { LiftType } from '@dyel/api';
import { MAIN_TABS, type PageTab } from './appTabs';
import { useAppSettings } from './useAppSettings';
import { usePipelineOrchestration } from './usePipelineOrchestration';
import { useVisualizerData } from './useVisualizerData';
import styles from './App.module.css';

export function App() {
  const {
    url,
    inputMode,
    pastedText,
    panelForcedOpen,
    setPanelForcedOpen,
    refreshToken,
    setRefreshToken,
    activeTab,
    setActiveTab,
    shownResetToken,
    athleteBase,
    dateRange,
    setDateRange,
    handleUrlChange,
    handleTextChange,
    handleModeChange,
  } = useAppSettings();

  const {
    status: effStatus,
    model: effModel,
    invalidUrl,
    textValidation,
  } = usePipelineOrchestration(inputMode, url, pastedText, refreshToken, athleteBase);
  const {
    tabRows,
    visibleLiftIds,
    defaultCanonicals,
    dataUnit,
    volumeByDate,
    allSessionDates,
    lastSessionDate,
  } = useVisualizerData(effModel, dateRange);

  const showUrlPanel = panelForcedOpen || effStatus !== 'success';
  const tabs = MAIN_TABS.filter(({ id }) => visibleLiftIds.has(id));
  const effActiveTab: PageTab =
    activeTab !== 'sigma' &&
    activeTab !== 'calculator' &&
    !visibleLiftIds.has(activeTab as LiftType)
      ? 'sigma'
      : activeTab;
  const liftTab =
    effActiveTab !== 'calculator' && effActiveTab !== 'sigma' ? (effActiveTab as LiftType) : null;

  useEffect(() => {
    if (!lastSessionDate) {
      return;
    }
    setDateRange(defaultDateRangeFromLastSession(lastSessionDate));
  }, [lastSessionDate, setDateRange]);

  return (
    <main className={styles.main}>
      <SheetUrlPanel
        showUrlPanel={showUrlPanel}
        url={url}
        loaded={effStatus === 'success'}
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
      <PipelineProvider status={effStatus} model={effModel}>
        <div className={styles.content}>
          {inputMode === 'url' && url.length === 0 && <GettingStarted mode="url" />}
          {inputMode === 'text' && pastedText.length === 0 && <GettingStarted mode="text" />}
          {effStatus === 'loading' && <p>Loading…</p>}
          {effStatus === 'error' && (
            <p className={styles.errorMsg}>
              {inputMode === 'text' && !textValidation.isValid
                ? 'No usable exercise lines found. Try one exercise per line, e.g. "comp squat 1rm 300lbs".'
                : 'Failed to load data — check the URL and try again.'}
              {inputMode === 'url' && (
                <a href="?page=validator" className={styles.accentLink}>
                  {' '}
                  Check your spreadsheet format{' '}
                </a>
              )}
            </p>
          )}
          {effStatus === 'success' && (
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
                    className={clsx(styles.tab, effActiveTab === id && styles.tabActive)}
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
              {effActiveTab === 'calculator' ? (
                <div className={styles.calculatorRow}>
                  <div>
                    <RepCalculator tabRows={tabRows} baselineNames={defaultCanonicals} />
                  </div>
                  <div>
                    <StrengthScoreCalculator dateRange={dateRange} unit={dataUnit} />
                  </div>
                </div>
              ) : effActiveTab === 'sigma' ? (
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
                  targetName={defaultCanonicals[liftTab]!}
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
