import { defineConfig } from 'vitest/config';
import fs from 'fs';
import path from 'path';

const modifierEffectsPath = path.resolve(__dirname, '../app/modifierEffects.json');
const modifierEffectsData = JSON.parse(fs.readFileSync(modifierEffectsPath, 'utf-8'));

export default defineConfig({
  test: {
    environment: 'node',
  },
  define: {
    __MODIFIER__EFFECTS__: JSON.stringify(modifierEffectsData),
  },
});
