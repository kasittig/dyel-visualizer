import type { LiftUnits } from '../../types/conjugate';
import type { LiftMetrics } from '../../types/metrics';

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

function calculatePercentileRank(
  score: number,
  { mean, std }: { mean: number; std: number }
): number {
  const z = (score - mean) / std;
  const a = [0.31938153, -0.356563782, 1.781477937, -1.821255978, 1.330274429];
  const p = 0.2316419;
  const absZ = Math.abs(z);
  const t = 1 / (1 + p * absZ);
  const pdf = Math.exp(-0.5 * absZ * absZ) / Math.sqrt(2 * Math.PI);
  const poly = t * (a[0] + t * (a[1] + t * (a[2] + t * (a[3] + t * a[4]))));
  const q = pdf * poly;
  return Math.min(99, Math.max(1, Math.round((z >= 0 ? 1 - q : q) * 100)));
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

  const wilks = calculateMetric<number[]>(bw, total, units, coefficients.wilks, calculateWilks);
  const dots = calculateMetric<number[]>(bw, total, units, coefficients.dots, calculateDots);
  const schwartzmalone = calculateMetric<SMAnchorValue[]>(
    bw,
    total,
    units,
    coefficients.schwartzmalone,
    calculateSchwartzMalone
  );

  return {
    wilks,
    wilksPercentile: calculatePercentileRank(wilks, coefficients.wilks.percentile),
    dots,
    dotsPercentile: calculatePercentileRank(dots, coefficients.dots.percentile),
    schwartzmalone,
    schwartzmalonePercentile: calculatePercentileRank(
      schwartzmalone,
      coefficients.schwartzmalone.percentile
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

function calculateWilks(bw: number, total: number, coefficients: number[]): number {
  const denominator = calcDenominator(bw, coefficients);

  // 4. Calculate final Wilks Coefficient and multiply by total lifted
  const wilksCoefficient = 500 / denominator;
  const wilksScore = total * wilksCoefficient;

  // Return the final score rounded to two decimal places
  return parseFloat(wilksScore.toFixed(2));
}
