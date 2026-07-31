import type { SetRecord, Unit } from '@dyel/pipeline';
import { ParseError, parseFreeformText } from '@dyel/pipeline';

/**
 * Parses pasted text with the same freeform parser used to build PipelineModel.
 * Invalid input returns an empty list for the app's lightweight validity check;
 * detailed validation should use the pipeline result and its ParseError metadata.
 */
export function parseTextData(
  text: string,
  defaultUnit: Unit = 'lbs',
  now: Date = new Date()
): SetRecord[] {
  try {
    return parseFreeformText(text, { fallback: defaultUnit }, now.getTime());
  } catch (error) {
    if (error instanceof ParseError) {
      return [];
    }
    throw error;
  }
}
