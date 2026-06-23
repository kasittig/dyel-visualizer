import { useState, useEffect, useRef } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { DayPicker } from 'react-day-picker';
import type { DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';
import styles from './DateRangePicker.module.css';

function formatDate(d: Date | undefined): string {
  if (!d) {
    return '';
  }
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
}

function parseDate(text: string): Date | null {
  const t = text.trim();
  if (!t) {
    return null;
  }
  if (!/^(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{1,2}-\d{1,2})$/.test(t)) {
    return null;
  }
  const d = t.includes('-') ? new Date(t + 'T12:00:00') : new Date(t);
  return isNaN(d.getTime()) ? null : d;
}

export function DateRangePicker({
  value,
  onChange,
  sessionDates,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  sessionDates?: Date[];
}) {
  const [open, setOpen] = useState(false);
  const [startText, setStartText] = useState(() => formatDate(value.from));
  const [endText, setEndText] = useState(() => formatDate(value.to));
  const [focused, setFocused] = useState<'start' | 'end' | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => value.from ?? new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  type InteractOutsideEvent = Parameters<
    NonNullable<Popover.PopoverContentProps['onInteractOutside']>
  >[0];
  type FocusOutsideEvent = Parameters<
    NonNullable<Popover.PopoverContentProps['onFocusOutside']>
  >[0];

  // Sync text and calendar month from external value changes, but only for the field
  // that isn't focused (avoid overwriting what the user is currently typing).
  useEffect(() => {
    if (focused !== 'start') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStartText(formatDate(value.from));
    }
    if (focused !== 'start' && value.from) {
      setCalendarMonth(value.from);
    }
  }, [value.from]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (focused !== 'end') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEndText(formatDate(value.to));
    }
  }, [value.to]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleStartChange(text: string) {
    setStartText(text);
    const d = parseDate(text);
    if (d) {
      onChange({ ...value, from: d });
    }
  }

  function handleEndChange(text: string) {
    setEndText(text);
    const d = parseDate(text);
    if (d) {
      onChange({ ...value, to: d });
    }
  }

  function handleStartBlur() {
    setFocused(null);
    if (!parseDate(startText)) {
      setStartText(formatDate(value.from));
    }
  }

  function handleEndBlur() {
    setFocused(null);
    if (!parseDate(endText)) {
      setEndText(formatDate(value.to));
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <div ref={containerRef} className={styles.container}>
          <input
            type="text"
            value={startText}
            placeholder="M/D/YYYY"
            className={styles.input}
            onChange={(e) => handleStartChange(e.target.value)}
            onFocus={() => {
              setFocused('start');
              if (value.from) {
                setCalendarMonth(value.from);
              }
              setOpen(true);
            }}
            onBlur={handleStartBlur}
          />
          <span className={styles.separator}>–</span>
          <input
            type="text"
            value={endText}
            placeholder="M/D/YYYY"
            className={styles.input}
            onChange={(e) => handleEndChange(e.target.value)}
            onFocus={() => {
              setFocused('end');
              if (value.to) {
                setCalendarMonth(value.to);
              }
              setOpen(true);
            }}
            onBlur={handleEndBlur}
          />
        </div>
      </Popover.Anchor>

      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          onOpenAutoFocus={(e: Event) => e.preventDefault()}
          onInteractOutside={(e: InteractOutsideEvent) => {
            if (containerRef.current?.contains(e.detail.originalEvent.target as Node)) {
              e.preventDefault();
            }
          }}
          onFocusOutside={(e: FocusOutsideEvent) => {
            if (containerRef.current?.contains(e.detail.originalEvent.target as Node)) {
              e.preventDefault();
            }
          }}
          className={styles.popover}
        >
          <DayPicker
            mode="range"
            selected={value}
            onSelect={(r: DateRange | undefined) => {
              onChange(r ?? { from: undefined, to: undefined });
            }}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            disabled={{ after: new Date() }}
            numberOfMonths={1}
            modifiers={{ hasSession: sessionDates ?? [] }}
            modifiersStyles={{
              hasSession: { fontWeight: 'bold', color: 'var(--accent)' },
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
