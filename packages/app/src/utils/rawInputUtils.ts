import type { RawInput } from '@dyel/pipeline';
import type { InputMode } from './appUtils';

export function buildRawInput(mode: InputMode, content: string): RawInput {
  return { name: mode === 'url' ? 'sheet.csv' : 'pasted.txt', content };
}
