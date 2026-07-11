import { useState } from 'react';
import type { TextValidationResult } from '@dyel/api';
import { validateTextData } from '@dyel/api';

type TextValidationState = { status: 'idle' } | { status: 'success'; result: TextValidationResult };

export function useTextValidation(): [TextValidationState, (text: string) => void] {
  const [state, setState] = useState<TextValidationState>({ status: 'idle' });

  function validate(text: string) {
    if (!text.trim()) {
      setState({ status: 'idle' });
      return;
    }
    setState({ status: 'success', result: validateTextData(text) });
  }

  return [state, validate];
}
