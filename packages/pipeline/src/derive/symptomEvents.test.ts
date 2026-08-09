import { describe, expect, it } from 'vitest';
import type { DayContext } from './dayContext';
import { extractSymptomEvents } from './symptomEvents';

const DAY = Date.UTC(2025, 0, 2);
const context = (note: string): DayContext => ({
  date: DAY,
  bodyweightKg: null,
  notes: [note],
  findings: [],
});

describe('extractSymptomEvents', () => {
  it.each([
    [
      'region, side, and severity',
      'Left knee pain 3/10.',
      {
        region: 'knee',
        side: 'left',
        severityOutOf10: 3,
      },
    ],
    [
      'bilateral side',
      'Both shoulders were sore.',
      {
        region: 'shoulder',
        side: 'bilateral',
      },
    ],
    [
      'explicit limitation and exercise',
      "Back pain, couldn't deadlift today",
      {
        region: 'back',
        limitation: "couldn't deadlift today",
        relatedExercise: 'deadlift',
      },
    ],
    [
      'exercise and timing',
      'Shoulder discomfort on bench during training',
      {
        region: 'shoulder',
        relatedExercise: 'bench press',
        timing: 'during-training',
      },
    ],
    [
      'next-day timing',
      'Right hip stiffness the next morning',
      {
        region: 'hip',
        side: 'right',
        timing: 'next-day',
      },
    ],
    [
      'after-training timing',
      'Wrist soreness after training',
      {
        region: 'wrist',
        timing: 'after-training',
      },
    ],
    [
      'region and severity without a symptom word',
      'Left elbow 6/10',
      {
        region: 'elbow',
        side: 'left',
        severityOutOf10: 6,
      },
    ],
  ])('extracts %s', (_, note, expected) => {
    expect(extractSymptomEvents([context(note)])).toEqual([
      {
        date: DAY,
        sourceText: note,
        matchedText: note,
        ...expected,
      },
    ]);
  });

  it.each([
    ['negated symptom', 'No knee pain after squats'],
    ['ordinary training observation', 'Squat was hard today'],
    ['positive observation', 'Left knee felt great'],
    ['unrecognized free text', 'Worked late and missed dinner'],
    ['diagnosis without an explicit symptom', 'My doctor mentioned tendinitis'],
  ])('does not infer an event from %s', (_, note) => {
    expect(extractSymptomEvents([context(note)])).toEqual([]);
  });

  it('preserves the complete source note and extracts each matched statement in order', () => {
    const note = 'Left knee pain 2/10. Right wrist was sore! Slept well.';
    const input = context(note);

    expect(extractSymptomEvents([input])).toEqual([
      {
        date: DAY,
        sourceText: note,
        matchedText: 'Left knee pain 2/10.',
        region: 'knee',
        side: 'left',
        severityOutOf10: 2,
      },
      {
        date: DAY,
        sourceText: note,
        matchedText: 'Right wrist was sore!',
        region: 'wrist',
        side: 'right',
      },
    ]);
    expect(input.notes).toEqual([note]);
  });

  it('keeps a positive symptom when another symptom in the statement is negated', () => {
    const note = 'No knee pain but right shoulder pain 6/10';

    expect(extractSymptomEvents([context(note)])).toEqual([
      {
        date: DAY,
        sourceText: note,
        matchedText: 'right shoulder pain 6/10',
        region: 'shoulder',
        side: 'right',
        severityOutOf10: 6,
      },
    ]);
  });

  it('leaves optional fields absent rather than guessing', () => {
    expect(extractSymptomEvents([context('Felt sore today')])).toEqual([
      {
        date: DAY,
        sourceText: 'Felt sore today',
        matchedText: 'Felt sore today',
      },
    ]);
  });

  it('does not assign an exercise merely because it appears in the same statement', () => {
    expect(extractSymptomEvents([context('Knee pain but bench felt great')])).toEqual([
      {
        date: DAY,
        sourceText: 'Knee pain but bench felt great',
        matchedText: 'Knee pain but bench felt great',
        region: 'knee',
      },
    ]);
  });

  it('handles adversarial whitespace without regex backtracking or symptom loss', () => {
    const spaces = ' '.repeat(50_000);
    const note = `No${spaces}knee pain but right shoulder pain 6/10`;

    expect(extractSymptomEvents([context(note)])).toEqual([
      {
        date: DAY,
        sourceText: note,
        matchedText: 'right shoulder pain 6/10',
        region: 'shoulder',
        side: 'right',
        severityOutOf10: 6,
      },
    ]);
    expect(
      extractSymptomEvents([context(`Back pain, couldn't${spaces}deadlift today`)])[0]
    ).toMatchObject({ region: 'back', relatedExercise: 'deadlift' });
  });
});
