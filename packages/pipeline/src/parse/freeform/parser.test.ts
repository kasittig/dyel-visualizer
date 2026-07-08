import { describe, it, expect } from 'vitest';
import { freeformParser, parseFreeformText } from './parser';
import { ParseError } from '../parser';
import type { ParseContext } from '../parser';
import * as fs from 'fs';
import * as path from 'path';
import type { SetRecord } from '../../types.ts';

const ctx: ParseContext = {
  fallback: 'lbs',
};

describe('freeformParser', () => {
  describe('canParse', () => {
    it('recognizes .txt files', () => {
      expect(freeformParser.canParse({ name: 'log.txt', content: '' })).toBe(true);
    });

    it('recognizes content with units: keyword', () => {
      expect(freeformParser.canParse({ name: 'anyfile', content: 'units: kg' })).toBe(true);
    });

    it('rejects other files', () => {
      expect(freeformParser.canParse({ name: 'log.csv', content: 'some,data' })).toBe(false);
    });
  });

  describe('parse', () => {
    const load = (f: string) => {
      return {
        name: f,
        content: fs.readFileSync(path.join(__dirname, '../../../test/fixtures', f), 'utf-8'),
      };
    };

    it('correctly parses all freeform inline variants, units precedence, and structures', () => {
      const simple = freeformParser.parse(
        { name: 't.txt', content: '2026-01-10 Bench 315x5 @8\n' },
        ctx
      );
      expect(simple).toHaveLength(1);
      expect(simple[0]).toMatchObject({
        date: new Date('2026-01-10').setHours(0, 0, 0, 0),
        exercise: 'Bench',
        weight: 315 * 0.453592,
        reps: 5,
        rpe: 8,
        meta: { rawUnit: 'lbs', rawWeight: '315' },
      });

      const shorthand = freeformParser.parse(
        { name: 't.txt', content: '2026-01-12 Squat 315/335/355 x3\n' },
        ctx
      );
      expect(shorthand).toHaveLength(3);
      [315, 335, 355].forEach((w, i) => {
        expect(shorthand[i]).toMatchObject({ exercise: 'Squat', weight: w * 0.453592, reps: 3 });
      });

      expect(
        freeformParser.parse({ name: 't.txt', content: '2026-01-09 Bench 100kg x 5\n' }, ctx)[0]
      ).toMatchObject({
        exercise: 'Bench',
        weight: 100,
        reps: 5,
        meta: { rawUnit: 'kg', rawWeight: '100kg' },
      });
      expect(
        freeformParser.parse({ name: 't.txt', content: '2026-01-11 Bench 3x5 @ 315\n' }, ctx)[0]
      ).toMatchObject({ exercise: 'Bench', weight: 315 * 0.453592, reps: 5 });
      expect(
        freeformParser.parse(
          { name: 't.txt', content: 'units: kg 2026-01-08 Squat 140x5 @8\n' },
          ctx
        )[0]
      ).toMatchObject({ exercise: 'Squat', weight: 140, reps: 5, rpe: 8, meta: { rawUnit: 'kg' } });
      expect(
        freeformParser.parse(
          { name: 't.txt', content: '2026-02-01 bench press 235x3 @9\n' },
          ctx
        )[0].exercise
      ).toBe('bench press');

      const multiUnit = freeformParser.parse(
        {
          name: 't.txt',
          content: 'units: kg\n2026-01-10 Bench 225lbs x5\n2026-01-10 Squat 140x3\n',
        },
        ctx
      );
      expect(multiUnit).toHaveLength(2);
      expect(multiUnit[0]).toMatchObject({ weight: 225 * 0.453592, meta: { rawUnit: 'lbs' } });
      expect(multiUnit[1]).toMatchObject({ weight: 140, meta: { rawUnit: 'kg' } });

      const emptyLines = freeformParser.parse(
        { name: 't.txt', content: '2026-01-10 Bench 315x5 @8\n\n2026-01-11 Squat 405x3\n' },
        ctx
      );
      expect(
        emptyLines.map((r: SetRecord) => {
          return r.exercise;
        })
      ).toEqual(['Bench', 'Squat']);
    });

    it('verifies parser file boundaries against external file system fixtures', () => {
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
        { weight: 315 * 0.453592, reps: 5 },
      ]);

      const multi = freeformParser.parse(load('freeform-multi-weight-shorthand.txt'), ctx);
      expect(multi).toHaveLength(3);
      [315, 335, 355].forEach((w, i) => {
        expect(multi[i].weight).toBe(w * 0.453592);
      });

      expect(
        freeformParser
          .parse(load('freeform-near-variant-exercise-names.txt'), ctx)
          .map((r: SetRecord) => {
            return r.exercise;
          })
      ).toEqual(['Bench', 'bench press', 'Comp Bench']);
    });

    it('triggers exact validation exceptions for broken formatting lines', () => {
      const badTokens =
        '2026-01-13 Bench 225x5 @8\n2026-01-13 Squat 315x @7\n2026-01-13 Deadlift 405x3 @9\n';
      const errs = ['No date here Bench 315x5 @8\n', '2026-01-10 Bench\n'];
      errs.forEach((c) => {
        expect(() => {
          return freeformParser.parse({ name: 't.txt', content: c }, ctx);
        }).toThrow(ParseError);
      });
      expect(() => {
        return freeformParser.parse({ name: 't.txt', content: badTokens }, ctx);
      }).toThrow(ParseError);
      expect(() => {
        return freeformParser.parse(load('freeform-malformed-line.txt'), ctx);
      }).toThrow(ParseError);
    });
  });

  describe('parseFreeformText', () => {
    it.each([
      ['simple form', '2026-01-10 Bench 315x5 @8\n'],
      ['multi-weight shorthand', '2026-01-12 Squat 315/335/355 x3\n'],
      ['inline unit suffix', '2026-01-09 Bench 100kg x 5\n'],
      ['reversed form', '2026-01-11 Bench 3x5 @ 315\n'],
      ['preamble units', 'units: kg 2026-01-08 Squat 140x5 @8\n'],
    ])('produces same result as freeformParser.parse for %s', (_, content) => {
      const directResult = parseFreeformText(content, ctx);
      const parserResult = freeformParser.parse({ name: 'test.txt', content }, ctx);

      expect(directResult).toEqual(parserResult);
    });
  });
});
