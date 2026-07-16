import type { AthleteContext, RawInput } from '@dyel/api';
import type { InputMode } from '../../app/appTabs';

export const PLACEHOLDER_ATHLETE: AthleteContext = {
  sex: 'M',
  bodyweight: 90,
};

export function buildRawInput(mode: InputMode, content: string): RawInput {
  return { name: mode === 'url' ? 'sheet.csv' : 'pasted.txt', content };
}
