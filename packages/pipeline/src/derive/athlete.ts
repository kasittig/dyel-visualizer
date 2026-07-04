export interface AthleteContext {
  sex: 'M' | 'F';
  bodyweight: number;
}

const WILKS: Record<AthleteContext['sex'], number[]> = {
  M: [-216.0475144, 16.2606339, -0.002388645, -0.00113732, 7.01863e-6, -1.291e-8],
  F: [594.31747775582, -27.23842536447, 0.82112226871, -0.00930733913, 4.731582e-5, -9.054e-8],
};

const DOTS: Record<AthleteContext['sex'], { c: number[]; min: number; max: number }> = {
  M: { c: [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -1.093e-6], min: 40, max: 210 },
  F: { c: [-57.96288, 13.6175032, -0.1126655495, 0.0005158568, -1.0706e-6], min: 40, max: 150 },
};

const calc = (bw: number, total: number, coeff: number[]) => {
  const d = coeff.reduce((sum, c, i) => sum + c * Math.pow(bw, i), 0);
  return Math.round(((total * 500) / d) * 100) / 100;
};

export const wilks = (totalKg: number, { bodyweight: bw, sex }: AthleteContext) =>
  calc(bw, totalKg, WILKS[sex]);

export const dots = (totalKg: number, { bodyweight: bw, sex }: AthleteContext) => {
  const { c, min, max } = DOTS[sex];
  return bw < min || bw > max ? 0 : calc(bw, totalKg, c);
};
