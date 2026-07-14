import { useState, useEffect, useRef } from 'react';
import type { DateRange } from 'react-day-picker';
import { formatDate, parseDate, shortDate } from '../dateUtils';
import styles from './EditableDateChip.module.css';

export function EditableDateChip({
  dateRange,
  onDateRangeChange,
}: {
  dateRange: DateRange;
  onDateRangeChange: (r: DateRange) => void;
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

  const reset = () => {
    setFromText(formatDate(dateRange.from));
    setToText(formatDate(dateRange.to));
    setIsEditing(false);
  };

  const commit = () => {
    const from = parseDate(fromText);
    const to = parseDate(toText);
    if (from && to) {
      onDateRangeChange({ from, to });
      setIsEditing(false);
    } else {
      reset();
    }
  };

  if (!dateRange.from || !dateRange.to) {
    return null;
  }

  if (!isEditing) {
    return (
      <span
        className="tab-title-date"
        style={{ cursor: 'text' }}
        title="Click to edit date range"
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter' || e.key === ' ') {
            setIsEditing(true);
          }
        }}
      >
        {`${shortDate(dateRange.from)} – ${shortDate(dateRange.to)}`}
      </span>
    );
  }

  return (
    <span
      ref={containerRef}
      className={styles.editWrapper}
      onClick={(e) => e.stopPropagation()}
      onBlur={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
          commit();
        }
      }}
    >
      <input
        ref={fromRef}
        className={styles.editInput}
        value={fromText}
        onChange={(e) => setFromText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit();
          }
          if (e.key === 'Escape') {
            reset();
          }
        }}
        placeholder="M/D/YYYY"
        aria-label="Start date"
      />
      <span className={styles.sep}>–</span>
      <input
        className={styles.editInput}
        value={toText}
        onChange={(e) => setToText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit();
          }
          if (e.key === 'Escape') {
            reset();
          }
        }}
        placeholder="M/D/YYYY"
        aria-label="End date"
      />
    </span>
  );
}
