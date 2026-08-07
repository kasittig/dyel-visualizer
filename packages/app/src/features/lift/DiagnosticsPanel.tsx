import { useState, type CSSProperties } from 'react';
import { usePipelineDiagnostics, type DiagnosticRow } from './usePipelineDiagnostics';
import type { DisplayUnit, DiagnosticVariant } from '@dyel/api';
import { CollapsibleSection, TableCard } from '../../shared/components';
import { useSortableRows } from '../../shared/hooks';
import styles from './DiagnosticsPanel.module.css';

const LABELS = {
  optimal: ['On target', 'var(--success)'],
  overperforming: ['Above expected', 'var(--warning)'],
  weakness: ['Below expected', 'var(--danger)'],
  stale: ['Outdated', 'var(--muted)'],
} satisfies Record<DiagnosticVariant['status'], readonly [string, string]>;

const FITTED_LABELS = {
  optimal: 'Within target range',
  overperforming: 'Above target range',
  weakness: 'Below target range',
} satisfies Record<NonNullable<DiagnosticVariant['fittedStatus']>, string>;

type SortColumn = 'variation' | 'effects' | 'evidence' | 'diagnostic';

export function DiagnosticsPanel({
  onVariationClick,
  highlightedVariation,
  liftType,
  unit,
}: {
  onVariationClick?: (name: string | null) => void;
  highlightedVariation?: string | null;
  liftType: string;
  unit: DisplayUnit;
}) {
  const [activeEffect, setActiveEffect] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set());
  const { variants, effectEvidence, needsData, attentionSummary, priorityFindings } =
    usePipelineDiagnostics(liftType, unit);
  const rows = variants;
  const { sortedRows, sortKey, direction, toggleSort } = useSortableRows<DiagnosticRow, SortColumn>(
    rows,
    {
      variation: (r) => r.displayName,
      effects: (r) => r.effectsDisplay,
      evidence: (r) => r.averageIndex,
      diagnostic: (r) => LABELS[r.status][0],
    },
    (r) => r.displayName
  );

  if (variants.length === 0 && needsData.length === 0) {
    return null;
  }

  const handleEffectClick = (e: string) => {
    setActiveEffect((prev) => (prev === e ? null : e));
    onVariationClick?.(null);
  };

  const toggleRow = (canonical: string) => {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(canonical)) {
        next.delete(canonical);
      } else {
        next.add(canonical);
      }
      return next;
    });
  };

  return (
    <div className={styles.wrapper}>
      <CollapsibleSection
        label="Diagnostics"
        persistenceId={`visualizer:${liftType}:diagnostics`}
        summary={`${variants.length} variation${variants.length === 1 ? '' : 's'} · ${attentionSummary.belowCount} below expected · ${attentionSummary.aboveCount} above expected · ${needsData.length} need data`}
      >
        <TableCard>
          {variants.length > 0 && (
            <section
              className={styles.attention}
              aria-labelledby={`diagnostic-${liftType}-attention`}
            >
              <span className={styles.attentionEyebrow}>What needs attention</span>
              <h3 id={`diagnostic-${liftType}-attention`}>
                {attentionSummary.belowCount === 0 && attentionSummary.aboveCount === 0
                  ? 'No current findings need attention'
                  : `${attentionSummary.belowCount} variation${attentionSummary.belowCount === 1 ? '' : 's'} below expected · ${attentionSummary.aboveCount} variation${attentionSummary.aboveCount === 1 ? '' : 's'} above expected`}
              </h3>
              {attentionSummary.leadingBelowEffectDisplay && (
                <p>
                  <strong>{attentionSummary.leadingBelowEffectDisplay}</strong> appears in{' '}
                  {attentionSummary.leadingBelowEffectCount} below-expected{' '}
                  {attentionSummary.leadingBelowEffectCount === 1 ? 'variation' : 'variations'}.
                </p>
              )}
              {priorityFindings.length > 0 && (
                <ol className={styles.priorities} aria-label="Highest-priority diagnostic findings">
                  {priorityFindings.slice(0, 3).map((finding) => (
                    <li key={finding.canonical}>
                      <strong>{finding.title}</strong>
                      <span>{finding.confidence}</span>
                      <small>{finding.detail}</small>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}
          {effectEvidence.length > 0 && (
            <div className={styles.cardPadded}>
              <div
                className={styles.summary}
                role="group"
                aria-label="Highlight by effect evidence"
              >
                <span className={styles.summaryLabel}>Effect evidence</span>
                <div className={styles.summaryRow}>
                  {effectEvidence.map((item) => (
                    <button
                      type="button"
                      key={item.effect}
                      className={`${styles.chip} ${activeEffect === item.effect ? styles.chipActive : item.belowCount > 0 && item.aboveCount > 0 ? styles.chipMixed : item.belowCount > 0 ? styles.chipDanger : styles.chipWarning}`}
                      onClick={() => handleEffectClick(item.effect)}
                      aria-pressed={activeEffect === item.effect}
                    >
                      <span>{item.label}</span>
                      <small>
                        {item.belowCount} below · {item.aboveCount} above
                      </small>
                    </button>
                  ))}
                </div>
              </div>
              <span className={styles.srOnly} aria-live="polite">
                {activeEffect
                  ? `${effectEvidence.find((item) => item.effect === activeEffect)?.label} highlights ${effectEvidence.find((item) => item.effect === activeEffect)?.belowCount ?? 0} below-expected and ${effectEvidence.find((item) => item.effect === activeEffect)?.aboveCount ?? 0} above-expected variations.`
                  : 'No effect highlighted.'}
              </span>
            </div>
          )}
          {variants.length > 0 && (
            <div className={styles.sortBar} aria-label="Sort diagnostics">
              <span>Sort by</span>
              {(
                [
                  ['diagnostic', 'Status'],
                  ['evidence', 'Index'],
                  ['variation', 'Variation'],
                ] as const
              ).map(([column, label]) => (
                <button
                  type="button"
                  key={column}
                  className={`${styles.sortButton} ${sortKey === column ? styles.sortButtonActive : ''}`}
                  onClick={() => toggleSort(column)}
                  aria-pressed={sortKey === column}
                  aria-label={
                    sortKey === column
                      ? `${label}, sorted ${direction === 'asc' ? 'ascending' : 'descending'}`
                      : `Sort by ${label}`
                  }
                >
                  {label}
                  {sortKey === column && (
                    <span aria-hidden="true"> {direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {variants.length > 0 && (
            <div className={styles.findings} role="list">
              {sortedRows.map((r) => {
                const [lbl, color] = LABELS[r.status];
                const isCollapsed = !expandedRows.has(r.canonical);
                const detailId = `diagnostic-${r.canonical}-details`;
                const isHigh =
                  r.displayName === highlightedVariation ||
                  (activeEffect !== null &&
                    (r.status === 'weakness' || r.status === 'overperforming') &&
                    r.effects.includes(activeEffect));
                return (
                  <div
                    role="listitem"
                    key={r.displayName}
                    className={`${styles.finding} ${isHigh ? styles.findingSelected : ''}`}
                    style={{ '--diagnostic-color': color } as CSSProperties}
                  >
                    <button
                      type="button"
                      className={styles.findingToggle}
                      aria-expanded={!isCollapsed}
                      aria-controls={detailId}
                      aria-label={`${r.displayName}: ${lbl}${r.status === 'stale' ? `, last tested ${r.ageDisplay}` : ''}. ${isCollapsed ? 'Expand' : 'Collapse'} diagnostic`}
                      onClick={() => toggleRow(r.canonical)}
                    >
                      <span className={styles.variationName}>
                        {r.displayName}
                        {r.isCompLift && (
                          <span className={styles.compBadge} title="Competition variant">
                            🏆
                          </span>
                        )}
                        {r.isSymptomLimited && (
                          <span className={styles.symptomBadge}>Symptom-limited</span>
                        )}
                      </span>
                      {r.status === 'stale' && (
                        <span className={styles.staleAge}>Last tested {r.ageDisplay}</span>
                      )}
                      <span className={styles.status}>{lbl}</span>
                      <span className={styles.collapseIcon} aria-hidden="true">
                        {isCollapsed ? '＋' : '−'}
                      </span>
                    </button>
                    {!isCollapsed && (
                      <button
                        type="button"
                        id={detailId}
                        className={styles.findingDetails}
                        onClick={() => {
                          setActiveEffect(null);
                          onVariationClick?.(r.displayName);
                        }}
                      >
                        <span className={styles.comparison}>
                          <span className={styles.actual}>
                            {r.actualE1rmDisplay}
                            <small>latest e1RM</small>
                          </span>
                          <span className={styles.arrow} aria-hidden="true">
                            →
                          </span>
                          <span className={styles.expected}>
                            {r.expectedE1rmDisplay}
                            <small>expected e1RM</small>
                          </span>
                          <span className={styles.comparisonContext}>
                            <strong>{r.deltaDisplay}</strong>
                            <span>Fitted index {r.averageIndex.toFixed(1)}%</span>
                            <span>Target range {r.expectedBaseline ?? 'within ±5%'}</span>
                            {r.fittedStatus && <span>{FITTED_LABELS[r.fittedStatus]}</span>}
                          </span>
                        </span>
                        <span className={styles.findingFooter}>
                          <span className={styles.effects}>{r.effectsDisplay}</span>
                          <span className={styles.recency}>
                            Tested {r.ageDisplay === 'Today' ? 'today' : r.ageDisplay}
                            {r.status === 'stale' && <strong> · Retest recommended</strong>}
                          </span>
                        </span>
                        <span className={styles.provenance}>
                          <span>
                            <strong>Latest</strong>
                            {r.latestDateDisplay} · {r.latestSetDisplay} · {r.actualE1rmDisplay}{' '}
                            e1RM
                          </span>
                          <span>
                            <strong>Recent trend</strong>
                            {r.trendDisplay}
                          </span>
                          <span>
                            <strong>Evidence</strong>
                            {r.observationDisplay}
                          </span>
                          <span className={styles.provenanceWide}>
                            <strong>Expected calculation</strong>
                            {r.calculationDisplay}
                          </span>
                          <span className={styles.provenanceWide}>
                            <strong>Why this status</strong>
                            {r.rationaleDisplay}
                          </span>
                          {r.symptomContextDisplay.length > 0 && (
                            <span className={styles.provenanceWide}>
                              <strong>Session symptom context</strong>
                              {r.symptomContextDisplay.join(' · ')}
                            </span>
                          )}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {needsData.length > 0 && (
            <section
              className={styles.needsData}
              aria-labelledby={`diagnostic-${liftType}-needs-data`}
            >
              <div className={styles.needsDataHeader}>
                <h3 id={`diagnostic-${liftType}-needs-data`}>Needs data</h3>
                <span>{needsData.length}</span>
              </div>
              <div role="list">
                {needsData.map((item) => (
                  <div className={styles.needRow} role="listitem" key={item.canonical}>
                    <span className={styles.needName}>{item.displayName}</span>
                    <span className={styles.needReason}>{item.reasonDisplay}</span>
                    <span className={styles.needAction}>{item.actionDisplay}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </TableCard>
      </CollapsibleSection>
    </div>
  );
}
