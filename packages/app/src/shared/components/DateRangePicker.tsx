import { useState, useEffect, useRef, useMemo } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { DayPicker } from 'react-day-picker';
import type { DateRange } from 'react-day-picker';
import { presetDateRange, activePreset, type PresetId } from '@dyel/api';
import 'react-day-picker/style.css';
import styles from './DateRangePicker.module.css';
import { formatDate, parseDate } from '../dateUtils';

const PRESETS: {
  label: string;
  presetId: PresetId;
}[] = [
  {
    label: '2 WKS',
    presetId: '2w',
  },
  {
    label: '1 MO',
    presetId: '1m',
  },
  {
    label: '3 MO',
    presetId: '3m',
  },
  {
    label: 'ALL TIME',
    presetId: 'all',
  },
];

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
  const outerRef = useRef<HTMLDivElement>(null);
  const popoverContentRef = useRef<HTMLDivElement>(null);

  const latestDate = useMemo(() => {
    if (!sessionDates || sessionDates.length === 0) {
      return new Date();
    }
    return new Date(Math.max(...sessionDates.map((d) => d.getTime())));
  }, [sessionDates]);

  const [showCustomPicker, setShowCustomPicker] = useState(() => {
    if (!sessionDates || sessionDates.length === 0) {
      return true;
    }
    return activePreset(value.from, value.to, latestDate) === null;
  });

  // Close the popover when clicking outside both the component and the calendar portal.
  // Radix's built-in dismiss doesn't fire reliably when `open` is set imperatively
  // (i.e. via the Custom chip, not through a Popover.Trigger).
  useEffect(() => {
    if (!open && !showCustomPicker) {
      return;
    }
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (!outerRef.current?.contains(target) && !popoverContentRef.current?.contains(target)) {
        setOpen(false);
        setShowCustomPicker(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown, { capture: true });
    return () => document.removeEventListener('mousedown', handleMouseDown, { capture: true });
  }, [open, showCustomPicker]);

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

  // When value changes to match a preset (e.g. on initial data load), close the custom picker.
  useEffect(() => {
    if (activePreset(value.from, value.to, latestDate) !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowCustomPicker(false);
    }
  }, [value.from, value.to, latestDate]);

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

  const showPresets = sessionDates && sessionDates.length > 0;
  const currentPreset = activePreset(value.from, value.to, latestDate);
  const anyPresetActive = currentPreset !== null;
  const showPicker = !showPresets || showCustomPicker;
  const customChipActive = !anyPresetActive;

  return (
    <div ref={outerRef} className={styles.outerWrapper}>
      {showPresets && (
        <div className={styles.presets}>
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              className={`${styles.preset} ${currentPreset === preset.presetId ? styles.presetActive : ''}`}
              onClick={() => {
                if (preset.presetId === 'all') {
                  onChange({ from: undefined, to: latestDate });
                } else {
                  onChange(presetDateRange(preset.presetId, latestDate));
                }
                setShowCustomPicker(false);
              }}
            >
              {preset.label}
            </button>
          ))}
          <button
            className={`${styles.preset} ${customChipActive ? styles.presetActive : ''}`}
            onClick={() => {
              setShowCustomPicker((v) => !v);
              setOpen(true);
            }}
          >
            CUSTOM
          </button>
        </div>
      )}
      {showPicker && (
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Anchor asChild>
            <div ref={containerRef} className={styles.container}>
              <span className={styles.icon} aria-hidden>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="1"
                    y="3"
                    width="14"
                    height="12"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M5 1v4M11 1v4M1 7h14"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
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
              ref={popoverContentRef}
              sideOffset={6}
              onOpenAutoFocus={(e: Event) => e.preventDefault()}
              onInteractOutside={(e) => e.preventDefault()}
              onFocusOutside={(e) => e.preventDefault()}
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
      )}
    </div>
  );
}
