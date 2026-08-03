import { useState, useEffect, useRef, useMemo } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { DayPicker, type DateRange } from 'react-day-picker';
import { presetDateRange, activePreset, type PresetId } from '@dyel/api/display';
import { formatDate, parseDate } from '../dateUtils';
import { MOBILE_LAYOUT_QUERY, useMediaQuery } from '../hooks';
import 'react-day-picker/style.css';
import styles from './DateRangePicker.module.css';

const PRESETS: { label: string; presetId: PresetId }[] = [
  { label: '2 WKS', presetId: '2w' },
  { label: '1 MO', presetId: '1m' },
  { label: '3 MO', presetId: '3m' },
  { label: 'ALL TIME', presetId: 'all' },
];

export function DateRangePicker({
  value,
  onChange,
  sessionDates,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
  sessionDates?: Date[];
}) {
  const [open, setOpen] = useState(false);
  const [startText, setStartText] = useState(() => formatDate(value.from));
  const [endText, setEndText] = useState(() => formatDate(value.to));
  const [focused, setFocused] = useState<'start' | 'end' | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => value.from ?? new Date());
  const mobile = useMediaQuery(MOBILE_LAYOUT_QUERY);

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

  useEffect(() => {
    if (!open && !showCustomPicker) {
      return;
    }
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!outerRef.current?.contains(target) && !popoverContentRef.current?.contains(target)) {
        setOpen(false);
        setShowCustomPicker(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown, { capture: true });
    return () => document.removeEventListener('mousedown', handleMouseDown, { capture: true });
  }, [open, showCustomPicker]);

  useEffect(() => {
    if (focused !== 'start') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStartText(formatDate(value.from));
    }
    if (focused !== 'start' && value.from) {
      setCalendarMonth(value.from);
    }
  }, [value.from, focused]);

  useEffect(() => {
    if (focused !== 'end') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEndText(formatDate(value.to));
    }
  }, [value.to, focused]);

  useEffect(() => {
    if (activePreset(value.from, value.to, latestDate) !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowCustomPicker(false);
    }
  }, [value.from, value.to, latestDate]);

  const currentPreset = activePreset(value.from, value.to, latestDate);
  const showPresets = sessionDates && sessionDates.length > 0;
  const currentLabel = currentPreset
    ? (PRESETS.find(({ presetId }) => presetId === currentPreset)?.label ?? 'DATE RANGE')
    : value.from || value.to
      ? `${formatDate(value.from) || 'Start'} – ${formatDate(value.to) || 'Today'}`
      : 'DATE RANGE';

  const selectPreset = (presetId: PresetId) => {
    onChange(
      presetId === 'all'
        ? { from: undefined, to: latestDate }
        : presetDateRange(presetId, latestDate)
    );
    setShowCustomPicker(false);
    setOpen(false);
  };

  const handleBlur = (field: 'start' | 'end', text: string) => {
    setFocused(null);
    if (!parseDate(text)) {
      if (field === 'start') {
        setStartText(formatDate(value.from));
      } else {
        setEndText(formatDate(value.to));
      }
    }
  };

  return (
    <div ref={outerRef} className={styles.outerWrapper}>
      {mobile && (
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              className={styles.mobileTrigger}
              aria-label={`Date range: ${currentLabel}`}
            >
              <span className={styles.mobileTriggerIcon} aria-hidden="true">
                ▦
              </span>
              <span>{currentLabel}</span>
              <span aria-hidden="true">⌄</span>
            </button>
          </Popover.Trigger>
          <Popover.Portal>
          <Popover.Content
            ref={popoverContentRef}
            sideOffset={8}
              align="end"
              className={styles.mobileSheet}
              aria-label="Choose date range"
            >
              <div className={styles.mobileSheetHandle} aria-hidden="true" />
              <div className={styles.mobileSheetHeading}>Date range</div>
              {showPresets && (
                <div className={styles.mobilePresetGrid}>
                  {PRESETS.map(({ label, presetId }) => (
                    <button
                      key={presetId}
                      type="button"
                      aria-pressed={currentPreset === presetId}
                      className={`${styles.mobilePreset} ${currentPreset === presetId ? styles.presetActive : ''}`}
                      onClick={() => selectPreset(presetId)}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-pressed={currentPreset === null}
                    className={`${styles.mobilePreset} ${currentPreset === null ? styles.presetActive : ''}`}
                    onClick={() => setShowCustomPicker((shown) => !shown)}
                  >
                    CUSTOM
                  </button>
                </div>
              )}
              {(!showPresets || showCustomPicker) && (
                <div className={styles.mobileCustom}>
                  <DayPicker
                    mode="range"
                    selected={value}
                    onSelect={(r) => onChange(r ?? { from: undefined, to: undefined })}
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    disabled={{ after: new Date() }}
                    numberOfMonths={1}
                    modifiers={{ hasSession: sessionDates ?? [] }}
                    modifiersStyles={{ hasSession: { fontWeight: 'bold', color: 'var(--accent)' } }}
                  />
                </div>
              )}
              <Popover.Close className={styles.mobileDone}>Done</Popover.Close>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
      {!mobile && showPresets && (
        <div className={styles.presets}>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              aria-pressed={currentPreset === p.presetId}
              className={`${styles.preset} ${currentPreset === p.presetId ? styles.presetActive : ''}`}
              onClick={() => {
                selectPreset(p.presetId);
              }}
              aria-pressed={currentPreset === p.presetId}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={currentPreset === null}
            className={`${styles.preset} ${currentPreset === null ? styles.presetActive : ''}`}
            onClick={() => {
              setShowCustomPicker((v) => !v);
              setOpen(true);
            }}
            aria-expanded={showCustomPicker}
          >
            CUSTOM
          </button>
        </div>
      )}
      {!mobile && (!showPresets || showCustomPicker) && (
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Anchor asChild>
            <div className={styles.container}>
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
                aria-label="Start date"
                inputMode="numeric"
                onBlur={() => handleBlur('start', startText)}
                onChange={(e) => {
                  setStartText(e.target.value);
                  const d = parseDate(e.target.value);
                  if (d) {
                    onChange({ ...value, from: d });
                  }
                }}
                onFocus={() => {
                  setFocused('start');
                  if (value.from) {
                    setCalendarMonth(value.from);
                  }
                  setOpen(true);
                }}
              />
              <span className={styles.separator}>–</span>
              <input
                type="text"
                value={endText}
                placeholder="M/D/YYYY"
                className={styles.input}
                aria-label="End date"
                inputMode="numeric"
                onBlur={() => handleBlur('end', endText)}
                onChange={(e) => {
                  setEndText(e.target.value);
                  const d = parseDate(e.target.value);
                  if (d) {
                    onChange({ ...value, to: d });
                  }
                }}
                onFocus={() => {
                  setFocused('end');
                  if (value.to) {
                    setCalendarMonth(value.to);
                  }
                  setOpen(true);
                }}
              />
            </div>
          </Popover.Anchor>
          <Popover.Portal>
            <Popover.Content
              ref={popoverContentRef}
              sideOffset={6}
              onOpenAutoFocus={(e) => e.preventDefault()}
              onInteractOutside={(e) => e.preventDefault()}
              onFocusOutside={(e) => e.preventDefault()}
              className={styles.popover}
              aria-label="Choose date range"
            >
              <DayPicker
                mode="range"
                selected={value}
                onSelect={(r) => onChange(r ?? { from: undefined, to: undefined })}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                disabled={{ after: new Date() }}
                numberOfMonths={1}
                modifiers={{ hasSession: sessionDates ?? [] }}
                modifiersStyles={{ hasSession: { fontWeight: 'bold', color: 'var(--accent)' } }}
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </div>
  );
}
