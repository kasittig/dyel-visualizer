import type { LiftUnits } from '../../types/conjugate.ts';

function convertUnits(value: number, inputUnit: LiftUnits, outputUnit: LiftUnits): number {
  if (inputUnit === outputUnit) {
    return value;
  } else if (inputUnit === 'lbs') {
    return value * 0.45359237;
  } else {
    return value * 2.20462262185;
  }
}

export function calculateDots(
  bw: number,
  total: number,
  gender: boolean,
  unit: LiftUnits = 'lbs'
): number {
  // formula is in kg
  bw = convertUnits(bw, unit, 'kg');
  total = convertUnits(total, unit, 'kg');

  // Polynomial bounds to ensure a positive return value
  if (bw < 40 || bw > 150 + (gender ? 0 : 60)) {
    return 0;
  }

  // Look up coefficients by gender
  const genderStr = gender ? 'female' : 'male';
  const coefficients = __COEFFICIENTS__.dots[genderStr];

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
 * @param {boolean} gender - 'false' (Schwartz) or 'true' (Malone).
 * @param {string} unit - 'lbs' or 'kg' (Default is 'lbs' as the formula historically used lbs).
 * @returns {number} The relative strength score (Formula Total), rounded to 4 decimals.
 */
export function calculateSchwartzMalone(
  bw: number,
  total: number,
  gender: boolean,
  unit: LiftUnits = 'lbs'
): number {
  // 1. Standardize everything to pounds (lbs) since the core tables were built using lbs.
  bw = convertUnits(bw, unit, 'lbs');
  total = convertUnits(total, unit, 'lbs');

  const genderStr = gender ? 'female' : 'male';
  const selectedTable = __COEFFICIENTS__.schwartzmalone[genderStr];

  // 3. Bound checking (Handle extreme edge cases outside table thresholds)
  if (bw <= selectedTable[0].w) {
    return Number((total * selectedTable[0].c).toFixed(4));
  }
  if (bw >= selectedTable[selectedTable.length - 1].w) {
    return Number((total * selectedTable[selectedTable.length - 1].c).toFixed(4));
  }

  // 4. Linear Interpolation to find the precise floating coefficient
  let coefficient = 0;
  for (let i = 0; i < selectedTable.length - 1; i++) {
    const current = selectedTable[i];
    const next = selectedTable[i + 1];

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
 * @param {boolean} gender - false for 'male' + true for 'female'.
 * @param {LiftType} unit - 'kg' or 'lb' (defaults to 'kg').
 * @returns {number} The calculated Wilks score rounded to two decimal places.
 */
export function calculateWilksScore(
  bw: number,
  total: number,
  gender: boolean,
  unit: LiftUnits = 'lbs'
): number {
  bw = convertUnits(bw, unit, 'kg');
  total = convertUnits(total, unit, 'kg');

  const genderStr = gender ? 'female' : 'male';
  const coefficients = __COEFFICIENTS__.wilks[genderStr];

  const denominator = calcDenominator(bw, coefficients);

  // 4. Calculate final Wilks Coefficient and multiply by total lifted
  const wilksCoefficient = 500 / denominator;
  const wilksScore = total * wilksCoefficient;

  // Return the final score rounded to two decimal places
  return parseFloat(wilksScore.toFixed(2));
}

function calcDenominator(bw: number, coefficients: number[]): number {
  return coefficients.reduce((sum, coeff, index) => {
    return sum + coeff * Math.pow(bw, index);
  }, 0);
}
