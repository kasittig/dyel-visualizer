import type { TextFieldInput } from '../types/TextFieldInput';

export function extractTextLines(input: TextFieldInput): string[] | null {
  const lines = input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return lines.length > 0 ? lines : null;
}
