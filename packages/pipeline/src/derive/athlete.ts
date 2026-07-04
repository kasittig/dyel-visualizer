export interface AthleteContext {
  sex: 'M' | 'F';
  bodyweight: number;
}

// Coefficients duplicated here (not imported from @dyel/core, which the
// pipeline package must not depend on) — published IPF/USAPL Wilks and DOTS
// polynomial coefficient tables, ported from
// packages/core/src/utils/math/metrics.ts (`__COEFFICIENTS__`).
// Both formulas assume bodyweight/total in kg.
const WILKS_COEFFICIENTS: Record<AthleteContext['sex'], number[]> = {
  M: [-216.0475144, 16.2606339, -0.002388645, -0.00113732, 7.01863e-6, -1.291e-8],
  F: [594.31747775582, -27.23842536447, 0.82112226871, -0.00930733913, 4.731582e-5, -9.054e-8],
};

const DOTS_COEFFICIENTS: Record<
  AthleteContext['sex'],
  { coefficients: number[]; minBw: number; maxBw: number }
> = {
  M: {
    coefficients: [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -1.093e-6],
    minBw: 40,
    maxBw: 210,
  },
  F: {
    coefficients: [-57.96288, 13.6175032, -0.1126655495, 0.0005158568, -1.0706e-6],
    minBw: 40,
    maxBw: 150,
  },
};

const evalPolynomial = (bodyweight: number, coefficients: number[]): number =>
  coefficients.reduce((sum, coeff, index) => sum + coeff * Math.pow(bodyweight, index), 0);

export function wilks(totalKg: number, ctx: AthleteContext): number {
  const denominator = evalPolynomial(ctx.bodyweight, WILKS_COEFFICIENTS[ctx.sex]);
  return parseFloat(((totalKg * 500) / denominator).toFixed(2));
}

export function dots(totalKg: number, ctx: AthleteContext): number {
  const { coefficients, minBw, maxBw } = DOTS_COEFFICIENTS[ctx.sex];
  if (ctx.bodyweight < minBw || ctx.bodyweight > maxBw) {
    return 0;
  }
  const denominator = evalPolynomial(ctx.bodyweight, coefficients);
  return Math.round(((totalKg * 500) / denominator) * 100) / 100;
}
