import { defineConfig } from 'vitest/config';
import fs from 'fs';
import path from 'path';

const modifierEffectsPath = path.resolve(__dirname, './modifierEffects.json');
const modifierEffectsData = JSON.parse(fs.readFileSync(modifierEffectsPath, 'utf-8'));
const coefficientsPath = path.resolve(__dirname, './coefficients.json');
const coefficients = JSON.parse(fs.readFileSync(coefficientsPath, 'utf-8'));

export default defineConfig({
  test: {
    environment: 'node',
    pool: 'vmThreads',
    poolOptions: {
      vmThreads: {
        memoryLimit: '500MB', // Accepts fixed values (e.g., '500MB') or percentages (e.g., 0.5)
      },
    },
  },
  define: {
    __MODIFIER__EFFECTS__: JSON.stringify(modifierEffectsData),
    __COEFFICIENTS__: JSON.stringify(coefficients),
  },
});
