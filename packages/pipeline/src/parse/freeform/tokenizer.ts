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
      const suffix = t.slice(1);
      const w = parseWeight(suffix);
      if (w) {
        if (w.unit || w.value > 10) {
          // Has unit or value > 10 → weight annotation
          weights.push(w);
        } else {
          // Unitless and ≤ 10 → RPE
          rpe = w.value;
        }
      }
    } else if (/^x\d+$/i.test(t) || /^\d+rm$/i.test(t)) {
      reps = parseInt(t.replace(/x|rm/gi, ''), 10);
    } else if (/^\d+x\d+$/i.test(t)) {
      const [a, b] = t.split(/x/i).map(Number);
      reps = b;
      // Check if there's an explicit weight elsewhere on the line
      const hasExplicitWeight = tokens.slice(i + 1).some((tok) => {
        if (tok === '@') {
          return true; // bare @ means weight follows
        }
        if (tok.startsWith('@') && tok.length > 1) {
          const w = parseWeight(tok.slice(1));
          return w && (w.unit || w.value > 10); // weight if has unit or value > 10
        }
        return !!parseWeight(tok);
      });
      if (!hasExplicitWeight) {
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
