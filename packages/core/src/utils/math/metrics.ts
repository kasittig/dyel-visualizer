import type { LiftUnits } from '../../types/conjugate.ts';

export function calculateDots(
  bodyweight: number,
  total: number,
  gender: boolean,
  unit: LiftUnits = 'lbs'
) {
  // 1. Convert to kg if input is in lbs
  if (unit.toLowerCase() === 'lb') {
    bodyweight = bodyweight * 0.45359237;
    total = total * 0.45359237;
  }

  // Polynomial bounds to ensure a positive return value
  if (bodyweight < 40 || bodyweight > 150 + (gender ? 0 : 60)) {
    return 0;
  }

  // 2. Set coefficients based on gender
  let a, b, c, d, e;

  if (!gender) {
    a = -0.000001093;
    b = 0.0007391293;
    c = -0.1918759221;
    d = 24.0900756;
    e = -307.75076;
  } else {
    a = -0.0000010706;
    b = 0.0005158568;
    c = -0.1126655495;
    d = 13.6175032;
    e = -57.96288;
  }

  // 4. Calculate the polynomial denominator
  const denominator =
    a * Math.pow(bodyweight, 4) +
    b * Math.pow(bodyweight, 3) +
    c * Math.pow(bodyweight, 2) +
    d * bodyweight +
    e;

  // 5. Compute and return final DOTS score
  const dotsScore = total * (500 / denominator);
  return Math.round(dotsScore * 100) / 100;
}
