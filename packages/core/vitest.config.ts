import { defineConfig } from 'vitest/config';
import fs from 'fs';
import path from 'path';

// 1. Resolve and parse your mock or real data file at test-time
// Adjust the relative steps depending on where your config file sits
const modifierEffectsPath = path.resolve(__dirname, '../app/modifierEffects.json');
const modifierEffectsData = JSON.parse(fs.readFileSync(modifierEffectsPath, 'utf-8'));

export default defineConfig({
  test: {
    environment: 'node', // or 'jsdom' depending on your package setup
  },
  // 👇 ADD OR UPDATE THIS DEFINE BLOCK
  define: {
    __MODIFIER__EFFECTS__: JSON.stringify(modifierEffectsData),
  },
});
