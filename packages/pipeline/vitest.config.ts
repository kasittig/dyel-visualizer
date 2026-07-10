import { defineConfig } from 'vitest/config';

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
});
