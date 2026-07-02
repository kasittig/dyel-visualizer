import { describe, expect, it } from 'vitest';
import { parseConjugateData } from './parseConjugateData';

function csv(...rows: string[]): string {
  return ['Date,Exercise,Sets,Reps,Weight (lbs)', ...rows].join('\n');
}

function csvKg(...rows: string[]): string {
  return ['Date,Exercise,Sets,Reps,Weight (kg)', ...rows].join('\n');
}

function csvBareWeight(...rows: string[]): string {
  return ['Date,Exercise,Sets,Reps,Weight', ...rows].join('\n');
}

describe('parseConjugateData', () => {
  it('returns empty array for empty CSV', () => {
    expect(parseConjugateData('')).toEqual([]);
  });

  it('returns empty array when no exercise header is found', () => {
    expect(parseConjugateData('foo,bar\n1,2')).toEqual([]);
  });

  it('parses unrecognized exercise names as accessories', () => {
    const result = parseConjugateData(csv('2024-01-01,Lat Pulldown,3,10,100'));
    expect(result).toHaveLength(1);
    expect(result[0][0].type).toBe('accessory');
    expect(result[0][0].displayName).toBe('Lat Pulldown');
  });

  it("uses today's date for rows with a missing date", () => {
    const result = parseConjugateData(csv(',Squat,3,5,315'));
    expect(result).toHaveLength(1);
    const today = new Date();
    const d = result[0][1].date;
    expect(d.getFullYear()).toBe(today.getFullYear());
    expect(d.getMonth()).toBe(today.getMonth());
    expect(d.getDate()).toBe(today.getDate());
  });

  it('normalizes a non-YYYY-MM-DD date string to local midnight', () => {
    const dateStr = '2024-01-15T23:30:00-08:00';
    const result = parseConjugateData(csv(`${dateStr},Squat,3,5,315`));
    expect(result).toHaveLength(1);
    const d = result[0][1].date;
    const expected = new Date(dateStr);
    expect(d.getFullYear()).toBe(expected.getFullYear());
    expect(d.getMonth()).toBe(expected.getMonth());
    expect(d.getDate()).toBe(expected.getDate());
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });

  it('skips rows with an invalid (non-empty) date', () => {
    const result = parseConjugateData(csv('bad-date,Squat,3,5,315'));
    expect(result).toHaveLength(0);
  });

  it('skips rows with zero reps, assumes 1 for rows with no reps given', () => {
    const result = parseConjugateData(csv('2024-01-01,Squat,3,,315', '2024-01-01,Squat,3,0,315'));
    expect(result).toHaveLength(1);
  });

  it('parses a plain squat row', () => {
    const result = parseConjugateData(csv('2024-01-15,Squat,3,5,315'));
    expect(result).toHaveLength(1);
    const [exercise, session] = result[0];
    expect(exercise.type).toBe('squat');
    expect(exercise.bar).toBe('standard');
    expect(exercise.equipment).toBeNull();
    expect(exercise.addlWts).toEqual([]);
    expect(session.weight).toBe(315);
    expect(session.reps).toBe(5);
    expect(session.sets).toBe(3);
    expect(session.date).toBeInstanceOf(Date);
    expect(session.unit).toBe('lbs');
  });

  it('parses an SSB box squat with chains', () => {
    const result = parseConjugateData(csv('2024-01-15,SSB Box Squat (Chains),3,3,225'));
    const [exercise] = result[0];
    expect(exercise.bar).toBe('ssb');
    expect(exercise.equipment).toBe('box');
    expect(exercise.addlWts).toContain('chains');
  });

  it('parses a bench row with board count', () => {
    const result = parseConjugateData(csv('2024-01-15,Bench (2 Board),4,3,275'));
    const [exercise, session] = result[0];
    expect(exercise.type).toBe('bench');
    expect(exercise.equipment).toBe('board');
    expect(session.sets).toBe(4);
  });

  it('parses a deadlift row with reverse bands', () => {
    const result = parseConjugateData(csv('2024-01-15,Deadlift (Reverse Band),3,2,500'));
    const [exercise] = result[0];
    expect(exercise.type).toBe('deadlift');
    expect(exercise.addlWts).toContain('rev. bands');
    expect(exercise.addlWts).not.toContain('bands');
  });

  it('parses a trap bar deadlift', () => {
    const result = parseConjugateData(csv('2024-01-15,Trap Bar Deadlift,4,6,275'));
    const [exercise] = result[0];
    expect(exercise.bar).toBe('trap');
    expect(exercise.stance).toBe('competition');
  });

  it('skips leading title rows before the header', () => {
    const withTitle = [
      'My Training Log',
      'Week 1',
      'Date,Exercise,Sets,Reps,Weight (lbs)',
      '2024-01-15,Squat,3,5,315',
    ].join('\n');
    expect(parseConjugateData(withTitle)).toHaveLength(1);
  });

  it('reads unit from Weight (kg) column header', () => {
    const result = parseConjugateData(csvKg('2024-01-15,Squat,3,5,140'));
    expect(result[0][1].weight).toBe(140);
    expect(result[0][1].unit).toBe('kg');
  });

  it('reads unit from Weight (lbs) column header', () => {
    const result = parseConjugateData(csv('2024-01-15,Squat,3,5,315'));
    expect(result[0][1].unit).toBe('lbs');
  });

  it('defaults to lbs when weight column has no unit annotation', () => {
    const result = parseConjugateData(csvBareWeight('2024-01-15,Squat,3,5,315'));
    expect(result[0][1].unit).toBe('lbs');
  });

  it('does not default to lbs when any session has an explicit unit', () => {
    const result = parseConjugateData(
      csvKg('2024-01-15,Squat,3,5,140', '2024-01-22,Bench,4,3,100')
    );
    expect(result.every(([, s]) => s.unit === 'kg')).toBe(true);
  });

  it('parses a valid RPE from the RPE column', () => {
    const input = 'Date,Exercise,Sets,Reps,Weight (lbs),RPE\n2024-01-15,Squat,3,5,315,8';
    expect(parseConjugateData(input)[0][1].rpe).toBe(8);
  });

  it('sets rpe to null for an out-of-range RPE', () => {
    const input = 'Date,Exercise,Sets,Reps,Weight (lbs),RPE\n2024-01-15,Squat,3,5,315,11';
    expect(parseConjugateData(input)[0][1].rpe).toBeNull();
  });

  it('sets rpe to null when RPE column is absent', () => {
    const result = parseConjugateData(csv('2024-01-15,Squat,3,5,315'));
    expect(result[0][1].rpe).toBeNull();
  });

  it('defaults sets to 1 when sets column is absent', () => {
    const noSets = ['Date,Exercise,Reps,Weight (lbs)', '2024-01-15,Squat,5,315'].join('\n');
    expect(parseConjugateData(noSets)[0][1].sets).toBe(1);
  });

  it('parses all rows, classifying non-conjugate ones as accessories', () => {
    const result = parseConjugateData(
      csv(
        '2024-01-15,Squat,3,5,315',
        '2024-01-15,Lat Pulldown,3,10,100',
        '2024-01-15,Bench,4,3,225',
        '2024-01-15,Bicep Curl,3,12,40'
      )
    );
    expect(result).toHaveLength(4);
    expect(result[0][0].type).toBe('squat');
    expect(result[1][0].type).toBe('accessory');
    expect(result[2][0].type).toBe('bench');
    expect(result[3][0].type).toBe('accessory');
  });

  it('sets displayName from input', () => {
    const result = parseConjugateData(csv('2024-01-15,Box SSB,3,5,275'));
    expect(result[0][0].displayName).toBe('Box SSB');
  });

  it('expands a row with rep-max columns into one session per populated column', () => {
    const input = ['Date,Exercise,1RM,3RM,5RM', '2024-01-15,Squat,315,285,265'].join('\n');
    const result = parseConjugateData(input);
    expect(result).toHaveLength(3);
    expect(result.every(([exercise]) => exercise.type === 'squat')).toBe(true);
    expect(result.map(([, s]) => [s.reps, s.weight])).toEqual([
      [1, 315],
      [3, 285],
      [5, 265],
    ]);
    expect(result.every(([, s]) => s.date.getTime() === result[0][1].date.getTime())).toBe(true);
  });

  it('skips blank rep-max cells within a row', () => {
    const input = ['Date,Exercise,1RM,3RM', '2024-01-15,Squat,315,'].join('\n');
    const result = parseConjugateData(input);
    expect(result).toHaveLength(1);
    expect(result[0][1].reps).toBe(1);
  });

  it('reads unit from a rep-max column header like 1RM (kg)', () => {
    const input = ['Date,Exercise,1RM (kg)', '2024-01-15,Squat,140'].join('\n');
    const result = parseConjugateData(input);
    expect(result[0][1].unit).toBe('kg');
  });
});
