import type { BenchAngle, BenchBar, SquatBar } from "./conjugate";

export interface SquatFilter {
  bars: Set<SquatBar>;
  onlyBox: boolean;
  onlyChains: boolean;
  onlyBands: boolean;
}

export interface BenchFilter {
  bars: Set<BenchBar>;
  angles: Set<BenchAngle>;
  onlyChains: boolean;
  onlyBands: boolean;
  onlyFloorPress: boolean;
  onlySlingshot: boolean;
  onlyPause: boolean;
}

export interface DeadliftFilter {
  onlyReverseStance: boolean;
  onlyChains: boolean;
  onlyBands: boolean;
  onlyReverseBands: boolean;
}

export const DEFAULT_SQUAT_FILTER: SquatFilter = {
  bars: new Set(),
  onlyBox: false,
  onlyChains: false,
  onlyBands: false,
};

export const DEFAULT_BENCH_FILTER: BenchFilter = {
  bars: new Set(),
  angles: new Set(),
  onlyChains: false,
  onlyBands: false,
  onlyFloorPress: false,
  onlySlingshot: false,
  onlyPause: false,
};

export const DEFAULT_DEADLIFT_FILTER: DeadliftFilter = {
  onlyReverseStance: false,
  onlyChains: false,
  onlyBands: false,
  onlyReverseBands: false,
};
