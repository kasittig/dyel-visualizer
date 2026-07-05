import { describe, it, expect } from 'vitest';
import { buildRawInput } from './rawInputUtils';
import type { InputMode } from './appUtils';

describe('buildRawInput', () => {
  it.each<[string, InputMode, string, string]>([
    ['url mode', 'url', 'test,data', 'sheet.csv'],
    ['text mode', 'text', 'test log', 'pasted.txt'],
    ['url mode with multiline', 'url', 'line1\nline2', 'sheet.csv'],
    ['text mode with empty content', 'text', '', 'pasted.txt'],
  ])('produces correct filename for %s', (_, mode, content, expectedName) => {
    const result = buildRawInput(mode, content);
    expect(result.name).toBe(expectedName);
  });

  it.each<[string, InputMode, string]>([
    ['url mode', 'url', 'test,data,csv'],
    ['text mode', 'text', 'bench\nsquat\ndeadlift'],
    ['url with newlines', 'url', 'header\n1,2,3\n4,5,6'],
  ])('passes content through unchanged for %s', (_, mode, content) => {
    const result = buildRawInput(mode, content);
    expect(result.content).toBe(content);
  });
});
