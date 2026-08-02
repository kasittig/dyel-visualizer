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
  parseResult?(input: RawInput, ctx: ParseContext): ParseResult;
}

export interface ParseResult {
  records: SetRecord[];
  errors: ParseError[];
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
    return [
      this.message,
      this.line !== undefined ? `at line ${this.line}` : undefined,
      this.rawText !== undefined ? `: ${this.rawText}` : undefined,
    ]
      .filter(Boolean)
      .join(' ');
  }
}

export function resolveUnit(recordUnit: Unit | undefined, ctx: ParseContext): Unit {
  return recordUnit ?? ctx.datasetUnit ?? ctx.fallback;
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

  parseResult(input: RawInput, ctx: ParseContext): ParseResult {
    const parser = this.parsers.find((candidate) => candidate.canParse(input));
    if (!parser) {
      return { records: [], errors: [new ParseError(`No parser found for input: ${input.name}`)] };
    }
    if (parser.parseResult) {
      return parser.parseResult(input, ctx);
    }
    try {
      return { records: parser.parse(input, ctx), errors: [] };
    } catch (error) {
      if (error instanceof ParseError) {
        return { records: [], errors: [error] };
      }
      throw error;
    }
  }
}
