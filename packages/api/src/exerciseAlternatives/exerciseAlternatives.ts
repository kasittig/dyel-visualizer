export type ExerciseAlias = string;
export type ExerciseFamily = 'squat' | 'bench' | 'deadlift';
export type ExerciseIssueCategory =
  | 'grip-handle'
  | 'loading-range'
  | 'stance-spacing'
  | 'range-of-motion'
  | 'equipment-unavailable'
  | 'setup-unstable-difficult'
  | 'grip-uncomfortable'
  | 'movement-uncomfortable'
  | 'avoid-spinal-loading';
export type ExerciseIssueDirection =
  | 'too-small'
  | 'too-large'
  | 'starting-resistance-too-heavy'
  | 'maximum-resistance-too-light'
  | 'too-narrow'
  | 'too-wide'
  | 'too-short'
  | 'too-long';
export type ExerciseIssueId =
  | `grip-handle:${'too-small' | 'too-large'}`
  | `loading-range:${'starting-resistance-too-heavy' | 'maximum-resistance-too-light'}`
  | `stance-spacing:${'too-narrow' | 'too-wide'}`
  | `range-of-motion:${'too-short' | 'too-long'}`
  | 'equipment-unavailable'
  | 'setup-unstable-difficult'
  | 'grip-uncomfortable'
  | 'movement-uncomfortable'
  | 'avoid-spinal-loading';
export type ExerciseRecommendationKind = 'adjustment' | 'replacement';

export interface ExerciseIssueChoice {
  id: ExerciseIssueId;
  category: ExerciseIssueCategory;
  direction?: ExerciseIssueDirection;
  label: string;
}
export interface ExerciseRecommendationExplanation {
  whyItHelps: string;
  staysSimilar: string;
  changes: string;
}
export interface ExerciseRecommendation extends ExerciseRecommendationExplanation {
  id: string;
  kind: ExerciseRecommendationKind;
  title: string;
  exerciseId?: string;
}
export interface ExerciseAlternative {
  id: string;
  name: string;
  aliases: readonly ExerciseAlias[];
  recommendations: Readonly<Partial<Record<ExerciseIssueId, readonly ExerciseRecommendation[]>>>;
}

export const EXERCISE_ALTERNATIVE_ISSUES = [
  {
    id: 'grip-handle:too-small',
    category: 'grip-handle',
    direction: 'too-small',
    label: 'Grip or handle is too small',
  },
  {
    id: 'grip-handle:too-large',
    category: 'grip-handle',
    direction: 'too-large',
    label: 'Grip or handle is too large',
  },
  {
    id: 'loading-range:starting-resistance-too-heavy',
    category: 'loading-range',
    direction: 'starting-resistance-too-heavy',
    label: 'Starting resistance is too heavy',
  },
  {
    id: 'loading-range:maximum-resistance-too-light',
    category: 'loading-range',
    direction: 'maximum-resistance-too-light',
    label: 'Maximum resistance is too light',
  },
  {
    id: 'stance-spacing:too-narrow',
    category: 'stance-spacing',
    direction: 'too-narrow',
    label: 'Stance or spacing is too narrow',
  },
  {
    id: 'stance-spacing:too-wide',
    category: 'stance-spacing',
    direction: 'too-wide',
    label: 'Stance or spacing is too wide',
  },
  {
    id: 'range-of-motion:too-short',
    category: 'range-of-motion',
    direction: 'too-short',
    label: 'Range of motion is too short',
  },
  {
    id: 'range-of-motion:too-long',
    category: 'range-of-motion',
    direction: 'too-long',
    label: 'Range of motion is too long',
  },
  {
    id: 'equipment-unavailable',
    category: 'equipment-unavailable',
    label: 'Equipment unavailable',
  },
  {
    id: 'setup-unstable-difficult',
    category: 'setup-unstable-difficult',
    label: 'Setup is unstable or difficult',
  },
  { id: 'grip-uncomfortable', category: 'grip-uncomfortable', label: 'Grip is uncomfortable' },
  {
    id: 'movement-uncomfortable',
    category: 'movement-uncomfortable',
    label: 'Movement is uncomfortable',
  },
  {
    id: 'avoid-spinal-loading',
    category: 'avoid-spinal-loading',
    label: 'Avoid loading through the spine',
  },
] as const satisfies readonly ExerciseIssueChoice[];

const rec = (
  id: string,
  kind: ExerciseRecommendationKind,
  title: string,
  whyItHelps: string,
  staysSimilar: string,
  changes: string,
  exerciseId?: string
): ExerciseRecommendation => ({ id, kind, title, whyItHelps, staysSimilar, changes, exerciseId });

const unavailable = (id: string, title: string, exerciseId: string) =>
  rec(
    `${id}-unavailable`,
    'replacement',
    title,
    'Uses more commonly available equipment.',
    'Keeps the same broad movement pattern and primary training intent.',
    'Loading, stabilization, and resistance feel will differ.',
    exerciseId
  );
const discomfort = (id: string, title: string, exerciseId: string) =>
  rec(
    `${id}-comfort`,
    'replacement',
    title,
    'Offers a different setup or joint path. Stop any movement that reproduces pain and seek qualified help when appropriate.',
    'Keeps a related movement pattern and training intent.',
    'The range, balance demands, and muscle emphasis can differ.',
    exerciseId
  );
const avoidSpinalLoading = (
  id: string,
  title: string,
  staysSimilar: string,
  changes: string,
  exerciseId: string
) =>
  rec(
    `${id}-avoid-spinal-loading`,
    'replacement',
    title,
    'Shifts the primary external load away from a bar on the shoulders or a weight held in the hands. This does not eliminate spinal demand. Stop movements that reproduce pain and confirm medical restrictions with a qualified professional.',
    staysSimilar,
    changes,
    exerciseId
  );

export const EXERCISE_ALTERNATIVES_CATALOG: readonly ExerciseAlternative[] = [
  {
    id: 'barbell-bench-press',
    name: 'Barbell Bench Press',
    aliases: ['bench press', 'flat bench'],
    recommendations: {
      'grip-uncomfortable': [
        rec(
          'bench-grip',
          'adjustment',
          'Adjust grip width',
          'A modest grip change can provide a more comfortable hand and forearm position.',
          'Keeps the same barbell bench setup and loading.',
          'Touch point and muscle emphasis may shift.'
        ),
        discomfort('bench-db', 'Dumbbell Bench Press', 'dumbbell-bench-press'),
      ],
      'equipment-unavailable': [unavailable('bench', 'Push-Up', 'push-up')],
    },
  },
  {
    id: 'swiss-bar-bench-press',
    name: 'Swiss-Bar Bench Press',
    aliases: ['football bar bench', 'multi grip bench'],
    recommendations: {
      'grip-handle:too-small': [
        rec(
          'swiss-wider',
          'adjustment',
          'Use a wider handle pair',
          'Provides a wider hand placement without changing implements.',
          'Keeps the Swiss bar, neutral grip, bench, and loading method.',
          'Arm angle and pressing emphasis shift slightly.'
        ),
        rec(
          'swiss-flex',
          'replacement',
          'Dumbbell Bench Press',
          'Allows each hand to choose a flexible width and path.',
          'Keeps a horizontal free-weight press.',
          'Requires more independent stabilization and uses separate implements.',
          'dumbbell-bench-press'
        ),
        rec(
          'swiss-barbell',
          'replacement',
          'Barbell Bench Press',
          'Allows continuously adjustable hand placement along the bar.',
          'Keeps a barbell-loaded horizontal press.',
          'Uses a pronated rather than neutral grip.',
          'barbell-bench-press'
        ),
      ],
      'equipment-unavailable': [unavailable('swiss', 'Barbell Bench Press', 'barbell-bench-press')],
    },
  },
  {
    id: 'close-grip-bench-press',
    name: 'Close-Grip Bench Press',
    aliases: ['cgbp'],
    recommendations: {
      'grip-handle:too-small': [
        rec(
          'cgbp-widen',
          'adjustment',
          'Widen the grip slightly',
          'Creates more hand spacing while retaining a relatively close grip.',
          'Keeps the same barbell bench movement.',
          'May reduce triceps emphasis slightly.'
        ),
      ],
      'movement-uncomfortable': [
        discomfort('cgbp', 'Dumbbell Bench Press', 'dumbbell-bench-press'),
      ],
    },
  },
  {
    id: 'dumbbell-bench-press',
    name: 'Dumbbell Bench Press',
    aliases: ['db bench'],
    recommendations: {
      'loading-range:maximum-resistance-too-light': [
        rec(
          'db-tempo',
          'adjustment',
          'Add a pause or slower lowering',
          'Makes available weight more challenging without heavier dumbbells.',
          'Keeps the same dumbbell press and bench setup.',
          'Reduces momentum and changes time under tension.'
        ),
        rec(
          'db-barbell',
          'replacement',
          'Barbell Bench Press',
          'Supports heavier incremental loading.',
          'Keeps a horizontal free-weight press.',
          'Hands share one implement and stabilization changes.',
          'barbell-bench-press'
        ),
      ],
      'equipment-unavailable': [unavailable('db-bench', 'Push-Up', 'push-up')],
    },
  },
  {
    id: 'incline-dumbbell-press',
    name: 'Incline Dumbbell Press',
    aliases: ['incline db press'],
    recommendations: {
      'equipment-unavailable': [
        unavailable('incline-db', 'Feet-Elevated Push-Up', 'feet-elevated-push-up'),
      ],
      'setup-unstable-difficult': [
        rec(
          'incline-machine',
          'replacement',
          'Machine Chest Press',
          'A guided path reduces balance and setup demands.',
          'Keeps a loaded press.',
          'The machine fixes more of the movement path.',
          'machine-chest-press'
        ),
      ],
    },
  },
  {
    id: 'machine-chest-press',
    name: 'Machine Chest Press',
    aliases: ['chest press machine'],
    recommendations: {
      'grip-handle:too-large': [
        rec(
          'machine-neutral',
          'adjustment',
          'Use the smaller or neutral handles',
          'A different built-in handle may reduce required grip size.',
          'Keeps the same machine and guided press.',
          'Hand orientation and elbow path may change.'
        ),
        rec(
          'machine-db',
          'replacement',
          'Dumbbell Bench Press',
          'Uses handles whose size can be selected.',
          'Keeps a horizontal loaded press.',
          'Adds independent stabilization.',
          'dumbbell-bench-press'
        ),
      ],
      'loading-range:starting-resistance-too-heavy': [
        rec(
          'machine-band',
          'replacement',
          'Band Chest Press',
          'Band tension can start very light.',
          'Keeps a forward pressing pattern.',
          'Resistance rises through the press and setup differs.',
          'band-chest-press'
        ),
      ],
    },
  },
  {
    id: 'push-up',
    name: 'Push-Up',
    aliases: ['pushup', 'press-up'],
    recommendations: {
      'loading-range:maximum-resistance-too-light': [
        rec(
          'push-band',
          'adjustment',
          'Band-Resisted Push-Up',
          'Adds load, with band tension increasing toward lockout.',
          'Keeps the push-up body position and hand support.',
          'Adds accommodating resistance that is lightest near the bottom.',
          'band-resisted-push-up'
        ),
        rec(
          'push-bench',
          'replacement',
          'Barbell Bench Press',
          'Permits progressive external loading beyond bodyweight.',
          'Keeps a horizontal pressing pattern.',
          'Uses a bench and barbell with the torso supported.',
          'barbell-bench-press'
        ),
      ],
      'range-of-motion:too-short': [
        rec(
          'push-handles',
          'adjustment',
          'Use push-up handles',
          'Raises the hands so the chest can travel farther when comfortable.',
          'Keeps the push-up pattern and bodyweight loading.',
          'Increases available bottom range and stability demands.'
        ),
      ],
      'movement-uncomfortable': [discomfort('push', 'Machine Chest Press', 'machine-chest-press')],
    },
  },
  {
    id: 'band-resisted-push-up',
    name: 'Band-Resisted Push-Up',
    aliases: ['banded push-up'],
    recommendations: {
      'setup-unstable-difficult': [
        rec(
          'band-weighted',
          'replacement',
          'Weighted Push-Up',
          'A secured external load avoids managing band placement.',
          'Keeps the push-up pattern with added resistance.',
          'Resistance is less accommodating and requires safe plate placement.',
          'weighted-push-up'
        ),
      ],
    },
  },
  {
    id: 'weighted-push-up',
    name: 'Weighted Push-Up',
    aliases: ['loaded push-up'],
    recommendations: {
      'setup-unstable-difficult': [
        rec(
          'weighted-band',
          'replacement',
          'Band-Resisted Push-Up',
          'A band can be anchored by the hands without balancing a plate.',
          'Keeps an externally resisted push-up.',
          'Tension increases toward lockout.',
          'band-resisted-push-up'
        ),
      ],
    },
  },
  {
    id: 'feet-elevated-push-up',
    name: 'Feet-Elevated Push-Up',
    aliases: ['decline push-up'],
    recommendations: { 'equipment-unavailable': [unavailable('feet-push', 'Push-Up', 'push-up')] },
  },
  {
    id: 'band-chest-press',
    name: 'Band Chest Press',
    aliases: ['band press'],
    recommendations: {
      'loading-range:maximum-resistance-too-light': [
        rec(
          'band-machine',
          'replacement',
          'Machine Chest Press',
          'Provides a broader stack-loading range.',
          'Keeps a forward pressing pattern.',
          'Uses a guided path and more even resistance.',
          'machine-chest-press'
        ),
      ],
    },
  },
  {
    id: 'back-squat',
    name: 'Back Squat',
    aliases: ['squat', 'barbell squat'],
    recommendations: {
      'stance-spacing:too-narrow': [
        rec(
          'squat-widen',
          'adjustment',
          'Widen stance modestly',
          'Creates more foot spacing while retaining the lift.',
          'Keeps the barbell back squat setup.',
          'Hip and knee angles and muscle emphasis shift.'
        ),
      ],
      'equipment-unavailable': [unavailable('back-squat', 'Goblet Squat', 'goblet-squat')],
      'movement-uncomfortable': [discomfort('back-squat', 'Box Squat', 'box-squat')],
      'avoid-spinal-loading': [
        avoidSpinalLoading(
          'back-squat-belt',
          'Belt Squat',
          'Keeps a bilateral squat pattern with progressive lower-body loading.',
          'The load is attached at the hips; balance, bracing, and equipment setup differ.',
          'belt-squat'
        ),
        avoidSpinalLoading(
          'back-squat-leg-press',
          'Leg Press',
          'Keeps loaded knee and hip extension.',
          'Uses a supported, guided machine rather than a free-standing squat.',
          'leg-press'
        ),
      ],
    },
  },
  {
    id: 'goblet-squat',
    name: 'Goblet Squat',
    aliases: ['db goblet squat'],
    recommendations: {
      'loading-range:maximum-resistance-too-light': [
        rec(
          'goblet-tempo',
          'adjustment',
          'Add a pause or slower lowering',
          'Increases difficulty with the available implement.',
          'Keeps the goblet hold and squat pattern.',
          'Changes tempo and limits momentum.'
        ),
        rec(
          'goblet-back',
          'replacement',
          'Back Squat',
          'Allows substantially more external loading.',
          'Keeps a bilateral squat pattern.',
          'Moves the load from the front of the torso to the back.',
          'back-squat'
        ),
      ],
      'avoid-spinal-loading': [
        avoidSpinalLoading(
          'goblet-belt',
          'Belt Squat',
          'Keeps a bilateral squat pattern and upright training position.',
          'Removes the weight held at the chest and loads through a hip belt.',
          'belt-squat'
        ),
      ],
    },
  },
  {
    id: 'safety-bar-squat',
    name: 'Safety-Bar Squat',
    aliases: ['ssb squat'],
    recommendations: {
      'equipment-unavailable': [unavailable('ssb', 'Back Squat', 'back-squat')],
      'grip-uncomfortable': [
        rec(
          'ssb-straps',
          'adjustment',
          'Hold straps on the handles',
          'Can reduce the need to squeeze or reach the handles.',
          'Keeps the safety bar squat and load position.',
          'Hand connection to the bar becomes less rigid.'
        ),
      ],
      'avoid-spinal-loading': [
        avoidSpinalLoading(
          'ssb-belt',
          'Belt Squat',
          'Keeps a loaded bilateral squat pattern.',
          'Moves external load from the shoulders to a hip belt and changes balance demands.',
          'belt-squat'
        ),
      ],
    },
  },
  {
    id: 'box-squat',
    name: 'Box Squat',
    aliases: ['squat to box'],
    recommendations: {
      'range-of-motion:too-short': [
        rec(
          'box-lower',
          'adjustment',
          'Use a lower box',
          'Allows a longer squat range when it can be controlled comfortably.',
          'Keeps the box squat setup and feedback.',
          'Demands more bottom-range strength and mobility.'
        ),
      ],
      'equipment-unavailable': [unavailable('box', 'Back Squat', 'back-squat')],
      'avoid-spinal-loading': [
        avoidSpinalLoading(
          'box-belt',
          'Belt Squat',
          'Keeps a loaded squat pattern.',
          'Removes both the shoulder-loaded bar and the box target; loading and depth feedback differ.',
          'belt-squat'
        ),
      ],
    },
  },
  {
    id: 'leg-press',
    name: 'Leg Press',
    aliases: ['machine leg press'],
    recommendations: {
      'stance-spacing:too-narrow': [
        rec(
          'legpress-wider',
          'adjustment',
          'Use a wider foot placement',
          'Creates more spacing on the same platform.',
          'Keeps the guided leg press and loading.',
          'Joint angles and muscle emphasis change.'
        ),
      ],
      'equipment-unavailable': [unavailable('legpress', 'Goblet Squat', 'goblet-squat')],
    },
  },
  {
    id: 'belt-squat',
    name: 'Belt Squat',
    aliases: ['hip belt squat'],
    recommendations: {
      'equipment-unavailable': [unavailable('belt-squat', 'Leg Press', 'leg-press')],
    },
  },
  {
    id: 'conventional-deadlift',
    name: 'Conventional Deadlift',
    aliases: ['deadlift'],
    recommendations: {
      'range-of-motion:too-long': [
        rec(
          'dead-blocks',
          'adjustment',
          'Pull from blocks',
          'Shortens the bottom range to a controllable start height.',
          'Keeps a barbell hinge and heavy pull.',
          'Reduces floor-start specificity and total range.'
        ),
        rec(
          'dead-trap',
          'replacement',
          'Trap-Bar Deadlift',
          'The handle position may offer a more manageable start.',
          'Keeps a loaded bilateral pull from the floor area.',
          'Torso angle, grip position, and leg contribution differ.',
          'trap-bar-deadlift'
        ),
      ],
      'grip-uncomfortable': [
        rec(
          'dead-straps',
          'adjustment',
          'Use lifting straps',
          'Reduces the amount of grip force needed to hold the bar.',
          'Keeps the barbell deadlift pattern and load.',
          'Trains unsupported grip less directly.'
        ),
      ],
      'avoid-spinal-loading': [
        avoidSpinalLoading(
          'deadlift-hip-thrust',
          'Hip Thrust',
          'Keeps loaded hip extension as the main training intent.',
          'Uses a supported horizontal setup and does not train a floor pull.',
          'hip-thrust'
        ),
        avoidSpinalLoading(
          'deadlift-pull-through',
          'Cable Pull-Through',
          'Keeps a standing hip-hinge pattern.',
          'Uses cable resistance from behind with much lighter loading and no floor start.',
          'cable-pull-through'
        ),
      ],
    },
  },
  {
    id: 'romanian-deadlift',
    name: 'Romanian Deadlift',
    aliases: ['rdl'],
    recommendations: {
      'range-of-motion:too-long': [
        rec(
          'rdl-limit',
          'adjustment',
          'Limit the descent to a controlled range',
          'Stops the set where position can still be maintained.',
          'Keeps the hip hinge, bar, and continuous tension.',
          'Uses a shorter individual range rather than reaching a fixed depth.'
        ),
      ],
      'equipment-unavailable': [unavailable('rdl', 'Band Good Morning', 'band-good-morning')],
      'avoid-spinal-loading': [
        avoidSpinalLoading(
          'rdl-hip-thrust',
          'Hip Thrust',
          'Keeps loaded hip extension.',
          'Uses a supported horizontal setup instead of a standing hinge with weight in the hands.',
          'hip-thrust'
        ),
        avoidSpinalLoading(
          'rdl-pull-through',
          'Cable Pull-Through',
          'Keeps a standing hip-hinge pattern.',
          'Moves resistance behind the body and changes the loading range and balance demands.',
          'cable-pull-through'
        ),
      ],
    },
  },
  {
    id: 'trap-bar-deadlift',
    name: 'Trap-Bar Deadlift',
    aliases: ['trap bar deadlift', 'hex bar deadlift'],
    recommendations: {
      'grip-handle:too-large': [
        rec(
          'trap-low',
          'adjustment',
          'Try the alternate handle pair',
          'Some trap bars provide a differently sized or positioned handle.',
          'Keeps the trap-bar pull.',
          'Start height and required range may change.'
        ),
        rec(
          'trap-conventional',
          'replacement',
          'Conventional Deadlift',
          'A standard bar offers a smaller continuous gripping surface.',
          'Keeps a heavy bilateral pull.',
          'Places the load in front of the body.',
          'conventional-deadlift'
        ),
      ],
      'equipment-unavailable': [
        unavailable('trap', 'Conventional Deadlift', 'conventional-deadlift'),
      ],
    },
  },
  {
    id: 'cable-pull-through',
    name: 'Cable Pull-Through',
    aliases: ['rope pull-through'],
    recommendations: {
      'loading-range:maximum-resistance-too-light': [
        rec(
          'cable-rdl',
          'replacement',
          'Romanian Deadlift',
          'A barbell permits a larger loading range.',
          'Keeps a hip-hinge emphasis.',
          'Loads from the hands vertically rather than from behind.',
          'romanian-deadlift'
        ),
      ],
      'equipment-unavailable': [unavailable('cable', 'Band Good Morning', 'band-good-morning')],
    },
  },
  {
    id: 'band-good-morning',
    name: 'Band Good Morning',
    aliases: ['banded good morning'],
    recommendations: {
      'loading-range:maximum-resistance-too-light': [
        rec(
          'band-double',
          'adjustment',
          'Use a stronger or doubled band',
          'Increases available resistance while retaining the setup.',
          'Keeps the band good morning pattern.',
          'Adds more tension, especially near standing.'
        ),
        rec(
          'band-rdl',
          'replacement',
          'Romanian Deadlift',
          'Supports progressive free-weight loading.',
          'Keeps a hip-hinge emphasis.',
          'Loads through the hands with a less accommodating resistance curve.',
          'romanian-deadlift'
        ),
      ],
      'avoid-spinal-loading': [
        avoidSpinalLoading(
          'good-morning-hip-thrust',
          'Hip Thrust',
          'Keeps loaded hip extension as the main training intent.',
          'Uses a supported horizontal setup instead of band tension across the shoulders.',
          'hip-thrust'
        ),
      ],
    },
  },
  {
    id: 'hip-thrust',
    name: 'Hip Thrust',
    aliases: ['barbell hip thrust'],
    recommendations: {
      'equipment-unavailable': [
        unavailable('hip-thrust', 'Cable Pull-Through', 'cable-pull-through'),
      ],
    },
  },
] as const;

const EXERCISE_FAMILY_BY_ID: Readonly<Record<string, ExerciseFamily>> = {
  'barbell-bench-press': 'bench',
  'swiss-bar-bench-press': 'bench',
  'close-grip-bench-press': 'bench',
  'dumbbell-bench-press': 'bench',
  'incline-dumbbell-press': 'bench',
  'machine-chest-press': 'bench',
  'push-up': 'bench',
  'band-resisted-push-up': 'bench',
  'weighted-push-up': 'bench',
  'feet-elevated-push-up': 'bench',
  'band-chest-press': 'bench',
  'back-squat': 'squat',
  'goblet-squat': 'squat',
  'safety-bar-squat': 'squat',
  'box-squat': 'squat',
  'leg-press': 'squat',
  'belt-squat': 'squat',
  'conventional-deadlift': 'deadlift',
  'romanian-deadlift': 'deadlift',
  'trap-bar-deadlift': 'deadlift',
  'cable-pull-through': 'deadlift',
  'band-good-morning': 'deadlift',
  'hip-thrust': 'deadlift',
};

const byName = new Map<string, ExerciseAlternative>();
const issueById = new Map<ExerciseIssueId, ExerciseIssueChoice>(
  EXERCISE_ALTERNATIVE_ISSUES.map((issue) => [issue.id, issue])
);
for (const exercise of EXERCISE_ALTERNATIVES_CATALOG) {
  byName.set(exercise.name.toLocaleLowerCase(), exercise);
  for (const alias of exercise.aliases) {
    byName.set(alias.toLocaleLowerCase(), exercise);
  }
}

export const listSearchableExerciseNames = (): string[] => {
  const names: string[] = [];
  for (const exercise of EXERCISE_ALTERNATIVES_CATALOG) {
    names.push(exercise.name, ...exercise.aliases);
  }
  return names;
};
export const resolveAlternativeExercise = (name: string): ExerciseAlternative | null =>
  byName.get(name.trim().toLocaleLowerCase()) ?? null;
export const getExerciseFamily = (exerciseName: string): ExerciseFamily | null => {
  const exercise = resolveAlternativeExercise(exerciseName);
  return exercise ? (EXERCISE_FAMILY_BY_ID[exercise.id] ?? null) : null;
};
export const getSupportedExerciseIssues = (exerciseName: string): ExerciseIssueChoice[] => {
  const exercise = resolveAlternativeExercise(exerciseName);
  if (!exercise) {
    return [];
  }
  const choices: ExerciseIssueChoice[] = [];
  for (const issue of EXERCISE_ALTERNATIVE_ISSUES) {
    if (exercise.recommendations[issue.id]?.length) {
      choices.push(issueById.get(issue.id)!);
    }
  }
  return choices;
};
export const getExerciseRecommendations = (
  exerciseName: string,
  issueId: ExerciseIssueId
): ExerciseRecommendation[] => {
  const recommendations = resolveAlternativeExercise(exerciseName)?.recommendations[issueId];
  if (!recommendations) {
    return [];
  }
  const adjustments: ExerciseRecommendation[] = [];
  const replacements: ExerciseRecommendation[] = [];
  for (const recommendation of recommendations) {
    (recommendation.kind === 'adjustment' ? adjustments : replacements).push(recommendation);
  }
  return [...adjustments, ...replacements];
};
