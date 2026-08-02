import { describe, it, expect } from 'vitest';
import { freeformParser, parseFreeformText, parseFreeformTextResult } from './parser';
import { ParseError } from '../parser';
import type { ParseContext } from '../parser';
import * as fs from 'fs';
import * as path from 'path';
import type { SetRecord } from '../../types.ts';

const ctx: ParseContext = { fallback: 'lbs' };
const LBS = 0.453592;
const file = (content: string) => ({ name: 't.txt', content });
const load = (f: string) => ({
  name: f,
  content: fs.readFileSync(path.join(__dirname, '../../../test/fixtures', f), 'utf-8'),
});

describe('freeformParser', () => {
  describe('canParse', () => {
    it('evaluates file boundaries and magic phrases', () => {
      expect(freeformParser.canParse({ name: 'log.txt', content: '' })).toBe(true);
      expect(freeformParser.canParse({ name: 'anyfile', content: 'units: kg' })).toBe(true);
      expect(freeformParser.canParse({ name: 'log.csv', content: 'some,data' })).toBe(false);
    });
  });

  describe('parse', () => {
    it('parses variations, units rules, and hierarchies', () => {
      const simple = freeformParser.parse(file('2026-01-10 Bench 315x5 @8\n'), ctx);
      expect(simple).toHaveLength(1);
      expect(simple[0]).toMatchObject({
        date: Date.UTC(2026, 0, 10),
        exercise: 'Bench',
        weight: 315 * LBS,
        reps: 5,
        rpe: 8,
        meta: { rawUnit: 'lbs', rawWeight: '315' },
      });

      const shorthand = freeformParser.parse(file('2026-01-12 Squat 315/335/355 x3\n'), ctx);
      expect(shorthand).toHaveLength(3);
      [315, 335, 355].forEach((w: number, i: number) => {
        expect(shorthand[i]).toMatchObject({ exercise: 'Squat', weight: w * LBS, reps: 3 });
      });

      expect(freeformParser.parse(file('2026-01-09 Bench 100kg x 5\n'), ctx)[0]).toMatchObject({
        exercise: 'Bench',
        weight: 100,
        reps: 5,
        meta: { rawUnit: 'kg', rawWeight: '100kg' },
      });
      expect(freeformParser.parse(file('2026-01-11 Bench 3x5 @ 315\n'), ctx)[0]).toMatchObject({
        exercise: 'Bench',
        weight: 315 * LBS,
        reps: 5,
      });
      expect(
        freeformParser.parse(file('units: kg 2026-01-08 Squat 140x5 @8\n'), ctx)[0]
      ).toMatchObject({ exercise: 'Squat', weight: 140, reps: 5, rpe: 8, meta: { rawUnit: 'kg' } });
      expect(freeformParser.parse(file('2026-02-01 bench press 235x3 @9\n'), ctx)[0].exercise).toBe(
        'bench press'
      );

      const multi = freeformParser.parse(
        file('units: kg\n2026-01-10 Bench 225lbs x5\n2026-01-10 Squat 140x3\n'),
        ctx
      );
      expect(multi).toHaveLength(2);
      expect(multi[0]).toMatchObject({ weight: 225 * LBS, meta: { rawUnit: 'lbs' } });
      expect(multi[1]).toMatchObject({ weight: 140, meta: { rawUnit: 'kg' } });

      const empty = freeformParser.parse(
        file('2026-01-10 Bench 315x5 @8\n\n2026-01-11 Squat 405x3\n'),
        ctx
      );
      expect(
        empty.map((r: SetRecord): string => {
          return r.exercise;
        })
      ).toEqual(['Bench', 'Squat']);
    });

    it('matches assertions against external file fixtures', () => {
      expect(freeformParser.parse(load('freeform-simple-form.txt'), ctx)).toMatchObject([
        { exercise: 'Bench', reps: 5, rpe: 8 },
      ]);
      expect(freeformParser.parse(load('freeform-preamble-units-kg.txt'), ctx)).toMatchObject([
        { exercise: 'Squat', weight: 140, meta: { rawUnit: 'kg' } },
      ]);
      expect(freeformParser.parse(load('freeform-inline-unit-suffix.txt'), ctx)).toMatchObject([
        { weight: 100, meta: { rawUnit: 'kg' } },
      ]);
      expect(freeformParser.parse(load('freeform-reversed-form.txt'), ctx)).toMatchObject([
        { weight: 315 * LBS, reps: 5 },
      ]);

      const multi = freeformParser.parse(load('freeform-multi-weight-shorthand.txt'), ctx);
      expect(multi).toHaveLength(3);
      [315, 335, 355].forEach((w: number, i: number) => {
        expect(multi[i].weight).toBe(w * LBS);
      });
      expect(
        freeformParser
          .parse(load('freeform-near-variant-exercise-names.txt'), ctx)
          .map((r: SetRecord): string => {
            return r.exercise;
          })
      ).toEqual(['Bench', 'bench press', 'Comp Bench']);
    });

    it('throws errors on malformed tracking structures', () => {
      [
        'No weight here Bench\n',
        '2026-01-10 Bench\n',
        '2026-01-13 Bench 225x5 @8\n2026-01-13 Squat 315x @7\n2026-01-13 Deadlift 405x3 @9\n',
      ].forEach((c: string) => {
        expect(() => {
          return freeformParser.parse(file(c), ctx);
        }).toThrow(ParseError);
      });
      expect(() => {
        return freeformParser.parse(load('freeform-malformed-line.txt'), ctx);
      }).toThrow(ParseError);
    });
  });

  describe('parseFreeformText', () => {
    it.each([
      ['2026-01-10 Bench 315x5 @8\n'],
      ['2026-01-12 Squat 315/335/355 x3\n'],
      ['2026-01-09 Bench 100kg x 5\n'],
      ['2026-01-11 Bench 3x5 @ 315\n'],
      ['units: kg 2026-01-08 Squat 140x5 @8\n'],
    ])('parses identically to standard parsing flow', (content: string) => {
      expect(parseFreeformText(content, ctx)).toEqual(
        freeformParser.parse({ name: 'test.txt', content }, ctx)
      );
    });
  });

  describe('parseFreeformTextResult', () => {
    it('keeps valid lines and reports every malformed line', () => {
      const result = parseFreeformTextResult(
        '2026-01-10 Bench 315x5\ninvalid line\n2026-01-11 Squat 405x3\nalso invalid',
        ctx
      );
      expect(result.records.map((record) => record.exercise)).toEqual(['Bench', 'Squat']);
      expect(result.errors.map((error) => error.line)).toEqual([2, 4]);
    });

    it('carries standalone unit preambles across valid lines', () => {
      expect(parseFreeformTextResult('units: kg\nBench 100x5', ctx).records[0]).toMatchObject({
        weight: 100,
        meta: { rawUnit: 'kg' },
      });
    });
  });

  describe('parseDate (timezone correctness)', () => {
    it('defaults missing dates to today and accepts an ISO date anywhere', () => {
      const today = Date.UTC(2026, 6, 30, 18);
      expect(parseFreeformText('Bench 100x5\n', ctx, today)[0].date).toBe(Date.UTC(2026, 6, 30));
      expect(parseFreeformText('Bench 2025-03-02 100x5\n', ctx, today)[0].date).toBe(
        Date.UTC(2025, 2, 2)
      );
    });

    it.each([
      ['Jan 10', '2026-01-10', Date.UTC(2026, 0, 10)],
      ['Feb 28', '2026-02-28', Date.UTC(2026, 1, 28)],
      ['Dec 31', '2026-12-31', Date.UTC(2026, 11, 31)],
      ['Jan 1 start of year', '2026-01-01', Date.UTC(2026, 0, 1)],
      ['Mar 1 after Feb 28', '2026-03-01', Date.UTC(2026, 2, 1)],
      ['leap year Feb 29', '2024-02-29', Date.UTC(2024, 1, 29)],
      ['month boundary Apr 30', '2026-04-30', Date.UTC(2026, 3, 30)],
      ['mid-year Jun 15', '2026-06-15', Date.UTC(2026, 5, 15)],
    ])('parses %s correctly with UTC timezone', (_, dateStr: string, expected: number) => {
      expect(parseFreeformText(`${dateStr} Bench 100x5\n`, ctx)[0].date).toBe(expected);
    });

    it('treats unsupported date formats as exercise text', () => {
      const invalidFormats = [
        '01-10-2026 Bench 100x5',
        '2026/01/10 Bench 100x5',
        '2026-1-10 Bench 100x5',
        '2026-01-5 Bench 100x5',
        '2026-01 Bench 100x5',
        '01/10 Bench 100x5',
      ];
      invalidFormats.forEach((line) => {
        expect(parseFreeformText(`${line}\n`, ctx)[0].exercise).toContain(line.split(' ')[0]);
      });
    });

    it('maintains consistent UTC midnight timestamp across locales', () => {
      const dates = ['2026-01-10', '2026-12-25', '2026-06-15'];
      dates.forEach((dateStr) => {
        const parsed = parseFreeformText(`${dateStr} Bench 100x5\n`, ctx)[0];
        const [year, month, day] = dateStr.split('-').map(Number);
        const expected = Date.UTC(year, month - 1, day);
        expect(parsed.date).toBe(expected);
        // Verify the timestamp represents midnight UTC (modulo 86400000 ms/day should be 0)
        expect(parsed.date % 86400000).toBe(0);
      });
    });
  });
});
