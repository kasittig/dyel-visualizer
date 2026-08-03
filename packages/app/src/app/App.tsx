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
import { PrimaryTabs } from './PrimaryTabs';
import { PRIMARY_TABPANEL_ID } from './appTabA11y';
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
    lastLiftTab,
    setLastLiftTab,
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
  const availableLastLift = visibleLiftIds.has(lastLiftTab)
    ? lastLiftTab
    : (tabs[0]?.id ?? 'squat');
  const mobileDestination =
    effActiveTab === 'sigma' ? 'overview' : effActiveTab === 'calculator' ? 'calculator' : 'lifts';
  const primaryTabs = [
    { id: 'sigma' as const, label: 'Σ', accessibleLabel: 'Overview' },
    ...tabs,
    { id: 'calculator' as const, label: 'Calculator' },
  ];
  const activeTabLabel =
    effActiveTab === 'sigma'
      ? 'Overview'
      : (primaryTabs.find(({ id }) => id === effActiveTab)?.label ?? 'Visualization');

  const selectLift = (lift: LiftType) => {
    setLastLiftTab(lift);
    setActiveTab(lift);
  };

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
              <PrimaryTabs
                tabs={primaryTabs}
                activeTab={effActiveTab}
                onSelect={setActiveTab}
                trailing={
                  <>
                    <div className={styles.tabSpacer} />
                    <div className={styles.datePickerWrap}>
                      <DateRangePicker
                        value={dateRange}
                        onChange={setDateRange}
                        sessionDates={allSessionDates}
                      />
                    </div>
                  </>
                }
              />
              <div className={styles.mobileTopControls}>
                <div className={styles.mobileScreenHeader}>
                  <span className={styles.mobileEyebrow}>
                    {mobileDestination === 'overview'
                      ? 'Σ Overview'
                      : mobileDestination === 'calculator'
                        ? 'Calculator'
                        : 'Lifts'}
                  </span>
                  <DateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                    sessionDates={allSessionDates}
                  />
                </div>
                {mobileDestination === 'lifts' && (
                  <div className={styles.liftSelector} role="tablist" aria-label="Choose lift">
                    {tabs.map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={effActiveTab === id}
                        className={clsx(
                          styles.liftSelectorTab,
                          effActiveTab === id && styles.liftSelectorTabActive
                        )}
                        onClick={() => selectLift(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div
                id={PRIMARY_TABPANEL_ID}
                role="tabpanel"
                aria-label={activeTabLabel}
                tabIndex={0}
              >
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
              </div>
              <nav className={styles.mobileNav} aria-label="Primary navigation">
                <button
                  type="button"
                  className={clsx(
                    styles.mobileNavItem,
                    mobileDestination === 'overview' && styles.mobileNavItemActive
                  )}
                  aria-current={mobileDestination === 'overview' ? 'page' : undefined}
                  onClick={() => setActiveTab('sigma')}
                >
                  <span className={styles.mobileNavSymbol} aria-hidden="true">
                    Σ
                  </span>
                  <span>Overview</span>
                </button>
                <button
                  type="button"
                  className={clsx(
                    styles.mobileNavItem,
                    mobileDestination === 'lifts' && styles.mobileNavItemActive
                  )}
                  aria-current={mobileDestination === 'lifts' ? 'page' : undefined}
                  onClick={() => selectLift(availableLastLift)}
                >
                  <span className={styles.mobileNavSymbol} aria-hidden="true">
                    ↟
                  </span>
                  <span>Lifts</span>
                </button>
                <button
                  type="button"
                  className={clsx(
                    styles.mobileNavItem,
                    mobileDestination === 'calculator' && styles.mobileNavItemActive
                  )}
                  aria-current={mobileDestination === 'calculator' ? 'page' : undefined}
                  onClick={() => setActiveTab('calculator')}
                >
                  <span className={styles.mobileNavSymbol} aria-hidden="true">
                    ±
                  </span>
                  <span>Calculator</span>
                </button>
              </nav>
            </>
          )}
        </div>
      </PipelineProvider>
    </main>
  );
}
