import { describe, it, expect } from 'vitest';
import { freeformParser, parseFreeformText } from './parser';
import { ParseError } from '../parser';
import type { RawInput, ParseContext } from '../parser';
import * as fs from 'fs';
import * as path from 'path';

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
    it('parses simple form: 2026-01-10 Bench 315x5 @8', () => {
      const input: RawInput = {
        name: 'test.txt',
        content: '2026-01-10 Bench 315x5 @8\n',
      };

      const result = freeformParser.parse(input, ctx);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        date: new Date('2026-01-10').setHours(0, 0, 0, 0),
        exercise: 'Bench',
        weight: 315 * 0.453592, // lbs to kg
        reps: 5,
        rpe: 8,
      });
      expect(result[0].meta).toMatchObject({
        rawUnit: 'lbs',
        rawWeight: '315',
      });
    });

    it('parses multi-weight shorthand: 2026-01-12 Squat 315/335/355 x3', () => {
      const input: RawInput = {
        name: 'test.txt',
        content: '2026-01-12 Squat 315/335/355 x3\n',
      };

      const result = freeformParser.parse(input, ctx);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        exercise: 'Squat',
        weight: 315 * 0.453592,
        reps: 3,
      });
      expect(result[1]).toMatchObject({
        exercise: 'Squat',
        weight: 335 * 0.453592,
        reps: 3,
      });
      expect(result[2]).toMatchObject({
        exercise: 'Squat',
        weight: 355 * 0.453592,
        reps: 3,
      });
    });

    it('parses inline unit suffix: 2026-01-09 Bench 100kg x 5', () => {
      const input: RawInput = {
        name: 'test.txt',
        content: '2026-01-09 Bench 100kg x 5\n',
      };

      const result = freeformParser.parse(input, ctx);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        exercise: 'Bench',
        weight: 100, // already kg
        reps: 5,
      });
      expect(result[0].meta).toMatchObject({
        rawUnit: 'kg',
        rawWeight: '100kg',
      });
    });

    it('parses reversed form: 2026-01-11 Bench 3x5 @ 315', () => {
      const input: RawInput = {
        name: 'test.txt',
        content: '2026-01-11 Bench 3x5 @ 315\n',
      };

      const result = freeformParser.parse(input, ctx);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        exercise: 'Bench',
        weight: 315 * 0.453592,
        reps: 5,
      });
    });

    it('parses preamble units: kg declaration', () => {
      const input: RawInput = {
        name: 'test.txt',
        content: 'units: kg 2026-01-08 Squat 140x5 @8\n',
      };

      const result = freeformParser.parse(input, ctx);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        exercise: 'Squat',
        weight: 140, // already kg
        reps: 5,
        rpe: 8,
      });
      expect(result[0].meta?.rawUnit).toBe('kg');
    });

    it('parses multi-word exercise names', () => {
      const input: RawInput = {
        name: 'test.txt',
        content: '2026-02-01 bench press 235x3 @9\n',
      };

      const result = freeformParser.parse(input, ctx);

      expect(result).toHaveLength(1);
      expect(result[0].exercise).toBe('bench press');
    });

    it('applies unit precedence: record level > dataset level > fallback', () => {
      const inputWithDatasetUnit: RawInput = {
        name: 'test.txt',
        content: 'units: kg\n2026-01-10 Bench 225lbs x5\n2026-01-10 Squat 140x3\n',
      };

      const result = freeformParser.parse(inputWithDatasetUnit, ctx);

      expect(result).toHaveLength(2);
      // 225lbs with explicit unit, should use lbs even though dataset is kg
      expect(result[0].weight).toBe(225 * 0.453592);
      expect(result[0].meta?.rawUnit).toBe('lbs');
      // 140 without explicit unit, should use dataset kg
      expect(result[1].weight).toBe(140);
      expect(result[1].meta?.rawUnit).toBe('kg');
    });

    it('handles empty lines', () => {
      const input: RawInput = {
        name: 'test.txt',
        content: '2026-01-10 Bench 315x5 @8\n\n2026-01-11 Squat 405x3\n',
      };

      const result = freeformParser.parse(input, ctx);

      expect(result).toHaveLength(2);
      expect(result[0].exercise).toBe('Bench');
      expect(result[1].exercise).toBe('Squat');
    });

    it('throws ParseError on malformed date line', () => {
      const input: RawInput = {
        name: 'test.txt',
        content: 'No date here Bench 315x5 @8\n',
      };

      expect(() => freeformParser.parse(input, ctx)).toThrow(ParseError);
    });

    it('throws ParseError on missing weight/reps specification', () => {
      const input: RawInput = {
        name: 'test.txt',
        content: '2026-01-10 Bench\n',
      };

      expect(() => freeformParser.parse(input, ctx)).toThrow(ParseError);
    });

    it('propagates tokenizer errors with line context', () => {
      const input: RawInput = {
        name: 'test.txt',
        content:
          '2026-01-13 Bench 225x5 @8\n2026-01-13 Squat 315x @7\n2026-01-13 Deadlift 405x3 @9\n',
      };

      expect(() => freeformParser.parse(input, ctx)).toThrow(ParseError);
    });

    it('loads and parses freeform-simple-form.txt fixture', () => {
      const fixture = fs.readFileSync(
        path.join(__dirname, '../../../test/fixtures/freeform-simple-form.txt'),
        'utf-8'
      );
      const input: RawInput = { name: 'freeform-simple-form.txt', content: fixture };

      const result = freeformParser.parse(input, ctx);

      expect(result).toHaveLength(1);
      expect(result[0].exercise).toBe('Bench');
      expect(result[0].reps).toBe(5);
      expect(result[0].rpe).toBe(8);
    });

    it('loads and parses freeform-preamble-units-kg.txt fixture', () => {
      const fixture = fs.readFileSync(
        path.join(__dirname, '../../../test/fixtures/freeform-preamble-units-kg.txt'),
        'utf-8'
      );
      const input: RawInput = { name: 'freeform-preamble-units-kg.txt', content: fixture };

      const result = freeformParser.parse(input, ctx);

      expect(result).toHaveLength(1);
      expect(result[0].exercise).toBe('Squat');
      expect(result[0].weight).toBe(140);
      expect(result[0].meta?.rawUnit).toBe('kg');
    });

    it('loads and parses freeform-multi-weight-shorthand.txt fixture', () => {
      const fixture = fs.readFileSync(
        path.join(__dirname, '../../../test/fixtures/freeform-multi-weight-shorthand.txt'),
        'utf-8'
      );
      const input: RawInput = {
        name: 'freeform-multi-weight-shorthand.txt',
        content: fixture,
      };

      const result = freeformParser.parse(input, ctx);

      expect(result).toHaveLength(3);
      expect(result[0].weight).toBe(315 * 0.453592);
      expect(result[1].weight).toBe(335 * 0.453592);
      expect(result[2].weight).toBe(355 * 0.453592);
    });

    it('loads and parses freeform-inline-unit-suffix.txt fixture', () => {
      const fixture = fs.readFileSync(
        path.join(__dirname, '../../../test/fixtures/freeform-inline-unit-suffix.txt'),
        'utf-8'
      );
      const input: RawInput = { name: 'freeform-inline-unit-suffix.txt', content: fixture };

      const result = freeformParser.parse(input, ctx);

      expect(result).toHaveLength(1);
      expect(result[0].weight).toBe(100);
      expect(result[0].meta?.rawUnit).toBe('kg');
    });

    it('loads and parses freeform-reversed-form.txt fixture', () => {
      const fixture = fs.readFileSync(
        path.join(__dirname, '../../../test/fixtures/freeform-reversed-form.txt'),
        'utf-8'
      );
      const input: RawInput = { name: 'freeform-reversed-form.txt', content: fixture };

      const result = freeformParser.parse(input, ctx);

      expect(result).toHaveLength(1);
      expect(result[0].weight).toBe(315 * 0.453592);
      expect(result[0].reps).toBe(5);
    });

    it('loads and parses freeform-near-variant-exercise-names.txt fixture', () => {
      const fixture = fs.readFileSync(
        path.join(__dirname, '../../../test/fixtures/freeform-near-variant-exercise-names.txt'),
        'utf-8'
      );
      const input: RawInput = {
        name: 'freeform-near-variant-exercise-names.txt',
        content: fixture,
      };

      const result = freeformParser.parse(input, ctx);

      expect(result).toHaveLength(3);
      expect(result[0].exercise).toBe('Bench');
      expect(result[1].exercise).toBe('bench press');
      expect(result[2].exercise).toBe('Comp Bench');
    });

    it('throws on freeform-malformed-line.txt fixture', () => {
      const fixture = fs.readFileSync(
        path.join(__dirname, '../../../test/fixtures/freeform-malformed-line.txt'),
        'utf-8'
      );
      const input: RawInput = { name: 'freeform-malformed-line.txt', content: fixture };

      expect(() => freeformParser.parse(input, ctx)).toThrow(ParseError);
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
