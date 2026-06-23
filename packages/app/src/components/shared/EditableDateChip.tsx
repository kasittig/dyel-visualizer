import { useState, useEffect, useRef } from 'react';
import type React from 'react';
import type { DateRange } from 'react-day-picker';
import styles from './EditableDateChip.module.css';
import { formatDate, parseDate } from '../../utils/dateUtils';

function shortDate(d: Date | undefined): string {
  if (!d) {
    return '';
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function EditableDateChip({
  dateRange,
  onDateRangeChange,
}: {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [fromText, setFromText] = useState(() => formatDate(dateRange.from));
  const [toText, setToText] = useState(() => formatDate(dateRange.to));
  const fromRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isEditing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFromText(formatDate(dateRange.from));
      setToText(formatDate(dateRange.to));
    }
  }, [dateRange.from, dateRange.to, isEditing]);

  useEffect(() => {
    if (isEditing) {
      fromRef.current?.focus();
      fromRef.current?.select();
    }
  }, [isEditing]);

  function commit(overrideFrom?: string, overrideTo?: string) {
    const from = parseDate(overrideFrom ?? fromText);
    const to = parseDate(overrideTo ?? toText);
    if (from && to) {
      onDateRangeChange({ from, to });
    } else {
      setFromText(formatDate(dateRange.from));
      setToText(formatDate(dateRange.to));
    }
    setIsEditing(false);
  }

  function cancel() {
    setFromText(formatDate(dateRange.from));
    setToText(formatDate(dateRange.to));
    setIsEditing(false);
  }

  function handleContainerBlur(e: React.FocusEvent) {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      commit();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      commit();
    }
    if (e.key === 'Escape') {
      cancel();
    }
  }

  const displayLabel =
    dateRange.from && dateRange.to
      ? `${shortDate(dateRange.from)} – ${shortDate(dateRange.to)}`
      : null;

  if (!displayLabel) {
    return null;
  }

  if (!isEditing) {
    return (
      <span
        className="tab-title-date"
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        style={{ cursor: 'text' }}
        title="Click to edit date range"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter' || e.key === ' ') {
            setIsEditing(true);
          }
        }}
      >
        {displayLabel}
      </span>
    );
  }

  return (
    <span
      ref={containerRef}
      className={styles.editWrapper}
      onBlur={handleContainerBlur}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        ref={fromRef}
        className={styles.editInput}
        value={fromText}
        onChange={(e) => setFromText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="M/D/YYYY"
        aria-label="Start date"
      />
      <span className={styles.sep}>–</span>
      <input
        className={styles.editInput}
        value={toText}
        onChange={(e) => setToText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="M/D/YYYY"
        aria-label="End date"
      />
    </span>
  );
}
