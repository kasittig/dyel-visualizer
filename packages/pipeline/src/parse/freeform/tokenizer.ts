import type { Unit } from '../../types';

export interface TokenizerOutput {
  weights: Array<{ value: number; unit?: Unit }>;
  reps: number;
  rpe?: number;
}

export class TokenizerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenizerError';
  }
}

const parseWeight = (str: string): { value: number; unit?: Unit } | null => {
  const m = str.match(/^(\d+(?:\.\d+)?)(lbs|kg)?$/i);
  return m ? { value: parseFloat(m[1]), unit: m[2]?.toLowerCase() as Unit } : null;
};

export function tokenize(line: string): TokenizerOutput {
  const tokens = line.trim().split(/\s+/);
  const weights: TokenizerOutput['weights'] = [];
  let reps: number | null = null;
  let rpe: number | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const next = tokens[i + 1];
    if (t.startsWith('@') && t.length > 1) {
      rpe = parseFloat(t.slice(1));
    } else if (/^x\d+$/i.test(t) || /^\d+rm$/i.test(t)) {
      reps = parseInt(t.replace(/x|rm/gi, ''), 10);
    } else if (/^\d+x\d+$/i.test(t)) {
      const [a, b] = t.split(/x/i).map(Number);
      reps = b;
      if (!tokens.slice(i + 1).includes('@')) {
        weights.push({ value: a });
      }
    } else if (t.includes('/')) {
      t.split('/').forEach((p: string) => {
        const w = parseWeight(p);
        if (w) {
          weights.push(w);
        }
      });
    } else if (t.toLowerCase() === 'x' && next && !isNaN(Number(next))) {
      reps = parseInt(next, 10);
      i++;
    } else if (t === '@' && next && parseWeight(next)) {
      weights.push(parseWeight(next)!);
      i++;
    } else {
      const w = parseWeight(t);
      if (w) {
        weights.push(w);
      }
    }
  }

  if (reps === null || !weights.length) {
    throw new TokenizerError(`No ${reps === null ? 'reps' : 'weights'} found in: ${line.trim()}`);
  }
  return { weights, reps, ...(rpe !== null ? { rpe } : {}) };
}
