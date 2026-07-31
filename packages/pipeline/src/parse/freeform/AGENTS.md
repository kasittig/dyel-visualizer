# AGENTS.md — freeform/ pipeline development

## 📌 Core Architecture & APIs

### Module Responsibilities

- **`tokenizer.ts`:** Processes line suffix strings. Returns `weights: Array<{value: number, unit?: string}>`, `reps: number`, and `rpe?: number`. **Do not add date/exercise parsing here.**
- **`parser.ts`:** Steps backward from line-end to find the tokenization boundary. Loops over `weights` to yield multiple `SetRecord` objects.

## 📏 Code Style & Idioms

- **Errors:** Throw `ParseError` on failure. It takes the message, 1-based line number, and raw text.
  ```ts
  throw new ParseError(errorMsg, lineNum + 1, rawLine);
  ```
- **Date Parsing:** Parse optional `YYYY-MM-DD` tokens via `Date.UTC`; missing dates default to the current UTC calendar date. Do not accept alternate formats as dates.
- **Unit Precedence Rules:** Evaluate exactly in this order: `Record suffix (e.g., 100kg)` -> `Preamble (units: lbs)` -> `ParseContext.fallback`.

## ❌ Non-Goals & Strict Constraints

- **Do not implement:** Supersets, AMRAP symbols (`+`), inline comments, or digital/numeric exercise names.
