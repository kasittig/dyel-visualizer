import type { SetRecord, Unit } from '../types';

export interface RawInput {
  name: string;
  content: string;
}

export interface ParseContext {
  datasetUnit?: Unit;
  fallback: Unit;
}

export interface Parser {
  id: string;
  canParse(input: RawInput): boolean;
  parse(input: RawInput, ctx: ParseContext): SetRecord[];
}

export class ParseError extends Error {
  line?: number;
  rawText?: string;

  constructor(message: string, line?: number, rawText?: string) {
    super(message);
    this.name = 'ParseError';
    this.line = line;
    this.rawText = rawText;
  }

  toString(): string {
    const parts = [this.message];
    if (this.line !== undefined) {
      parts.push(`at line ${this.line}`);
    }
    if (this.rawText !== undefined) {
      parts.push(`: ${this.rawText}`);
    }
    return parts.join(' ');
  }
}

export function resolveUnit(recordUnit: Unit | undefined, ctx: ParseContext): Unit {
  if (recordUnit !== undefined) {
    return recordUnit;
  }
  if (ctx.datasetUnit !== undefined) {
    return ctx.datasetUnit;
  }
  return ctx.fallback;
}

export class ParserRegistry {
  private parsers: Parser[] = [];

  register(parser: Parser): void {
    this.parsers.push(parser);
  }

  registerMany(parsers: Parser[]): void {
    this.parsers.push(...parsers);
  }

  parse(input: RawInput, ctx: ParseContext): SetRecord[] {
    const parser = this.parsers.find((p) => p.canParse(input));
    if (!parser) {
      throw new ParseError(
        `No parser found for input: ${input.name}`,
        undefined,
        input.content.slice(0, 100)
      );
    }
    return parser.parse(input, ctx);
  }
}
