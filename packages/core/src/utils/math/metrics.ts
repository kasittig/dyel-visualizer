import type { LiftUnits } from '../../types/conjugate.ts';
import type { LiftMetrics } from '../../types/metrics.ts';

function convertUnits(value: number, inputUnit: LiftUnits, outputUnit: LiftUnits): number {
  if (inputUnit === outputUnit) {
    return value;
  } else if (inputUnit === 'lbs') {
    return value * 0.45359237;
  } else {
    return value * 2.20462262185;
  }
}

function calcDenominator(bw: number, coefficients: number[]): number {
  return coefficients.reduce((sum, coeff, index) => {
    return sum + coeff * Math.pow(bw, index);
  }, 0);
}

export function calculateMetrics(
  bw: number,
  total: number,
  gender: boolean,
  units: LiftUnits = 'lbs'
): LiftMetrics {
  const coefficients: MetricCoefficientGroup = gender
    ? __COEFFICIENTS__.female
    : __COEFFICIENTS__.male;

  return {
    wilks: calculateMetric<number[]>(bw, total, units, coefficients.wilks, calculateWilks),
    dots: calculateMetric<number[]>(bw, total, units, coefficients.dots, calculateDots),
    schwartzmalone: calculateMetric<SMAnchorValue[]>(
      bw,
      total,
      units,
      coefficients.schwartzmalone,
      calculateSchwartzMalone
    ),
  };
}

function calculateMetric<T>(
  bw: number,
  total: number,
  unit: LiftUnits,
  coefficientConfig: MetricCoefficient<T>,
  metric: (bw: number, total: number, coefficients: T) => number
): number {
  bw = convertUnits(bw, unit, coefficientConfig.units);
  total = convertUnits(total, unit, coefficientConfig.units);

  if (coefficientConfig.max_bw && coefficientConfig.min_bw) {
    if (bw > coefficientConfig.max_bw || bw < coefficientConfig.min_bw) {
      return 0;
    }
  }
  return metric(bw, total, coefficientConfig.coefficients);
}

function calculateDots(bw: number, total: number, coefficients: number[]): number {
  // 4. Calculate the polynomial denominator
  const denominator = calcDenominator(bw, coefficients);

  // 5. Compute and return final DOTS score
  const dotsScore = total * (500 / denominator);
  return Math.round(dotsScore * 100) / 100;
}

/**
 * Calculates the Schwartz / Malone Formula Score (Formula Total).
 * @param {number} bw - The bodyweight of the lifter.
 * @param {number} total - The sum of squat + bench + deadlift.
 * @param {SMAnchorValue[]} coefficients - Schwartz / Malone formula coefficients.
 * @param {string} unit - 'lbs' or 'kg' (Default is 'lbs' as the formula historically used lbs).
 * @returns {number} The relative strength score (Formula Total), rounded to 4 decimals.
 */
function calculateSchwartzMalone(bw: number, total: number, coefficients: SMAnchorValue[]): number {
  // Bound checking (Handle extreme edge cases outside table thresholds)
  const min_val = coefficients[0];
  const max_val = coefficients[coefficients.length - 1];

  if (bw <= min_val.w) {
    return Number((total * min_val.c).toFixed(4));
  }
  if (bw >= max_val.w) {
    return Number((total * max_val.c).toFixed(4));
  }

  let coefficient = 0;
  for (let i = 0; i < coefficients.length - 1; i++) {
    const current = coefficients[i];
    const next = coefficients[i + 1];

    if (bw >= current.w && bw <= next.w) {
      // Linear interpolation formula: y = y0 + ((x - x0) * (y1 - y0)) / (x1 - x0)
      coefficient = current.c + ((bw - current.w) * (next.c - current.c)) / (next.w - current.w);
      break;
    }
  }

  // 5. Calculate and return Formula Total (FT)
  const formulaTotal = total * coefficient;
  return Number(formulaTotal.toFixed(4));
}

/**
 * Calculates the Wilks Score for a powerlifter.
 *
 * @param {number} bw - The lifter's body weight.
 * @param {number} total - Total weight of Squat + Bench + Deadlift.
 * @param {number[]} coefficients - Wilks formula coefficients
 * @returns {number} The calculated Wilks score rounded to two decimal places.
 */
function calculateWilks(bw: number, total: number, coefficients: number[]): number {
  const denominator = calcDenominator(bw, coefficients);

  // 4. Calculate final Wilks Coefficient and multiply by total lifted
  const wilksCoefficient = 500 / denominator;
  const wilksScore = total * wilksCoefficient;

  // Return the final score rounded to two decimal places
  return parseFloat(wilksScore.toFixed(2));
}
