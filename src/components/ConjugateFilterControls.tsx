import type { BenchAngle, BenchBar, ConjugateLift, SquatBar } from "../types/conjugate";
import type { BenchFilter, DeadliftFilter, SquatFilter } from "../types/conjugateFilters";
import type {
  BenchPresence,
  ConjugatePresence,
  DeadliftPresence,
  SquatPresence,
} from "../utils/conjugateFilters";

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
  presence,
}: {
  filter: SquatFilter;
  onChange: (f: SquatFilter) => void;
  presence: SquatPresence;
}) {
  const bars = SQUAT_BARS.filter((b) => presence.bars.has(b.value));
  const hasEquipment = presence.hasBox || presence.hasChains || presence.hasBands;
  return (
    <>
      {bars.length >= 2 && (
        <FilterRow label="Bar">
          {bars.map(({ value, label }) => (
            <CheckboxRow
              key={value}
              label={label}
              checked={filter.bars.has(value)}
              onChange={() => onChange({ ...filter, bars: toggleSetItem(filter.bars, value) })}
            />
          ))}
        </FilterRow>
      )}
      {hasEquipment && (
        <FilterRow label="Equipment">
          {presence.hasBox && (
            <CheckboxRow
              label="Box"
              checked={filter.onlyBox}
              onChange={(v) => onChange({ ...filter, onlyBox: v })}
            />
          )}
          {presence.hasChains && (
            <CheckboxRow
              label="Chains"
              checked={filter.onlyChains}
              onChange={(v) => onChange({ ...filter, onlyChains: v })}
            />
          )}
          {presence.hasBands && (
            <CheckboxRow
              label="Bands"
              checked={filter.onlyBands}
              onChange={(v) => onChange({ ...filter, onlyBands: v })}
            />
          )}
        </FilterRow>
      )}
    </>
  );
}

function BenchFilters({
  filter,
  onChange,
  presence,
}: {
  filter: BenchFilter;
  onChange: (f: BenchFilter) => void;
  presence: BenchPresence;
}) {
  const bars = BENCH_BARS.filter((b) => presence.bars.has(b.value));
  const angles = BENCH_ANGLES.filter((a) => presence.angles.has(a.value));
  const hasEquipment =
    presence.hasChains || presence.hasBands || presence.hasSlingshot || presence.hasPause;
  return (
    <>
      {bars.length >= 2 && (
        <FilterRow label="Bar">
          {bars.map(({ value, label }) => (
            <CheckboxRow
              key={value}
              label={label}
              checked={filter.bars.has(value)}
              onChange={() => onChange({ ...filter, bars: toggleSetItem(filter.bars, value) })}
            />
          ))}
        </FilterRow>
      )}
      {angles.length >= 2 && (
        <FilterRow label="Angle">
          {angles.map(({ value, label }) => (
            <CheckboxRow
              key={value}
              label={label}
              checked={filter.angles.has(value)}
              onChange={() => onChange({ ...filter, angles: toggleSetItem(filter.angles, value) })}
            />
          ))}
        </FilterRow>
      )}
      {hasEquipment && (
        <FilterRow label="Equipment">
          {presence.hasChains && (
            <CheckboxRow
              label="Chains"
              checked={filter.onlyChains}
              onChange={(v) => onChange({ ...filter, onlyChains: v })}
            />
          )}
          {presence.hasBands && (
            <CheckboxRow
              label="Bands"
              checked={filter.onlyBands}
              onChange={(v) => onChange({ ...filter, onlyBands: v })}
            />
          )}
          {presence.hasSlingshot && (
            <CheckboxRow
              label="Slingshot"
              checked={filter.onlySlingshot}
              onChange={(v) => onChange({ ...filter, onlySlingshot: v })}
            />
          )}
          {presence.hasPause && (
            <CheckboxRow
              label="Pause"
              checked={filter.onlyPause}
              onChange={(v) => onChange({ ...filter, onlyPause: v })}
            />
          )}
        </FilterRow>
      )}
    </>
  );
}

function DeadliftFilters({
  filter,
  onChange,
  presence,
}: {
  filter: DeadliftFilter;
  onChange: (f: DeadliftFilter) => void;
  presence: DeadliftPresence;
}) {
  return (
    <FilterRow label="Equipment">
      {[...presence.stances].sort().map((s) => (
        <CheckboxRow
          key={s}
          label={
            s
              .split(" ")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ") + " Stance"
          }
          checked={filter.stances.has(s)}
          onChange={(checked) => {
            const next = new Set(filter.stances);
            if (checked) next.add(s);
            else next.delete(s);
            onChange({ ...filter, stances: next });
          }}
        />
      ))}
      {presence.hasChains && (
        <CheckboxRow
          label="Chains"
          checked={filter.onlyChains}
          onChange={(v) => onChange({ ...filter, onlyChains: v })}
        />
      )}
      {presence.hasBands && (
        <CheckboxRow
          label="Bands"
          checked={filter.onlyBands}
          onChange={(v) => onChange({ ...filter, onlyBands: v })}
        />
      )}
      {presence.hasReverseBands && (
        <CheckboxRow
          label="Reverse Bands"
          checked={filter.onlyReverseBands}
          onChange={(v) => onChange({ ...filter, onlyReverseBands: v })}
        />
      )}
    </FilterRow>
  );
}

function hasAnyFilters(liftType: LiftTab, presence: ConjugatePresence): boolean {
  if (liftType === "squat") {
    const p = presence.squat;
    return p.bars.size >= 2 || p.hasBox || p.hasChains || p.hasBands;
  }
  if (liftType === "bench") {
    const p = presence.bench;
    return (
      p.bars.size >= 2 ||
      p.angles.size >= 2 ||
      p.hasChains ||
      p.hasBands ||
      p.hasSlingshot ||
      p.hasPause
    );
  }
  const p = presence.deadlift;
  return p.stances.size > 1 || p.hasChains || p.hasBands || p.hasReverseBands;
}

export function ConjugateFilterControls({
  liftType,
  presence,
  squatFilter,
  benchFilter,
  deadliftFilter,
  onSquatChange,
  onBenchChange,
  onDeadliftChange,
}: {
  liftType: LiftTab;
  presence: ConjugatePresence;
  squatFilter: SquatFilter;
  benchFilter: BenchFilter;
  deadliftFilter: DeadliftFilter;
  onSquatChange: (f: SquatFilter) => void;
  onBenchChange: (f: BenchFilter) => void;
  onDeadliftChange: (f: DeadliftFilter) => void;
}) {
  if (!hasAnyFilters(liftType, presence)) return null;

  return (
    <details style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>
      <summary style={{ cursor: "pointer", color: "#374151", userSelect: "none" }}>Filters</summary>
      <div style={{ marginTop: "0.6rem", paddingLeft: "0.5rem" }}>
        {liftType === "squat" && (
          <SquatFilters filter={squatFilter} onChange={onSquatChange} presence={presence.squat} />
        )}
        {liftType === "bench" && (
          <BenchFilters filter={benchFilter} onChange={onBenchChange} presence={presence.bench} />
        )}
        {liftType === "deadlift" && (
          <DeadliftFilters
            filter={deadliftFilter}
            onChange={onDeadliftChange}
            presence={presence.deadlift}
          />
        )}
      </div>
    </details>
  );
}
