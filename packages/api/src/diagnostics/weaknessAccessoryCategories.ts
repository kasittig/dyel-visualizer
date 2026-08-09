import type { AccessoryCategory } from '../accessory/accessoryCoverage';
import type { DiagnosticEffectEvidence } from './diagnosticsSelectors';

export const DIAGNOSTIC_EFFECTS = [
  'BAR_SPEED',
  'BOTTOM_RANGE',
  'CONDITIONING',
  'CORE_DEMAND',
  'DEAD_STOP',
  'EXTENDED_ROM',
  'HAMSTRING_DOMINANT',
  'HIP_DOMINANT',
  'LOCKOUT',
  'LOWER_BACK_DEMAND',
  'LOWER_PECS',
  'PEC_DOMINANT',
  'POSTERIOR_CHAIN',
  'POSTERIOR_SHIFT',
  'QUAD_DOMINANT',
  'REDUCED_ROM',
  'STABILIZER_DEMAND',
  'SUPRAMAXIMAL',
  'TRICEP_DOMINANT',
  'UNILATERAL',
  'UPPER_BACK_DEMAND',
  'UPPER_PECS',
  'UPRIGHT_TORSO',
] as const;

export type DiagnosticEffect = (typeof DIAGNOSTIC_EFFECTS)[number];
export type WeaknessAccessoryMappingStatus = 'mapped' | 'unsupported' | 'unmapped';
export interface WeaknessAccessoryCategoryMapping {
  evidence: DiagnosticEffectEvidence;
  categories: AccessoryCategory[];
  status: WeaknessAccessoryMappingStatus;
  rationale: string;
  provenance: 'reviewed-effect-map';
}
interface MappingRule {
  categories: readonly AccessoryCategory[];
  rationale: string;
}

const EFFECT_CATEGORY_RULES: Readonly<Record<DiagnosticEffect, MappingRule>> = {
  BAR_SPEED: {
    categories: [],
    rationale: 'Bar speed is a performance quality, not an accessory category.',
  },
  BOTTOM_RANGE: { categories: [], rationale: 'Bottom-range demand depends on the diagnosed lift.' },
  CONDITIONING: {
    categories: ['conditioning'],
    rationale: 'Conditioning demand directly matches the conditioning category.',
  },
  CORE_DEMAND: {
    categories: ['core'],
    rationale: 'Core demand directly matches the core category.',
  },
  DEAD_STOP: {
    categories: [],
    rationale: 'Dead-stop performance does not identify a broad accessory category.',
  },
  EXTENDED_ROM: {
    categories: [],
    rationale: 'Extended range of motion does not identify a broad accessory category.',
  },
  HAMSTRING_DOMINANT: {
    categories: ['hamstrings'],
    rationale: 'Hamstring-dominant demand directly matches the hamstrings category.',
  },
  HIP_DOMINANT: {
    categories: ['glutes', 'hamstrings'],
    rationale: 'Hip-dominant demand spans the glutes and hamstrings categories.',
  },
  LOCKOUT: {
    categories: [],
    rationale: 'Lockout demand is lift-specific and cannot be mapped safely without lift context.',
  },
  LOWER_BACK_DEMAND: {
    categories: ['low-back'],
    rationale: 'Lower-back demand directly matches the low-back category.',
  },
  LOWER_PECS: {
    categories: ['upper-push'],
    rationale: 'Lower-pec demand belongs to the broad upper-push category.',
  },
  PEC_DOMINANT: {
    categories: ['upper-push'],
    rationale: 'Pec-dominant demand belongs to the broad upper-push category.',
  },
  POSTERIOR_CHAIN: {
    categories: ['hamstrings', 'glutes', 'low-back'],
    rationale: 'Posterior-chain demand spans the hamstrings, glutes, and low-back categories.',
  },
  POSTERIOR_SHIFT: {
    categories: ['glutes', 'hamstrings'],
    rationale: 'Posterior loading shifts demand toward the glutes and hamstrings categories.',
  },
  QUAD_DOMINANT: {
    categories: ['quads'],
    rationale: 'Quad-dominant demand directly matches the quads category.',
  },
  REDUCED_ROM: {
    categories: [],
    rationale: 'Reduced range of motion does not identify a broad accessory category.',
  },
  STABILIZER_DEMAND: {
    categories: [],
    rationale: 'General stabilizer demand is too broad for one accessory category.',
  },
  SUPRAMAXIMAL: {
    categories: [],
    rationale: 'Supramaximal loading is an intensity property, not an accessory category.',
  },
  TRICEP_DOMINANT: {
    categories: ['triceps'],
    rationale: 'Triceps-dominant demand directly matches the triceps category.',
  },
  UNILATERAL: {
    categories: [],
    rationale: 'Unilateral loading is a training format, not an accessory category.',
  },
  UPPER_BACK_DEMAND: {
    categories: ['upper-pull'],
    rationale: 'Upper-back demand belongs to the broad upper-pull category.',
  },
  UPPER_PECS: {
    categories: ['upper-push'],
    rationale: 'Upper-pec demand belongs to the broad upper-push category.',
  },
  UPRIGHT_TORSO: {
    categories: [],
    rationale: 'Upright-torso demand is a movement characteristic, not an accessory category.',
  },
};

export function mapWeaknessesToAccessoryCategories(
  evidenceByEffect: readonly DiagnosticEffectEvidence[]
): WeaknessAccessoryCategoryMapping[] {
  return evidenceByEffect.flatMap((evidence) => {
    if (evidence.belowCount <= evidence.aboveCount) {
      return [];
    }
    const rule = EFFECT_CATEGORY_RULES[evidence.effect as DiagnosticEffect];
    return [
      rule
        ? {
            evidence: { ...evidence },
            categories: [...rule.categories],
            status: rule.categories.length ? 'mapped' : 'unsupported',
            rationale: rule.rationale,
            provenance: 'reviewed-effect-map',
          }
        : {
            evidence: { ...evidence },
            categories: [],
            status: 'unmapped',
            rationale: 'The effect is not part of the reviewed diagnostic effect map.',
            provenance: 'reviewed-effect-map',
          },
    ];
  });
}
