import { useEffect } from 'react';
import clsx from 'clsx';
import { PipelineProvider } from './PipelineContext';
import { StrengthScoreCalculator } from '../features/calculator/StrengthScoreCalculator';
import { SigmaTab } from '../features/sigma/SigmaTab';
import { AccessoryTabPanel, LiftTabPanel } from '../features/lift';
import { DateRangePicker } from '../shared/components/DateRangePicker';
import { defaultDateRangeFromLastSession } from '@dyel/api';
import type { LiftType } from '@dyel/api';
import { MAIN_TABS, type PageTab } from './appTabs';
import { useAppSettings } from './useAppSettings';
import { usePipelineOrchestration } from './usePipelineOrchestration';
import { useVisualizerData } from './useVisualizerData';
import { PrimaryTabs } from './PrimaryTabs';
import { PRIMARY_TABPANEL_ID, primaryTabId } from './appTabA11y';
import { CachedTrainingNotice, MyTrainingGate } from './MyTrainingState';
import { DataSetupPage } from '../features/data-source/DataSetupPage';
import { TrainingToolsPage } from '../features/training-tools';
import { useLocalStorageState } from '../shared/hooks';
import styles from './App.module.css';

const SHORT_DATE = new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric' });

export function App({
  destination = 'training',
}: {
  destination?: 'training' | 'setup' | 'tools';
}) {
  const [isTrainingPeriodExpanded, setIsTrainingPeriodExpanded] = useLocalStorageState(
    'dyel:training-period:expanded',
    false
  );
  const {
    url,
    inputMode,
    pastedText,
    refreshToken,
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
    setRefreshToken,
  } = useAppSettings();

  const {
    status: effStatus,
    requestStatus,
    lastUpdatedAt,
    isUsingCachedData,
    model: effModel,
    invalidUrl,
    requestError,
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

  const tabs = MAIN_TABS.filter(({ id }) => visibleLiftIds.has(id));
  const hasConfiguredSource =
    inputMode === 'url' ? url.trim().length > 0 : pastedText.trim().length > 0;
  const blockingState =
    effStatus === 'success'
      ? visibleLiftIds.size === 0
        ? 'empty'
        : null
      : effStatus === 'loading'
        ? 'loading'
        : effStatus === 'error' || invalidUrl
          ? 'error'
          : hasConfiguredSource
            ? 'loading'
            : 'unconnected';
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
    { id: 'sigma' as const, label: 'Σ Overview', accessibleLabel: 'Overview' },
    ...tabs,
    { id: 'calculator' as const, label: 'Strength score' },
  ];
  const trainingPeriodSummary = dateRange.from
    ? `${SHORT_DATE.format(dateRange.from)}${dateRange.to ? ` – ${SHORT_DATE.format(dateRange.to)}` : ''}`
    : 'Choose dates';

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

  if (destination === 'setup') {
    return (
      <DataSetupPage
        mode={inputMode}
        url={url}
        text={pastedText}
        status={effStatus}
        requestStatus={requestStatus}
        requestError={requestError}
        invalidUrl={invalidUrl}
        isUsingCachedData={isUsingCachedData}
        lastUpdatedAt={lastUpdatedAt}
        onModeChange={handleModeChange}
        onUrlChange={handleUrlChange}
        onTextChange={handleTextChange}
        onRefresh={() => setRefreshToken((token) => token + 1)}
      />
    );
  }

  if (destination === 'tools') {
    return (
      <PipelineProvider status={effStatus} model={effModel}>
        <TrainingToolsPage
          tabRows={tabRows}
          baselineNames={defaultCanonicals}
          connected={effStatus === 'success' && visibleLiftIds.size > 0}
        />
      </PipelineProvider>
    );
  }

  return (
    <main className={styles.main}>
      <PipelineProvider status={effStatus} model={effModel}>
        <div className={styles.content}>
          {blockingState && <MyTrainingGate state={blockingState} />}
          {!blockingState && (
            <>
              {isUsingCachedData && (
                <CachedTrainingNotice requestStatus={requestStatus} lastUpdatedAt={lastUpdatedAt} />
              )}
              <div className={styles.controlDock}>
                <PrimaryTabs tabs={primaryTabs} activeTab={effActiveTab} onSelect={setActiveTab} />
                <section
                  className={clsx(
                    styles.filterToolbar,
                    !isTrainingPeriodExpanded && styles.filterToolbarCollapsed
                  )}
                  role="toolbar"
                  aria-labelledby="training-period-label"
                >
                  <button
                    type="button"
                    className={styles.filterToggle}
                    aria-expanded={isTrainingPeriodExpanded}
                    aria-controls="training-period-controls"
                    onClick={() => setIsTrainingPeriodExpanded((expanded) => !expanded)}
                  >
                    <span className={styles.filterToggleIcon} aria-hidden="true">
                      {isTrainingPeriodExpanded ? '▾' : '▸'}
                    </span>
                    <span className={styles.filterDescription}>
                      <span id="training-period-label" className={styles.filterLabel}>
                        Training period
                      </span>
                      <span className={styles.filterScope}>
                        {isTrainingPeriodExpanded
                          ? 'Applies to all charts and calculations'
                          : trainingPeriodSummary}
                      </span>
                    </span>
                  </button>
                  {isTrainingPeriodExpanded && (
                    <div id="training-period-controls" className={styles.datePickerWrap}>
                      <DateRangePicker
                        value={dateRange}
                        onChange={setDateRange}
                        sessionDates={allSessionDates}
                      />
                    </div>
                  )}
                </section>
              </div>
              <div className={styles.mobileTopControls}>
                <div className={styles.mobileScreenHeader}>
                  <span className={styles.mobileEyebrow}>
                    {mobileDestination === 'overview'
                      ? 'Σ Overview'
                      : mobileDestination === 'calculator'
                        ? 'Strength score'
                        : 'Lifts'}
                  </span>
                  <DateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                    sessionDates={allSessionDates}
                    scopeLabel="Applies to all visualization tabs"
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
                aria-labelledby={primaryTabId(effActiveTab)}
                tabIndex={0}
              >
                {effActiveTab === 'calculator' ? (
                  <div className={styles.calculatorWorkspace}>
                    <StrengthScoreCalculator
                      dateRange={dateRange}
                      unit={dataUnit}
                      collapsible={false}
                    />
                  </div>
                ) : effActiveTab === 'sigma' ? (
                  <SigmaTab
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                    unit={dataUnit}
                    volumeByDate={volumeByDate}
                  />
                ) : liftTab === 'accessory' ? (
                  <AccessoryTabPanel
                    key={shownResetToken}
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                    unit={dataUnit}
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
              <nav className={styles.mobileNav} aria-label="My Training views">
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
