import { defineConfig } from 'vitest/config';
import fs from 'fs';
import path from 'path';

const modifierEffectsPath = path.resolve(__dirname, '../core/modifierEffects.json');
const modifierEffectsData = JSON.parse(fs.readFileSync(modifierEffectsPath, 'utf-8'));

const coefficientsPath = path.resolve(__dirname, '../core/coefficients.json');
const coefficientsData = JSON.parse(fs.readFileSync(coefficientsPath, 'utf-8'));

export default defineConfig({
  test: {
    environment: 'node',
  },
  define: {
    __MODIFIER__EFFECTS__: JSON.stringify(modifierEffectsData),
    __COEFFICIENTS__: JSON.stringify(coefficientsData),
  },
});
