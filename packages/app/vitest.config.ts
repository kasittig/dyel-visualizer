import { defineConfig } from 'vitest/config';
import fs from 'fs';
import path from 'path';

const modifierEffectsPath = path.resolve(__dirname, '../core/modifierEffects.json');
const modifierEffectsData = JSON.parse(fs.readFileSync(modifierEffectsPath, 'utf-8'));

const coefficientsPath = path.resolve(__dirname, '../core/coefficients.json');
const coefficientsData = JSON.parse(fs.readFileSync(coefficientsPath, 'utf-8'));

export default defineConfig({
  test: {
    environment: 'jsdom',
    pool: 'vmThreads',
    poolOptions: {
      vmThreads: {
        memoryLimit: '500MB', // Accepts fixed values (e.g., '500MB') or percentages (e.g., 0.5)
      },
    },
  },
  define: {
    __MODIFIER__EFFECTS__: JSON.stringify(modifierEffectsData),
    __COEFFICIENTS__: JSON.stringify(coefficientsData),
  },
});
