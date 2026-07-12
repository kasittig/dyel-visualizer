import type { AthleteContext } from '@dyel/pipeline';
import { KG_TO_LBS } from './weightUnit';

interface LiftMetrics {
  dots: number;
  dotsPercentile: number;
  wilks: number;
  wilksPercentile: number;
  schwartzmalone: number;
  schwartzmalonePercentile: number;
}

interface SMAnchorValue {
  w: number;
  c: number;
}

const WILKS: Record<AthleteContext['sex'], number[]> = {
  M: [-216.0475144, 16.2606339, -0.002388645, -0.00113732, 7.01863e-6, -1.291e-8],
  F: [594.31747775582, -27.23842536447, 0.82112226871, -0.00930733913, 4.731582e-5, -9.054e-8],
};

const DOTS: Record<AthleteContext['sex'], { c: number[]; min: number; max: number }> = {
  M: { c: [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -1.093e-6], min: 40, max: 210 },
  F: { c: [-57.96288, 13.6175032, -0.1126655495, 0.0005158568, -1.0706e-6], min: 40, max: 150 },
};

const SCHWARTZ_MALONE_MALE: SMAnchorValue[] = [
  { w: 90, c: 1.2803 },
  { w: 91, c: 1.2627 },
  { w: 92, c: 1.2455 },
  { w: 93, c: 1.2287 },
  { w: 94, c: 1.212 },
  { w: 95, c: 1.1965 },
  { w: 96, c: 1.1809 },
  { w: 97, c: 1.1657 },
  { w: 98, c: 1.1509 },
  { w: 99, c: 1.1365 },
  { w: 100, c: 1.1223 },
  { w: 101, c: 1.1086 },
  { w: 102, c: 1.0952 },
  { w: 103, c: 1.0821 },
  { w: 104, c: 1.0693 },
  { w: 105, c: 1.0569 },
  { w: 106, c: 1.0448 },
  { w: 107, c: 1.0329 },
  { w: 108, c: 1.0214 },
  { w: 109, c: 1.0101 },
  { w: 110, c: 0.9991 },
  { w: 111, c: 0.9884 },
  { w: 112, c: 0.9779 },
  { w: 113, c: 0.9677 },
  { w: 114, c: 0.9578 },
  { w: 115, c: 0.9481 },
  { w: 116, c: 0.9385 },
  { w: 117, c: 0.9293 },
  { w: 118, c: 0.9203 },
  { w: 119, c: 0.9115 },
  { w: 120, c: 0.9029 },
  { w: 121, c: 0.8946 },
  { w: 122, c: 0.8863 },
  { w: 123, c: 0.8783 },
  { w: 124, c: 0.8706 },
  { w: 125, c: 0.863 },
  { w: 126, c: 0.8556 },
  { w: 127, c: 0.8483 },
  { w: 128, c: 0.8412 },
  { w: 129, c: 0.8343 },
  { w: 130, c: 0.8276 },
  { w: 131, c: 0.821 },
  { w: 132, c: 0.8146 },
  { w: 133, c: 0.8083 },
  { w: 134, c: 0.8022 },
  { w: 135, c: 0.7961 },
  { w: 136, c: 0.7903 },
  { w: 137, c: 0.7846 },
  { w: 138, c: 0.779 },
  { w: 139, c: 0.7735 },
  { w: 140, c: 0.7682 },
  { w: 141, c: 0.763 },
  { w: 142, c: 0.7579 },
  { w: 143, c: 0.7528 },
  { w: 144, c: 0.7479 },
  { w: 145, c: 0.7432 },
  { w: 146, c: 0.7385 },
  { w: 147, c: 0.7339 },
  { w: 148, c: 0.7294 },
  { w: 149, c: 0.725 },
  { w: 150, c: 0.7207 },
  { w: 151, c: 0.7165 },
  { w: 152, c: 0.7124 },
  { w: 153, c: 0.7083 },
  { w: 154, c: 0.7044 },
  { w: 155, c: 0.7004 },
  { w: 156, c: 0.6967 },
  { w: 157, c: 0.693 },
  { w: 158, c: 0.6893 },
  { w: 159, c: 0.6857 },
  { w: 160, c: 0.6822 },
  { w: 161, c: 0.6787 },
  { w: 162, c: 0.6753 },
  { w: 163, c: 0.672 },
  { w: 164, c: 0.6688 },
  { w: 165, c: 0.6656 },
  { w: 166, c: 0.6624 },
  { w: 167, c: 0.6593 },
  { w: 168, c: 0.6563 },
  { w: 169, c: 0.6533 },
  { w: 170, c: 0.6504 },
  { w: 171, c: 0.6475 },
  { w: 172, c: 0.6447 },
  { w: 173, c: 0.642 },
  { w: 174, c: 0.6392 },
  { w: 175, c: 0.6365 },
  { w: 176, c: 0.6339 },
  { w: 177, c: 0.6313 },
  { w: 178, c: 0.6288 },
  { w: 179, c: 0.6262 },
  { w: 180, c: 0.6238 },
  { w: 181, c: 0.6214 },
  { w: 182, c: 0.619 },
  { w: 183, c: 0.6167 },
  { w: 184, c: 0.6144 },
  { w: 185, c: 0.6121 },
  { w: 186, c: 0.61 },
  { w: 187, c: 0.6078 },
  { w: 188, c: 0.6057 },
  { w: 189, c: 0.6036 },
  { w: 190, c: 0.6016 },
  { w: 191, c: 0.5996 },
  { w: 192, c: 0.5977 },
  { w: 193, c: 0.5957 },
  { w: 194, c: 0.5938 },
  { w: 195, c: 0.5919 },
  { w: 196, c: 0.59 },
  { w: 197, c: 0.5882 },
  { w: 198, c: 0.5864 },
  { w: 199, c: 0.5846 },
  { w: 200, c: 0.5828 },
  { w: 201, c: 0.581 },
  { w: 202, c: 0.5793 },
  { w: 203, c: 0.5776 },
  { w: 204, c: 0.5759 },
  { w: 205, c: 0.5742 },
  { w: 206, c: 0.5726 },
  { w: 207, c: 0.5709 },
  { w: 208, c: 0.5693 },
  { w: 209, c: 0.5677 },
  { w: 210, c: 0.5661 },
  { w: 211, c: 0.5645 },
  { w: 212, c: 0.563 },
  { w: 213, c: 0.5614 },
  { w: 214, c: 0.5599 },
  { w: 215, c: 0.5584 },
  { w: 216, c: 0.5569 },
  { w: 217, c: 0.5554 },
  { w: 218, c: 0.5539 },
  { w: 219, c: 0.5525 },
  { w: 220, c: 0.551 },
  { w: 221, c: 0.5496 },
  { w: 222, c: 0.5482 },
  { w: 223, c: 0.5468 },
  { w: 224, c: 0.5454 },
  { w: 225, c: 0.544 },
  { w: 226, c: 0.5426 },
  { w: 227, c: 0.5412 },
  { w: 228, c: 0.5399 },
  { w: 229, c: 0.5385 },
  { w: 230, c: 0.5372 },
  { w: 231, c: 0.5358 },
  { w: 232, c: 0.5345 },
  { w: 233, c: 0.5332 },
  { w: 234, c: 0.5319 },
  { w: 235, c: 0.5306 },
  { w: 236, c: 0.5293 },
  { w: 237, c: 0.528 },
  { w: 238, c: 0.5268 },
  { w: 239, c: 0.5255 },
  { w: 240, c: 0.5243 },
  { w: 241, c: 0.523 },
  { w: 242, c: 0.5218 },
  { w: 243, c: 0.5206 },
  { w: 244, c: 0.5194 },
  { w: 245, c: 0.5182 },
  { w: 246, c: 0.517 },
  { w: 247, c: 0.5158 },
  { w: 248, c: 0.5147 },
  { w: 249, c: 0.5135 },
  { w: 250, c: 0.5123 },
];

const SCHWARTZ_MALONE_FEMALE: SMAnchorValue[] = [
  { w: 90, c: 1.1756 },
  { w: 91, c: 1.1645 },
  { w: 92, c: 1.1557 },
  { w: 93, c: 1.145 },
  { w: 94, c: 1.1365 },
  { w: 95, c: 1.1261 },
  { w: 96, c: 1.118 },
  { w: 97, c: 1.1079 },
  { w: 98, c: 1.098 },
  { w: 99, c: 1.0903 },
  { w: 100, c: 1.0807 },
  { w: 101, c: 1.0732 },
  { w: 102, c: 1.0657 },
  { w: 103, c: 1.0566 },
  { w: 104, c: 1.0494 },
  { w: 105, c: 1.0405 },
  { w: 106, c: 1.0336 },
  { w: 107, c: 1.025 },
  { w: 108, c: 1.0165 },
  { w: 109, c: 1.0098 },
  { w: 110, c: 1.0011 },
  { w: 111, c: 0.9948 },
  { w: 112, c: 0.9872 },
  { w: 113, c: 0.9795 },
  { w: 114, c: 0.9727 },
  { w: 115, c: 0.9659 },
  { w: 116, c: 0.9592 },
  { w: 117, c: 0.9526 },
  { w: 118, c: 0.946 },
  { w: 119, c: 0.9402 },
  { w: 120, c: 0.9336 },
  { w: 121, c: 0.928 },
  { w: 122, c: 0.9225 },
  { w: 123, c: 0.9163 },
  { w: 124, c: 0.9103 },
  { w: 125, c: 0.9051 },
  { w: 126, c: 0.8994 },
  { w: 127, c: 0.8941 },
  { w: 128, c: 0.8889 },
  { w: 129, c: 0.8834 },
  { w: 130, c: 0.8738 },
  { w: 131, c: 0.8676 },
  { w: 132, c: 0.8628 },
  { w: 133, c: 0.8579 },
  { w: 134, c: 0.8523 },
  { w: 135, c: 0.8478 },
  { w: 136, c: 0.8425 },
  { w: 137, c: 0.8373 },
  { w: 138, c: 0.8321 },
  { w: 139, c: 0.8271 },
  { w: 140, c: 0.8202 },
  { w: 141, c: 0.8159 },
  { w: 142, c: 0.8105 },
  { w: 143, c: 0.8052 },
  { w: 144, c: 0.801 },
  { w: 145, c: 0.7959 },
  { w: 146, c: 0.7918 },
  { w: 147, c: 0.7867 },
  { w: 148, c: 0.7827 },
  { w: 149, c: 0.7769 },
  { w: 150, c: 0.7737 },
  { w: 151, c: 0.7697 },
  { w: 152, c: 0.7666 },
  { w: 153, c: 0.7627 },
  { w: 154, c: 0.7596 },
  { w: 155, c: 0.7565 },
  { w: 156, c: 0.752 },
  { w: 157, c: 0.752 },
  { w: 158, c: 0.7453 },
  { w: 159, c: 0.7431 },
  { w: 160, c: 0.7392 },
  { w: 161, c: 0.7372 },
  { w: 162, c: 0.7345 },
  { w: 163, c: 0.7325 },
  { w: 164, c: 0.7295 },
  { w: 165, c: 0.7268 },
  { w: 166, c: 0.7252 },
  { w: 167, c: 0.7222 },
  { w: 168, c: 0.7195 },
  { w: 169, c: 0.717 },
  { w: 170, c: 0.7148 },
  { w: 171, c: 0.7122 },
  { w: 172, c: 0.7097 },
  { w: 173, c: 0.7071 },
  { w: 174, c: 0.7055 },
  { w: 175, c: 0.703 },
  { w: 176, c: 0.7004 },
  { w: 177, c: 0.6988 },
  { w: 178, c: 0.6963 },
  { w: 179, c: 0.6938 },
  { w: 180, c: 0.6913 },
  { w: 181, c: 0.6888 },
  { w: 182, c: 0.6863 },
  { w: 183, c: 0.6838 },
  { w: 184, c: 0.6806 },
  { w: 185, c: 0.6782 },
  { w: 186, c: 0.6757 },
  { w: 187, c: 0.6743 },
  { w: 188, c: 0.6719 },
  { w: 189, c: 0.6694 },
  { w: 190, c: 0.6674 },
  { w: 191, c: 0.665 },
  { w: 192, c: 0.6631 },
  { w: 193, c: 0.6607 },
  { w: 194, c: 0.6588 },
  { w: 195, c: 0.6563 },
  { w: 196, c: 0.6544 },
  { w: 197, c: 0.652 },
  { w: 198, c: 0.6501 },
  { w: 199, c: 0.6477 },
  { w: 200, c: 0.6458 },
  { w: 201, c: 0.6434 },
  { w: 202, c: 0.6415 },
  { w: 203, c: 0.639 },
  { w: 204, c: 0.6371 },
  { w: 205, c: 0.6347 },
  { w: 206, c: 0.6328 },
  { w: 207, c: 0.6304 },
  { w: 208, c: 0.6285 },
  { w: 209, c: 0.6261 },
  { w: 210, c: 0.6242 },
  { w: 211, c: 0.6223 },
  { w: 212, c: 0.6199 },
  { w: 213, c: 0.618 },
  { w: 214, c: 0.6161 },
  { w: 215, c: 0.6142 },
  { w: 216, c: 0.6118 },
  { w: 217, c: 0.6099 },
  { w: 218, c: 0.608 },
  { w: 219, c: 0.6061 },
  { w: 220, c: 0.6042 },
  { w: 221, c: 0.6023 },
  { w: 222, c: 0.5999 },
  { w: 223, c: 0.598 },
  { w: 224, c: 0.5961 },
  { w: 225, c: 0.5942 },
  { w: 226, c: 0.5923 },
  { w: 227, c: 0.5904 },
  { w: 228, c: 0.5885 },
  { w: 229, c: 0.5866 },
  { w: 230, c: 0.5847 },
  { w: 231, c: 0.5828 },
  { w: 232, c: 0.5809 },
  { w: 233, c: 0.579 },
  { w: 234, c: 0.5776 },
  { w: 235, c: 0.5757 },
  { w: 236, c: 0.5738 },
  { w: 237, c: 0.5765 },
  { w: 238, c: 0.5754 },
  { w: 239, c: 0.574 },
  { w: 240, c: 0.5725 },
  { w: 241, c: 0.5714 },
  { w: 242, c: 0.57 },
  { w: 243, c: 0.5693 },
  { w: 244, c: 0.5686 },
  { w: 245, c: 0.5681 },
  { w: 246, c: 0.5671 },
  { w: 247, c: 0.5669 },
  { w: 248, c: 0.5662 },
  { w: 249, c: 0.5656 },
  { w: 250, c: 0.5649 },
];

const WILKS_PERCENTILE = {
  M: { mean: 315, std: 55 },
  F: { mean: 315, std: 55 },
};

const DOTS_PERCENTILE = {
  M: { mean: 310, std: 52 },
  F: { mean: 285, std: 48 },
};

const SCHWARTZ_MALONE_PERCENTILE = {
  M: { mean: 215, std: 42 },
  F: { mean: 480, std: 85 },
};

const calc = (bw: number, total: number, coeff: number[]) => {
  return (
    Math.round(
      ((total * 500) /
        coeff.reduce((sum, c, i) => {
          return sum + c * Math.pow(bw, i);
        }, 0)) *
        100
    ) / 100
  );
};

const convertUnits = (v: number, from: 'lbs' | 'kg', to: 'lbs' | 'kg') => {
  return from === to ? v : from === 'lbs' ? v / KG_TO_LBS : v * KG_TO_LBS;
};

function calculatePercentileRank(
  score: number,
  { mean, std }: { mean: number; std: number }
): number {
  const z = (score - mean) / std,
    absZ = Math.abs(z),
    t = 1 / (1 + 0.2316419 * absZ);
  const a = [0.31938153, -0.356563782, 1.781477937, -1.821255978, 1.330274429];
  const pdf = Math.exp(-0.5 * absZ * absZ) / Math.sqrt(2 * Math.PI);
  const q = pdf * t * (a[0] + t * (a[1] + t * (a[2] + t * (a[3] + t * a[4]))));
  return Math.min(99, Math.max(1, Math.round((z >= 0 ? 1 - q : q) * 100)));
}

function calculateSchwartzMalone(bw: number, total: number, coefficients: SMAnchorValue[]): number {
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
      coefficient = current.c + ((bw - current.w) * (next.c - current.c)) / (next.w - current.w);
      break;
    }
  }

  const formulaTotal = total * coefficient;
  return Number(formulaTotal.toFixed(4));
}

export function strengthTierForPercentile(percentile: number): string {
  if (percentile >= 99) {
    return 'World class';
  }
  if (percentile >= 90) {
    return 'Elite';
  }
  if (percentile >= 60) {
    return 'Advanced';
  }
  if (percentile >= 30) {
    return 'Intermediate';
  }
  return 'Novice';
}

export function computeStrengthScores(
  bodyweight: number,
  total: number,
  isFemale: boolean,
  unit: 'lbs' | 'kg' = 'lbs'
): LiftMetrics {
  const sex = isFemale ? 'F' : 'M';
  const bwKg = convertUnits(bodyweight, unit, 'kg'),
    totalKg = convertUnits(total, unit, 'kg');
  const bwLbs = convertUnits(bodyweight, unit, 'lbs'),
    totalLbs = convertUnits(total, unit, 'lbs');

  const wilksScore = calc(bwKg, totalKg, WILKS[sex]);
  const dotsScore =
    bwKg < DOTS[sex].min || bwKg > DOTS[sex].max ? 0 : calc(bwKg, totalKg, DOTS[sex].c);
  const smScore = calculateSchwartzMalone(
    bwLbs,
    totalLbs,
    sex === 'F' ? SCHWARTZ_MALONE_FEMALE : SCHWARTZ_MALONE_MALE
  );

  return {
    wilks: wilksScore,
    wilksPercentile: calculatePercentileRank(wilksScore, WILKS_PERCENTILE[sex]),
    dots: dotsScore,
    dotsPercentile: calculatePercentileRank(dotsScore, DOTS_PERCENTILE[sex]),
    schwartzmalone: smScore,
    schwartzmalonePercentile: calculatePercentileRank(smScore, SCHWARTZ_MALONE_PERCENTILE[sex]),
  };
}
