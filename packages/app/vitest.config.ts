import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    // Was 'vmThreads' with a memoryLimit (see git history: "Vitest args to hopefully not
    // OOM as much"). Switched to 'forks' because 'vmThreads' cannot correctly load recharts
    // (whose CJS build calls require('@reduxjs/toolkit'), which vmThreads' vm.Context-based
    // module loader resolves to an ESM-only build, throwing "seems to be an ES Module but
    // shipped in a CommonJS package") — this surfaced once a test (TeamViewPage.test.tsx)
    // first rendered a component tree that transitively imports recharts. 'forks' pool loads
    // dependencies via real Node child processes, which resolves recharts/@reduxjs/toolkit
    // correctly. execArgv caps each worker's heap to preserve the original OOM mitigation.
    pool: 'forks',
    poolOptions: {
      forks: {
        execArgv: ['--max-old-space-size=500'],
      },
    },
  },
});
