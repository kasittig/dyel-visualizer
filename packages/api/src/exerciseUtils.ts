import { CONJUGATE_BARS, CONJUGATE_STANCES, CONJUGATE_EQUIPMENT } from './conjugate/facets';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const BAR_DISPLAY: Record<string, string> = {
  ssb: 'SSB',
  american: 'American Bar',
  swiss: 'Swiss Bar',
  cambered: 'Cambered Bar',
  trap: 'Trap Bar',
  zercher: 'Zercher',
  duffalo: 'Duffalo Bar',
  dumbbell: 'Dumbbell',
  bamboo: 'Bamboo Bar',
  belt: 'Belt',
  goblet: 'Goblet',
  standard: '',
};

const LIFT_DISPLAY: Record<string, string> = {
  squat: 'Squat',
  bench: 'Bench Press',
  deadlift: 'Deadlift',
};
const BAND_MAGS = new Set(['light', 'mini', 'micro', 'heavy', 'medium']);

function formatEquipmentToken(equipment: string, magnitude: string | null): string {
  const m = magnitude ?? '1';
  if (equipment === 'board') {
    return `${m}-Board`;
  }
  if (equipment === 'blocks') {
    return `${m}" Blocks`;
  }
  if (equipment === 'deficit') {
    return `${m}" Deficit`;
  }
  return cap(equipment);
}

function formatAddlWtClause(kind: string, magnitude: string | null): string {
  const noun = kind === 'rev-bands' ? 'reverse bands' : kind;
  if (magnitude && ((kind === 'chains' && /^\d+$/.test(magnitude)) || BAND_MAGS.has(magnitude))) {
    return `${magnitude} ${noun}`;
  }
  return noun;
}

export function formatExerciseDisplayName(canonical: string): string {
  const fallback = () => canonical.split('-').map(cap).join(' ');
  try {
    if (!canonical) {
      return '';
    }
    const tokens = canonical.split('-');
    const [liftType, ...rest] = tokens;
    if (!new Set(['squat', 'bench', 'deadlift']).has(liftType)) {
      return fallback();
    }

    const barSet = new Set<string>(CONJUGATE_BARS);
    const stanceSet = new Set<string>(CONJUGATE_STANCES);
    const equipSet = new Set<string>(CONJUGATE_EQUIPMENT);

    const norm: string[] = [];
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === 'rev' && rest[i + 1] === 'bands') {
        norm.push('rev-bands');
        i++;
      } else {
        norm.push(rest[i]);
      }
    }

    let bar: string | null = null,
      stance: string | null = null,
      equipment: string | null = null,
      equipMag: string | null = null;
    const addlWts: Array<{ kind: string; magnitude: string | null }> = [];

    let i = 0;
    while (i < norm.length) {
      const tok = norm[i];
      const next = norm[i + 1];
      const isNum = next && /^\d+$/.test(next);

      if (barSet.has(tok) && !bar) {
        bar = tok;
        i++;
      } else if (stanceSet.has(tok) && !stance) {
        stance = tok;
        i++;
      } else if (equipSet.has(tok) && !equipment) {
        equipment = tok;
        const hasMag = ['board', 'blocks', 'deficit'].includes(tok) && isNum;
        equipMag = hasMag ? next : null;
        i += hasMag ? 2 : 1;
      } else if (new Set(['chains', 'bands', 'rev-bands']).has(tok)) {
        let mag: string | null = null;
        if (tok === 'chains' && isNum) {
          mag = next;
          i += 2;
        } else if (
          tok !== 'chains' &&
          next &&
          new Set([...BAND_MAGS, 'unspecified'] as string[]).has(next)
        ) {
          mag = next === 'unspecified' ? null : next;
          i += 2;
        } else {
          i++;
        }
        addlWts.push({ kind: tok, magnitude: mag });
      } else {
        i++;
      }
    }

    const pre: string[] = [];
    if (bar && BAR_DISPLAY[bar]) {
      pre.push(BAR_DISPLAY[bar]);
    }
    if (stance && stance !== 'competition') {
      pre.push(cap(stance));
    }
    if (equipment) {
      pre.push(formatEquipmentToken(equipment, equipMag));
    }

    const base = LIFT_DISPLAY[liftType] || cap(liftType);
    const main = pre.length ? `${pre.join(' ')} ${base}` : base;

    return addlWts.length
      ? `${main} w/${addlWts.map((aw) => formatAddlWtClause(aw.kind, aw.magnitude)).join(' + ')}`
      : main;
  } catch {
    return fallback();
  }
}

export function buildExerciseDisplayNameIndex(
  canonicals: string[]
): { canonical: string; displayName: string }[] {
  return Array.from(new Set(canonicals))
    .map((canonical) => ({
      canonical,
      displayName: formatExerciseDisplayName(canonical),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
