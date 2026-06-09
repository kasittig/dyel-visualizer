import type { BenchAngle, BenchBar, ConjugateLift, SquatBar } from "../types/conjugate";
import type { BenchFilter, DeadliftFilter, SquatFilter } from "../types/conjugateFilters";

type LiftTab = ConjugateLift["liftType"];

const SQUAT_BARS: { value: SquatBar; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "ssb", label: "SSB" },
];

const BENCH_BARS: { value: BenchBar; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "american", label: "American" },
  { value: "swiss", label: "Swiss" },
  { value: "bamboo", label: "Bamboo" },
  { value: "duffalo", label: "Duffalo" },
  { value: "dumbbell", label: "Dumbbell" },
  { value: "bench_builder", label: "Bench Builder" },
];

const BENCH_ANGLES: { value: BenchAngle; label: string }[] = [
  { value: "flat", label: "Flat" },
  { value: "incline", label: "Incline" },
  { value: "decline", label: "Decline" },
  { value: "floor", label: "Floor Press" },
];

function toggleSetItem<T>(set: Set<T>, item: T): Set<T> {
  const next = new Set(set);
  if (next.has(item)) next.delete(item);
  else next.add(item);
  return next;
}

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        fontSize: "0.85rem",
        cursor: "pointer",
        marginRight: "0.75rem",
      }}
    >
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.4rem" }}>
      <span style={{ fontSize: "0.8rem", color: "#6b7280", minWidth: "3.5rem" }}>{label}</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.1rem" }}>{children}</div>
    </div>
  );
}

function SquatFilters({
  filter,
  onChange,
}: {
  filter: SquatFilter;
  onChange: (f: SquatFilter) => void;
}) {
  return (
    <>
      <FilterRow label="Bar">
        {SQUAT_BARS.map(({ value, label }) => (
          <CheckboxRow
            key={value}
            label={label}
            checked={filter.bars.has(value)}
            onChange={() => onChange({ ...filter, bars: toggleSetItem(filter.bars, value) })}
          />
        ))}
      </FilterRow>
      <FilterRow label="Equipment">
        <CheckboxRow
          label="Box"
          checked={filter.onlyBox}
          onChange={(v) => onChange({ ...filter, onlyBox: v })}
        />
        <CheckboxRow
          label="Chains"
          checked={filter.onlyChains}
          onChange={(v) => onChange({ ...filter, onlyChains: v })}
        />
        <CheckboxRow
          label="Bands"
          checked={filter.onlyBands}
          onChange={(v) => onChange({ ...filter, onlyBands: v })}
        />
      </FilterRow>
    </>
  );
}

function BenchFilters({
  filter,
  onChange,
}: {
  filter: BenchFilter;
  onChange: (f: BenchFilter) => void;
}) {
  return (
    <>
      <FilterRow label="Bar">
        {BENCH_BARS.map(({ value, label }) => (
          <CheckboxRow
            key={value}
            label={label}
            checked={filter.bars.has(value)}
            onChange={() => onChange({ ...filter, bars: toggleSetItem(filter.bars, value) })}
          />
        ))}
      </FilterRow>
      <FilterRow label="Angle">
        {BENCH_ANGLES.map(({ value, label }) => (
          <CheckboxRow
            key={value}
            label={label}
            checked={filter.angles.has(value)}
            onChange={() => onChange({ ...filter, angles: toggleSetItem(filter.angles, value) })}
          />
        ))}
      </FilterRow>
      <FilterRow label="Equipment">
        <CheckboxRow
          label="Chains"
          checked={filter.onlyChains}
          onChange={(v) => onChange({ ...filter, onlyChains: v })}
        />
        <CheckboxRow
          label="Bands"
          checked={filter.onlyBands}
          onChange={(v) => onChange({ ...filter, onlyBands: v })}
        />
        <CheckboxRow
          label="Slingshot"
          checked={filter.onlySlingshot}
          onChange={(v) => onChange({ ...filter, onlySlingshot: v })}
        />
        <CheckboxRow
          label="Pause"
          checked={filter.onlyPause}
          onChange={(v) => onChange({ ...filter, onlyPause: v })}
        />
      </FilterRow>
    </>
  );
}

function DeadliftFilters({
  filter,
  onChange,
}: {
  filter: DeadliftFilter;
  onChange: (f: DeadliftFilter) => void;
}) {
  return (
    <FilterRow label="Equipment">
      <CheckboxRow
        label="Opposite Stance"
        checked={filter.onlyReverseStance}
        onChange={(v) => onChange({ ...filter, onlyReverseStance: v })}
      />
      <CheckboxRow
        label="Chains"
        checked={filter.onlyChains}
        onChange={(v) => onChange({ ...filter, onlyChains: v })}
      />
      <CheckboxRow
        label="Bands"
        checked={filter.onlyBands}
        onChange={(v) => onChange({ ...filter, onlyBands: v })}
      />
      <CheckboxRow
        label="Reverse Bands"
        checked={filter.onlyReverseBands}
        onChange={(v) => onChange({ ...filter, onlyReverseBands: v })}
      />
    </FilterRow>
  );
}

export function ConjugateFilterControls({
  liftType,
  squatFilter,
  benchFilter,
  deadliftFilter,
  onSquatChange,
  onBenchChange,
  onDeadliftChange,
}: {
  liftType: LiftTab;
  squatFilter: SquatFilter;
  benchFilter: BenchFilter;
  deadliftFilter: DeadliftFilter;
  onSquatChange: (f: SquatFilter) => void;
  onBenchChange: (f: BenchFilter) => void;
  onDeadliftChange: (f: DeadliftFilter) => void;
}) {
  return (
    <details style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>
      <summary style={{ cursor: "pointer", color: "#374151", userSelect: "none" }}>Filters</summary>
      <div style={{ marginTop: "0.6rem", paddingLeft: "0.5rem" }}>
        {liftType === "squat" && <SquatFilters filter={squatFilter} onChange={onSquatChange} />}
        {liftType === "bench" && <BenchFilters filter={benchFilter} onChange={onBenchChange} />}
        {liftType === "deadlift" && (
          <DeadliftFilters filter={deadliftFilter} onChange={onDeadliftChange} />
        )}
      </div>
    </details>
  );
}
