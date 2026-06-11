import { useState, useEffect, useRef } from "react";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import type { DateRange } from "react-day-picker";
import "react-day-picker/style.css";

function formatDate(d: Date | undefined): string {
  if (!d) return "";
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
}

function parseDate(text: string): Date | null {
  const t = text.trim();
  if (!t) return null;
  if (!/^(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{1,2}-\d{1,2})$/.test(t)) return null;
  const d = t.includes("-") ? new Date(t + "T12:00:00") : new Date(t);
  return isNaN(d.getTime()) ? null : d;
}

const inputStyle: React.CSSProperties = {
  width: "7rem",
  padding: "0.35rem 0.5rem",
  fontSize: "0.9rem",
  textAlign: "center",
  cursor: "pointer",
};

const popoverStyle: React.CSSProperties = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  boxShadow: "var(--shadow)",
  zIndex: 50,
};

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
  const [focused, setFocused] = useState<"start" | "end" | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => value.from ?? new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync text from external value changes, but only for the field that isn't focused.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (focused !== "start") setStartText(formatDate(value.from));
  }, [value.from]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (focused !== "end") setEndText(formatDate(value.to));
  }, [value.to]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleStartChange(text: string) {
    setStartText(text);
    const d = parseDate(text);
    if (d) onChange({ ...value, from: d });
  }

  function handleEndChange(text: string) {
    setEndText(text);
    const d = parseDate(text);
    if (d) onChange({ ...value, to: d });
  }

  function handleStartBlur() {
    setFocused(null);
    if (!parseDate(startText)) setStartText(formatDate(value.from));
  }

  function handleEndBlur() {
    setFocused(null);
    if (!parseDate(endText)) setEndText(formatDate(value.to));
  }

  const muted: React.CSSProperties = { color: "var(--text)", fontSize: "0.85rem" };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <div
          ref={containerRef}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
        >
          <input
            type="text"
            value={startText}
            placeholder="M/D/YYYY"
            style={inputStyle}
            onChange={(e) => handleStartChange(e.target.value)}
            onFocus={() => {
              setFocused("start");
              if (value.from) setCalendarMonth(value.from);
              setOpen(true);
            }}
            onBlur={handleStartBlur}
          />
          <span style={muted}>–</span>
          <input
            type="text"
            value={endText}
            placeholder="M/D/YYYY"
            style={inputStyle}
            onChange={(e) => handleEndChange(e.target.value)}
            onFocus={() => {
              setFocused("end");
              if (value.to) setCalendarMonth(value.to);
              setOpen(true);
            }}
            onBlur={handleEndBlur}
          />
        </div>
      </Popover.Anchor>

      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if (containerRef.current?.contains(e.detail.originalEvent.target as Node)) {
              e.preventDefault();
            }
          }}
          onFocusOutside={(e) => {
            if (containerRef.current?.contains(e.detail.originalEvent.target as Node)) {
              e.preventDefault();
            }
          }}
          style={popoverStyle}
        >
          <DayPicker
            mode="range"
            selected={value}
            onSelect={(r) => {
              onChange(r ?? { from: undefined, to: undefined });
            }}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            disabled={{ after: new Date() }}
            numberOfMonths={1}
            modifiers={{ hasSession: sessionDates ?? [] }}
            modifiersStyles={{
              hasSession: { fontWeight: "bold", color: "var(--accent)" },
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
