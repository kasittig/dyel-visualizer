import { CONJUGATE_BARS, CONJUGATE_STANCES, CONJUGATE_EQUIPMENT } from './conjugate/facets';

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

const BAR_DISPLAY: Record<string, string> = {
  ssb: 'SSB',
  american: 'American Bar',
  swiss: 'Swiss Bar',
  cambered: 'Cambered Bar',
  standard: '',
  trap: 'Trap Bar',
  zercher: 'Zercher',
  duffalo: 'Duffalo Bar',
  dumbbell: 'Dumbbell',
  bamboo: 'Bamboo Bar',
  belt: 'Belt',
  goblet: 'Goblet',
};

const LIFT_DISPLAY: Record<string, string> = {
  squat: 'Squat',
  bench: 'Bench Press',
  deadlift: 'Deadlift',
};

function formatEquipmentToken(equipment: string, magnitude: string | null): string {
  if (equipment === 'board') {
    return `${magnitude ?? '1'}-Board`;
  } else if (equipment === 'blocks') {
    return `${magnitude ?? '1'}" Blocks`;
  } else if (equipment === 'deficit') {
    return `${magnitude ?? '1'}" Deficit`;
  } else {
    return capitalize(equipment);
  }
}

function formatAddlWtClause(kind: string, magnitude: string | null): string {
  const noun =
    kind === 'chains'
      ? 'chains'
      : kind === 'bands'
        ? 'bands'
        : kind === 'rev-bands'
          ? 'reverse bands'
          : kind;

  const bandMagnitudes = new Set(['light', 'mini', 'micro', 'heavy', 'medium']);

  if (magnitude) {
    if (kind === 'chains' && /^\d+$/.test(magnitude)) {
      return `${magnitude} ${noun}`;
    } else if ((kind === 'bands' || kind === 'rev-bands') && bandMagnitudes.has(magnitude)) {
      return `${magnitude} ${noun}`;
    }
  }
  return noun;
}

export function formatExerciseDisplayName(canonical: string): string {
  try {
    const tokens = canonical.split('-');
    if (!canonical || tokens.length === 0) {
      return '';
    }

    const liftType = tokens[0];
    const rest = tokens.slice(1);

    const liftTypes = new Set(['squat', 'bench', 'deadlift']);
    if (!liftTypes.has(liftType)) {
      return tokens.map(capitalize).join(' ');
    }

    const barSet: Set<string> = new Set(CONJUGATE_BARS);
    const stanceSet: Set<string> = new Set(CONJUGATE_STANCES);
    const equipmentSet: Set<string> = new Set(CONJUGATE_EQUIPMENT);
    const addlWtSet = new Set(['chains', 'bands', 'rev-bands']);

    const normalized = [...rest];

    for (let i = 0; i < normalized.length - 1; i++) {
      if (normalized[i] === 'rev' && normalized[i + 1] === 'bands') {
        normalized.splice(i, 2, 'rev-bands');
      }
    }

    let bar: string | null = null;
    let stance: string | null = null;
    let equipment: string | null = null;
    let equipmentMagnitude: string | null = null;
    const addlWts: Array<{ kind: string; magnitude: string | null }> = [];

    let i = 0;
    while (i < normalized.length) {
      const token = normalized[i];

      if (barSet.has(token) && !bar) {
        bar = token;
        i++;
      } else if (stanceSet.has(token) && !stance) {
        stance = token;
        i++;
      } else if (equipmentSet.has(token) && !equipment) {
        equipment = token;
        const nextToken = normalized[i + 1];
        if (
          (equipment === 'board' || equipment === 'blocks' || equipment === 'deficit') &&
          nextToken &&
          /^\d+$/.test(nextToken)
        ) {
          equipmentMagnitude = nextToken;
          i += 2;
        } else {
          i++;
        }
      } else if (addlWtSet.has(token)) {
        const nextToken = normalized[i + 1];
        let magnitude: string | null = null;

        if (token === 'chains' && nextToken && /^\d+$/.test(nextToken)) {
          magnitude = nextToken;
          i += 2;
        } else if (
          (token === 'bands' || token === 'rev-bands') &&
          nextToken &&
          new Set(['light', 'mini', 'micro', 'heavy', 'medium', 'unspecified']).has(nextToken)
        ) {
          magnitude = nextToken === 'unspecified' ? null : nextToken;
          i += 2;
        } else {
          i++;
        }
        addlWts.push({ kind: token, magnitude });
      } else {
        i++;
      }
    }

    const prefix: string[] = [];
    if (bar) {
      const barDisplay = BAR_DISPLAY[bar];
      if (barDisplay) {
        prefix.push(barDisplay);
      }
    }
    if (stance && stance !== 'competition') {
      prefix.push(capitalize(stance));
    }
    if (equipment) {
      prefix.push(formatEquipmentToken(equipment, equipmentMagnitude));
    }

    const baseLift = LIFT_DISPLAY[liftType] || capitalize(liftType);
    const mainName = prefix.length > 0 ? prefix.join(' ') + ' ' + baseLift : baseLift;

    if (addlWts.length === 0) {
      return mainName;
    }

    const clause =
      'w/' + addlWts.map((aw) => formatAddlWtClause(aw.kind, aw.magnitude)).join(' + ');
    return `${mainName} ${clause}`;
  } catch {
    return canonical
      .split('-')
      .map((token) => capitalize(token))
      .join(' ');
  }
}
